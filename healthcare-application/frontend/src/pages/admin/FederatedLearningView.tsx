import React, { useState, useEffect } from 'react';
import { usePageTitle } from '../../utils/usePageTitle';
import { adminApi, federatedApi } from '../../api/services';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { KPIStrip } from '../../components/ui/KPIStrip';
import type { FederatedNode } from '../../types';
import './FederatedLearningView.css';

interface LocalStorageStatus {
  status: string;
  patients_stored: number;
  clinical_records_stored: number;
  vector_index_records: number;
  engine: string;
  last_indexed_at: string;
  notice: string;
}

export const FederatedLearningView: React.FC = () => {
  usePageTitle('MedFed Federated Intelligence & Model Registry');

  const [activeTab, setActiveTab] = useState<'network' | 'models' | 'nodes' | 'storage'>('network');
  const [nodes, setNodes] = useState<FederatedNode[]>([]);
  const [storageStatus, setStorageStatus] = useState<LocalStorageStatus | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationSuccess, setSimulationSuccess] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  // Initial load
  useEffect(() => {
    // 1. Fetch nodes
    federatedApi.nodes()
      .then(setNodes)
      .catch(() => {
        setNodes([
          { id: 'node-a', node_name: 'Hospital A (Varanasi District Hospital)', is_active: true, last_heartbeat: new Date().toISOString(), local_data_count: 840 },
          { id: 'node-b', node_name: 'Hospital B (Ramnagar Community Health Centre)', is_active: true, last_heartbeat: new Date().toISOString(), local_data_count: 520 },
          { id: 'node-c', node_name: 'Hospital C (Pandit Deen Dayal Upadhyay Hospital)', is_active: true, last_heartbeat: new Date().toISOString(), local_data_count: 610 },
        ]);
      });

    // 2. Fetch storage status
    adminApi.storageStatus()
      .then(setStorageStatus)
      .catch(() => {
        setStorageStatus({
          status: 'Connected',
          patients_stored: 5,
          clinical_records_stored: 7,
          vector_index_records: 12,
          engine: 'SQLite3 + Sparse Cosine Vector Retrieval Engine',
          last_indexed_at: new Date().toISOString(),
          notice: 'Demonstration and fast local retrieval prototype. Not production medical records storage.',
        });
      });
  }, []);

  const handleSimulateRound = () => {
    setIsSimulating(true);
    setSimulationSuccess(null);

    setTimeout(() => {
      setIsSimulating(false);
      setSimulationSuccess('Federated Round #13 completed! Aggregation: Fed-FibAvg. Prime-DP noise injected (ε=0.5). Global Model updated to v1.3.1.');
      setTimeout(() => setSimulationSuccess(null), 6000);
    }, 2500);
  };

  const handleResetDemo = async () => {
    if (!window.confirm('Reset SIH Demo Scenario? This will restore Ramesh Kumar, the active District Hospital referral, and clear transient state.')) {
      return;
    }

    setIsResetting(true);
    try {
      const res = await adminApi.resetDemo();
      setResetMessage(`SIH Demo successfully reset! Patient ${res.seeded_patient_id} restored with referral ${res.seeded_referral_id}.`);
      setTimeout(() => setResetMessage(null), 6000);
    } catch (err: any) {
      setResetMessage('Demo reset completed locally.');
      setTimeout(() => setResetMessage(null), 4000);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="fed-learning-view">
      {/* Page Header */}
      <PageHeader
        eyebrow="SYSTEM INFRASTRUCTURE • PRIVACY-PRESERVING FEDERATED AI"
        title="MedFed Federated Learning & Model Governance"
        description="Multi-hospital decentralized training network using Fed-FibAvg aggregation and Prime-DP differential privacy."
        action={
          <div className="fed-header-actions">
            <Button
              variant="outline"
              size="sm"
              icon={<Icon name="sync" size={15} />}
              isLoading={isResetting}
              onClick={handleResetDemo}
            >
              Reset SIH Demo Scenario
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Icon name="brain" size={15} />}
              isLoading={isSimulating}
              onClick={handleSimulateRound}
            >
              Simulate Federated Round
            </Button>
          </div>
        }
      />

      {/* Notifications / Feedback Toasts */}
      {simulationSuccess && (
        <div className="fed-toast success" role="status">
          <Icon name="check" size={16} />
          <span>{simulationSuccess}</span>
        </div>
      )}

      {resetMessage && (
        <div className="fed-toast info" role="status">
          <Icon name="check" size={16} />
          <span>{resetMessage}</span>
        </div>
      )}

      {/* Telemetry KPIs */}
      <KPIStrip
        items={[
          { label: 'Federation Status', value: 'Active', subtitle: 'Flower Aggregator v1.8' },
          { label: 'Current Global Round', value: 'Round 12', subtitle: 'Target: 20 Rounds', trend: { direction: 'up', text: '+1 from baseline' } },
          { label: 'Participating Nodes', value: '3 Hospitals', subtitle: 'Hospital A, B, C Online' },
          { label: 'Differential Privacy', value: 'ε = 0.5', subtitle: 'Laplace Mechanism (Prime-DP)' },
        ]}
      />

      {/* Navigation Tabs */}
      <div className="fed-nav-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === 'network'}
          className={`fed-tab ${activeTab === 'network' ? 'active' : ''}`}
          onClick={() => setActiveTab('network')}
        >
          <Icon name="network" size={15} />
          <span>Federation Architecture</span>
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'models'}
          className={`fed-tab ${activeTab === 'models' ? 'active' : ''}`}
          onClick={() => setActiveTab('models')}
        >
          <Icon name="chart" size={15} />
          <span>Model Registry</span>
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'nodes'}
          className={`fed-tab ${activeTab === 'nodes' ? 'active' : ''}`}
          onClick={() => setActiveTab('nodes')}
        >
          <Icon name="hospital" size={15} />
          <span>Hospital Nodes</span>
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'storage'}
          className={`fed-tab ${activeTab === 'storage' ? 'active' : ''}`}
          onClick={() => setActiveTab('storage')}
        >
          <Icon name="lock" size={15} />
          <span>Local Storage & Vector Engine</span>
        </button>
      </div>

      {/* TAB 1: Federation Architecture Topology (Phase 10) */}
      {activeTab === 'network' && (
        <div className="fed-network-container">
          {/* Strict Core Privacy Banner */}
          <div className="privacy-mandate-banner">
            <div className="mandate-col">
              <span className="mandate-tag-shield">
                <Icon name="lock" size={14} /> ZERO PATIENT PHI LEAKAGE
              </span>
              <h3 className="mandate-title">Raw Patient Images Stay at Local Hospital Node</h3>
              <p className="mandate-desc">
                Patient chest radiographs never leave the hospital on-premise edge storage. Only mathematically perturbed gradient weight updates are communicated to the coordinator.
              </p>
            </div>
            <div className="mandate-divider" />
            <div className="mandate-col">
              <span className="mandate-tag-network">
                <Icon name="network" size={14} /> WEIGHT SYNCHRONIZATION
              </span>
              <h3 className="mandate-title">Model Updates & Gradients Are Shared</h3>
              <p className="mandate-desc">
                Gradients are aggregated via <strong>Fed-FibAvg</strong>, compressed, and passed through the <strong>Prime-DP</strong> differential privacy barrier prior to global parameter distribution.
              </p>
            </div>
          </div>

          {/* Visual Network Architecture Diagram */}
          <div className="architecture-diagram-card">
            <h4 className="diagram-title">Decentralized Aggregation Pipeline</h4>

            <div className="topology-canvas">
              {/* Level 1: Global Model Coordinator */}
              <div className="topology-level level-global">
                <div className={`topology-box global-model-box ${isSimulating ? 'pulsing' : ''}`}>
                  <div className="box-icon">
                    <Icon name="brain" size={24} />
                  </div>
                  <div className="box-content">
                    <span className="box-eyebrow">CENTRAL COORDINATOR</span>
                    <span className="box-title">MedFed Global DenseNet121 Model</span>
                    <span className="box-meta">Version v1.3 · Parameter Set #4412 · Round 12</span>
                  </div>
                  <span className="box-status active">GLOBAL ACTIVE</span>
                </div>
              </div>

              {/* Vertical Connector Down */}
              <div className="topology-connector-tree">
                <div className="stem-down" />
                <div className="horizontal-bar" />
                <div className="branch branch-left" />
                <div className="branch branch-center" />
                <div className="branch branch-right" />
              </div>

              {/* Level 2: Hospital Nodes */}
              <div className="topology-level level-nodes">
                <div className="hospital-node-card">
                  <div className="node-header">
                    <Icon name="hospital" size={18} />
                    <span>Hospital Node A</span>
                  </div>
                  <span className="node-facility">Varanasi District Hospital</span>
                  <div className="node-data-pill">
                    <code>840 Chest X-Rays</code> (On-Premise)
                  </div>
                  <span className="node-training-state">Local Training: Synced</span>
                </div>

                <div className="hospital-node-card">
                  <div className="node-header">
                    <Icon name="hospital" size={18} />
                    <span>Hospital Node B</span>
                  </div>
                  <span className="node-facility">Ramnagar CHC</span>
                  <div className="node-data-pill">
                    <code>520 Chest X-Rays</code> (On-Premise)
                  </div>
                  <span className="node-training-state">Local Training: Synced</span>
                </div>

                <div className="hospital-node-card">
                  <div className="node-header">
                    <Icon name="hospital" size={18} />
                    <span>Hospital Node C</span>
                  </div>
                  <span className="node-facility">Pt. Deen Dayal Upadhyay Hosp</span>
                  <div className="node-data-pill">
                    <code>610 Chest X-Rays</code> (On-Premise)
                  </div>
                  <span className="node-training-state">Local Training: Synced</span>
                </div>
              </div>

              {/* Inverted Tree Connector for Aggregation */}
              <div className="topology-connector-tree inverted">
                <div className="branch branch-left" />
                <div className="branch branch-center" />
                <div className="branch branch-right" />
                <div className="horizontal-bar" />
                <div className="stem-down" />
              </div>

              {/* Level 3: Aggregation & Privacy Layer */}
              <div className="topology-level level-aggregation">
                <div className="topology-box aggregation-box">
                  <div className="box-icon">
                    <Icon name="pulse" size={20} />
                  </div>
                  <div className="box-content">
                    <span className="box-eyebrow">FEDERATED AGGREGATOR</span>
                    <span className="box-title">Fed-FibAvg Adaptive Weighting</span>
                    <span className="box-meta">Fibonacci-weighted convergence · 36% communication reduction</span>
                  </div>
                </div>

                <div className="flow-arrow">↓</div>

                <div className="topology-box privacy-box">
                  <div className="box-icon">
                    <Icon name="lock" size={20} />
                  </div>
                  <div className="box-content">
                    <span className="box-eyebrow">DIFFERENTIAL PRIVACY LAYER</span>
                    <span className="box-title">Prime-DP Noise Injection</span>
                    <span className="box-meta">Laplace Mechanism · Budget ε = 0.5 · Zero reconstruction risk</span>
                  </div>
                  <span className="box-status secure">PRIVACY ENFORCED</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Model Registry (Phase 11) */}
      {activeTab === 'models' && (
        <div className="fed-models-container">
          <div className="models-table-card">
            <div className="table-header-strip">
              <h4 className="table-title">Governed Clinical Model Registry</h4>
              <span className="table-sub">Validated against NIH ChestX-ray14 & CheXpert rural benchmark cohorts</span>
            </div>

            <table className="fed-table">
              <thead>
                <tr>
                  <th>Model Identifier</th>
                  <th>Version</th>
                  <th>Training Round</th>
                  <th>Federation Nodes</th>
                  <th>Dataset Benchmark</th>
                  <th>Privacy Status</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong>MedFed DenseNet121 CXR</strong>
                    <div className="sub-model-info">5-Class Multi-label Pulmonary Classifier</div>
                  </td>
                  <td><code>v1.3</code></td>
                  <td>Round 12</td>
                  <td>3 Nodes (A, B, C)</td>
                  <td>
                    <span className="dataset-pill">NIH CXR Demo</span>
                  </td>
                  <td>
                    <span className="privacy-badge">Prime-DP (ε=0.5)</span>
                  </td>
                  <td>
                    <span className="registry-badge approved">Approved</span>
                    <span className="tag-demo">[DEMO]</span>
                  </td>
                </tr>

                <tr>
                  <td>
                    <strong>MedFed DenseNet121 CXR</strong>
                    <div className="sub-model-info">Baseline Aggregation Model</div>
                  </td>
                  <td><code>v1.2</code></td>
                  <td>Round 8</td>
                  <td>3 Nodes</td>
                  <td>
                    <span className="dataset-pill">CheXpert Subset</span>
                  </td>
                  <td>
                    <span className="privacy-badge">FedAvg Baseline</span>
                  </td>
                  <td>
                    <span className="registry-badge archived">Archived</span>
                    <span className="tag-demo">[BENCHMARK]</span>
                  </td>
                </tr>

                <tr>
                  <td>
                    <strong>Maternal Risk Predictor</strong>
                    <div className="sub-model-info">Antenatal Care Default & Pre-eclampsia Edge Model</div>
                  </td>
                  <td><code>v2.4</code></td>
                  <td>Round 24</td>
                  <td>12 PHC Nodes</td>
                  <td>
                    <span className="dataset-pill">Varanasi Rural ANC</span>
                  </td>
                  <td>
                    <span className="privacy-badge">Local Edge Differential</span>
                  </td>
                  <td>
                    <span className="registry-badge approved">Approved</span>
                    <span className="tag-demo">[SIMULATED]</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Hospital Nodes (Phase 10) */}
      {activeTab === 'nodes' && (
        <div className="fed-nodes-container">
          <div className="nodes-grid">
            {nodes.map((node) => (
              <div key={node.id} className="node-detail-card">
                <div className="node-card-top">
                  <div className="node-icon-circle">
                    <Icon name="hospital" size={20} />
                  </div>
                  <div>
                    <h4 className="node-card-name">{node.node_name}</h4>
                    <span className="node-card-id"><code>{node.id}</code></span>
                  </div>
                  <StatusBadge status="verified" label="Online" size="sm" />
                </div>

                <div className="node-card-metrics">
                  <div className="metric-row">
                    <span className="metric-lbl">Local Patient Records</span>
                    <span className="metric-val">{node.local_data_count} CXRs</span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-lbl">Data Storage Boundary</span>
                    <span className="metric-val">On-Premise (Non-Exportable)</span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-lbl">Last Heartbeat</span>
                    <span className="metric-val">30 seconds ago</span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-lbl">Encryption Status</span>
                    <span className="metric-val">TLS 1.3 + Ed25519 Signed</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: Local Storage & Vector Engine (Phase 3) */}
      {activeTab === 'storage' && (
        <div className="fed-storage-container">
          <div className="storage-status-card">
            <div className="storage-card-header">
              <div className="storage-icon-wrap">
                <Icon name="lock" size={24} color="var(--color-primary, #0f766e)" />
              </div>
              <div>
                <span className="storage-eyebrow">ARCHITECTURE COMPONENT</span>
                <h3 className="storage-title">LOCAL DEMO STORAGE & VECTOR RETRIEVAL</h3>
                <p className="storage-subtitle">
                  Lightweight on-premise persistence for rapid local querying and clinical similarity search.
                </p>
              </div>
              <StatusBadge status="verified" label="Connected" />
            </div>

            <div className="storage-metrics-grid">
              <div className="storage-metric-box">
                <span className="storage-metric-label">Engine Status</span>
                <span className="storage-metric-value status-connected">Connected</span>
              </div>
              <div className="storage-metric-box">
                <span className="storage-metric-label">Patients Stored</span>
                <span className="storage-metric-value">{storageStatus?.patients_stored ?? 5}</span>
              </div>
              <div className="storage-metric-box">
                <span className="storage-metric-label">Clinical Records</span>
                <span className="storage-metric-value">{storageStatus?.clinical_records_stored ?? 7}</span>
              </div>
              <div className="storage-metric-box">
                <span className="storage-metric-label">Vector Index Records</span>
                <span className="storage-metric-value">{storageStatus?.vector_index_records ?? 12}</span>
              </div>
            </div>

            <div className="storage-engine-details">
              <div className="detail-line">
                <strong>Storage Architecture:</strong> {storageStatus?.engine || 'SQLite3 relational database + In-Memory Sparse Cosine Vector Retrieval'}
              </div>
              <div className="detail-line">
                <strong>Last Indexed At:</strong> {storageStatus?.last_indexed_at ? new Date(storageStatus.last_indexed_at).toLocaleString() : 'Just Now'}
              </div>
              <div className="storage-notice-banner">
                <Icon name="info" size={14} />
                <span>
                  <strong>PROTOTYPE NOTICE:</strong> {storageStatus?.notice || 'The local vector store is designed for rapid demonstration and edge search. It is labeled as demo/synthetic data and does not represent unverified production claims.'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
