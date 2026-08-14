from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime

from models.equipment import Equipment
from models.diagnosis import DiagnosisRequest
from models.maintenance import Maintenance
from models.technician import Technician
from models.repair import Repair
from models.user import User
from models.work_order import WorkOrder

from security.password import hash_password, verify_password
from security.generator import generate_strong_password
from security.token import (
    create_access_token,
    get_current_user,
    require_role,
)

from data import HOME_APPLIANCE_FAULTS

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
    get_maintenance_alerts,

    # Technicians
    add_technician,
    get_all_technicians,
    get_technician_by_id,

    # Repairs
    add_repair,
    get_repairs,

    # Users
    add_user,
    get_all_users,
    get_user_by_id,
    get_user_by_username,
    get_user_by_email,

    # Work Orders
    add_work_order,
    get_all_work_orders,
    get_work_order_by_id,
    get_work_orders_by_equipment,
    get_work_orders_by_technician,
    update_work_order,
    update_work_order_status,
    delete_work_order,
    get_work_order_statistics,
    get_work_order_intelligence,
    get_work_order_performance,
    get_work_order_workload,
    get_overdue_work_orders,
    get_technician_workload_intelligence,


    # Dashboard
    get_dashboard,
    get_equipment_health,
    get_analytics,
    get_summary_report,
    get_connection,
)


# ==========================================================
# WORK ORDER STATUS MODEL
# ==========================================================

class WorkOrderStatusUpdate(BaseModel):
    status: str


# ==========================================================
# DATABASE
# ==========================================================

create_tables()


# ==========================================================
# APPLICATION
# ==========================================================

app = FastAPI(
    title="FuElectric-AI",
    version="3.5.0",
    description="AI Equipment Diagnosis & Maintenance API",
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
        "message": "Welcome to FuElectric-AI 3.5.0"
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

    equipment_id = request.equipment.strip()
    fault = request.fault.strip().lower()

    # Check that the equipment actually exists
    equipment = get_equipment_by_id(equipment_id)

    if equipment is None:
        raise HTTPException(
            status_code=404,
            detail="Equipment not found."
        )

    # Check that the fault exists in the knowledge base
    if fault not in HOME_APPLIANCE_FAULTS:
        raise HTTPException(
            status_code=404,
            detail="Fault not found in knowledge base."
        )

    diagnosis = HOME_APPLIANCE_FAULTS[fault]

    return {
        "equipment_id": equipment_id,
        "equipment_name": equipment["name"],
        "fault": fault,
        **diagnosis
    }


# ==========================================================
# EQUIPMENT
# ==========================================================

@app.post("/equipment")
def register_equipment(equipment: Equipment):

    existing = get_equipment_by_id(
        equipment.equipment_id
    )

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


@app.get("/equipment/{equipment_id}")
def get_equipment(equipment_id: str):

    equipment = get_equipment_by_id(
        equipment_id
    )

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

    existing = get_equipment_by_id(
        equipment_id
    )

    if existing is None:
        raise HTTPException(
            status_code=404,
            detail="Equipment not found."
        )

    update_equipment(
        equipment_id,
        equipment
    )

    return {
        "message": "Equipment updated successfully.",
        "equipment": equipment
    }


@app.delete("/equipment/{equipment_id}")
def delete_equipment_endpoint(
    equipment_id: str
):

    existing = get_equipment_by_id(
        equipment_id
    )

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


# ==========================================================
# MAINTENANCE
# ==========================================================

@app.post("/maintenance")
def register_maintenance(record: Maintenance):

    equipment = get_equipment_by_id(
        record.equipment_id
    )

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


# ==========================================================
# MAINTENANCE INTELLIGENCE — v3.2
# MAINTENANCE ALERTS
# ==========================================================

@app.get("/maintenance/alerts")
def maintenance_alerts():

    return get_maintenance_alerts()


@app.get("/maintenance/{equipment_id}")
def maintenance_history(
    equipment_id: str
):

    history = get_maintenance_history(
        equipment_id
    )

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
def register_technician(
    technician: Technician
):

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

    equipment = get_equipment_by_id(
        repair.equipment_id
    )

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
def repair_history(
    equipment_id: str
):

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
@app.get("/users/generate-password")
def generate_password(length: int = 16):

    password = generate_strong_password(
        length
    )

    return {
        "message": "Strong password generated successfully.",
        "password": password,
        "length": len(password)
    }



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

    existing_username = get_user_by_username(
        user.username
    )

    if existing_username:
        raise HTTPException(
            status_code=400,
            detail="Username already exists."
        )

    existing_email = get_user_by_email(
        str(user.email)
    )

    if existing_email:
        raise HTTPException(
            status_code=400,
            detail="Email already exists."
        )

    password_hash = hash_password(
        user.password
    )

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

    existing_user = get_user_by_username(
        user.username
    )

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
def get_my_profile(
    current_user=Depends(get_current_user)
):

    return {
        "message": "Authentication successful.",
        "user": current_user
    }


@app.get("/admin/dashboard")
def admin_dashboard(
    current_user=Depends(
        require_role(["Admin"])
    )
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
        require_role(
            ["Admin", "Technician", "Viewer"]
        )
    )
):

    return {
        "message": "Welcome to FuElectric-AI.",
        "user": current_user
    }


# ==========================================================
# DASHBOARD
# ==========================================================

@app.get("/dashboard")
def dashboard():

    return get_dashboard()


# ==========================================================
# EQUIPMENT HEALTH
# ==========================================================

@app.get("/equipment/{equipment_id}/health")
def equipment_health(
    equipment_id: str
):

    health = get_equipment_health(
        equipment_id
    )

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
# SUMMARY REPORT
# ==========================================================

