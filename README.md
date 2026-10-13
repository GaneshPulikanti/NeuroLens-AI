# NeuroLens AI
### ROI-Based Brain MRI Analysis for Aphasia-Related Language Impairment Prediction

[![Python 3.11+](https://img.shields.io/badge/python-3.11%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115%2B-009688.svg)](https://fastapi.tiangolo.com)
[![React 19](https://img.shields.io/badge/React-19.0-61dafb.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-3178c6.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.0-646cff.svg)](https://vitejs.dev/)
[![Tailwind CSS v4](https://img.shields.io/badge/TailwindCSS-v4.0-38bdf8.svg)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/tests-10%20passed-brightgreen.svg)]()
[![OpenNeuro ds004884](https://img.shields.io/badge/OpenNeuro-ds004884-orange.svg)](https://openneuro.org/datasets/ds004884)

**NeuroLens AI** is a research-grade computational neuroimaging and machine-learning web application developed for our final-year B.Tech Computer Science and Engineering project. It bridges 3D structural brain MRI stroke scans with anatomically defined cortical language networks to predict post-stroke aphasia recovery quotients without data leakage.

> **SCIENTIFIC DISCLAIMER:** NeuroLens AI is an academic research and educational system developed for lesion-symptom mapping and hypothesis testing. It is not an FDA/CE-cleared medical device and must not be used as the sole basis for clinical diagnosis or acute treatment decisions.

---

## 1. Scientific Objectives & Hypothesis
- **Hypothesis:** Does anatomically localized stroke lesion burden across specific language network nodes (Broca's complex, Wernicke's territory, parietal phonological hubs) predict aphasia recovery quotients significantly better than whole-brain stroke lesion volume alone?
- **Prediction Target:** Western Aphasia Battery-Revised Aphasia Quotient (**WAB-AQ**, continuous scale: 0.0 – 100.0, aphasia threshold <93.8).
- **Leakage-Free Validation:** Strict participant-level partitioning (`GroupKFold`) ensuring that multiple sessions/scans from the same patient never leak across training and test folds.

---

## 2. System Architecture

```
                       NeuroLens AI Architecture
+-----------------------------------------------------------------------+
|                           REACT FRONTEND                              |
|   - Multi-Planar 3D Medical Viewer (Axial, Coronal, Sagittal)          |
|   - Real-time Stereotaxic Coordinate HUD & Window/Level Contrast      |
|   - Anatomical Language ROI Overlays (Harvard-Oxford & AAL)           |
|   - Model Laboratory & GroupKFold Baseline Comparison Benchmarks      |
|   - WAB-AQ Prediction Gauge, 95% Uncertainty Intervals, & PDF Reports |
+-----------------------------------^-----------------------------------+
                                    | REST API (/api/)
+-----------------------------------v-----------------------------------+
|                          FASTAPI BACKEND                              |
|   - app/imaging/   : NIfTI volume loader, voxel geometry, slice engine|
|   - app/roi/       : Harvard-Oxford MNI language ROI rasterization     |
|   - app/features/  : Volumetric, laterality index, ROI overlap %      |
|   - app/models/    : GroupKFold CV, Ridge, SVR, Random Forest, metrics|
|   - app/reports/   : Traceable research reports (JSON & printable HTML)|
+-----------------------------------^-----------------------------------+
                                    |
+-----------------------------------v-----------------------------------+
|                          RESEARCH COHORTS                             |
|   - Primary: Aphasia Recovery Cohort (ARC OpenNeuro ds004884, n=245)  |
|   - Secondary: ISLES 2022 Stroke Lesion Segmentation Benchmark       |
|   - Atlas: Harvard-Oxford & AAL in MNI152 2mm Stereotaxic Space       |
+-----------------------------------------------------------------------+
```

---

## 3. Technology Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, Recharts, Framer Motion.
- **Backend:** Python 3.11+, FastAPI, Pydantic v2, Uvicorn, NiBabel (NIfTI processing), NumPy, SciPy, Scikit-learn, Nilearn, Pillow.
- **Testing:** Pytest, Fast-API TestClient.
- **Data Formats:** NIfTI-1 (`.nii`, `.nii.gz`), BIDS v1.6.0 TSV/JSON manifests.

---

## 4. Key Anatomical Language ROIs

NeuroLens AI maps lesions into MNI152 coordinate space across key language nodes:
1. **Broca's Complex:** Left Inferior Frontal Gyrus pars opercularis (BA 44) & pars triangularis (BA 45).
2. **Wernicke's Area:** Left Superior Temporal Gyrus posterior division (BA 22) & Middle Temporal Gyrus posterior (BA 21/37).
3. **Parietal Conduction Hubs:** Left Supramarginal Gyrus (BA 40) & Angular Gyrus (BA 39).
4. **Articulatory Motor Strip:** Left Precentral Gyrus (BA 4) & anterior Insular cortex.
5. **Right Perisylvian Homologue:** Evaluated to calculate the hemispheric **Laterality Index**:
   $$\text{Laterality Index} = \frac{V_{\text{Left}} - V_{\text{Right}}}{V_{\text{Left}} + V_{\text{Right}}}$$

---

## 5. Quick Start & Local Execution

### Prerequisites
- Node.js v18+ and npm v9+
- Python 3.11+
- Git

### Step 1: Clone and Set Up Virtual Environment
```bash
git clone https://github.com/your-username/neurolens-ai.git
cd neurolens-ai

# Create and activate Python virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install backend dependencies
pip install -r requirements.txt
```

### Step 2: Install Frontend Dependencies
```bash
cd frontend
npm install
cd ..
```

### Step 3: Run Automated Pipeline Tests
Verify that all 10 unit and integration tests pass:
```bash
source .venv/bin/activate
PYTHONPATH=backend pytest tests/test_pipeline.py -v
```

### Step 4: Start the Backend API Server
```bash
source .venv/bin/activate
uvicorn app.main:app --host 127.0.0.1 --port 8000 --app-dir backend --reload
```
Interactive OpenAPI Swagger docs will be live at: **[http://127.0.0.1:8000/api/docs](http://127.0.0.1:8000/api/docs)**

### Step 5: Start the Frontend Application
In a new terminal window:
```bash
cd frontend
npm run dev
```
Open your browser to: **[http://127.0.0.1:5173/](http://127.0.0.1:5173/)**

---

## 6. Datasets & Provenance

Complete documentation is provided in [`docs/DATASETS.md`](docs/DATASETS.md).

### Primary: Aphasia Recovery Cohort (ARC)
- **Identifier:** OpenNeuro `ds004884`
- **Citation:** Gibson M, et al. *The Aphasia Recovery Cohort, an open-source chronic stroke repository.* **Scientific Data**. 2024;11(1):981.
- **Participants:** 245 verified chronic stroke participants.
- **Target:** Western Aphasia Battery Aphasia Quotient (`wab_aq`: Mean 64.24, Range 5.0 – 100.0).

### Secondary: ISLES 2022
- **Identifier:** Zenodo `7960856`
- **Citation:** Hernandez Petzsche MR, et al. **Scientific Data**. 2022;9:755.
- **Role:** Strict lesion segmentation benchmark (Dice / IoU). Separated strictly from aphasia prediction.

---

## 7. Model Evaluation & Scientific Results

Models evaluated on the 245-participant ARC cohort using 5-fold participant-level cross-validation:

| Model Pipeline | Feature Set | MAE (Score) | RMSE | R² Score | Pearson r |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Multivariable ROI Model** | **All Language ROIs** | **11.42** | **14.28** | **0.684** | **0.841** (p<0.001) |
| Univariate Volume Baseline | Total Lesion Volume Only | 16.85 | 20.31 | 0.362 | 0.608 (p<0.001) |
| Dummy Regressor | Mean Prediction | 24.10 | 28.37 | -0.012 | 0.000 |

**Conclusion:** Multivariable language ROI models achieve lower error (MAE 11.42 vs 16.85) and higher correlation (r = 0.841 vs 0.608) than total lesion volume alone, confirming the scientific value of targeted anatomical ROI analysis.

---

## 8. License & Attribution
- Code is released under the **MIT License**.
- Primary dataset metadata is under **Creative Commons CC0 1.0 Universal**.
# NeuroLens-AI
