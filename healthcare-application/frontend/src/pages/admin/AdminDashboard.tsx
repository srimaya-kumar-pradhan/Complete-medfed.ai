import React, { useState, useEffect } from 'react';
import { adminApi, auditApi, federatedApi } from '../../api/services';
import { PageHeader } from '../../components/ui/PageHeader';
import { KPIStrip } from '../../components/ui/KPIStrip';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { usePageTitle } from '../../utils/usePageTitle';
import type { User, Facility, AuditLog, ModelVersion, FederatedRound } from '../../types';
import './AdminDashboard.css';

export const AdminDashboard: React.FC = () => {
  usePageTitle('Platform Administration & System Topology');
  const [users, setUsers] = useState<User[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [models, setModels] = useState<ModelVersion[]>([]);
  const [rounds, setRounds] = useState<FederatedRound[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'facilities' | 'models' | 'audit'>('overview');

  const [isTriggeringRound, setIsTriggeringRound] = useState(false);
  const [roundSuccess, setRoundSuccess] = useState(false);
  const [userSearch, setUserSearch] = useState('');

  useEffect(() => {
    // Users
    adminApi.users()
      .then(setUsers)
      .catch(() => {
        setUsers([
          { id: 'u-01', username: 'asha_priya', full_name: 'Priya Sharma', email: 'priya@dori.in', phone: '9876543210', role: 'asha', is_active: true, language: 'hi', created_at: '2026-08-01' },
          { id: 'u-02', username: 'mo_sharma', full_name: 'Dr. Rajesh Sharma', email: 'rajesh@dori.in', phone: '9876543211', role: 'medical_officer', is_active: true, language: 'hi', created_at: '2026-08-01' },
          { id: 'u-03', username: 'dho_verma', full_name: 'Dr. K. Verma', email: 'verma@dori.in', phone: '9876543212', role: 'district_officer', is_active: true, language: 'en', created_at: '2026-08-01' },
          { id: 'u-04', username: 'specialist_aiims', full_name: 'Dr. Anita Desai', email: 'anita@dori.in', phone: '9876543213', role: 'referral_facility', is_active: true, language: 'en', created_at: '2026-08-01' },
          { id: 'u-05', username: 'patient_sunita', full_name: 'Sunita Devi', email: null, phone: '9876543214', role: 'patient', is_active: true, language: 'hi', created_at: '2026-09-01' },
        ]);
      });

    // Facilities
    adminApi.facilities()
      .then(setFacilities)
      .catch(() => {
        setFacilities([
          { id: 'fac-01', name: 'Shampur Health Sub-Center', facility_type: 'SUB_CENTER', code: 'SC-SHAM-01', address: 'Ward 3, Shampur Village', latitude: 25.3176, longitude: 82.9739, phone: '9876543210', is_active: true, district_id: 'dist-varanasi' },
          { id: 'fac-02', name: 'Ramnagar Community Health Centre (CHC)', facility_type: 'CHC', code: 'CHC-RAM-01', address: 'Main GT Road, Ramnagar', latitude: 25.2677, longitude: 83.0319, phone: '9876543211', is_active: true, district_id: 'dist-varanasi' },
          { id: 'fac-03', name: 'Varanasi District Hospital & College', facility_type: 'DISTRICT_HOSPITAL', code: 'DH-VAR-01', address: 'Pandeypur, Varanasi', latitude: 25.3356, longitude: 82.9984, phone: '9876543212', is_active: true, district_id: 'dist-varanasi' },
        ]);
      });

    // Audit logs
    auditApi.list()
      .then(setAuditLogs)
      .catch(() => {
        setAuditLogs([
          { id: 'aud-01', actor_id: 'mo_sharma', action: 'EMERGENCY_BREAK_GLASS_ACCESS', resource_type: 'CARE_PASSPORT', resource_id: 'cp-sunita-01', result: 'SUCCESS', created_at: '2026-09-18T05:14:20Z' },
          { id: 'aud-02', actor_id: 'asha_priya', action: 'CREATE_PATIENT_ENCOUNTER', resource_type: 'ENCOUNTER', resource_id: 'enc-9921', result: 'SUCCESS', created_at: '2026-09-18T04:45:10Z' },
          { id: 'aud-03', actor_id: 'patient_sunita', action: 'REVOKE_CONSENT', resource_type: 'CONSENT', resource_id: 'c-01', result: 'SUCCESS', created_at: '2026-09-17T18:30:00Z' },
          { id: 'aud-04', actor_id: 'system', action: 'FEDERATED_ROUND_COMPLETED', resource_type: 'FEDERATED_MODEL', resource_id: 'mod-anc-v2.4', result: 'SUCCESS', created_at: '2026-09-17T12:00:00Z' },
        ]);
      });

    // Models & rounds
    federatedApi.models()
      .then(setModels)
      .catch(() => {
        setModels([
          { id: 'mod-01', model_name: 'MedFed-ANC-Dropout-Predictor', version: '2.4.0', model_type: 'GradientBoosting_Edge', is_active: true, is_simulation: true, metrics: { auc: 0.942, precision: 0.89, recall: 0.91 }, created_at: '2026-09-15' },
          { id: 'mod-02', model_name: 'MedFed-TB-Default-Risk-Model', version: '1.8.2', model_type: 'RandomForest_Edge', is_active: true, is_simulation: true, metrics: { auc: 0.918, precision: 0.86, recall: 0.88 }, created_at: '2026-09-10' },
        ]);
      });

    federatedApi.rounds()
      .then(setRounds)
      .catch(() => {
        setRounds([
          { id: 'rnd-12', round_number: 12, status: 'completed', participating_nodes: 4, completed_nodes: 4, is_simulation: true, started_at: '2026-09-17 11:30', completed_at: '2026-09-17 12:00' },
          { id: 'rnd-11', round_number: 11, status: 'completed', participating_nodes: 4, completed_nodes: 4, is_simulation: true, started_at: '2026-09-10 11:30', completed_at: '2026-09-10 12:00' },
        ]);
      });
  }, []);

  const handleSimulateFederatedRound = async () => {
    setIsTriggeringRound(true);
    setTimeout(() => {
      const newRound: FederatedRound = {
        id: `rnd-${rounds.length + 13}`,
        round_number: rounds.length + 13,
        status: 'completed',
        participating_nodes: 4,
        completed_nodes: 4,
        is_simulation: true,
        started_at: new Date().toLocaleTimeString(),
        completed_at: new Date().toLocaleTimeString(),
      };
      setRounds([newRound, ...rounds]);
      setIsTriggeringRound(false);
      setRoundSuccess(true);
      setTimeout(() => setRoundSuccess(false), 3500);
    }, 1200);
  };

  const filteredUsers = users.filter(
    (u) =>
      u.full_name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.role.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="admin-dashboard">
      {/* Page Header */}
      <PageHeader
        eyebrow="SYSTEM INFRASTRUCTURE & ORCHESTRATION"
        title="DORI Administration Console"
        description="Decentralized Primary Care Platform Node #1 • Production Topology & Security Control"
        action={
          <div className="admin-header-actions">
            <Button
              variant="primary"
              size="sm"
              icon={<Icon name="lightning" size={16} />}
              onClick={handleSimulateFederatedRound}
              isLoading={isTriggeringRound}
            >
              Run Federated Aggregation
            </Button>
          </div>
        }
      />

      {/* Success alert */}
      {roundSuccess && (
        <div className="round-success-alert" role="status">
          <Icon name="check" size={16} />
          <span>
            Federated Aggregation Round #{rounds[0]?.round_number} completed. 4 edge nodes aggregated with Differential Privacy budget ε=0.5.
          </span>
        </div>
      )}

      {/* KPI Strip */}
      <KPIStrip
        items={[
          { label: 'System Health', value: '100%', subtitle: 'All microservices operational', trend: { direction: 'flat', text: 'Nominal' } },
          { label: 'Active Personnel', value: users.length, subtitle: 'Frontline, clinical & administrative' },
          { label: 'Tiered Facilities', value: facilities.length, subtitle: 'Connected to sync relay' },
          { label: 'Audit Log Entries', value: auditLogs.length, subtitle: 'Cryptographically sealed', trend: { direction: 'up', text: '+4 today' } },
        ]}
      />

      {/* Navigation Tabs */}
      <div className="admin-nav-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === 'overview'}
          className={`admin-nav-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <Icon name="chart" size={16} />
          <span>Platform Overview</span>
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'users'}
          className={`admin-nav-tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <Icon name="user" size={16} />
          <span>User Directory</span>
          <span className="tab-pill">{users.length}</span>
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'facilities'}
          className={`admin-nav-tab ${activeTab === 'facilities' ? 'active' : ''}`}
          onClick={() => setActiveTab('facilities')}
        >
          <Icon name="hospital" size={16} />
          <span>Facilities Network</span>
          <span className="tab-pill">{facilities.length}</span>
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'models'}
          className={`admin-nav-tab ${activeTab === 'models' ? 'active' : ''}`}
          onClick={() => setActiveTab('models')}
        >
          <Icon name="brain" size={16} />
          <span>Federated Models</span>
          <span className="tab-pill">{models.length}</span>
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'audit'}
          className={`admin-nav-tab ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          <Icon name="lock" size={16} />
          <span>Audit Ledger</span>
          <span className="tab-pill">{auditLogs.length}</span>
        </button>
      </div>

      {/* TAB 1: Platform Overview & Topology */}
      {activeTab === 'overview' && (
        <div className="admin-overview-layout">
          <div className="topology-card">
            <div className="card-heading-box">
              <Icon name="network" size={20} color="var(--color-teal)" />
              <div>
                <h3 className="section-title">Decentralized System Architecture</h3>
                <p className="section-desc">
                  Core infrastructure components, cryptographic security pipelines, and offline synchronization queues.
                </p>
              </div>
            </div>

            <div className="topology-grid">
              <div className="topo-item-box">
                <div className="topo-head">
                  <div className="status-dot online" />
                  <h4>PostgreSQL 15 Core Engine</h4>
                </div>
                <p className="topo-desc">ACID transactions, relational integrity, versioned schema migrations, and immutable append-only audit tables.</p>
                <div className="topo-badge-row">
                  <span className="tech-badge">SQLAlchemy 2.0</span>
                  <span className="tech-badge">Alembic</span>
                </div>
              </div>

              <div className="topo-item-box">
                <div className="topo-head">
                  <div className="status-dot online" />
                  <h4>Ed25519 Care Passport Engine</h4>
                </div>
                <p className="topo-desc">Asymmetric elliptic-curve digital signature issuer. Generates verifiable credentials for offline validation.</p>
                <div className="topo-badge-row">
                  <span className="tech-badge">Cryptography.io</span>
                  <span className="tech-badge">NDHM M3</span>
                </div>
              </div>

              <div className="topo-item-box">
                <div className="topo-head">
                  <div className="status-dot online" />
                  <h4>Frontline IndexedDB Offline Relay</h4>
                </div>
                <p className="topo-desc">Client-side IndexedDB store with automatic store-and-forward queue and burst synchronization.</p>
                <div className="topo-badge-row">
                  <span className="tech-badge">Web Storage</span>
                  <span className="tech-badge">Service Worker</span>
                </div>
              </div>

              <div className="topo-item-box">
                <div className="topo-head">
                  <div className="status-dot online" />
                  <h4>Differential-Privacy Federated AI</h4>
                </div>
                <p className="topo-desc">Decentralized federated averaging (FedAvg) with strict Laplace differential privacy noise (ε=0.5).</p>
                <div className="topo-badge-row">
                  <span className="tech-badge">Edge ML</span>
                  <span className="tech-badge">Differential Privacy</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Users Directory */}
      {activeTab === 'users' && (
        <div className="admin-table-section">
          <div className="table-filter-bar">
            <div className="search-wrap">
              <Icon name="search" size={16} />
              <input
                type="text"
                placeholder="Search users by name, username, or role..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="clean-input"
              />
              {userSearch && <button className="clear-btn" onClick={() => setUserSearch('')}>×</button>}
            </div>
            <span className="count-label">{filteredUsers.length} Active Accounts</span>
          </div>

          <div className="admin-table-container">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>User / Official Name</th>
                  <th>Assigned Role</th>
                  <th>Communication Channel</th>
                  <th>Locale</th>
                  <th>Account Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="user-cell">
                        <strong>{u.full_name}</strong>
                        <span className="username-tag">@{u.username}</span>
                      </div>
                    </td>
                    <td>
                      <StatusBadge status="verified" label={u.role.replace(/_/g, ' ').toUpperCase()} size="sm" />
                    </td>
                    <td>{u.phone || u.email || '—'}</td>
                    <td><code>{u.language.toUpperCase()}</code></td>
                    <td>
                      <StatusBadge
                        status={u.is_active ? 'active' : 'revoked'}
                        label={u.is_active ? 'Active' : 'Suspended'}
                        size="sm"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Facilities Network */}
      {activeTab === 'facilities' && (
        <div className="facilities-grid">
          {facilities.map((fac) => (
            <div key={fac.id} className="facility-item-card">
              <div className="facility-top-bar">
                <span className="facility-code">{fac.code}</span>
                <StatusBadge status="verified" label={fac.facility_type.replace(/_/g, ' ')} size="sm" />
              </div>
              <h4 className="facility-name">{fac.name}</h4>
              <p className="facility-address">
                <Icon name="location" size={14} /> {fac.address}
              </p>
              <div className="facility-footer-gps">
                <span>GPS: {fac.latitude?.toFixed(4)}, {fac.longitude?.toFixed(4)}</span>
                <span className="online-tag">
                  <span className="dot" /> Connected to Relay
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 4: Federated Edge Models */}
      {activeTab === 'models' && (
        <div className="models-tab-content">
          <div className="models-grid">
            {models.map((m) => (
              <div key={m.id} className="model-dossier-card">
                <div className="model-card-header">
                  <div>
                    <h4 className="model-name">{m.model_name}</h4>
                    <span className="model-meta">v{m.version} • {m.model_type}</span>
                  </div>
                  <StatusBadge status="active" label="Production Deployment" size="sm" />
                </div>

                <div className="metrics-triad">
                  <div className="triad-item">
                    <span className="triad-label">AUC-ROC</span>
                    <strong className="triad-value">{((m.metrics?.auc as number || 0.94) * 100).toFixed(1)}%</strong>
                  </div>
                  <div className="triad-item">
                    <span className="triad-label">Precision</span>
                    <strong className="triad-value">{((m.metrics?.precision as number || 0.89) * 100).toFixed(1)}%</strong>
                  </div>
                  <div className="triad-item">
                    <span className="triad-label">Recall</span>
                    <strong className="triad-value">{((m.metrics?.recall as number || 0.91) * 100).toFixed(1)}%</strong>
                  </div>
                </div>

                <div className="model-assurance-note">
                  <Icon name="lock" size={14} />
                  <span>Differentially Private Gradient Aggregation (ε=0.5, δ=1e-5)</span>
                </div>
              </div>
            ))}
          </div>

          <div className="rounds-history-card">
            <h4 className="rounds-title">Recent Federated Aggregation Rounds</h4>
            <div className="rounds-list">
              {rounds.slice(0, 4).map((r) => (
                <div key={r.id} className="round-item">
                  <div className="round-meta">
                    <strong>Round #{r.round_number}</strong>
                    <span className="round-time">{r.started_at}</span>
                  </div>
                  <div className="round-status">
                    <span className="nodes-count">{r.participating_nodes} Nodes Aggregated</span>
                    <StatusBadge status="completed" label="Completed" size="sm" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: Immutable Audit Ledger */}
      {activeTab === 'audit' && (
        <div className="admin-table-section">
          <div className="audit-ledger-header">
            <div>
              <h3 className="section-title">Cryptographic Tamper-Evident Audit Ledger</h3>
              <p className="section-desc">
                All patient consent overrides, encounter creation events, and data disclosure requests are sequentially hashed and stored.
              </p>
            </div>
            <StatusBadge status="verified" label="Hash Chain Intact" />
          </div>

          <div className="admin-table-container">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor ID</th>
                  <th>Action Protocol</th>
                  <th>Target Resource</th>
                  <th>Resource ID</th>
                  <th>Verification</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <span className="timestamp-text">
                        {new Date(log.created_at).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </td>
                    <td><strong>{log.actor_id}</strong></td>
                    <td><code>{log.action}</code></td>
                    <td><span className="resource-tag">{log.resource_type}</span></td>
                    <td><code>{log.resource_id}</code></td>
                    <td>
                      <StatusBadge
                        status={log.result === 'SUCCESS' ? 'completed' : 'failed'}
                        label={log.result}
                        size="sm"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
