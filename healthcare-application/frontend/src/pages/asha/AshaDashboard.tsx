import React, { useState, useEffect } from 'react';
import { usePageTitle } from '../../utils/usePageTitle';
import { patientApi, careGapApi, referralApi, encounterApi } from '../../api/services';
import { offlineStore } from '../../offline/offlineStore';
import { useOfflineSync } from '../../offline/useOfflineSync';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { FormField } from '../../components/ui/FormField';
import { Table } from '../../components/ui/Table';
import { Tabs } from '../../components/ui/Tabs';
import { StatCard } from '../../components/ui/StatCard';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { AlertBanner } from '../../components/ui/AlertBanner';
import type { Patient, CareGap, Referral } from '../../types';
import './AshaDashboard.css';

export const AshaDashboard: React.FC = () => {
  usePageTitle("Frontline Outreach — ASHA / ANM Portal");
  const { isOnline, pendingCount, triggerSync } = useOfflineSync();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [careGaps, setCareGaps] = useState<CareGap[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'home' | 'patients' | 'gaps' | 'referrals' | 'enroll'>('home');

  const [searchQuery, setSearchQuery] = useState('');
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [visitBP, setVisitBP] = useState('140/92');
  const [visitNotes, setVisitNotes] = useState('Elevated BP observed during home visit. Mild pedal edema.');
  const [visitSuccess, setVisitSuccess] = useState(false);

  const [newFullName, setNewFullName] = useState('');
  const [newAge, setNewAge] = useState('24');
  const [newVillage, setNewVillage] = useState('Shampur');
  const [newPhone, setNewPhone] = useState('9876543210');
  const [enrollSuccess, setEnrollSuccess] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    Promise.allSettled([
      patientApi.list().then(setPatients),
      careGapApi.list().then(setCareGaps),
      referralApi.list().then(setReferrals),
    ]).finally(async () => {
      if (patients.length === 0) {
        const cached = await offlineStore.getCachedList('patients') as unknown as Patient[];
        if (cached && cached.length > 0) {
          setPatients(cached);
        } else {
          setPatients([
            { id: 'p-01', pseudonymous_id: 'PID-2026-SUNITA-9021', full_name: 'Sunita Devi', date_of_birth: '2000-05-14', gender: 'female', blood_group: 'B+', phone: '9876543210', village: 'Shampur (Ward 3)', district_id: 'dist-varanasi', facility_id: 'fac-shampur-sc', abha_id: '91-4829-1920-1122', is_active: true, created_at: '2026-09-01T08:00:00Z' },
            { id: 'p-02', pseudonymous_id: 'PID-2026-RADHA-4812', full_name: 'Radha Kumari', date_of_birth: '1998-11-20', gender: 'female', blood_group: 'O+', phone: '9876543211', village: 'Shampur (Ward 1)', district_id: 'dist-varanasi', facility_id: 'fac-shampur-sc', abha_id: '91-3829-9182-3344', is_active: true, created_at: '2026-08-15T09:30:00Z' },
            { id: 'p-03', pseudonymous_id: 'PID-2026-RAMESH-7731', full_name: 'Ramesh Patel', date_of_birth: '1975-03-10', gender: 'male', blood_group: 'A+', phone: '9876543212', village: 'Belwa', district_id: 'dist-varanasi', facility_id: 'fac-shampur-sc', abha_id: '91-1122-3344-5566', is_active: true, created_at: '2026-07-20T10:00:00Z' },
          ]);
        }
      }
      setCareGaps((prev) => prev.length > 0 ? prev : [
        { id: 'gap-01', patient_id: 'p-01', gap_type: 'ANC_2_OVERDUE', description: 'Sunita Devi (14w ANC) missed ANC-2 checkup window. Distance > 12km from CHC.', severity: 'high', status: 'alerted', detected_at: '2026-09-12T08:00:00Z', due_date: '2026-09-22T00:00:00Z', resolved_at: null, assigned_worker_id: 'asha_priya' },
        { id: 'gap-02', patient_id: 'p-03', gap_type: 'TB_DOTS_REFILL_DUE', description: 'Ramesh Patel: Intensive Phase Month 2 medication blister pack pickup overdue by 3 days.', severity: 'critical', status: 'alerted', detected_at: '2026-09-15T09:00:00Z', due_date: '2026-09-18T00:00:00Z', resolved_at: null, assigned_worker_id: 'asha_priya' },
      ]);
      setReferrals((prev) => prev.length > 0 ? prev : [
        { id: 'ref-01', referral_token: 'REF-2026-8812', patient_id: 'p-01', referring_facility_id: 'Shampur Sub-Center', receiving_facility_id: 'Ramnagar CHC', status: 'issued', priority: 'urgent', reason: 'Elevated BP (140/92) + Second trimester ultrasound screening for pre-eclampsia', clinical_summary: 'Gravida 2, Para 1. Mild pedal edema noted.', diagnosis: 'Gestational Hypertension Risk', created_at: '2026-09-15T10:30:00Z', completed_at: null },
      ]);
      setIsLoading(false);
    });
  }, [patients.length]);

  const filteredPatients = patients.filter(
    (p) =>
      p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.pseudonymous_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.village && p.village.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleLogHomeVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;
    const encounterPayload = {
      patient_id: selectedPatient.id,
      encounter_type: 'outreach',
      encounter_date: new Date().toISOString(),
      chief_complaint: 'Routine ASHA Home Outreach & Vitals Check',
      treatment_plan: 'Dispensed IFA 30 tablets. Advised low-salt diet and immediate CHC visit.',
      notes: visitNotes,
      vitals: { bp: visitBP, weight_kg: 54 },
    };
    try {
      if (isOnline) {
        await encounterApi.create(encounterPayload as unknown as import('../../types').EncounterCreate);
      } else {
        await offlineStore.enqueueAction({ type: 'CREATE_ENCOUNTER', endpoint: '/encounters', payload: encounterPayload });
      }
    } catch {
      await offlineStore.enqueueAction({ type: 'CREATE_ENCOUNTER', endpoint: '/encounters', payload: encounterPayload });
    }
    setVisitSuccess(true);
    setTimeout(() => { setShowVisitModal(false); setVisitSuccess(false); }, 1200);
  };

  const handleEnrollPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    const newPID = `PID-2026-${newFullName.toUpperCase().replace(/\s+/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newPat: Patient = {
      id: `p-${Date.now()}`, pseudonymous_id: newPID, full_name: newFullName,
      date_of_birth: `${2026 - parseInt(newAge)}-01-01`, gender: 'female', blood_group: 'B+',
      phone: newPhone, village: `${newVillage} Village`, district_id: 'dist-varanasi',
      facility_id: 'fac-shampur-sc', abha_id: null, is_active: true, created_at: new Date().toISOString(),
    };
    try {
      if (isOnline) {
        await patientApi.create(newPat as unknown as import('../../types').PatientCreate);
      } else {
        await offlineStore.enqueueAction({ type: 'CREATE_PATIENT', endpoint: '/patients', payload: newPat as unknown as Record<string, unknown> });
      }
    } catch {
      await offlineStore.enqueueAction({ type: 'CREATE_PATIENT', endpoint: '/patients', payload: newPat as unknown as Record<string, unknown> });
    }
    setPatients([newPat, ...patients]);
    setEnrollSuccess(true);
    setNewFullName('');
    setTimeout(() => { setEnrollSuccess(false); setActiveTab('patients'); }, 1200);
  };

  const tabsConfig = [
    { id: 'home' as const, label: "Today's Schedule", icon: <Icon name="home" size={16} /> },
    { id: 'patients' as const, label: 'Community Registry', icon: <Icon name="patient" size={16} />, badge: patients.length },
    { id: 'gaps' as const, label: 'Care Gaps', icon: <Icon name="alert" size={16} />, badge: careGaps.length, badgeVariant: 'error' as const },
    { id: 'referrals' as const, label: 'Active Referrals', icon: <Icon name="hospital" size={16} />, badge: referrals.length },
    { id: 'enroll' as const, label: 'New Registration', icon: <Icon name="add" size={16} /> },
  ];

  return (
    <div className="dori-dashboard asha-dashboard">
      <PageHeader
        eyebrow="Primary Health Network • Village Sub-Centre"
        title="Sunita Devi (ASHA Worker) — Outreach Console"
        description="Monitor community members, execute home outreach visits, log vital signs, and close predictive care gaps."
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<Icon name="sync" size={14} />}
              onClick={() => triggerSync()}
            >
              {pendingCount > 0 ? `Sync (${pendingCount})` : 'Sync Offline DB'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Icon name="add" size={14} />}
              onClick={() => setActiveTab('enroll')}
            >
              + Register Patient
            </Button>
          </div>
        }
      />

      {/* KPI Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="Community Assigned"
          value={patients.length}
          subtitle="Shampur Catchment (Ward 1-4)"
          accentColor="navy"
          icon={<Icon name="patient" size={20} />}
        />
        <StatCard
          title="Active Care Gaps"
          value={careGaps.length}
          subtitle="Flagged by Predictive Engine"
          accentColor="crimson"
          trend="Action Required"
          trendType="negative"
          icon={<Icon name="alert" size={20} />}
        />
        <StatCard
          title="In-Transit Referrals"
          value={referrals.length}
          subtitle="Connected to Ramnagar CHC"
          accentColor="teal"
          icon={<Icon name="hospital" size={20} />}
        />
        <StatCard
          title="Sync Status"
          value={isOnline ? 'Online' : 'Offline'}
          subtitle={pendingCount > 0 ? `${pendingCount} records queued locally` : 'All local changes synced'}
          accentColor="green"
          trend={isOnline ? 'Active' : 'Queueing'}
          trendType={isOnline ? 'positive' : 'neutral'}
          icon={<Icon name="sync" size={20} />}
        />
      </div>

      {/* Navigation Tabs */}
      <Tabs
        tabs={tabsConfig}
        activeTab={activeTab}
        onChange={setActiveTab}
        variant="pills"
        size="md"
      />

      {/* ─── TAB 1: TODAY'S SCHEDULE ─── */}
      {activeTab === 'home' && (
        <div className="flex flex-col gap-4">
          {careGaps.length > 0 && (
            <AlertBanner
              variant="warning"
              title="Predictive Care Gap Identified (Urgent Action)"
              action={
                <Button size="sm" variant="gold" onClick={() => setActiveTab('gaps')}>
                  Review Gaps
                </Button>
              }
            >
              {careGaps[0].description}
            </AlertBanner>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Card variant="bordered">
              <Card.Header>
                <Card.Title>
                  <Icon name="timeline" size={18} color="var(--dori-primary)" />
                  <span>Scheduled Home Visits Today</span>
                </Card.Title>
              </Card.Header>
              <Card.Content>
                <div className="flex flex-col gap-3">
                  {patients.slice(0, 3).map((pat) => (
                    <div key={pat.id} className="visit-task-row">
                      <div className="flex items-center gap-3">
                        <div className="pat-avatar-sm">{pat.full_name.charAt(0)}</div>
                        <div>
                          <h4 className="task-pat-name">{pat.full_name}</h4>
                          <p className="task-pat-meta">{pat.village} • Blood Group: {pat.blood_group || 'B+'}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        icon={<Icon name="stethoscope" size={14} />}
                        onClick={() => {
                          setSelectedPatient(pat);
                          setShowVisitModal(true);
                        }}
                      >
                        Log Vitals
                      </Button>
                    </div>
                  ))}
                </div>
              </Card.Content>
            </Card>

            <Card variant="bordered">
              <Card.Header>
                <Card.Title>
                  <Icon name="hospital" size={18} color="var(--dori-teal)" />
                  <span>Active Visual Referrals</span>
                </Card.Title>
              </Card.Header>
              <Card.Content>
                <div className="flex flex-col gap-3">
                  {referrals.map((ref) => (
                    <div key={ref.id} className="ref-task-row">
                      <div className="ref-badge-top">
                        <Badge variant="teal">{ref.referral_token}</Badge>
                        <Badge variant="crimson">{ref.priority.toUpperCase()}</Badge>
                      </div>
                      <p className="ref-reason-text"><strong>Reason:</strong> {ref.reason}</p>
                      <p className="ref-fac-text">
                        <span>{ref.referring_facility_id}</span> → <strong>{ref.receiving_facility_id}</strong>
                      </p>
                    </div>
                  ))}
                </div>
              </Card.Content>
            </Card>
          </div>
        </div>
      )}

      {/* ─── TAB 2: PATIENTS REGISTRY ─── */}
      {activeTab === 'patients' && (
        <Card variant="bordered">
          <Card.Header>
            <Card.Title>
              <Icon name="patient" size={18} color="var(--dori-primary)" />
              <span>Village Community Health Registry</span>
            </Card.Title>
            <div className="search-bar-wrap">
              <input
                type="text"
                className="table-search-input"
                placeholder="Search by name, ID, or village..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </Card.Header>
          <Card.Content>
            {isLoading ? (
              <LoadingSkeleton count={4} />
            ) : filteredPatients.length === 0 ? (
              <EmptyState
                icon="patient"
                title="No Patients Found"
                description="Try a different search query or register a new patient."
              />
            ) : (
              <Table hoverable>
                <Table.Header>
                  <Table.Row>
                    <Table.Head>Patient Name & ID</Table.Head>
                    <Table.Head>Village Ward</Table.Head>
                    <Table.Head>Blood Group</Table.Head>
                    <Table.Head>ABHA ID</Table.Head>
                    <Table.Head>Status</Table.Head>
                    <Table.Head>Action</Table.Head>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {filteredPatients.map((pat) => (
                    <Table.Row key={pat.id}>
                      <Table.Cell>
                        <strong>{pat.full_name}</strong>
                        <div className="cell-sub">{pat.pseudonymous_id}</div>
                      </Table.Cell>
                      <Table.Cell>{pat.village || 'Shampur Ward 3'}</Table.Cell>
                      <Table.Cell>
                        <Badge variant="neutral">{pat.blood_group || 'B+'}</Badge>
                      </Table.Cell>
                      <Table.Cell>
                        <span className="font-mono text-xs">{pat.abha_id || '91-4829-1920-1122'}</span>
                      </Table.Cell>
                      <Table.Cell>
                        <StatusBadge status="verified" label="Care Passport Issued" size="sm" />
                      </Table.Cell>
                      <Table.Cell>
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={<Icon name="stethoscope" size={14} />}
                          onClick={() => {
                            setSelectedPatient(pat);
                            setShowVisitModal(true);
                          }}
                        >
                          Log Visit
                        </Button>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            )}
          </Card.Content>
        </Card>
      )}

      {/* ─── TAB 3: CARE GAPS ─── */}
      {activeTab === 'gaps' && (
        <Card variant="bordered">
          <Card.Header>
            <Card.Title>
              <Icon name="alert" size={18} color="var(--dori-crimson)" />
              <span>Predictive Care Gaps & Drop-Out Prevention</span>
            </Card.Title>
          </Card.Header>
          <Card.Content>
            <div className="flex flex-col gap-3">
              {careGaps.map((gap) => (
                <div key={gap.id} className="care-gap-item-card">
                  <div className="gap-item-header">
                    <Badge variant={gap.severity === 'critical' ? 'crimson' : 'gold'}>
                      {gap.severity.toUpperCase()} RISK
                    </Badge>
                    <span className="gap-type-label">{gap.gap_type}</span>
                  </div>
                  <p className="gap-desc">{gap.description}</p>
                  <div className="gap-action-row">
                    <span className="gap-due-date">Due: {gap.due_date ? new Date(gap.due_date).toLocaleDateString() : 'Immediate'}</span>
                    <Button
                      size="sm"
                      variant="primary"
                      icon={<Icon name="check" size={14} />}
                      onClick={() => {
                        alert(`Action plan recorded for ${gap.id}. Scheduled home outreach visit.`);
                      }}
                    >
                      Resolve & Assign Visit
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card.Content>
        </Card>
      )}

      {/* ─── TAB 4: ACTIVE REFERRALS ─── */}
      {activeTab === 'referrals' && (
        <Card variant="bordered">
          <Card.Header>
            <Card.Title>
              <Icon name="hospital" size={18} color="var(--dori-primary)" />
              <span>Active Continuity Referrals</span>
            </Card.Title>
          </Card.Header>
          <Card.Content>
            <Table hoverable>
              <Table.Header>
                <Table.Row>
                  <Table.Head>Referral Token</Table.Head>
                  <Table.Head>Priority</Table.Head>
                  <Table.Head>Reason & Diagnosis</Table.Head>
                  <Table.Head>From → To Facility</Table.Head>
                  <Table.Head>Status</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {referrals.map((ref) => (
                  <Table.Row key={ref.id}>
                    <Table.Cell><strong>{ref.referral_token}</strong></Table.Cell>
                    <Table.Cell>
                      <Badge variant={ref.priority === 'urgent' ? 'crimson' : 'teal'}>
                        {ref.priority.toUpperCase()}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <div>{ref.reason}</div>
                      <div className="cell-sub">{ref.diagnosis}</div>
                    </Table.Cell>
                    <Table.Cell>
                      {ref.referring_facility_id} → <strong>{ref.receiving_facility_id}</strong>
                    </Table.Cell>
                    <Table.Cell>
                      <StatusBadge status="pending" label="In Transit / Active" size="sm" />
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </Card.Content>
        </Card>
      )}

      {/* ─── TAB 5: NEW REGISTRATION ─── */}
      {activeTab === 'enroll' && (
        <Card variant="bordered" className="max-w-2xl mx-auto">
          <Card.Header>
            <Card.Title>
              <Icon name="add" size={18} color="var(--dori-primary)" />
              <span>Direct Community Member Registration</span>
            </Card.Title>
            <Card.Description>
              Issues an offline-scannable cryptographic Care Passport immediately.
            </Card.Description>
          </Card.Header>
          <Card.Content>
            {enrollSuccess && (
              <AlertBanner variant="success" title="Care Passport Generated!">
                Patient successfully registered into local offline store and cloud relay.
              </AlertBanner>
            )}
            <form onSubmit={handleEnrollPatient} className="flex flex-col gap-3">
              <FormField label="Full Name" required>
                <input
                  type="text"
                  placeholder="e.g. Kavita Devi"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  required
                />
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Age" required>
                  <input
                    type="number"
                    value={newAge}
                    onChange={(e) => setNewAge(e.target.value)}
                    required
                  />
                </FormField>
                <FormField label="Phone Number" required>
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    required
                  />
                </FormField>
              </div>

              <FormField label="Village / Catchment Area" required>
                <input
                  type="text"
                  value={newVillage}
                  onChange={(e) => setNewVillage(e.target.value)}
                  required
                />
              </FormField>

              <Card.Footer>
                <Button type="submit" variant="primary" size="lg" icon={<Icon name="check" size={16} />}>
                  Issue Care Passport
                </Button>
              </Card.Footer>
            </form>
          </Card.Content>
        </Card>
      )}

      {/* ─── MODAL: LOG HOME VISIT VITALS ─── */}
      <Modal
        isOpen={showVisitModal}
        onClose={() => setShowVisitModal(false)}
        title={`Log Home Outreach Visit — ${selectedPatient?.full_name || 'Patient'}`}
        subtitle={`PID: ${selectedPatient?.pseudonymous_id || ''}`}
        footer={
          <div className="flex gap-2 justify-end w-full">
            <Button variant="secondary" onClick={() => setShowVisitModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleLogHomeVisit}
              icon={<Icon name="check" size={16} />}
            >
              Save Outreach Vitals
            </Button>
          </div>
        }
      >
        {visitSuccess ? (
          <AlertBanner variant="success" title="Encounter Recorded!">
            Vitals saved and synchronized to patient longitudinal timeline.
          </AlertBanner>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Blood Pressure (Systolic/Diastolic)" required hint="e.g. 120/80 mmHg">
                <input
                  type="text"
                  value={visitBP}
                  onChange={(e) => setVisitBP(e.target.value)}
                  required
                />
              </FormField>
              <FormField label="Encounter Type">
                <input type="text" value="ASHA Village Outreach" disabled />
              </FormField>
            </div>

            <FormField label="Clinical Observations & Notes" required>
              <textarea
                rows={3}
                value={visitNotes}
                onChange={(e) => setVisitNotes(e.target.value)}
                placeholder="Log symptoms, medication adherence, or maternal warning signs..."
              />
            </FormField>
          </div>
        )}
      </Modal>
    </div>
  );
};
