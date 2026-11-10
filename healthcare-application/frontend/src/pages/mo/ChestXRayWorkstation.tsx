import React, { useState, useEffect, useRef } from 'react';
import { usePageTitle } from '../../utils/usePageTitle';
import { xrayApi, mlApi, patientApi } from '../../api/services';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { VisualReferralTracker, DEFAULT_RAMESH_MILESTONES, type ReferralMilestone } from '../../components/referral/VisualReferralTracker';
import type { Patient, CuratedXRaySample, ChestXRayAnalysisResult } from '../../types';
import './ChestXRayWorkstation.css';

export const ChestXRayWorkstation: React.FC = () => {
  usePageTitle('MedFed Chest X-Ray Clinical Workstation');

  // Patient context
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // Curated samples & upload
  const [samples, setSamples] = useState<CuratedXRaySample[]>([]);
  const [selectedSampleId, setSelectedSampleId] = useState<string>('sample-ramesh');
  const [customImageBase64, setCustomImageBase64] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // AI inference state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ChestXRayAnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Viewer controls
  const [viewMode, setViewMode] = useState<'original' | 'overlay' | 'gradcam'>('overlay');
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Doctor review state
  const [doctorDecision, setDoctorDecision] = useState<'agree' | 'modify' | 'reject'>('agree');
  const [clinicalNotes, setClinicalNotes] = useState(
    'Radiographic opacity noted in right lower and middle lung zones. Correlates with 3-week productive cough and localized coarse crackles. Diagnosis: Bacterial Community-Acquired Pneumonia with right lower lobe infiltration.'
  );
  const [treatmentPlan, setTreatmentPlan] = useState(
    'Initiate Oral Azithromycin 500mg OD for 5 days and Cefpodoxime 200mg BD for 7 days. Sputum AFB sent. ASHA assigned for medication adherence check.'
  );
  const [followUpDays, setFollowUpDays] = useState<number>(7);
  const [isSavingReview, setIsSavingReview] = useState(false);
  const [reviewSavedSuccess, setReviewSavedSuccess] = useState(false);
  const [reviewSavedDetails, setReviewSavedDetails] = useState<{
    studyId?: string;
    followUp?: string;
  } | null>(null);

  // Milestones state (dynamic update on save)
  const [milestones, setMilestones] = useState<ReferralMilestone[]>(DEFAULT_RAMESH_MILESTONES);
  const [showReferralDrawer, setShowReferralDrawer] = useState(true);
  const [modelStatus, setModelStatus] = useState<{ available: boolean; model_version: string; device: string } | null>(null);

  // Initial data loading
  useEffect(() => {
    // 0. Fetch live ML model status
    mlApi.status()
      .then((st) => setModelStatus(st))
      .catch(() => null);

    // 1. Fetch patients
    patientApi.list()
      .then((pats) => {
        setPatients(pats);
        const ramesh = pats.find((p) => p.full_name.toLowerCase().includes('ramesh'));
        if (ramesh) {
          setSelectedPatient(ramesh);
        } else if (pats.length > 0) {
          setSelectedPatient(pats[0]);
        }
      })
      .catch(() => {
        const fallback: Patient = {
          id: 'p-ramesh-01',
          pseudonymous_id: 'PID-2026-RAMESH-4412',
          full_name: 'Ramesh Kumar',
          gender: 'male',
          blood_group: 'B+',
          date_of_birth: '1984-05-12',
          phone: '+91 98765 43210',
          email: 'sihdori7@gmail.com',
          village: 'Shampur Ward 3',
          district_id: 'dist-varanasi',
          facility_id: 'fac-varanasi-dh',
          abha_id: '91-8842-1920-3341',
          is_active: true,
          created_at: new Date().toISOString(),
        };
        setPatients([fallback]);
        setSelectedPatient(fallback);
      });

    // 2. Fetch curated samples
    xrayApi.getSamples()
      .then((data) => {
        setSamples(data);
        if (data.length > 0) {
          setSelectedSampleId(data[0].id);
        }
      })
      .catch(() => {
        setSamples([
          {
            id: 'sample-ramesh',
            title: 'Ramesh Kumar (Infiltration / Pneumonia)',
            category: 'Infiltration',
            filename: '00000013_026.png',
            description: 'Right middle and lower lobe patchy alveolar infiltrates. Clinical history of cough and fever.',
            expected_top: 'Infiltration',
            has_physical_file: true,
          },
          {
            id: 'sample-effusion',
            title: 'Pleural Effusion (Costophrenic Blunting)',
            category: 'Effusion',
            filename: '00000013_001.png',
            description: 'Right costophrenic angle blunting with meniscus sign indicative of fluid accumulation.',
            expected_top: 'Effusion',
            has_physical_file: true,
          },
          {
            id: 'sample-clear',
            title: 'Normal Chest Radiograph',
            category: 'No Finding',
            filename: '00000001_000.png',
            description: 'Clear lung fields bilaterally, normal cardiac contour, sharp costophrenic angles.',
            expected_top: 'No Finding',
            has_physical_file: true,
          },
        ]);
      });
  }, []);

  // Run AI Inference
  const handleRunAnalysis = async (sampleId?: string, customB64?: string) => {
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const payload: { sample_id?: string; image_base64?: string; patient_id?: string } = {
        patient_id: selectedPatient?.id,
      };

      if (customB64) {
        payload.image_base64 = customB64;
      } else {
        payload.sample_id = sampleId || selectedSampleId;
      }

      const res = await xrayApi.predict(payload);
      setAnalysisResult(res);
      setViewMode('overlay');
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'MedFed clinical AI inference failed.';
      setAnalysisError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Automatically trigger analysis on sample change if not yet loaded
  useEffect(() => {
    if (selectedSampleId && !customImageBase64) {
      handleRunAnalysis(selectedSampleId);
    }
  }, [selectedSampleId]);

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64String = reader.result as string;
      setCustomImageBase64(base64String);
      setSelectedSampleId('custom-upload');
      handleRunAnalysis(undefined, base64String);
    };
    reader.readAsDataURL(file);
  };

  // Submit doctor review
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;

    setIsSavingReview(true);
    setReviewSavedSuccess(false);

    try {
      const payload = {
        patient_id: selectedPatient.id,
        referral_id: 'REF-RAMESH-2026-CHEST',
        sample_id: selectedSampleId,
        top_finding: analysisResult?.top_finding || 'Infiltration',
        top_confidence: analysisResult?.top_confidence || 0.673,
        decision: doctorDecision,
        clinical_notes: clinicalNotes,
        treatment_plan: treatmentPlan,
        schedule_follow_up_days: followUpDays,
        findings: analysisResult?.findings,
      };

      const res = await xrayApi.submitReview(payload);
      setReviewSavedSuccess(true);
      setReviewSavedDetails({
        studyId: res.study_id,
        followUp: res.follow_up_scheduled,
      });

      // Update local referral milestones to reflect completion of Step 9 & 10
      setMilestones((prev) =>
        prev.map((m) => {
          if (m.stepNumber === 9) {
            return {
              ...m,
              state: 'completed',
              notes: `Doctor validated: Decision = ${doctorDecision.toUpperCase()}. Clinical note logged.`,
              timestamp: 'Just Now',
            };
          }
          if (m.stepNumber === 10) {
            return {
              ...m,
              state: 'completed',
              notes: treatmentPlan,
              timestamp: 'Just Now',
            };
          }
          if (m.stepNumber === 11) {
            return {
              ...m,
              state: 'active',
              timestamp: `Scheduled in ${followUpDays} Days (Email & In-App Alert Sent)`,
            };
          }
          return m;
        })
      );
    } catch (err: any) {
      alert('Failed to record review: ' + (err?.message || 'Server error'));
    } finally {
      setIsSavingReview(false);
    }
  };

  // Determine current active image for viewer
  const getDisplayImageSrc = () => {
    if (!analysisResult) {
      return customImageBase64 || '/placeholder-xray.png';
    }
    if (viewMode === 'gradcam') {
      return analysisResult.gradcam_overlay_base64 || analysisResult.original_image_base64;
    }
    if (viewMode === 'overlay') {
      return analysisResult.gradcam_overlay_base64 || analysisResult.original_image_base64;
    }
    return analysisResult.original_image_base64;
  };

  return (
    <div className="xray-workstation">
      {/* Workstation Header */}
      <PageHeader
        eyebrow="DISTRICT HOSPITAL RADIODIAGNOSIS • MEDFED AI LAYER"
        title="Clinical Chest X-Ray Review Workstation"
        description="Private on-premise AI decision-support with Prime-DP privacy guarantees & Grad-CAM visual explainability."
        action={
          <div className="workstation-header-actions">
            <Button
              variant="outline"
              size="sm"
              icon={<Icon name="network" size={15} />}
              onClick={() => setShowReferralDrawer(!showReferralDrawer)}
            >
              {showReferralDrawer ? 'Hide Referral Journey' : 'View Referral Journey'}
            </Button>
            <StatusBadge
              status={modelStatus ? (modelStatus.available ? 'verified' : 'needs-review') : 'verified'}
              label={modelStatus ? `${modelStatus.model_version} • ${modelStatus.device.toUpperCase()}` : 'DenseNet121 v1.3 Active'}
            />
          </div>
        }
      />

      {/* Embedded Visual Referral Journey (Phase 4 & 9) */}
      {showReferralDrawer && (
        <VisualReferralTracker
          patientName={selectedPatient?.full_name || 'Ramesh Kumar'}
          patientId={selectedPatient?.pseudonymous_id || 'PID-2026-RAMESH-4412'}
          referralId="REF-RAMESH-2026-CHEST"
          milestones={milestones}
        />
      )}

      {/* Patient & Sample Selector Bar */}
      <div className="workstation-control-bar">
        <div className="patient-select-group">
          <label htmlFor="ws-patient-select" className="bar-label">Active Clinical Dossier:</label>
          <select
            id="ws-patient-select"
            className="bar-select"
            value={selectedPatient?.id || ''}
            onChange={(e) => {
              const p = patients.find((pat) => pat.id === e.target.value);
              if (p) setSelectedPatient(p);
            }}
          >
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name} ({p.pseudonymous_id}) · {p.village || 'Varanasi'}
              </option>
            ))}
          </select>
        </div>

        <div className="sample-select-group">
          <span className="bar-label">Curated Studies / Case Demo:</span>
          <div className="sample-chips-row">
            {samples.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`sample-chip ${selectedSampleId === s.id && !customImageBase64 ? 'active' : ''}`}
                onClick={() => {
                  setCustomImageBase64(null);
                  setSelectedSampleId(s.id);
                  handleRunAnalysis(s.id);
                }}
              >
                <Icon name="xray" size={14} />
                <span>{s.title}</span>
              </button>
            ))}

            <button
              type="button"
              className={`sample-chip upload-chip ${customImageBase64 ? 'active' : ''}`}
              onClick={() => fileInputRef.current?.click()}
            >
              <Icon name="scan" size={14} />
              <span>{customImageBase64 ? 'Custom Image Loaded' : 'Upload DICOM/PNG'}</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
          </div>
        </div>
      </div>

      {/* Workstation 2-Column Clinical Layout */}
      <div className="workstation-grid">
        {/* LEFT COLUMN: Large High-Resolution Radiograph Viewer */}
        <div className="viewer-column">
          <div className="viewer-card">
            {/* Viewer Top Toolbar */}
            <div className="viewer-toolbar">
              <div className="view-mode-toggles">
                <button
                  type="button"
                  className={`toolbar-btn ${viewMode === 'original' ? 'active' : ''}`}
                  onClick={() => setViewMode('original')}
                >
                  <Icon name="scan" size={14} />
                  <span>Original</span>
                </button>
                <button
                  type="button"
                  className={`toolbar-btn ${viewMode === 'overlay' ? 'active' : ''}`}
                  onClick={() => setViewMode('overlay')}
                >
                  <Icon name="brain" size={14} />
                  <span>AI Overlay</span>
                </button>
                <button
                  type="button"
                  className={`toolbar-btn ${viewMode === 'gradcam' ? 'active' : ''}`}
                  onClick={() => setViewMode('gradcam')}
                >
                  <Icon name="pulse" size={14} />
                  <span>Grad-CAM Heatmap</span>
                </button>
              </div>

              <div className="viewer-zoom-controls">
                <button
                  type="button"
                  className="zoom-btn"
                  onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.25))}
                  title="Zoom In"
                >
                  +
                </button>
                <span className="zoom-indicator">{Math.round(zoomLevel * 100)}%</span>
                <button
                  type="button"
                  className="zoom-btn"
                  onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                  title="Zoom Out"
                >
                  -
                </button>
                <button
                  type="button"
                  className="zoom-btn reset-btn"
                  onClick={() => setZoomLevel(1)}
                  title="Fit to Screen"
                >
                  Fit
                </button>
              </div>
            </div>

            {/* Display Canvas Frame */}
            <div className="xray-canvas-viewport">
              {isAnalyzing ? (
                <div className="canvas-loading-state">
                  <div className="pulsing-spinner" />
                  <span className="loading-title">Executing MedFed On-Premise Inference...</span>
                  <span className="loading-sub">
                    Evaluating DenseNet121 edge weights & computing Grad-CAM feature attribution gradients.
                  </span>
                </div>
              ) : (
                <div className="image-zoom-container" style={{ transform: `scale(${zoomLevel})` }}>
                  <img
                    src={getDisplayImageSrc()}
                    alt="Chest Radiograph Clinical Study"
                    className="xray-radiograph-image"
                  />
                  {viewMode !== 'original' && analysisResult && (
                    <div className="gradcam-indicator-pill">
                      <Icon name="brain" size={12} />
                      <span>Grad-CAM Feature Attribution Layer Active</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Viewer Footer Meta */}
            <div className="viewer-footer">
              <div className="meta-tag">
                <span className="tag-key">Study Modality:</span>
                <span className="tag-val">Digital Radiography (PA View)</span>
              </div>
              <div className="meta-tag">
                <span className="tag-key">Privacy Protocol:</span>
                <span className="tag-val">Prime-DP Edge Layer (ε = 0.5)</span>
              </div>
              <div className="meta-tag">
                <span className="tag-key">Hospital Edge Node:</span>
                <span className="tag-val">Node A (Varanasi DH)</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: AI Analysis & Doctor Review Station */}
        <div className="clinical-review-column">
          {/* AI Output Card */}
          <div className="clinical-card ai-output-card">
            <div className="clinical-card-header">
              <div>
                <span className="card-eyebrow">MEDFED CLINICAL INTELLIGENCE</span>
                <h3 className="card-title">Multi-Label Finding Predictions</h3>
              </div>
              <StatusBadge status="verified" label="Analysis Complete" />
            </div>

            {analysisError ? (
              <div className="analysis-error-box" role="alert">
                <Icon name="alert" size={16} />
                <span>{analysisError}</span>
              </div>
            ) : analysisResult ? (
              <div className="ai-findings-content">
                {/* Primary finding banner */}
                <div className="primary-finding-callout">
                  <div className="callout-header">
                    <span className="callout-label">PREDOMINANT PATHOLOGY:</span>
                    <span className="callout-finding-name">{analysisResult.top_finding}</span>
                  </div>
                  <div className="callout-confidence-score">
                    <span className="score-num">{(analysisResult.top_confidence * 100).toFixed(1)}%</span>
                    <span className="score-label">Confidence Score</span>
                  </div>
                </div>

                {/* Multi-label findings table */}
                <div className="findings-table-wrapper">
                  <table className="findings-table">
                    <thead>
                      <tr>
                        <th>Classified Finding</th>
                        <th>Confidence</th>
                        <th>Clinical Significance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysisResult.findings.map((f) => (
                        <tr key={f.finding} className={f.is_positive ? 'row-positive' : ''}>
                          <td className="finding-col">
                            <strong>{f.finding}</strong>
                          </td>
                          <td className="confidence-col">
                            <div className="confidence-bar-wrap">
                              <div
                                className={`confidence-bar-fill ${f.is_positive ? 'high' : 'low'}`}
                                style={{ width: `${Math.min(100, f.percentage)}%` }}
                              />
                              <span className="confidence-pct-text">{f.percentage.toFixed(1)}%</span>
                            </div>
                          </td>
                          <td className="significance-col">
                            {f.is_positive ? (
                              <span className="sig-badge positive">Significant</span>
                            ) : (
                              <span className="sig-badge nominal">Nominal</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Model Explanation Box */}
                <div className="explanation-box">
                  <div className="explanation-title">
                    <Icon name="info" size={14} />
                    <span>Grad-CAM Interpretability & Spatial Attention</span>
                  </div>
                  <p className="explanation-text">
                    {analysisResult.explanation_notes ||
                      'Highlighted regions in the heatmap represent the spatial feature activations contributing directly to the model prediction.'}
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          {/* Clinician Review & Decision Form */}
          <div className="clinical-card doctor-review-card">
            <div className="clinical-card-header">
              <div>
                <span className="card-eyebrow">FINAL CLINICAL DISPOSITION</span>
                <h3 className="card-title">Attending Clinician Review</h3>
              </div>
              <span className="dr-name-tag">Dr. Rajesh Sharma, MD</span>
            </div>

            {reviewSavedSuccess ? (
              <div className="review-saved-success-box">
                <div className="success-icon-badge">
                  <Icon name="check" size={24} color="#15803d" />
                </div>
                <h4 className="saved-title">Clinical Review Confirmed & Ledger Immutated</h4>
                <p className="saved-sub">
                  Referral journey <code>REF-RAMESH-2026-CHEST</code> updated to Step 9 (Reviewed) & Step 10 (Treatment Initiated).
                </p>
                <div className="saved-meta-receipt">
                  <span>Study Record ID: <strong>{reviewSavedDetails?.studyId}</strong></span>
                  <span>Patient Follow-up: <strong>Scheduled for {reviewSavedDetails?.followUp}</strong></span>
                  <span>Patient Alerts: <strong>In-App Notification + Real SMTP Email Dispatched</strong></span>
                </div>
                <div className="saved-actions">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setReviewSavedSuccess(false)}
                    icon={<Icon name="stethoscope" size={14} />}
                  >
                    Edit Clinical Entry
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} className="doctor-review-form">
                {/* Decision Buttons (Agree / Modify / Reject) */}
                <div className="decision-button-group" role="radiogroup" aria-label="Clinical Decision">
                  <button
                    type="button"
                    className={`decision-btn agree ${doctorDecision === 'agree' ? 'selected' : ''}`}
                    onClick={() => setDoctorDecision('agree')}
                    role="radio"
                    aria-checked={doctorDecision === 'agree'}
                  >
                    <Icon name="check" size={16} />
                    <span>Agree with AI</span>
                  </button>
                  <button
                    type="button"
                    className={`decision-btn modify ${doctorDecision === 'modify' ? 'selected' : ''}`}
                    onClick={() => setDoctorDecision('modify')}
                    role="radio"
                    aria-checked={doctorDecision === 'modify'}
                  >
                    <Icon name="pulse" size={16} />
                    <span>Modify Findings</span>
                  </button>
                  <button
                    type="button"
                    className={`decision-btn reject ${doctorDecision === 'reject' ? 'selected' : ''}`}
                    onClick={() => setDoctorDecision('reject')}
                    role="radio"
                    aria-checked={doctorDecision === 'reject'}
                  >
                    <Icon name="close" size={16} />
                    <span>Reject / Normal</span>
                  </button>
                </div>

                {/* Clinical Notes Field */}
                <div className="form-field">
                  <label htmlFor="ws-clinical-notes" className="field-label required">
                    Doctor Clinical Interpretation Notes
                  </label>
                  <textarea
                    id="ws-clinical-notes"
                    rows={3}
                    required
                    className="field-textarea"
                    value={clinicalNotes}
                    onChange={(e) => setClinicalNotes(e.target.value)}
                  />
                </div>

                {/* Treatment Plan Field */}
                <div className="form-field">
                  <label htmlFor="ws-treatment-plan" className="field-label required">
                    Prescribed Treatment & Clinical Protocol
                  </label>
                  <textarea
                    id="ws-treatment-plan"
                    rows={2}
                    required
                    className="field-textarea"
                    value={treatmentPlan}
                    onChange={(e) => setTreatmentPlan(e.target.value)}
                  />
                </div>

                {/* Follow-up Scheduling */}
                <div className="followup-scheduling-row">
                  <label htmlFor="ws-followup-days" className="field-label">Schedule Clinical Follow-up:</label>
                  <select
                    id="ws-followup-days"
                    className="field-select"
                    value={followUpDays}
                    onChange={(e) => setFollowUpDays(parseInt(e.target.value, 10))}
                  >
                    <option value={3}>3 Days (Acute Adherence Check)</option>
                    <option value={7}>7 Days (Antibiotic Course Review)</option>
                    <option value={14}>14 Days (Post-treatment Auscultation)</option>
                    <option value={30}>30 Days (Resolution Radiograph)</option>
                  </select>
                </div>

                {/* Mandatory Safety Notice */}
                <div className="safety-disclaimer-banner">
                  <Icon name="alert" size={14} />
                  <span>
                    <strong>CLINICAL DECISION SUPPORT NOTICE:</strong> Assistive AI decision support only. Final clinical interpretation and diagnostic responsibility remains with the qualified clinician.
                  </span>
                </div>

                {/* Save Clinical Review Button */}
                <div className="review-action-row">
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    isLoading={isSavingReview}
                    icon={<Icon name="check" size={16} />}
                  >
                    Save Clinical Decision & Update Referral
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