@app.get("/reports/summary")
def summary_report():

    return get_summary_report()


# ==========================================================
# WORK ORDERS — FuElectric-AI v3.1
# ==========================================================

@app.post("/work-orders")
def register_work_order(
    work_order: WorkOrder
):

    # Check equipment
    equipment = get_equipment_by_id(
        work_order.equipment_id
    )

    if equipment is None:
        raise HTTPException(
            status_code=404,
            detail="Equipment not found."
        )

    # Check technician
    if work_order.technician_id:

        technician = get_technician_by_id(
            work_order.technician_id
        )

        if technician is None:
            raise HTTPException(
                status_code=404,
                detail="Technician not found."
            )

    # Creation time
    if not work_order.created_at:

        work_order.created_at = (
            datetime.now().strftime(
                "%Y-%m-%d %H:%M:%S"
            )
        )

    add_work_order(work_order)

    return {
        "message": "Work order created successfully.",
        "work_order": work_order
    }


@app.get("/work-orders")
def list_work_orders():

    return get_all_work_orders()


@app.get("/work-orders/equipment/{equipment_id}")
def equipment_work_orders(
    equipment_id: str
):

    equipment = get_equipment_by_id(
        equipment_id
    )

    if equipment is None:
        raise HTTPException(
            status_code=404,
            detail="Equipment not found."
        )

    return get_work_orders_by_equipment(
        equipment_id
    )


@app.get("/work-orders/technician/{technician_id}")
def technician_work_orders(
    technician_id: str
):

    technician = get_technician_by_id(
        technician_id
    )

    if technician is None:
        raise HTTPException(
            status_code=404,
            detail="Technician not found."
        )

    return get_work_orders_by_technician(
        technician_id
    )


@app.get("/work-orders/statistics")
def work_order_statistics():

    return get_work_order_statistics()

# ==========================================================
# WORK ORDER INTELLIGENCE — FuElectric-AI v3.5.0
# ==========================================================


@app.get("/work-orders/overdue")
def overdue_work_orders():

    overdue = get_overdue_work_orders()

    return {
        "message": "Overdue work orders retrieved successfully.",
        "total_overdue": len(overdue),
        "work_orders": overdue
    }


# ==========================================================
# TECHNICIAN WORKLOAD
# ==========================================================

@app.get("/work-orders/workload")
def work_order_workload():

    return {
        "message": "Technician workload retrieved successfully.",
        "workload": get_work_order_workload()
    }


# ==========================================================
# WORK ORDER PERFORMANCE
# ==========================================================

@app.get("/work-orders/performance")
def work_order_performance():

    return {
        "message": "Work order performance retrieved successfully.",
        "performance": get_work_order_performance()
    }


# ==========================================================
# WORK ORDER INTELLIGENCE
# ==========================================================

@app.get("/work-orders/intelligence")
def work_order_intelligence():

    return {
        "message": "Work Order Intelligence generated successfully.",
        "intelligence": get_work_order_intelligence()
    }


# ==========================================================
# GET SINGLE WORK ORDER
# ==========================================================

@app.get("/work-orders/{work_order_id}")
def get_work_order(
    work_order_id: str
):

    work_order = get_work_order_by_id(
        work_order_id
    )

    if work_order is None:
        raise HTTPException(
            status_code=404,
            detail="Work order not found."
        )

    return work_order


# ==========================================================
# UPDATE COMPLETE WORK ORDER
# ==========================================================

@app.put("/work-orders/{work_order_id}")
def edit_work_order(
    work_order_id: str,
    work_order: WorkOrder
):

    existing = get_work_order_by_id(
        work_order_id
    )

    if existing is None:
        raise HTTPException(
            status_code=404,
            detail="Work order not found."
        )

    update_work_order(
        work_order_id,
        work_order
    )

    return {
        "message": "Work order updated successfully.",
        "work_order_id": work_order_id
    }


# ==========================================================
# UPDATE WORK ORDER STATUS — FuElectric-AI v3.4.4
# ==========================================================

@app.put("/work-orders/{work_order_id}/status")
def change_work_order_status(
    work_order_id: str,
    status_update: WorkOrderStatusUpdate
):

    existing = get_work_order_by_id(
        work_order_id
    )

    if existing is None:

        raise HTTPException(
            status_code=404,
            detail="Work order not found."
        )

    success = update_work_order_status(
        work_order_id,
        status_update.status
    )

    if not success:

        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid status. "
                "Allowed statuses: "
                "Open, Assigned, In Progress, "
                "Completed, Cancelled"
            )
        )

    updated_work_order = get_work_order_by_id(
        work_order_id
    )

    return {
        "message": "Work order status updated successfully.",
        "work_order": updated_work_order
    }


# ==========================================================
# DELETE WORK ORDER — FuElectric-AI v3.4.4
# ==========================================================

@app.delete("/work-orders/{work_order_id}")
def remove_work_order(
    work_order_id: str
):

    deleted = delete_work_order(
        work_order_id
    )

    if not deleted:

        raise HTTPException(
            status_code=404,
            detail="Work order not found."
        )

    return {
        "message": "Work order deleted successfully.",
        "work_order_id": work_order_id
    }

# ==========================================================
# TECHNICIAN WORKLOAD INTELLIGENCE — FuElectric-AI v3.5.5
# ==========================================================

@app.get("/work-orders/workload/intelligence")
def technician_workload_intelligence():

    return {
        "message":
            "Technician workload intelligence generated successfully.",

        "technicians":
            get_technician_workload_intelligence()
    }