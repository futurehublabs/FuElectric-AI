from pydantic import BaseModel

class DiagnosisRequest(BaseModel):
    equipment: str
    fault: str