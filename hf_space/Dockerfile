# HuggingFace Space — WeldVision AI Inspector
# Full ML backend: torch + ultralytics + transformers + opencv
# Model weights pulled from HF Hub at build time

FROM python:3.11-slim

# System deps for opencv + torch CPU
RUN apt-get update && apt-get install -y \
    libglib2.0-0 libsm6 libxext6 libxrender-dev \
    libgomp1 libgl1-mesa-glx wget git curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps (full stack)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY src/ ./src/

# Create weights directories
RUN mkdir -p weights/hf_weld_rtdetr_final

# Copy YOLO weights (small, in repo)
COPY weights/m60.pt ./weights/m60.pt

# Copy RT-DETR config files (no safetensors — pulled from HF Hub below)
COPY weights/hf_weld_rtdetr_final/config.json ./weights/hf_weld_rtdetr_final/
COPY weights/hf_weld_rtdetr_final/preprocessor_config.json ./weights/hf_weld_rtdetr_final/

# Download model.safetensors from HF Hub at build time
# Baked into the image so no runtime download delay
ARG HF_TOKEN
RUN python -c "\
import os; \
from huggingface_hub import hf_hub_download; \
import shutil; \
token = os.environ.get('HF_TOKEN', ''); \
path = hf_hub_download( \
    repo_id='anjanid/RT-DETR-weld-trained', \
    filename='model.safetensors', \
    token=token if token else None \
); \
shutil.copy(path, 'weights/hf_weld_rtdetr_final/model.safetensors'); \
print('model.safetensors downloaded successfully')"

# Pre-warm: load models once at build time to cache torch internals
RUN python -c "\
import torch; \
from ultralytics import YOLO; \
model = YOLO('weights/m60.pt'); \
print('YOLO model pre-loaded successfully')" || echo "Pre-warm skipped"

# HuggingFace Spaces requires port 7860
EXPOSE 7860

# Environment
ENV PYTHONUNBUFFERED=1
ENV VERCEL=0

# Start FastAPI
CMD ["uvicorn", "src.api.server:app", "--host", "0.0.0.0", "--port", "7860", "--workers", "1"]
