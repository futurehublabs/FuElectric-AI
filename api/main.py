from fastapi import FastAPI, HTTPException, Depends
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
import os

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

    # Reliability Analytics — v3.5.3
    get_equipment_reliability,
    get_all_equipment_reliability,
    get_reliability_summary,
    get_reliability_ranking,

    get_equipment_health_trend,
    get_equipment_risk_ranking,
    get_health_risk_summary,
    get_deteriorating_equipment

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
# DATABASE MIGRATIONS
# ==========================================================

def migrate_database():
    """
    Apply safe database schema upgrades.

    FuElectric-AI v3.5.3
    """

    conn = get_connection()

    try:

        # --------------------------------------------------
        # CHECK EXISTING REPAIR COLUMNS
        # --------------------------------------------------

        columns = conn.execute("""
            PRAGMA table_info(repairs)
        """).fetchall()

        existing_columns = {
            row["name"]
            for row in columns
        }

        # --------------------------------------------------
        # ADD REPAIR START DATE
        # --------------------------------------------------

        if "repair_start_date" not in existing_columns:

            conn.execute("""
                ALTER TABLE repairs
                ADD COLUMN repair_start_date TEXT
            """)

        # --------------------------------------------------
        # ADD REPAIR COMPLETION DATE
        # --------------------------------------------------

        if "repair_completion_date" not in existing_columns:

            conn.execute("""
                ALTER TABLE repairs
                ADD COLUMN repair_completion_date TEXT
            """)

        conn.commit()

    finally:

        conn.close()


# Apply database migrations after base tables exist
migrate_database()

# ==========================================================
# APPLICATION
# ==========================================================

app = FastAPI(
    title="FuElectric-AI",
    version="3.5.4",
    description="AI Equipment Diagnosis & Maintenance API",
)


# ==========================================================
# CORS
# ==========================================================

