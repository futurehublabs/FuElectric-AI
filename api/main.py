from fastapi import FastAPI, HTTPException

from models.equipment import Equipment
from models.equipment import DiagnosisRequest
from database.database import(
 create_tables,
add_equipment,
get_all_equipment,
get_equipment_by_id,
update_equipment
)
from data import HOME_APPLIANCE_FAULTS

create_tables()

app  = FastAPI( 
    title="FuElectric-AI",
    version="2.0",
    description="AI Equipment Diagnosis API",
)
@app.get("/")
def home():
    return {
        "message": "Welcome to FuElectric-AI 2.0 "

    }

equipment_database = []

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
