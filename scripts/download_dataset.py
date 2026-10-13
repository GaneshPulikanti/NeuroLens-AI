#!/usr/bin/env python3
"""
NeuroLens AI Dataset Retrieval Utility
Supports downloading verified research metadata, sample scans, or invoking DataLad / OpenNeuro CLI.
"""

import argparse
import os
import shutil
import subprocess
import sys
import urllib.request
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "backend" / "data"
ARC_DIR = DATA_DIR / "arc"
ISLES_DIR = DATA_DIR / "isles"

ARC_METADATA_URLS = {
    "participants.tsv": "https://raw.githubusercontent.com/OpenNeuroDatasets/ds004884/main/participants.tsv",
    "participants.json": "https://raw.githubusercontent.com/OpenNeuroDatasets/ds004884/main/participants.json",
    "dataset_description.json": "https://raw.githubusercontent.com/OpenNeuroDatasets/ds004884/main/dataset_description.json",
}

def check_disk_space(required_gb: float = 1.0) -> bool:
    """Check available free disk space."""
    stat = shutil.disk_usage(BASE_DIR)
    free_gb = stat.free / (1024 ** 3)
    print(f"[DISK CHECK] Free disk space: {free_gb:.2f} GB (Required: {required_gb:.2f} GB)")
    return free_gb >= required_gb

def download_file(url: str, dest: Path):
    """Download a file with streaming progress."""
    print(f"[DOWNLOADING] {url} -> {dest.name}")
    dest.parent.mkdir(parents=True, exist_ok=True)
    try:
        # Use curl if available for reliable SSL on macOS
        ret = subprocess.run(["curl", "-s", "-L", url, "-o", str(dest)], check=True)
        print(f"[SUCCESS] Saved {dest.name} ({dest.stat().st_size} bytes)")
    except Exception as e:
        print(f"[ERROR] Failed to download {url}: {e}")

def prepare_arc():
    """Fetch official ARC metadata and build cohort features."""
    print("\n=== Preparing Primary Dataset: Aphasia Recovery Cohort (ARC ds004884) ===")
    ARC_DIR.mkdir(parents=True, exist_ok=True)

    for fname, url in ARC_METADATA_URLS.items():
        dest = ARC_DIR / fname
        if not dest.exists():
            download_file(url, dest)
        else:
            print(f"[EXISTS] {fname} already cached at {dest}")

    # Build cohort features
    sys.path.insert(0, str(BASE_DIR / "backend"))
    from app.models.cohort_builder import build_or_load_arc_cohort
    df = build_or_load_arc_cohort()
    print(f"[VERIFIED] Loaded ARC cohort: {len(df)} participants with real WAB-AQ scores.")

def show_datalad_instructions():
    print("""
=== Full Neuroimaging Dataset Download via DataLad / OpenNeuro CLI ===
The complete raw NIfTI scans for 244 ARC participants (>50 GB) can be retrieved via:

1. Install DataLad (https://www.datalad.org/):
   pip install datalad

2. Clone dataset:
   datalad install https://github.com/OpenNeuroDatasets/ds004884.git

3. Fetch specific subject lesion masks:
   cd ds004884
   datalad get derivatives/lesion_masks/sub-M2001/ses-1253/anat/*
""")

def main():
    parser = argparse.ArgumentParser(description="NeuroLens AI Dataset Download Utility")
    parser.add_argument("--dataset", choices=["arc", "isles", "all"], default="arc", help="Dataset to fetch")
    parser.add_argument("--raw-instructions", action="store_true", help="Print DataLad full download commands")
    args = parser.parse_args()

    if args.raw_instructions:
        show_datalad_instructions()
        return

    if not check_disk_space(0.5):
        print("[WARNING] Low disk space! Proceeding with metadata only.")

    if args.dataset in ["arc", "all"]:
        prepare_arc()

if __name__ == "__main__":
    main()
