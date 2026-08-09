from pydantic import BaseModel
from typing import Optional


class WorkOrder(BaseModel):
    work_order_id: str
    equipment_id: str
    technician_id: Optional[str] = None

    work_type: str
    priority: str = "Medium"

    description: str

    scheduled_date: Optional[str] = None
    due_date: Optional[str] = None
    completed_date: Optional[str] = None

    status: str = "Open"

    technician_notes: Optional[str] = None

    created_at: Optional[str] = None