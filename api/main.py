from fastapi import FastAPI

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
