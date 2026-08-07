from pydantic import BaseModel, Field


class Repair(BaseModel):
    repair_id: str = Field(..., min_length=3)
    equipment_id: str
    fault_reported: str
    diagnosis: str
    action_taken: str
    technician_id: str
    repair_date: str
    repair_status: str = "Pending"