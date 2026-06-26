---
title: WeldVision AI Inspector
emoji: 🔧
colorFrom: orange
colorTo: red
sdk: docker
pinned: true
license: mit
short_description: AI-powered NDT weld inspection — RT-DETR + YOLO on radiography images
---

# WeldVision AI — NDT Inspection Backend

FastAPI ML backend for AI-powered weld defect detection using RT-DETR and YOLO models.

## Endpoints

- `POST /inspect` — Upload radiography image, get PASS/REJECT verdict with defect annotations
- `GET /health` — Liveness probe
- `GET /license` — License info

## Models
- **RT-DETR** (fine-tuned on weld radiography) — primary model
- **Gazprom YOLO m60** — secondary model

## Stack
- FastAPI + Uvicorn
- PyTorch + HuggingFace Transformers
- Ultralytics YOLO
- AWS DynamoDB (single-table design)
