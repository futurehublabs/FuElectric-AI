from pydantic import BaseModel, Field


class Maintenance(BaseModel):
    equipment_id: str = Field(..., min_length=3)
    maintenance_date: str
    maintenance_type: str
    description: str
    technician: str
    cost: float = 0
    status: str = "Completed"