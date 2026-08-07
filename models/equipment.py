from pyexpat import model

from pydantic import BaseModel

class DiagnosisRequest(BaseModel):
    equipment: str
    fault: str
class Equipment(BaseModel):
    equipment_id: str
    name: str
    category: str
    manufacturer: str
    model: str
    serial_number: str
    location: str
    installation_date: str