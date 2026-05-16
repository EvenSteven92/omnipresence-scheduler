"""
Stub backend - this project is frontend-only (TanStack Start with mock data).
This stub exists to satisfy supervisor configuration.
"""
from fastapi import FastAPI

app = FastAPI()


@app.get("/api/")
async def root():
    return {"message": "Frontend-only app - no backend endpoints required."}


@app.get("/api/health")
async def health():
    return {"status": "ok"}
