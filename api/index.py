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

@app.get("/static/reports/{report_id}.pdf")
def get_pdf_report(report_id: str):
    import hashlib
    import logging
    from fastapi.responses import FileResponse
    import urllib.request
    
    _DATA_ROOT = "/tmp"
    pdf_path = f"{_DATA_ROOT}/inspections/reports/{report_id}.pdf"
    
    # If the PDF already exists on disk, serve it immediately
    if os.path.exists(pdf_path):
        return FileResponse(pdf_path, media_type="application/pdf", filename=f"{report_id}.pdf")
        
    # Otherwise, rebuild it dynamically from database record
    db = _get_db()
    record = db.get_record_by_report_id(report_id)
    if not record:
        raise HTTPException(status_code=404, detail="Inspection record not found")
        
    try:
        from src.reporting.reporter import WeldReporter
        pdf_dir = f"{_DATA_ROOT}/inspections/reports"
        os.makedirs(pdf_dir, exist_ok=True)
        
        # In serverless, the annotated image is not stored locally.
        # We download it from the ML backend if it exists.
        annotated_storage_path = f"{_DATA_ROOT}/inspections/annotated/{report_id}.jpg"
        if not os.path.exists(annotated_storage_path):
            os.makedirs(os.path.dirname(annotated_storage_path), exist_ok=True)
            ml_url = os.environ.get("ML_BACKEND_URL", "http://localhost:8000")
            if ml_url.endswith("/"):
                ml_url = ml_url[:-1]
            remote_img_url = f"{ml_url}/static/annotated/{report_id}.jpg"
            try:
                # Set a short timeout for downloading the image
                req = urllib.request.Request(remote_img_url, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req, timeout=5) as response, open(annotated_storage_path, "wb") as out_file:
                    out_file.write(response.read())
            except Exception as dl_err:
                logging.warning(f"Could not download remote annotated image from {remote_img_url}: {dl_err}")
                # Fallback to copy placeholder or raw image if exists
                raw_local = f"{_DATA_ROOT}/raw/{report_id}.jpg"
                if os.path.exists(raw_local):
                    import shutil
                    shutil.copy(raw_local, annotated_storage_path)

        # Retrieve vision cache to construct findings
        model_name = os.path.basename(record.model_used)
        cache_key = hashlib.sha256(f"{record.image_id}_{model_name}".encode('utf-8')).hexdigest()
        
        detections = []
        try:
            cached = db.get_vision_cache(cache_key)
            if cached and "detections" in cached:
                detections = cached["detections"]
        except Exception as cache_err:
            logging.warning(f"Failed to query vision cache: {cache_err}")

        findings = []
        for d in detections:
            # d is a dict: type, confidence, bbox, dims
            dims = d.get("dims", {})
            mm_len = dims.get("length", 0.0) * 0.1
            status = "Accept"
            d_type_lower = d.get("type", "").lower()
            if d_type_lower in ["crack", "lack_of_fusion", "lack of fusion"]:
                status = "Reject"
            elif d_type_lower in ["porosity", "pora", "hidden_porosity", "pora-skrytaya"]:
                if mm_len > (record.thickness * 0.333):
                    status = "Reject"
            elif d_type_lower in ["inclusion", "vkljuchenie"]:
                if mm_len > (record.thickness * 0.5):
                    status = "Reject"
            
            findings.append({
                "type": str(d.get("type", "")).encode('latin-1', 'replace').decode('latin-1'),
                "size_mm": mm_len,
                "status": status
            })
            
        report_data = {
            "report_id": record.report_id,
            "thickness": record.thickness,
            "material": str(record.material).encode('latin-1', 'replace').decode('latin-1'),
            "regulatory_code": str(record.regulatory_code).encode('latin-1', 'replace').decode('latin-1'),
            "client_spec": str(record.client_spec).encode('latin-1', 'replace').decode('latin-1'),
            "other_standard": str(record.other_standard).encode('latin-1', 'replace').decode('latin-1'),
            "app_type": str(record.app_type).encode('latin-1', 'replace').decode('latin-1'),
            "usage": str(record.usage).encode('latin-1', 'replace').decode('latin-1'),
            "findings": findings,
            "agent_reasoning": record.details,
            "performer_comments": record.performer_comments,
            "supervisor_comments": record.supervisor_comments,
            "status_state": record.status_state
        }
        
        reporter = WeldReporter()
        reporter.create_report(pdf_path, report_data, annotated_storage_path)
        logging.info(f"Dynamically generated PDF report for {report_id} on Vercel at {pdf_path}")
        
        if os.path.exists(pdf_path):
            return FileResponse(pdf_path, media_type="application/pdf", filename=f"{report_id}.pdf")
        else:
            raise HTTPException(status_code=500, detail="Failed to generate PDF file on Vercel disk")
            
    except Exception as e:
        logging.error(f"Failed to dynamically generate PDF report on Vercel for {report_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF on Vercel: {str(e)}")

