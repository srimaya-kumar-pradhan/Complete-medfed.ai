import React, { useState } from 'react';
import { patientApi } from '../../api/services';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { StatusBadge } from '../ui/StatusBadge';
import type { Patient, PatientCreate, Gender, BloodGroup } from '../../types';
import './RegisterPatientModal.css';

interface RegisterPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPatientCreated?: (newPatient: Patient) => void;
  defaultFacilityId?: string;
  defaultDistrictId?: string;
}

export const RegisterPatientModal: React.FC<RegisterPatientModalProps> = ({
  isOpen,
  onClose,
  onPatientCreated,
  defaultFacilityId = 'fac-ramnagar-chc',
  defaultDistrictId = 'dist-varanasi',
}) => {
  // Form fields
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>('B+');
  const [ageYears, setAgeYears] = useState('38');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('sihdori7@gmail.com');
  const [village, setVillage] = useState('Shampur Ward 2');
  const [address, setAddress] = useState('House 42, Near Primary School');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [existingConditions, setExistingConditions] = useState('Persistent dry cough (3 weeks), intermittent evening fever, mild chest discomfort');
  const [clinicalNotes, setClinicalNotes] = useState('Suspected respiratory infiltration. Advised clinical chest X-ray screening and sputum evaluation.');
  const [consentGiven, setConsentGiven] = useState(true);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdPatient, setCreatedPatient] = useState<Patient | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Auto-calculate approximate DOB from age
  const calculateDob = (age: string) => {
    const years = parseInt(age, 10);
    if (isNaN(years) || years <= 0) return '1990-01-01';
    const currentYear = new Date().getFullYear();
    return `${currentYear - years}-01-15`;
  };

  const handleQuickSeed = (type: 'respiratory' | 'maternal' | 'cardiac') => {
    if (type === 'respiratory') {
      setFullName('Ramesh Kumar');
      setGender('male');
      setAgeYears('42');
      setBloodGroup('B+');
      setPhone('9876543210');
      setEmail('sihdori7@gmail.com');
      setVillage('Shampur Ward 3');
      setAddress('Plot 14, Riverbank Road, Shampur');
      setEmergencyName('Kavita Kumar (Spouse)');
      setEmergencyPhone('+91 98765 43211');
      setExistingConditions('Chronic productive cough with purulent sputum, low-grade evening fever for 3 weeks, unexplained weight loss (4kg).');
      setClinicalNotes('Auscultation reveals coarse crackles in right lower lung zone. Urgent chest X-ray and sputum AFB recommended. Suspected infiltration.');
    } else if (type === 'maternal') {
      setFullName('Sunita Devi');
      setGender('female');
      setAgeYears('24');
      setBloodGroup('O+');
      setPhone('9876543212');
      setEmail('sihdori7@gmail.com');
      setVillage('Belwa Village');
      setAddress('House 8, Belwa North');
      setEmergencyName('Suresh Prasad (Husband)');
      setEmergencyPhone('+91 98765 43213');
      setExistingConditions('Second trimester primigravida, gestational age 18 weeks. Elevated systolic blood pressure.');
      setClinicalNotes('BP 144/92 mmHg on two repeated readings. Mild bilateral pedal edema. ANC-2 screening.');
    } else {
      setFullName('Anil Verma');
      setGender('male');
      setAgeYears('55');
      setBloodGroup('A+');
      setPhone('9876543214');
      setEmail('sihdori7@gmail.com');
      setVillage('Ramnagar Block');
      setAddress('Lane 3, Main Bazaar, Ramnagar');
      setEmergencyName('Sunil Verma (Son)');
      setEmergencyPhone('+91 98765 43215');
      setExistingConditions('Known hypertensive on Amlodipine 5mg. Occasional exertional dyspnea.');
      setClinicalNotes('Follow-up cardiovascular evaluation. Advised baseline ECG and chest radiograph.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consentGiven) {
      setErrorMessage('Patient or guardian informed consent is legally required under the DPDP Act 2023.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const payload: PatientCreate = {
      full_name: fullName.trim(),
      gender,
      blood_group: bloodGroup,
      date_of_birth: calculateDob(ageYears),
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      village: village.trim() || undefined,
      address: address.trim() || undefined,
      emergency_contact_name: emergencyName.trim() || undefined,
      emergency_contact_phone: emergencyPhone.trim() || undefined,
      existing_conditions: existingConditions.trim() || undefined,
      clinical_notes: clinicalNotes.trim() || undefined,
      facility_id: defaultFacilityId,
      district_id: defaultDistrictId,
    };

    try {
      const result = await patientApi.create(payload);
      setCreatedPatient(result);
      if (onPatientCreated) {
        onPatientCreated(result);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to register patient record.';
      setErrorMessage(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForAnother = () => {
    setCreatedPatient(null);
    setFullName('');
    setPhone('');
    setExistingConditions('');
    setClinicalNotes('');
  };

  return (
    <div className="modal-overlay reg-patient-overlay" role="dialog" aria-modal="true" aria-labelledby="register-patient-title">
      <div className="modal-content reg-patient-modal">
        {/* Modal Header */}
        <div className="modal-header reg-patient-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge">
              <Icon name="patient" size={20} color="var(--color-gold-400, #d4a373)" />
            </div>
            <div>
              <h3 id="register-patient-title" className="modal-title">Live Patient Registration</h3>
              <p className="modal-subtitle">
                Unified public-health registration · Issues decentralized Care Passport and primes vector retrieval
              </p>
            </div>
          </div>
          <button
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close registration dialog"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* Quick Demo Scenario Seeds */}
        {!createdPatient && (
          <div className="reg-quick-seeds">
            <span className="seeds-label">SIH Demo Quick Fill:</span>
            <button
              type="button"
              className="seed-chip"
              onClick={() => handleQuickSeed('respiratory')}
            >
              <Icon name="xray" size={13} /> Ramesh Kumar (Respiratory CXR)
            </button>
            <button
              type="button"
              className="seed-chip"
              onClick={() => handleQuickSeed('maternal')}
            >
              <Icon name="patient" size={13} /> Sunita Devi (ANC)
            </button>
            <button
              type="button"
              className="seed-chip"
              onClick={() => handleQuickSeed('cardiac')}
            >
              <Icon name="pulse" size={13} /> Anil Verma (Hypertension)
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="modal-body reg-patient-body">
          {createdPatient ? (
            /* Success State */
            <div className="reg-success-view">
              <div className="success-banner-card">
                <div className="success-icon-wrap">
                  <Icon name="check" size={32} color="var(--color-emerald, #10b981)" />
                </div>
                <h4 className="success-title">Patient Successfully Registered & Indexed</h4>
                <p className="success-desc">
                  Longitudinal record created, Care Passport issued, and clinical profile indexed into the local vector engine for semantic retrieval.
                </p>
              </div>

              <div className="patient-receipt-grid">
                <div className="receipt-field">
                  <span className="receipt-label">Patient Name</span>
                  <span className="receipt-value">{createdPatient.full_name}</span>
                </div>
                <div className="receipt-field">
                  <span className="receipt-label">Universal Pseudonymous ID</span>
                  <span className="receipt-value-id"><code>{createdPatient.pseudonymous_id}</code></span>
                </div>
                <div className="receipt-field">
                  <span className="receipt-label">Care Passport Status</span>
                  <StatusBadge status="verified" label="Issued & Signed (Ed25519)" size="sm" />
                </div>
                <div className="receipt-field">
                  <span className="receipt-label">Local Vector Store</span>
                  <StatusBadge status="active" label="Indexed for Semantic Search" size="sm" />
                </div>
                <div className="receipt-field">
                  <span className="receipt-label">Facility & District</span>
                  <span className="receipt-value">{createdPatient.village || 'Ramnagar CHC'}, Varanasi</span>
                </div>
                <div className="receipt-field">
                  <span className="receipt-label">Registered Contact</span>
                  <span className="receipt-value">{createdPatient.phone || 'Phone not provided'} · {createdPatient.email || 'sihdori7@gmail.com'}</span>
                </div>
              </div>

              <div className="success-footer-actions">
                <Button
                  variant="outline"
                  size="md"
                  onClick={handleResetForAnother}
                  icon={<Icon name="patient" size={16} />}
                >
                  Register Another Patient
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={onClose}
                  icon={<Icon name="check" size={16} />}
                >
                  View in Patient Registry
                </Button>
              </div>
            </div>
          ) : (
            /* Registration Form */
            <form onSubmit={handleSubmit} className="reg-form">
              {errorMessage && (
                <div className="reg-error-banner" role="alert">
                  <Icon name="alert" size={16} />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Section 1: Demographics */}
              <div className="form-section-title">
                <Icon name="patient" size={16} />
                <span>1. Patient Identification & Demographics</span>
              </div>

              <div className="form-row-grid-3">
                <div className="form-field col-span-2">
                  <label htmlFor="reg-name" className="field-label required">Full Legal Name</label>
                  <input
                    id="reg-name"
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kumar"
                    className="field-input"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="reg-age" className="field-label required">Age (Years)</label>
                  <input
                    id="reg-age"
                    type="number"
                    required
                    min="1"
                    max="120"
                    placeholder="42"
                    className="field-input"
                    value={ageYears}
                    onChange={(e) => setAgeYears(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row-grid-2">
                <div className="form-field">
                  <label htmlFor="reg-gender" className="field-label required">Gender</label>
                  <select
                    id="reg-gender"
                    className="field-select"
                    value={gender}
                    onChange={(e) => setGender(e.target.value as Gender)}
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="reg-blood" className="field-label">Blood Group</label>
                  <select
                    id="reg-blood"
                    className="field-select"
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value as BloodGroup)}
                  >
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </div>
              </div>

              {/* Section 2: Contact & Location */}
              <div className="form-section-title">
                <Icon name="location" size={16} />
                <span>2. Contact, Village & Notifications</span>
              </div>

              <div className="form-row-grid-2">
                <div className="form-field">
                  <label htmlFor="reg-phone" className="field-label">Mobile Number</label>
                  <input
                    id="reg-phone"
                    type="tel"
                    placeholder="10-digit mobile number"
                    className="field-input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="reg-email" className="field-label">
                    Email Alert Address (SMTP Enabled)
                  </label>
                  <input
                    id="reg-email"
                    type="email"
                    placeholder="sihdori7@gmail.com"
                    className="field-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row-grid-2">
                <div className="form-field">
                  <label htmlFor="reg-village" className="field-label">Village / Sub-Centre</label>
                  <input
                    id="reg-village"
                    type="text"
                    placeholder="e.g. Shampur Ward 3"
                    className="field-input"
                    value={village}
                    onChange={(e) => setVillage(e.target.value)}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="reg-address" className="field-label">Address / Landmark</label>
                  <input
                    id="reg-address"
                    type="text"
                    placeholder="e.g. Plot 14, Shampur"
                    className="field-input"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row-grid-2">
                <div className="form-field">
                  <label htmlFor="reg-emergency-name" className="field-label">Emergency Contact Name</label>
                  <input
                    id="reg-emergency-name"
                    type="text"
                    placeholder="e.g. Kavita Kumar (Spouse)"
                    className="field-input"
                    value={emergencyName}
                    onChange={(e) => setEmergencyName(e.target.value)}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="reg-emergency-phone" className="field-label">Emergency Contact Phone</label>
                  <input
                    id="reg-emergency-phone"
                    type="tel"
                    placeholder="e.g. +91 98765 43211"
                    className="field-input"
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                  />
                </div>
              </div>

              {/* Section 3: Clinical Information & Symptoms */}
              <div className="form-section-title">
                <Icon name="stethoscope" size={16} />
                <span>3. Baseline Clinical Profile (Vector-Indexed for Continuity)</span>
              </div>

              <div className="form-field">
                <label htmlFor="reg-conditions" className="field-label">
                  Existing Conditions / Chief Symptoms
                </label>
                <textarea
                  id="reg-conditions"
                  rows={2}
                  className="field-textarea"
                  placeholder="e.g. Productive cough, evening fever, chest heaviness..."
                  value={existingConditions}
                  onChange={(e) => setExistingConditions(e.target.value)}
                />
              </div>

              <div className="form-field">
                <label htmlFor="reg-clinical" className="field-label">
                  Frontline Clinical Observation / Intake Note
                </label>
                <textarea
                  id="reg-clinical"
                  rows={2}
                  className="field-textarea"
                  placeholder="e.g. Suspected infiltration, referred to CHC/District Hospital for chest X-ray screening."
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                />
              </div>

              {/* DPDP Consent */}
              <div className="consent-checkbox-row">
                <input
                  type="checkbox"
                  id="reg-consent"
                  className="consent-checkbox"
                  checked={consentGiven}
                  onChange={(e) => setConsentGiven(e.target.checked)}
                />
                <label htmlFor="reg-consent" className="consent-label">
                  <strong>DPDP Act 2023 Explicit Consent:</strong> The patient or legal guardian consents to issuing a decentralized Care Passport, longitudinal record continuity, and triage routing across the public health referral chain.
                </label>
              </div>

              {/* Form Action Footer */}
              <div className="modal-footer reg-patient-footer">
                <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isSubmitting}
                  icon={<Icon name="check" size={16} />}
                >
                  Register & Issue Care Passport
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
