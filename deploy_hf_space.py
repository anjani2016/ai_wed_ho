#!/usr/bin/env python3
"""
deploy_hf_space.py
Pushes the FastAPI ML backend to a HuggingFace Docker Space.

Usage:
  1. huggingface-cli login       (one time — needs Write token)
  2. python deploy_hf_space.py

The Space will be live at:
  https://huggingface.co/spaces/anjanid/weld-inspector
  https://anjanid-weld-inspector.hf.space   (API endpoint)
"""

import os
import shutil
import subprocess
import sys
from pathlib import Path

SPACE_ID = "anjanid/weld-inspector"
REPO_DIR = Path("/tmp/hf_space_deploy")
PROJECT_ROOT = Path(__file__).parent

FILES_TO_COPY = {
    "hf_space/Dockerfile":           "Dockerfile",
    "hf_space/README.md":            "README.md",
    "requirements.txt":              "requirements.txt",
}

DIRS_TO_COPY = {
    "src":     "src",
    "weights": "weights",   # m60.pt + RT-DETR configs (not safetensors — pulled by Docker)
}

def run(cmd, cwd=None):
    print(f"  $ {cmd}")
    result = subprocess.run(cmd, shell=True, cwd=cwd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"  ERROR: {result.stderr}")
        sys.exit(1)
    if result.stdout.strip():
        print(f"  {result.stdout.strip()}")
    return result.stdout.strip()

def main():
    from huggingface_hub import HfApi, create_repo

    api = HfApi()

    # 1 — Create the Space (idempotent)
    print(f"\n[1/4] Creating Space '{SPACE_ID}' (Docker)...")
    try:
        create_repo(
            repo_id=SPACE_ID,
            repo_type="space",
            space_sdk="docker",
            private=False,
            exist_ok=True,
        )
        print(f"  ✅ Space ready: https://huggingface.co/spaces/{SPACE_ID}")
    except Exception as e:
        print(f"  ⚠️  {e} — continuing anyway")

    # 2 — Clone the Space repo
    print(f"\n[2/4] Cloning Space repo...")
    if REPO_DIR.exists():
        shutil.rmtree(REPO_DIR)
    run(f"git clone https://huggingface.co/spaces/{SPACE_ID} {REPO_DIR}")

    # 3 — Copy project files into the clone
    print(f"\n[3/4] Copying project files...")
    for src_rel, dst_rel in FILES_TO_COPY.items():
        src = PROJECT_ROOT / src_rel
        dst = REPO_DIR / dst_rel
        shutil.copy2(src, dst)
        print(f"  copied {src_rel} → {dst_rel}")

    for src_rel, dst_rel in DIRS_TO_COPY.items():
        src = PROJECT_ROOT / src_rel
        dst = REPO_DIR / dst_rel
        if dst.exists():
            shutil.rmtree(dst)
        shutil.copytree(src, dst, ignore=shutil.ignore_patterns("*.safetensors"))
        print(f"  copied {src_rel}/ → {dst_rel}/  (safetensors excluded — pulled by Docker)")

    # 4 — Commit and push to HF
    print(f"\n[4/4] Pushing to HuggingFace...")
    run("git add -A", cwd=REPO_DIR)
    run('git commit -m "deploy: WeldVision AI FastAPI ML backend"', cwd=REPO_DIR)
    run("git push", cwd=REPO_DIR)

    print(f"""
✅ Deploy complete!

  Space URL:   https://huggingface.co/spaces/{SPACE_ID}
  API URL:     https://anjanid-weld-inspector.hf.space
  Build logs:  https://huggingface.co/spaces/{SPACE_ID}/logs

⏳ Build takes 5-15 min (installing torch + downloading model.safetensors).
   Watch progress in the Space logs above.

Next step — add to Vercel env vars:
  ML_FALLBACK_URL = https://anjanid-weld-inspector.hf.space
""")

if __name__ == "__main__":
    main()
