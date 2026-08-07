from fastapi import FastAPI, HTTPException

from models.equipment import Equipment
from models.diagnosis import DiagnosisRequest
from models.maintenance import Maintenance
from models.technician import Technician
from models.repair import Repair
from pydantic import BaseModel, Field

from database.database import (
    create_tables,

    add_equipment,
    get_all_equipment,
    get_equipment_by_id,
    update_equipment,
    delete_equipment,
    search_equipment,

    add_maintenance,
    get_maintenance_history,

    add_technician,
    get_all_technicians,

    add_repair,
    get_repairs
)

from data import HOME_APPLIANCE_FAULTS

create_tables()

app  = FastAPI( 
    title="FuElectric-AI",
    version="2.4",
    description="AI Equipment Diagnosis API",
)
@app.get("/")
def home():
    return {
        "message": "Welcome to FuElectric-AI 2.0 "

    }


@app.get("/health")
def health():
    return {
        "status": "Running",
        "system": "FuElectric-AI"
    }
@app.post("/diagnose")
def diagnose():
    return{"message":"diagnosis endpoint works"}
@app.post("/equipment")
def register_equipment(equipment: Equipment):
    add_equipment(equipment)

    return{ 
        "message": "Equipment registered successfully",
        "equipment": equipment
    }
@app.get("/equipment")
def list_equipment():
    return get_all_equipment()  
from pydantic import BaseModel, Field



def diagnose(request: DiagnosisRequest):
    equipment = request.equipment.lower()
    fault = request.fault.lower()

    if equipment not in HOME_APPLIANCE_FAULTS:
        raise HTTPException(status_code=404, detail="Equipment not found")

    if fault not in HOME_APPLIANCE_FAULTS:
        raise HTTPException(
            status_code=404,
            detail="Fault not found in knowledge base."
              )

    diagnosis = HOME_APPLIANCE_FAULTS[fault]

    return {
        "equipment": equipment,
        "fault":  request.fault,
        **diagnosis
    }

@app.get("/equipment/{equipment_id}")
def get_equipment(equipment_id: str):

    equipment = get_equipment_by_id(equipment_id)

    if not equipment:
        raise HTTPException(
            status_code=404,
             detail="Equipment not found."
             )

    return equipment

@app.put("/equipment/{equipment_id}")
def update_equipment_endpoint (
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

    return{

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


@app.post("/maintenance")
def register_maintenance(record: Maintenance):

    add_maintenance(record)

    return {
        "message": "Maintenance record added successfully.",
        "record": record
    }


@app.get("/maintenance/{equipment_id}")
def maintenance_history(equipment_id: str):

    history = get_maintenance_history(equipment_id)

    if not history:
        raise HTTPException(
            status_code=404,
            detail="No maintenance history found."
        )

    return history

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

@app.post("/repair")
def register_repair(repair: Repair):

    add_repair(repair)

    return {
        "message": "Repair record added successfully.",
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
# UPDATE EQUIPMENT
# ==========================================================

@app.put("/equipment/{equipment_id}")
def edit_equipment(
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


# ==========================================================
# DELETE EQUIPMENT
# ==========================================================

@app.delete("/equipment/{equipment_id}")
def remove_equipment(equipment_id: str):

    deleted = delete_equipment(equipment_id)

    if not deleted:
        raise HTTPException(
            status_code=404,
            detail="Equipment not found."
        )

    return {
        "message": "Equipment deleted successfully."
    }


# ==========================================================
# SEARCH EQUIPMENT
# ==========================================================

@app.get("/equipment/search/{keyword}")
def search(keyword: str):

    results = search_equipment(keyword)

    if not results:
        raise HTTPException(
            status_code=404,
            detail="No equipment found."
        )

    return results

# ==========================================================
# MAINTENANCE ENDPOINTS
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
# TECHNICIAN ENDPOINTS
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
# REPAIR ENDPOINTS
# ==========================================================

@app.post("/repair")
def register_repair(repair: Repair):

    # Check that the equipment exists
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
