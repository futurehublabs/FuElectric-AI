from fastapi import FastAPI, HTTPException
# from models.equipment import DiagnosisRequest
# from data import HOME_APPLIANCE_FAULTS

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

@app.get("/health")
def health():
    return {
        "status": "Running",
        "system": "FuElectric-AI"
    }
@app.post("/diagnose")
def diagnose():
    return{"message":"diagnosis endpoint works"}

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

