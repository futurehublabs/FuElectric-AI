from fastapi import FastAPI, HTTPException

from models.equipment import Equipment
from models.equipment import DiagnosisRequest
from database.database import(
    create_tables,
    add_equipment,
    get_all_equipment,
    get_equipment_by_id,
    update_equipment,
    delete_equipment,
    search_equipment,
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
from pydantic import BaseModel, Field


class Equipment(BaseModel):

    equipment_id: str = Field(
        min_length=3,
        max_length=20
    )

    name: str = Field(
        min_length=2
    )

    category: str = Field(
        min_length=2
    )

    manufacturer: str | None = None
    model: str | None = None
    serial_number: str | None = None

    location: str = Field(
        min_length=2
    )

    installation_date: str | None = None

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

from pydantic import BaseModel, Field


class Equipment(BaseModel):

    equipment_id: str = Field(
        min_length=3,
        max_length=20
    )

    name: str = Field(
        min_length=2
    )

    category: str = Field(
        min_length=2
    )

    manufacturer: str | None = None
    model: str | None = None
    serial_number: str | None = None

    location: str = Field(
        min_length=2
    )

    installation_date: str | None = None
