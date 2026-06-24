"""
Vercel-safe FastAPI entrypoint — lightweight DB & reporting layer.

What runs here (on Vercel, ~80 MB):
  GET  /health            → liveness probe
  GET  /license           → MIT license text
  GET  /records           → fetch all inspection records from DynamoDB
  POST /records/{id}/feedback → submit performer / supervisor review
  GET  /audit             → fetch audit logs from DynamoDB
  POST /inspect           → 503 — ML inference too large for Vercel Lambda
                            (point NEXT_PUBLIC_API_URL at your ML service for this)

What does NOT run here (needs full backend, ~5 GB):
  ML inference — torch, ultralytics, RT-DETR, YOLO, opencv
  Run locally:  uvicorn src.api.server:app --reload --port 8000
"""

import os
import sys

# Ensure project root is on PYTHONPATH so src.* imports resolve
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi import FastAPI, Header, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="WeldVision AI — DB & Report API",
    version="1.0.0",
    description="Lightweight Vercel deployment. ML inference runs on the full backend.",
)

# ── CORS ─────────────────────────────────────────────────────────────────────
# Allow the Next.js frontend (any Vercel domain) to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── DB factory (DynamoDB only — no heavy SQLite/Mongo fallback on Vercel) ────
def _get_db():
    """
    Returns DynamoDBAdapter. Credential resolution order:
      1. Vercel Marketplace OIDC (VERCEL_OIDC_TOKEN + AWS_ROLE_ARN)
      2. Static IAM keys (AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY)
      3. Default boto3 chain (~/.aws / instance role)
    Raises RuntimeError with a clear message if table is unreachable.
    """
    from src.infrastructure.adapters.dynamo_adapter import DynamoDBAdapter
    return DynamoDBAdapter()


# ─────────────────────────────────────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    """Liveness probe — returns immediately, no DB call."""
    return {
        "status": "ok",
        "service": "WeldVision AI Backend (Vercel)",
        "ml_inference": "external — set NEXT_PUBLIC_API_URL to your ML service",
    }


@app.get("/license")
def get_license():
    """MIT License text for open-source compliance."""
    try:
        license_path = os.path.join(os.path.dirname(__file__), "..", "LICENSE")
        with open(license_path) as f:
            return {"license": f.read()}
    except Exception:
        return {"license": "MIT License — Copyright 2026 WeldVision AI / Centauri Research"}


@app.get("/records")
def get_records(x_user_role: str = Header(default="Inspector")):
    """Fetch all NDT inspection records from DynamoDB."""
    try:
        db = _get_db()
        db.log_audit_event({
            "user_id": x_user_role,
            "action": "FETCH_RECORDS",
            "details": f"User '{x_user_role}' fetched inspection records.",
        })
        records = db.get_records()
        return {"status": "success", "records": [r.model_dump() for r in records]}
    except Exception as e:
        return JSONResponse(status_code=503, content={"status": "error", "message": str(e)})


@app.post("/records/{report_id}/feedback")
def submit_feedback(
    report_id: str,
    comments: str = Form(...),
    role: str = Form(...),
    x_user_role: str = Header(default="Inspector"),
):
    """
    Submit performer remarks or supervisor review.
    Updates workflow state: 0 (Inspected) → 1 (Performer) → 2 (Supervisor).
    """
    if role.lower() not in ("performer", "supervisor"):
        raise HTTPException(status_code=400, detail="Role must be 'performer' or 'supervisor'.")
    try:
        db = _get_db()
        record = db.get_record_by_report_id(report_id)
        if not record:
            raise HTTPException(status_code=404, detail=f"Report {report_id} not found.")

        if role.lower() == "performer":
            record.performer_comments = comments
            record.status_state = 1
        else:
            record.supervisor_comments = comments
            record.status_state = 2

        db.update_record(record)
        db.log_audit_event({
            "user_id": x_user_role,
            "action": "SUBMIT_FEEDBACK",
            "details": f"User '{x_user_role}' submitted {role} feedback for {report_id}.",
        })
        return {
            "status": "success",
            "report_id": report_id,
            "status_state": record.status_state,
            "performer_comments": record.performer_comments,
            "supervisor_comments": record.supervisor_comments,
        }
    except HTTPException:
        raise
    except Exception as e:
        return JSONResponse(status_code=503, content={"status": "error", "message": str(e)})


@app.get("/audit")
def get_audit_logs(x_user_role: str = Header(default="Inspector")):
    """Fetch SOC-2 style audit trail from DynamoDB."""
    try:
        db = _get_db()
        return {"status": "success", "logs": db.get_audit_logs()}
    except Exception as e:
        return JSONResponse(status_code=503, content={"status": "error", "message": str(e)})


@app.post("/records/clear")
def clear_records(x_user_role: str = Header(default="Inspector")):
    """Clear all records. Admin / Auditor only."""
    if x_user_role not in ("Admin", "Auditor"):
        raise HTTPException(status_code=403, detail="Role unauthorized.")
    return JSONResponse(
        status_code=501,
        content={"status": "error", "message": "clear_records not implemented on Vercel deployment."}
    )


@app.post("/inspect")
def inspect_stub():
    """
    ML inference is too large for Vercel Lambda (5.4 GB vs 500 MB limit).
    Run the full backend locally:
      uvicorn src.api.server:app --reload --port 8000
    Then set NEXT_PUBLIC_API_URL=http://localhost:8000 in frontend .env.local
    """
    ml_url = os.environ.get("ML_BACKEND_URL", "http://localhost:8000")
    return JSONResponse(
        status_code=503,
        content={
            "status": "ml_unavailable",
            "message": (
                "ML inference (YOLO/RT-DETR) requires the full backend. "
                f"Point your frontend at the ML service: {ml_url}"
            ),
            "ml_backend_url": ml_url,
        },
    )
