from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware

from models.equipment import Equipment
from models.diagnosis import DiagnosisRequest
from models.maintenance import Maintenance
from models.technician import Technician
from models.repair import Repair
from models.user import User
from security.password import hash_password, verify_password
from security.generator import generate_strong_password

from database.database import (
    create_tables,

    # Equipment
    add_equipment,
    get_all_equipment,
    get_equipment_by_id,
    update_equipment,
    delete_equipment,
    search_equipment,

    # Maintenance
    add_maintenance,
    get_maintenance_history,

    # Technicians
    add_technician,
    get_all_technicians,

    # Repairs
    add_repair,
    get_repairs,

    # Users
    add_user,
    get_all_users,
    get_user_by_id,
    get_user_by_username,
    get_user_by_email,

    # Dashboard & Analytics
    get_dashboard,
    get_equipment_health,
    get_analytics,
    get_maintenance_alerts,
    get_summary_report,
)

from security.token import (
    create_access_token,
    get_current_user,
    require_role,
)

from data import HOME_APPLIANCE_FAULTS


# ==========================================================
# DATABASE
# ==========================================================

create_tables()


# ==========================================================
# APPLICATION
# ==========================================================

app = FastAPI(
    title="FuElectric-AI",
    version="3.0",
    description="AI Equipment Diagnosis API",
)


# ==========================================================
# CORS
# ==========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
) 

# ==========================================================
# HOME
# ==========================================================

@app.get("/")
def home():
    return {
        "message": "Welcome to FuElectric-AI 3.0"
    }


# ==========================================================
# HEALTH
# ==========================================================

@app.get("/health")
def health():
    return {
        "status": "Running",
        "system": "FuElectric-AI"
    }


# ==========================================================
# AI DIAGNOSIS
# ==========================================================

@app.post("/diagnose")
def diagnose(request: DiagnosisRequest):

    equipment = request.equipment.lower()
    fault = request.fault.lower()

    if equipment not in HOME_APPLIANCE_FAULTS:
        raise HTTPException(
            status_code=404,
            detail="Equipment not found."
        )

    if fault not in HOME_APPLIANCE_FAULTS:
        raise HTTPException(
            status_code=404,
            detail="Fault not found in knowledge base."
        )

    diagnosis = HOME_APPLIANCE_FAULTS[fault]

    return {
        "equipment": equipment,
        "fault": request.fault,
        **diagnosis
    }


# ==========================================================
# EQUIPMENT
# ==========================================================

@app.post("/equipment")
def register_equipment(equipment: Equipment):

    existing = get_equipment_by_id(equipment.equipment_id)

    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Equipment ID '{equipment.equipment_id}' already exists."
        )

    add_equipment(equipment)

    return {
        "message": "Equipment registered successfully.",
        "equipment": equipment
    }


@app.get("/equipment")
def list_equipment():

    return get_all_equipment()


@app.get("/equipment/{equipment_id}")
def get_equipment(equipment_id: str):

    equipment = get_equipment_by_id(equipment_id)

    if equipment is None:
        raise HTTPException(
            status_code=404,
            detail="Equipment not found."
        )

    return equipment


@app.put("/equipment/{equipment_id}")
def update_equipment_endpoint(
    equipment_id: str,
    equipment: Equipment
):

    existing = get_equipment_by_id(equipment_id)

    if existing is None:
        raise HTTPException(
            status_code=404,
            detail="Equipment not found."
        )

    update_equipment(equipment_id, equipment)

    return {
        "message": "Equipment updated successfully.",
        "equipment": equipment
    }


@app.delete("/equipment/{equipment_id}")
def delete_equipment_endpoint(equipment_id: str):

    existing = get_equipment_by_id(equipment_id)

    if existing is None:
        raise HTTPException(
            status_code=404,
            detail="Equipment not found."
        )

    delete_equipment(equipment_id)

    return {
        "message": "Equipment deleted successfully.",
        "equipment_id": equipment_id
    }


@app.get("/equipment/search/{keyword}")
def search_equipment_endpoint(keyword: str):

    results = search_equipment(keyword)

    if not results:
        raise HTTPException(
            status_code=404,
            detail="No equipment found."
        )

    return {
        "keyword": keyword,
        "results": results
    }


# ==========================================================
# MAINTENANCE
# ==========================================================

@app.post("/maintenance")
def register_maintenance(record: Maintenance):

    equipment = get_equipment_by_id(record.equipment_id)

    if equipment is None:
        raise HTTPException(
            status_code=404,
            detail="Equipment not found."
        )

    add_maintenance(record)

    return {
        "message": "Maintenance record added successfully.",
        "record": record
    }

@app.get("/maintenance/alerts")
def maintenance_alerts():

    return get_maintenance_alerts() 

