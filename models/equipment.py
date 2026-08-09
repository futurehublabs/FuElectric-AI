from pydantic import BaseModel



class Equipment(BaseModel):
    equipment_id: str
    name: str
    category: str
    manufacturer: str
    model: str
    serial_number: str
    location: str
    installation_date: str