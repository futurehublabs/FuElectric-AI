from pydantic import BaseModel, Field


class Technician(BaseModel):
    technician_id: str = Field(..., min_length=3)
    name: str
    specialization: str
    phone: str | None = None
    department: str | None = None
    experience_years: int = 0