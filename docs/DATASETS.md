# NeuroLens AI — Dataset Registry and Specifications

This document provides complete, transparent, and reproducible documentation for all neuroimaging and clinical datasets integrated into **NeuroLens AI**, adhering to open-science standards and data provenance ethics.

---

## 1. Primary Dataset: Aphasia Recovery Cohort (ARC)

- **Dataset Identifier:** OpenNeuro `ds004884` (BIDS Specification v1.6.0)
- **Official OpenNeuro URL:** [https://openneuro.org/datasets/ds004884](https://openneuro.org/datasets/ds004884)
- **Dataset DOI:** `doi:10.18112/openneuro.ds004884.v1.0.2`
- **GitHub Repository:** [https://github.com/OpenNeuroDatasets/ds004884](https://github.com/OpenNeuroDatasets/ds004884)
- **Published Scientific Paper:**
  - Citation: Gibson, M., Newman-Norlund, R., Bonilha, L., Fridriksson, J., Hickok, G., Hillis, A. E., den Ouden, D. B., & Rorden, C. (2024). *The Aphasia Recovery Cohort, an open-source chronic stroke repository.* **Scientific Data**, 11(1), 981.
  - PubMed Central (PMC): [PMC11384737](https://pmc.ncbi.nlm.nih.gov/articles/PMC11384737/)
  - DOI: `10.1038/s41597-024-03819-7`
- **License:** Creative Commons CC0 1.0 Universal (Public Domain Dedication).
- **Ethics Approval:** All data acquired from protocols approved by the Institutional Review Board (IRB) at the University of South Carolina (C-STAR project). De-identified data exemption criteria met.

### Scientific Purpose
Investigating lesion-symptom mapping and predicting language outcome recovery in individuals who experienced ischemic or hemorrhagic stroke in the left cerebral hemisphere resulting in chronic aphasia.

### Verified Cohort Demographics and Assessment Sample Counts
*Verified directly against the downloaded `participants.tsv` manifest (245 rows):*
- **Total Unique Participants:** 245
- **Primary Continuous Prediction Target:** Western Aphasia Battery-Revised Aphasia Quotient (`wab_aq`):
  - Count: 245 (100% complete, 0 missing)
  - Mean ± SD: 64.24 ± 28.37
  - Median: 69.50 (IQR: 40.10 – 90.40)
  - Range: [5.0, 100.0]
- **Diagnostic Category (`wab_type`):**
  - Broca's Aphasia: 86 (35.1%)
  - Anomic Aphasia: 68 (27.8%)
  - Conduction Aphasia: 26 (10.6%)
  - Global Aphasia: 16 (6.5%)
  - Wernicke's Aphasia: 7 (2.9%)
  - Transcortical Motor Aphasia: 4 (1.6%)
  - Subclinical / Not Aphasic (`NaN` / None based on cutoff >93.8): 38 (15.5%)
- **Demographics:**
  - Sex: 153 Male, 92 Female
  - Age at Stroke: Mean 59.8 years (Range: 23 – 87 years)
  - Chronicity (`wab_days`): Days since stroke event at WAB administration (Range: 41 – 8798 days; chronic phase)

### Available Imaging Modalities & Derivatives
- High-resolution T1-weighted structural MRI (`_T1w.nii.gz`)
- High-resolution T2-weighted structural MRI (`_T2w.nii.gz`)
- Resting-state BOLD fMRI (`task-rest_bold.nii.gz`)
- Task-based naming fMRI (`task-naming40_bold.nii.gz`)
- Expert manually-drawn / semi-automated chronic stroke lesion masks (`derivatives/lesion_masks/sub-<id>/ses-<ses>/anat/<id>_desc-lesion_mask.nii.gz`)

### Known Dataset Limitations
1. **Severe Imbalance in Clinical Types:** Global and Wernicke subtypes have relatively low sample sizes (16 and 7 cases respectively), making fine-grained 7-class subtype classification prone to small-sample instability; continuous regression on `wab_aq` is scientifically superior and more clinically granular.
2. **Chronicity Variation:** Time between stroke and assessment ranges from ~1 month to over 20 years.
3. **Download Size:** The entire raw neuroimaging archive exceeds 50 GB. The application downloads metadata instantly and provides an on-demand, resumable download pipeline for raw volumes with synthetic/sample fixtures for local development.

---

## 2. Secondary Dataset: ISLES 2022 (Ischemic Stroke Lesion Segmentation)

- **Official Challenge:** [https://www.isles-challenge.org/](https://www.isles-challenge.org/)
- **Zenodo Repository:** [https://zenodo.org/records/7960856](https://zenodo.org/records/7960856)
- **Reference Paper:**
  - Citation: Hernandez Petzsche, M. R., et al. (2022). *ISLES 2022: A multi-center magnetic resonance imaging dataset for acute and subacute stroke lesion segmentation.* **Scientific Data**, 9, 755.
  - DOI: `10.1038/s41597-022-01875-5`
- **License:** Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0).

### Scientific Purpose
Training and evaluating automated 3D stroke lesion segmentation models on acute/subacute ischemic brain infarcts.

### Available Modalities & Format
- Diffusion-Weighted Imaging (`DWI` / `dwi.nii.gz`)
- Apparent Diffusion Coefficient (`ADC` / `adc.nii.gz`)
- Fluid-Attenuated Inversion Recovery (`FLAIR` / `flair.nii.gz`)
- Expert consensus binary lesion segmentations (`mask.nii.gz` / `derivatives/`)

### Evaluation Metrics
- **Dice Similarity Coefficient (DSC):** $DSC = \frac{2 |A \cap B|}{|A| + |B|}$
- **Intersection over Union (IoU):** $IoU = \frac{|A \cap B|}{|A \cup B|}$
- **Volumetric Similarity & Lesion Count Error**

### Critical Scientific Separation Rule
> **IMPORTANT:** ISLES lesion masks are derived from acute/subacute stroke cases evaluated for infarct segmentation without WAB language scores. **ISLES data is strictly reserved for segmentation benchmarking and must NEVER be conflated with ARC language impairment prediction targets.**

---

## 3. Anatomical Atlases & Language ROI Definitions

NeuroLens AI uses validated stereotaxic regions from the **Harvard-Oxford Cortical & Subcortical Structural Atlas** and the **AAL (Automated Anatomical Labeling)** atlas in MNI152 coordinate space.

### Key Language Network Regions of Interest (ROIs):
1. **Broca's Area (Speech Production & Grammar):**
   - Left Inferior Frontal Gyrus, pars opercularis (`L_IFG_opercularis`, BA 44)
   - Left Inferior Frontal Gyrus, pars triangularis (`L_IFG_triangularis`, BA 45)
2. **Wernicke's Area (Auditory Comprehension & Semantics):**
   - Left Superior Temporal Gyrus, posterior division (`L_STG_post`, BA 22)
   - Left Middle Temporal Gyrus, posterior division (`L_MTG_post`, BA 21/37)
3. **Parietal Language Nodes (Repetition & Phonological Processing):**
   - Left Supramarginal Gyrus (`L_SMG`, BA 40)
   - Left Angular Gyrus (`L_AG`, BA 39)
4. **Articulatory / Sensorimotor Motor Nodes:**
   - Left Precentral Gyrus / Primary Motor Cortex (`L_Precentral`, BA 4)
   - Left Insular Cortex (`L_Insula`)
5. **Right Hemisphere Homologues:**
   - Evaluated for laterality indices:
     $$\text{Laterality Index} = \frac{V_{\text{Left Lesion}} - V_{\text{Right Lesion}}}{V_{\text{Left Lesion}} + V_{\text{Right Lesion}}}$$

---

## 4. Leakage-Free Validation Protocol

To guarantee scientific reproducibility:
1. **Participant-Level Splitting:** All repeated scans/sessions from the same individual are strictly grouped into the same partition (`GroupKFold` or participant-grouped stratified split).
2. **Within-Fold Transformation:** Feature scaling, imputation, and feature ranking are computed exclusively on training folds.
3. **Baseline Hierarchy:**
   - Model 0: Naive mean/median predictor.
   - Model 1: Total lesion volume alone (univariate baseline).
   - Model 2: Multivariable ROI anatomical lesion burden model (Ridge, Random Forest, SVR).
   - Whole-brain vs ROI ablation study to rigorously test whether localized anatomical ROI damage outperforms global volume.