allowed_origins = [
    origin.strip()
    for origin in os.getenv(
        "FRONTEND_URLS",
        "http://127.0.0.1:5500,http://localhost:5500"
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)




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
# HEALTH & RISK INTELLIGENCE — v3.5.4
# ==========================================================

@app.get("/health-risk-summary")
def health_risk_summary():
    return get_health_risk_summary()


@app.get("/health-risk-ranking")
def health_risk_ranking():
    return get_equipment_risk_ranking()


@app.get("/health-risk-deteriorating")
def health_risk_deteriorating():
    return get_deteriorating_equipment()


@app.get("/health-risk-trend/{equipment_id}")
def health_risk_trend(equipment_id: str):

    equipment = get_equipment_by_id(equipment_id)

    if equipment is None:
        raise HTTPException(
            status_code=404,
            detail="Equipment not found."
        )

    return get_equipment_health_trend(equipment_id)

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

# ==========================================================
# INTELLIGENT SCANNER PROFILE
# FuElectric-AI v3.5.6
# ==========================================================

@app.get("/scanner/profile/{equipment_id}")
def intelligent_scanner_profile(
    equipment_id: str
):
    """
    FuElectric-AI v3.5.6

    Intelligent Equipment Scanner Profile.

    Converts an equipment ID scan into a complete
    operational equipment intelligence profile.

    Returns:
    - Equipment identity
    - Health
    - Risk
    - Reliability
    - Maintenance status
    - Recent maintenance
    - Repair history
    - Work orders
    - Risk factors
    - Recommended action
    - Scanner confidence
    """

    # ------------------------------------------------------
    # NORMALIZE EQUIPMENT ID
    # ------------------------------------------------------

    equipment_id = equipment_id.strip()

    if not equipment_id:

        raise HTTPException(
            status_code=400,
            detail="Equipment ID is required."
        )

    # ------------------------------------------------------
    # FIND EQUIPMENT
    # ------------------------------------------------------

    equipment = get_equipment_by_id(
        equipment_id
    )

    if equipment is None:

        raise HTTPException(
            status_code=404,
            detail="Equipment not found."
        )

    # ------------------------------------------------------
    # EQUIPMENT DATA
    # ------------------------------------------------------

    if hasattr(equipment, "model_dump"):

        equipment_data = equipment.model_dump()

    elif hasattr(equipment, "dict"):

        equipment_data = equipment.dict()

    else:

        equipment_data = dict(equipment)

    # ------------------------------------------------------
    # HEALTH
    # ------------------------------------------------------

    health_data = get_equipment_health(
        equipment_id
    )

    if health_data is None:

        health_data = {}

    # ------------------------------------------------------
    # RELIABILITY
    # ------------------------------------------------------

    reliability_data = get_equipment_reliability(
        equipment_id
    )

    if reliability_data is None:

        reliability_data = {}

    # ------------------------------------------------------
    # MAINTENANCE HISTORY
    # ------------------------------------------------------

    try:

        maintenance_history = get_maintenance_history(
            equipment_id
        )

    except Exception:

        maintenance_history = []

    if maintenance_history is None:

        maintenance_history = []

    # ------------------------------------------------------
    # REPAIR HISTORY
    # ------------------------------------------------------

    try:

        repair_history = get_repairs(
            equipment_id
        )

    except Exception:

        repair_history = []

    if repair_history is None:

        repair_history = []

    # ------------------------------------------------------
    # WORK ORDERS
    # ------------------------------------------------------

    try:

        work_orders = get_work_orders_by_equipment(
            equipment_id
        )

    except Exception:

        work_orders = []

    if work_orders is None:

        work_orders = []

    # ------------------------------------------------------
    # NORMALIZE LIST DATA
    # ------------------------------------------------------

    def normalize_record(record):

        if hasattr(record, "model_dump"):

            return record.model_dump()

        if hasattr(record, "dict"):

            return record.dict()

        try:

            return dict(record)

        except Exception:

            return record

    maintenance_history = [
        normalize_record(record)
        for record in maintenance_history
    ]

    repair_history = [
        normalize_record(record)
        for record in repair_history
    ]

    work_orders = [
        normalize_record(record)
        for record in work_orders
    ]

    # ------------------------------------------------------
    # HEALTH SCORE
    # ------------------------------------------------------

    health_score = health_data.get(
        "health_score",
        health_data.get(
            "current_health_score",
            100
        )
    )

    try:

        health_score = float(
            health_score
        )

    except (TypeError, ValueError):

        health_score = 100.0

    health_score = max(
        0,
        min(
            100,
            health_score
        )
    )

    # ------------------------------------------------------
    # RISK SCORE
    # ------------------------------------------------------

    risk_score = health_data.get(
        "risk_score",
        100 - health_score
    )

    try:

        risk_score = float(
            risk_score
        )

    except (TypeError, ValueError):

        risk_score = 100 - health_score

    risk_score = max(
        0,
        min(
            100,
            risk_score
        )
    )

    # ------------------------------------------------------
    # RISK LEVEL
    # ------------------------------------------------------

    if risk_score >= 75:

        risk_level = "Critical"

    elif risk_score >= 50:

        risk_level = "High"

    elif risk_score >= 25:

        risk_level = "Medium"

    else:

        risk_level = "Low"

    # ------------------------------------------------------
    # HEALTH STATUS
    # ------------------------------------------------------

    if health_score >= 90:

        health_status = "Healthy"

    elif health_score >= 75:

        health_status = "Stable"

    elif health_score >= 50:

        health_status = "At Risk"

    else:

        health_status = "Critical"

    # ------------------------------------------------------
    # TREND
    # ------------------------------------------------------

    trend = health_data.get(
        "trend",
        health_data.get(
            "overall_trend",
            "Unknown"
        )
    )

    # ------------------------------------------------------
    # RELIABILITY
    # ------------------------------------------------------

    reliability_score = reliability_data.get(
        "reliability_score",
        reliability_data.get(
            "reliability",
            None
        )
    )

    reliability_status = reliability_data.get(
        "status",
        reliability_data.get(
            "reliability_status",
            None
        )
    )

    # ------------------------------------------------------
    # MAINTENANCE STATUS
    # ------------------------------------------------------

    maintenance_count = len(
        maintenance_history
    )

    repair_count = len(
        repair_history
    )

    if maintenance_count == 0:

        maintenance_status = (
            "No maintenance record"
        )

    else:

        maintenance_status = (
            "Maintenance records available"
        )

    # ------------------------------------------------------
    # WORK ORDER INTELLIGENCE
    # ------------------------------------------------------

    open_work_orders = []

    for work_order in work_orders:

        status = str(
            work_order.get(
                "status",
                ""
            )
        ).strip().lower()

        if status not in [
            "completed",
            "cancelled"
        ]:

            open_work_orders.append(
                work_order
            )

    # ------------------------------------------------------
    # RISK FACTORS
    # ------------------------------------------------------

    risk_factors = []

    if health_score < 75:

        risk_factors.append(
            "Equipment health is below the stable threshold."
        )

    if risk_score >= 25:

        risk_factors.append(
            "Equipment risk requires monitoring."
        )

    if trend == "Deteriorating":

        risk_factors.append(
            "Equipment condition is deteriorating."
        )

    if maintenance_count == 0:

        risk_factors.append(
            "No recorded maintenance activity."
        )

    if repair_count >= 2:

        risk_factors.append(
            "Multiple repair events have been recorded."
        )

    if len(open_work_orders) > 0:

        risk_factors.append(
            f"{len(open_work_orders)} open work order(s) require attention."
        )

    if not risk_factors:

        risk_factors.append(
            "No major risk factors detected from available records."
        )

    # ------------------------------------------------------
    # RECOMMENDED ACTION
    # ------------------------------------------------------

    if risk_level == "Critical":

        recommended_action = (
            "Immediate inspection and corrective action required."
        )

    elif risk_level == "High":

        recommended_action = (
            "Prioritize equipment inspection and maintenance."
        )

    elif trend == "Deteriorating":

        recommended_action = (
            "Schedule preventive maintenance and increase monitoring."
        )

    elif maintenance_count == 0:

        recommended_action = (
            "Schedule an initial maintenance inspection."
        )

    elif len(open_work_orders) > 0:

        recommended_action = (
            "Review and complete outstanding work orders."
        )

    else:

        recommended_action = (
            "Continue routine monitoring and preventive maintenance."
        )

    # ------------------------------------------------------
    # LAST MAINTENANCE / SERVICE
    # ------------------------------------------------------

    last_maintenance = equipment_data.get(
        "last_maintenance"
    )

    if maintenance_history:

        latest_maintenance = maintenance_history[-1]

        last_maintenance = (
            latest_maintenance.get(
                "maintenance_date",
                last_maintenance
            )
        )

    # ------------------------------------------------------
    # SCANNER CONFIDENCE
    # ------------------------------------------------------

    confidence_points = 0

    if equipment_data.get("equipment_id"):
        confidence_points += 20

    if equipment_data.get("name"):
        confidence_points += 20

    if equipment_data.get("category"):
        confidence_points += 15

    if equipment_data.get("location"):
        confidence_points += 15

    if health_data:
        confidence_points += 10

    if reliability_data:
        confidence_points += 10

    if (
        maintenance_history
        or repair_history
        or work_orders
    ):
        confidence_points += 10

    scanner_confidence = min(
        confidence_points,
        100
    )

    # ------------------------------------------------------
    # PROFILE
    # ------------------------------------------------------

    profile = {

        "scanner_version":
            "v3.5.6",

        "scanner_status":
            "Intelligent Profile Generated",

        "scanner_confidence":
            scanner_confidence,

        "equipment": {

            "equipment_id":
                equipment_data.get(
                    "equipment_id",
                    equipment_id
                ),

            "name":
                equipment_data.get(
                    "name"
                ),

            "category":
                equipment_data.get(
                    "category"
                ),

            "manufacturer":
                equipment_data.get(
                    "manufacturer"
                ),

            "model":
                equipment_data.get(
                    "model"
                ),

            "serial_number":
                equipment_data.get(
                    "serial_number"
                ),

            "location":
                equipment_data.get(
                    "location"
                ),

            "status":
                equipment_data.get(
                    "status"
                ),

            "installation_date":
                equipment_data.get(
                    "installation_date"
                )

        },

        "health": {

            "health_score":
                health_score,

            "health_status":
                health_status,

            "risk_score":
                risk_score,

            "risk_level":
                risk_level,

            "trend":
                trend

        },

        "reliability": {

            "reliability_score":
                reliability_score,

            "reliability_status":
                reliability_status,

            "mtbf_days":
                reliability_data.get(
                    "mtbf_days"
                ),

            "mttr_days":
                reliability_data.get(
                    "mttr_days"
                ),

            "failure_frequency":
                reliability_data.get(
                    "failure_frequency"
                )

        },

        "maintenance": {

            "status":
                maintenance_status,

            "maintenance_count":
                maintenance_count,

            "last_maintenance":
                last_maintenance,

            "recent_history":
                maintenance_history[-5:]

        },

        "repairs": {

            "total_repairs":
                repair_count,

            "recent_repairs":
                repair_history[-5:]

        },

        "work_orders": {

            "total":
                len(work_orders),

            "open":
                len(open_work_orders),

            "active_work_orders":
                open_work_orders

        },

        "risk_factors":
            risk_factors,

        "recommended_action":
            recommended_action

    }

    return {

        "message":
            "Intelligent equipment scanner profile generated successfully.",

        "profile":
            profile
    }


# ==========================================================
# INTELLIGENT SCANNER — QUICK LOOKUP
# FuElectric-AI v3.5.6
# ==========================================================

@app.get("/scanner/{equipment_id}")
def scanner_lookup(
    equipment_id: str
):

    equipment_id = equipment_id.strip()

    if not equipment_id:

        raise HTTPException(
            status_code=400,
            detail="Equipment ID is required."
        )

    equipment = get_equipment_by_id(
        equipment_id
    )

    if equipment is None:

        raise HTTPException(
            status_code=404,
            detail="Equipment not found."
        )

    return {
        "message":
            "Equipment identified successfully.",

        "equipment_id":
            equipment_id,

        "scanner_action":
            "View intelligent equipment profile",

        "profile_endpoint":
            f"/scanner/profile/{equipment_id}"
    }

# ==========================================================
# EQUIPMENT RELIABILITY ANALYTICS — FuElectric-AI v3.5.3
# ==========================================================

@app.get("/reliability")
def reliability_analytics():

    return {
        "message":
            "Equipment reliability analytics generated successfully.",

        "equipment":
            get_all_equipment_reliability()
    }


# ==========================================================
# RELIABILITY SUMMARY
# ==========================================================

@app.get("/reliability/summary")
def reliability_summary():

    return {
        "message":
            "Reliability summary generated successfully.",

        "summary":
            get_reliability_summary()
    }

# ==========================================================
# RELIABILITY ALERTS — FuElectric-AI v3.5.3
# ==========================================================

def get_reliability_alerts():
    """Return equipment that requires a reliability alert."""
    return get_deteriorating_equipment()


@app.get("/reliability/alerts")
def reliability_alerts():

    return get_reliability_alerts()

# ==========================================================
# RELIABILITY RANKING
# ==========================================================

@app.get("/reliability/ranking")
def reliability_ranking():

    return {
        "message":
            "Equipment reliability ranking generated successfully.",

        "ranking":
            get_reliability_ranking()
    }

# ==========================================================
# SINGLE EQUIPMENT RELIABILITY
# FuElectric-AI v3.5.3
# ==========================================================

@app.get("/equipment/{equipment_id}/reliability")
def equipment_reliability(
    equipment_id: str
):

    reliability = get_equipment_reliability(
        equipment_id
    )

    if reliability is None:

        raise HTTPException(
            status_code=404,
            detail="Equipment not found."
        )

    return {
        "message":
            "Equipment reliability analytics generated successfully.",

        **reliability
    }

# ==========================================================
# RELIABILITY ANALYTICS DASHBOARD
# FuElectric-AI v3.5.3
# ==========================================================

@app.get("/reliability/analytics")
def reliability_analytics_dashboard():

    summary = get_reliability_summary()

    return {
        "message":
            "Reliability analytics generated successfully.",

        "total_equipment":
            summary.get("total_equipment", 0),

        "average_reliability":
            summary.get(
                "average_reliability_score",
                0
            ),

        "highly_reliable":
            summary.get("highly_reliable", 0),

        "reliable":
            summary.get("reliable", 0),

        "moderate":
            summary.get("moderate", 0),

        "low_reliability":
            summary.get("low_reliability", 0),

        "average_mtbf_days":
            summary.get("average_mtbf_days"),

        "average_mttr_days":
            summary.get("average_mttr_days"),

        "equipment_with_recent_failures":
            summary.get(
                "equipment_with_recent_failures",
                0
            ),

        "equipment_with_high_failure_frequency":
            summary.get(
                "equipment_with_high_failure_frequency",
                0
            ),

        "equipment_with_pending_repairs":
            summary.get(
                "equipment_with_pending_repairs",
                0
            ),

        "most_reliable_equipment":
            summary.get("most_reliable_equipment"),

        "least_reliable_equipment":
            summary.get("least_reliable_equipment"),

        "ranking":
            get_reliability_ranking()
    }

# ==========================================================
# HISTORICAL EQUIPMENT CONDITION INTELLIGENCE
# FuElectric-AI v3.5.4
# ==========================================================

from datetime import datetime, date
from dateutil.relativedelta import relativedelta


def get_equipment_health_history(
    equipment_id: str,
    months: int = 3
):
    """
    Analyze historical equipment condition.

    FuElectric-AI v3.5.4

    Returns:
    - Monthly equipment condition
    - Health score
    - Risk score
    - Overall trend
    - Overview
    - Immediate actions
    - Recommendations
    """

    # ------------------------------------------------------
    # Validate months
    # ------------------------------------------------------

    try:
        months = int(months)
    except (TypeError, ValueError):

        months = 3

    months = max(
        1,
        min(months, 24)
    )

    # ------------------------------------------------------
    # DATABASE CONNECTION
    # ------------------------------------------------------

    conn = get_connection()

    try:

        # --------------------------------------------------
        # GET EQUIPMENT
        # --------------------------------------------------

        equipment = conn.execute("""
            SELECT
                equipment_id,
                name,
                category,
                status,
                installation_date,
                last_maintenance
            FROM equipment
            WHERE equipment_id = ?
        """, (equipment_id,)).fetchone()

        if equipment is None:
            return None

        equipment = dict(equipment)

        # --------------------------------------------------
        # GET REPAIR HISTORY
        # --------------------------------------------------

        repairs = conn.execute("""
            SELECT
                repair_id,
                repair_date,
                repair_status,
                fault_reported
            FROM repairs
            WHERE equipment_id = ?
            ORDER BY repair_date ASC
        """, (equipment_id,)).fetchall()

        repairs = [
            dict(row)
            for row in repairs
        ]

        # --------------------------------------------------
        # GET MAINTENANCE HISTORY
        # --------------------------------------------------

        maintenance = conn.execute("""
            SELECT
                id,
                maintenance_date,
                maintenance_type,
                status
            FROM maintenance_history
            WHERE equipment_id = ?
            ORDER BY maintenance_date ASC
        """, (equipment_id,)).fetchall()

        maintenance = [
            dict(row)
            for row in maintenance
        ]

    finally:

        conn.close()

    # ======================================================
    # DATE HELPERS
    # ======================================================

    today = date.today()

    first_month = (
        today.replace(day=1)
        - relativedelta(months=months - 1)
    )

    def parse_date(value):

        if not value:
            return None

        try:

            return datetime.strptime(
                str(value)[:10],
                "%Y-%m-%d"
            ).date()

        except (ValueError, TypeError):

            return None

    # ======================================================
    # BUILD MONTHS
    # ======================================================

    monthly_history = []

    for index in range(months):

        month_date = (
            first_month
            + relativedelta(months=index)
        )

        year = month_date.year
        month = month_date.month

        month_name = month_date.strftime(
            "%B %Y"
        )

        # --------------------------------------------------
        # MONTHLY REPAIRS
        # --------------------------------------------------

        month_repairs = []

        for repair in repairs:

            repair_date = parse_date(
                repair.get("repair_date")
            )

            if (
                repair_date
                and repair_date.year == year
                and repair_date.month == month
            ):

                month_repairs.append(
                    repair
                )

        # --------------------------------------------------
        # MONTHLY MAINTENANCE
        # --------------------------------------------------

        month_maintenance = []

        for record in maintenance:

            maintenance_date = parse_date(
                record.get("maintenance_date")
            )

            if (
                maintenance_date
                and maintenance_date.year == year
                and maintenance_date.month == month
            ):

                month_maintenance.append(
                    record
                )

        repair_count = len(
            month_repairs
        )

        maintenance_count = len(
            month_maintenance
        )

        # --------------------------------------------------
        # MONTHLY HEALTH
        #
        # Base = 100
        # Repairs reduce health
        # Maintenance supports health
        # --------------------------------------------------

        health_score = 100

        health_score -= (
            repair_count * 10
        )

        health_score += (
            maintenance_count * 2
        )

        health_score = max(
            0,
            min(
                100,
                health_score
            )
        )

        risk_score = (
            100 - health_score
        )

        # --------------------------------------------------
        # CONDITION
        # --------------------------------------------------

        if (
            repair_count == 0
            and maintenance_count == 0
        ):

            condition = "No Recorded Activity"

        elif health_score >= 90:

            condition = "Healthy"

        elif health_score >= 75:

            condition = "Stable"

        elif health_score >= 50:

            condition = "At Risk"

        else:

            condition = "Critical"

        # --------------------------------------------------
        # MONTHLY TREND SIGNAL
        # --------------------------------------------------

        if repair_count > maintenance_count:

            monthly_trend = "Deteriorating"

        elif maintenance_count > repair_count:

            monthly_trend = "Improving"

        elif (
            repair_count == 0
            and maintenance_count == 0
        ):

            monthly_trend = "No Data"

        else:

            monthly_trend = "Stable"

        monthly_history.append({

            "month":
                month_name,

            "year":
                year,

            "month_number":
                month,

            "health_score":
                health_score,

            "risk_score":
                risk_score,

            "condition":
                condition,

            "trend":
                monthly_trend,

            "repair_count":
                repair_count,

            "maintenance_count":
                maintenance_count,

            "repairs":
                month_repairs,

            "maintenance":
                month_maintenance

        })

    # ======================================================
    # OVERALL TREND
    # ======================================================

    active_months = [
        item
        for item in monthly_history
        if item["trend"] != "No Data"
    ]

    if not active_months:

        overall_trend = "Insufficient Historical Data"

    else:

        deteriorating = sum(
            1
            for item in active_months
            if item["trend"] == "Deteriorating"
        )

        improving = sum(
            1
            for item in active_months
            if item["trend"] == "Improving"
        )

        if deteriorating > improving:

            overall_trend = "Deteriorating"

        elif improving > deteriorating:

            overall_trend = "Improving"

        else:

            overall_trend = "Stable"

    # ======================================================
    # CURRENT HEALTH
    # ======================================================

    current_data = None

    for item in reversed(monthly_history):

        if item["trend"] != "No Data":

            current_data = item
            break

    if current_data:

        current_health = (
            current_data["health_score"]
        )

        current_risk = (
            current_data["risk_score"]
        )

    else:

        current_health = None
        current_risk = None

    # ======================================================
    # TOTAL ACTIVITY
    # ======================================================

    total_repairs = sum(
        item["repair_count"]
        for item in monthly_history
    )

    total_maintenance = sum(
        item["maintenance_count"]
        for item in monthly_history
    )

    # ======================================================
    # OVERVIEW
    # ======================================================

    if not active_months:

        overview = (
            f"No recorded repair or maintenance activity "
            f"was found for {equipment['name']} during "
            f"the requested {months}-month period. "
            f"Historical condition cannot yet be "
            f"reliably established."
        )

    elif overall_trend == "Deteriorating":

        overview = (
            f"{equipment['name']} shows a deteriorating "
            f"condition trend over the requested period. "
            f"The equipment recorded {total_repairs} repair "
            f"event(s) and {total_maintenance} maintenance "
            f"event(s). Recent repair activity indicates "
            f"that increased monitoring is warranted."
        )

    elif overall_trend == "Improving":

        overview = (
            f"{equipment['name']} shows an improving "
            f"condition trend. Maintenance activity is "
            f"currently outweighing repair activity. "
            f"Continue the current maintenance strategy."
        )

    else:

        overview = (
            f"{equipment['name']} shows a generally stable "
            f"condition based on the available historical "
            f"records."
        )

    # ======================================================
    # IMMEDIATE ACTIONS
    # ======================================================

    immediate_actions = []

    if overall_trend == "Deteriorating":

        immediate_actions.append(
            "Inspect the equipment for recurring or unresolved faults."
        )

        immediate_actions.append(
            "Increase equipment monitoring frequency."
        )

        immediate_actions.append(
            "Schedule preventive maintenance."
        )

    elif overall_trend == "Improving":

        immediate_actions.append(
            "Continue the current maintenance strategy."
        )

        immediate_actions.append(
            "Monitor the equipment for recurrence of faults."
        )

    elif overall_trend == "Stable":

        immediate_actions.append(
            "Continue routine equipment monitoring."
        )

        immediate_actions.append(
            "Maintain the planned preventive maintenance schedule."
        )

    else:

        immediate_actions.append(
            "Begin recording equipment condition and maintenance activity."
        )

        immediate_actions.append(
            "Collect additional operational history before making major reliability decisions."
        )

    # ======================================================
    # RECOMMENDATIONS
    # ======================================================

    recommendations = []

    if total_repairs >= 2:

        recommendations.append(
            "Investigate recurring repair causes and identify the root cause."
        )

    if total_maintenance == 0:

        recommendations.append(
            "Establish a preventive maintenance schedule."
        )

    elif total_maintenance < total_repairs:

        recommendations.append(
            "Increase preventive maintenance activity relative to corrective repairs."
        )

    if overall_trend == "Deteriorating":

        recommendations.append(
            "Prioritize this equipment for maintenance planning."
        )

    elif overall_trend == "Improving":

        recommendations.append(
            "Continue the maintenance practices associated with the improvement."
        )

    else:

        recommendations.append(
            "Continue monitoring historical health indicators."
        )

    # ======================================================
    # RETURN
    # ======================================================

    return {

        "equipment_id":
            equipment["equipment_id"],

        "equipment_name":
            equipment["name"],

        "category":
            equipment["category"],

        "equipment_status":
            equipment["status"],

        "period_months":
            months,

        "current_health_score":
            current_health,

        "current_risk_score":
            current_risk,

        "overall_trend":
            overall_trend,

        "total_repairs":
            total_repairs,

        "total_maintenance":
            total_maintenance,

        "monthly_history":
            monthly_history,

        "overview":
            overview,

        "immediate_actions":
            immediate_actions,

        "recommendations":
            recommendations
    }

# ==========================================================
# FRONTEND — serve dashboard on Railway
# API routes are defined above; this catch-all mount is intentionally last.
# ==========================================================

BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"

if FRONTEND_DIR.exists():
    app.mount(
        "/",
        StaticFiles(directory=str(FRONTEND_DIR), html=True),
        name="frontend"
    )

# ==========================================================
# v3.5.4 — HEALTH & RISK HISTORY API
# ==========================================================

@app.get("/health-risk-history/{equipment_id}")
def health_risk_history(
    equipment_id: str,
    months: int = 3
):

    equipment = get_equipment_by_id(
        equipment_id
    )

    if equipment is None:

        raise HTTPException(
            status_code=404,
            detail="Equipment not found."
        )

    history = get_equipment_health_history(
        equipment_id,
        months
    )

    if history is None:

        raise HTTPException(
            status_code=404,
            detail="Historical health data not found."
        )

    return history