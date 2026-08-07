from typing import List
from pydantic import BaseModel

class DiagnosisResult(BaseModel):
    severity: str
    risk_level: str
    is_emergency: bool

    causes: List[str]
    recommendations: List[str]

    repair_time: str

    tools: List[str]
    spare_parts: List[str]

    safety_precautions: List[str]
    preventive_maintenance: List[str]

    skill_level: str