@app.get("/maintenance/{equipment_id}")
def maintenance_history(equipment_id: str):

    history = get_maintenance_history(equipment_id)

    if not history:
        raise HTTPException(
            status_code=404,
            detail="No maintenance history found."
        )

    return history


# ==========================================================
# TECHNICIANS
# ==========================================================

@app.post("/technician")
def register_technician(technician: Technician):

    add_technician(technician)

    return {
        "message": "Technician registered successfully.",
        "technician": technician
    }


@app.get("/technician")
def list_technicians():

    return get_all_technicians()


# ==========================================================
# REPAIRS
# ==========================================================

@app.post("/repair")
def register_repair(repair: Repair):

    equipment = get_equipment_by_id(repair.equipment_id)

    if equipment is None:
        raise HTTPException(
            status_code=404,
            detail="Equipment not found."
        )

    add_repair(repair)

    return {
        "message": "Repair registered successfully.",
        "repair": repair
    }


@app.get("/repair/{equipment_id}")
def repair_history(equipment_id: str):

    repairs = get_repairs(equipment_id)

    if not repairs:
        raise HTTPException(
            status_code=404,
            detail="No repair records found."
        )

    return repairs


# ==========================================================
# USERS
# ==========================================================

@app.get("/users")
def list_users():

    return get_all_users()


@app.get("/users/{user_id}")
def get_user(user_id: str):

    user = get_user_by_id(user_id)

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="User not found."
        )

    return user

@app.post("/users/signup")
def signup(user: User):

    existing_username = get_user_by_username(user.username)

    if existing_username:
        raise HTTPException(
            status_code=400,
            detail="Username already exists."
        )

    existing_email = get_user_by_email(str(user.email))

    if existing_email:
        raise HTTPException(
            status_code=400,
            detail="Email already exists."
        )

    password_hash = hash_password(user.password)

    add_user(
        user.user_id,
        user.username,
        str(user.email),
        password_hash,
        user.role
    )

    return {
        "message": "User registered successfully.",
        "user_id": user.user_id,
        "username": user.username,
        "email": str(user.email),
        "role": user.role
    }

@app.post("/users/login")
def login(user: User):

    existing_user = get_user_by_username(user.username)

    if existing_user is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password."
        )

    password_correct = verify_password(
        user.password,
        existing_user["password_hash"]
    )

    if not password_correct:
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password."
        )

    access_token = create_access_token(
        existing_user["user_id"],
        existing_user["username"],
        existing_user["role"]
    )

    return {
        "message": "Login successful.",
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "user_id": existing_user["user_id"],
            "username": existing_user["username"],
            "email": existing_user["email"],
            "role": existing_user["role"]
        }
    }

@app.get("/users/me")
def get_my_profile(current_user=Depends(get_current_user)):

    return {
        "message": "Authentication successful.",
        "user": current_user
    }

@app.get("/admin/dashboard")
def admin_dashboard(
    current_user=Depends(require_role(["Admin"]))
):
    return {
        "message": "Welcome to the Admin Dashboard.",
        "user": current_user
    }


@app.get("/technician/dashboard")
def technician_dashboard(
    current_user=Depends(
        require_role(["Admin", "Technician"])
    )
):
    return {
        "message": "Welcome to the Technician Dashboard.",
        "user": current_user
    }


@app.get("/viewer/dashboard")
def viewer_dashboard(
    current_user=Depends(
        require_role(["Admin", "Technician", "Viewer"])
    )
):
    return {
        "message": "Welcome to FuElectric-AI.",
        "user": current_user
    }

@app.get("/users/generate-password")
def generate_password(length: int = 16):

    password = generate_strong_password(length)

    return {
        "message": "Strong password generated successfully.",
        "password": password,
        "length": len(password)
    }

# ==========================================================
# DASHBOARD
# ==========================================================

@app.get("/dashboard")
def dashboard():

    return get_dashboard()


# ==========================================================
# EQUIPMENT HEALTH SCORE
# ==========================================================

@app.get("/equipment/{equipment_id}/health")
def equipment_health(equipment_id: str):

    health = get_equipment_health(equipment_id)

    if health is None:
        raise HTTPException(
            status_code=404,
            detail="Equipment not found."
        )

    return health


# ==========================================================
# ANALYTICS
# ==========================================================

@app.get("/analytics")
def analytics():

    return get_analytics()


# ==========================================================
# MAINTENANCE ALERTS
# ==========================================================

@app.get("/maintenance/alerts")
def maintenance_alerts():

    return get_maintenance_alerts()


# ==========================================================
# SUMMARY REPORT
# ==========================================================

@app.get("/reports/summary")
def summary_report():

    return get_summary_report()