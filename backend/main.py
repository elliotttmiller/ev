from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import uvicorn
#from google.cloud import vision # Uncomment and configure for real OCR
from vireo_engine import run_vireo_analysis

app = FastAPI(title="Vireo AI Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Prize(BaseModel):
    count: int
    value: float

class GameState(BaseModel):
    game_name: str
    ticket_price: float
    tickets_remaining: int
    prizes: List[Prize]

class AnalysisRequest(BaseModel):
    game_state: GameState
    user_bankroll: float

@app.post("/estimate_tickets")
async def estimate_tickets_endpoint(
    fill_ratio: float = Form(...),
    total_tickets: int = Form(...)
):
    if not 0.0 <= fill_ratio <= 1.0:
        raise HTTPException(status_code=400, detail="Fill ratio must be between 0 and 1.")
    # Enhanced estimation logic
    correction_factor = 0.98  # Account for packing density, calibration
    estimated = int(round(fill_ratio * total_tickets * correction_factor))
    estimated = max(0, min(estimated, total_tickets))
    # Optionally, log for calibration
    print(f"[ESTIMATE] fill_ratio={fill_ratio}, total_tickets={total_tickets}, estimated={estimated}")
    return {"estimated_tickets": estimated}

@app.post("/ocr_prize_board", response_model=GameState)
async def ocr_prize_board_endpoint(image: UploadFile = File(...)):
    # Placeholder for real OCR logic
    print(f"Received image '{image.filename}' for OCR processing.")
    parsed_game_state = {
        "game_name": "Golden Treasures",
        "ticket_price": 2.0,
        "tickets_remaining": 2500,
        "prizes": [
            {"count": 4, "value": 500.0},
            {"count": 10, "value": 100.0},
            {"count": 50, "value": 20.0},
            {"count": 200, "value": 5.0}
        ]
    }
    return parsed_game_state

@app.post("/run_analysis")
async def run_analysis_endpoint(request: AnalysisRequest):
    try:
        result = run_vireo_analysis(request.game_state.dict(), request.user_bankroll)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=5000, reload=True)
