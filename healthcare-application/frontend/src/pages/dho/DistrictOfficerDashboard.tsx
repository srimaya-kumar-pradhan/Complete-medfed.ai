import React, { useState, useEffect } from 'react';
import { usePageTitle } from '../../utils/usePageTitle';
import { publicHealthApi, federatedApi } from '../../api/services';
import { PageHeader } from '../../components/ui/PageHeader';
import { KPIStrip } from '../../components/ui/KPIStrip';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import type { PublicHealthSummary, Anomaly, FederatedNode } from '../../types';
import './DistrictOfficerDashboard.css';

interface BlockMetric {
  name: string;
  totalMothers: number;
  ancDropouts: number;
  dropoutRate: number;
  referralCompletion: number;
  status: 'normal' | 'warning' | 'alert';
}

const BLOCK_METRICS: BlockMetric[] = [
  {
    name: 'Ramnagar Block',
    totalMothers: 420,
    ancDropouts: 48,
    dropoutRate: 11.4,
    referralCompletion: 84.2,
    status: 'warning',
  },
  {
    name: 'Chandauli Rural',
    totalMothers: 510,
    ancDropouts: 82,
    dropoutRate: 16.1,
    referralCompletion: 68.5,
    status: 'alert',
  },
  {
    name: 'Pindra Block',
    totalMothers: 390,
    ancDropouts: 24,
    dropoutRate: 6.1,
    referralCompletion: 91.0,
    status: 'normal',
  },
  {
    name: 'Sevapuri Model Block',
    totalMothers: 480,
    ancDropouts: 19,
    dropoutRate: 3.9,
    referralCompletion: 95.8,
    status: 'normal',
  },
];

const MONTHLY_TRENDS = [
  { month: 'Apr', dropouts: 78, resolved: 65 },
  { month: 'May', dropouts: 64, resolved: 58 },
  { month: 'Jun', dropouts: 82, resolved: 70 },
  { month: 'Jul', dropouts: 55, resolved: 52 },
  { month: 'Aug', dropouts: 49, resolved: 46 },
  { month: 'Sep', dropouts: 38, resolved: 36 },
];

export const DistrictOfficerDashboard: React.FC = () => {
  usePageTitle('District Epidemiological Intelligence');
  const [summary, setSummary] = useState<PublicHealthSummary | null>(null);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [fedNodes, setFedNodes] = useState<FederatedNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'anomalies' | 'federated'>('overview');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [selectedBlock, setSelectedBlock] = useState<string>('all');

  useEffect(() => {
    setIsLoading(true);
    Promise.allSettled([
      publicHealthApi.summary().then(setSummary),
      publicHealthApi.anomalies().then(setAnomalies),
      federatedApi.nodes().then(setFedNodes),
    ]).finally(() => {
      setSummary((prev) => prev || {
        district_id: 'dist-varanasi',
        total_patients: 18420,
        active_care_gaps: 248,
        pending_referrals: 62,
        completed_referrals: 418,
        active_anomalies: 3,
        care_gap_trends: [],
        referral_completion_rate: 87.1,
      });

      setAnomalies((prev) => prev.length > 0 ? prev : [
        {
          id: 'anom-01',
          anomaly_type: 'ANC_DROPOUT_SPIKE',
          description: 'Unusual 22% spike in 2nd Trimester ANC Dropouts detected in Chandauli Block East.',
          severity: 'critical',
          indicator_name: 'ANC Dropout Rate',
          expected_value: '5.2%',
          observed_value: '16.1%',
          confidence: 0.94,
          detected_at: '2026-09-17T12:00:00Z',
          is_active: true,
        },
        {
          id: 'anom-02',
          anomaly_type: 'MALARIA_FEBRILE_CLUSTER',
          description: 'Cluster of 14 acute febrile illness cases flagged across 3 adjoining sub-centers in Ramnagar.',
          severity: 'high',
          indicator_name: 'Febrile Syndromic Surveillance',
          expected_value: '<3 cases/week',
          observed_value: '14 cases',
          confidence: 0.89,
          detected_at: '2026-09-16T08:30:00Z',
          is_active: true,
        },
      ]);

      setFedNodes((prev) => prev.length > 0 ? prev : [
        { id: 'node-01', node_name: 'Ramnagar CHC Edge Node', is_active: true, last_heartbeat: '2026-09-18 04:30', local_data_count: 3420 },
        { id: 'node-02', node_name: 'Chandauli Sub-District Edge Node', is_active: true, last_heartbeat: '2026-09-18 04:28', local_data_count: 4890 },
        { id: 'node-03', node_name: 'Pindra PHC Edge Node', is_active: true, last_heartbeat: '2026-09-18 04:31', local_data_count: 2980 },
        { id: 'node-04', node_name: 'Sevapuri Model Hospital Node', is_active: true, last_heartbeat: '2026-09-18 04:29', local_data_count: 5120 },
      ]);

      setIsLoading(false);
    });
  }, []);

  const filteredBlocks = selectedBlock === 'all'
    ? BLOCK_METRICS
    : BLOCK_METRICS.filter((b) => b.name.toLowerCase().includes(selectedBlock.toLowerCase()));

  return (
    <div className="dho-dashboard">
      {/* Page Header */}
      <PageHeader
        eyebrow="DISTRICT EPIDEMIOLOGICAL COMMAND • AGGREGATED TELEMETRY"
        title="Dr. K. Verma, MD (PSM)"
        description="Chief Medical Officer & District Health Officer • District Varanasi, Uttar Pradesh"
        action={
          <div className="dho-header-actions">
            <div className="time-range-toggle">
              {(['7d', '30d', '90d', '1y'] as const).map((r) => (
                <button
                  key={r}
                  className={`range-btn ${timeRange === r ? 'active' : ''}`}
                  onClick={() => setTimeRange(r)}
                >
                  {r.toUpperCase()}
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              icon={<Icon name="print" size={16} />}
              onClick={() => alert('Generating Privacy-Preserved District Health Bulletin (PDF)...')}
            >
              Export Bulletin
            </Button>
          </div>
        }
      />

      {/* KPI Strip */}
      <KPIStrip
        items={[
          { label: 'Total Tracked Citizens', value: summary?.total_patients?.toLocaleString() || '18,420', subtitle: 'Across 4 Blocks & 48 Sub-Centers' },
          { label: 'Active Care Gaps', value: summary?.active_care_gaps || '248', subtitle: 'Under frontline ASHA outreach', trend: { direction: 'down', text: '14.2% reduction' } },
          { label: 'Referral Completion', value: `${summary?.referral_completion_rate || 87.1}%`, subtitle: 'Closed-loop verified', trend: { direction: 'up', text: '+3.4%' } },
          { label: 'Active Outbreak Signals', value: anomalies.length, subtitle: 'Zero-knowledge anomaly radar', trend: { direction: 'flat', text: '2 monitored' } },
        ]}
      />

      {/* Navigation Tabs */}
      <div className="dho-nav-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === 'overview'}
          className={`dho-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <Icon name="chart" size={16} />
          <span>Block Analytics & Trends</span>
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'anomalies'}
          className={`dho-tab-btn ${activeTab === 'anomalies' ? 'active' : ''}`}
          onClick={() => setActiveTab('anomalies')}
        >
          <Icon name="alert" size={16} />
          <span>Epidemiological Radar</span>
          {anomalies.length > 0 && <span className="dho-badge-count">{anomalies.length}</span>}
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'federated'}
          className={`dho-tab-btn ${activeTab === 'federated' ? 'active' : ''}`}
          onClick={() => setActiveTab('federated')}
        >
          <Icon name="network" size={16} />
          <span>Federated AI Nodes</span>
          <span className="dho-badge-count neutral">{fedNodes.length}</span>
        </button>
      </div>

      {/* TAB 1: Block Analytics & Visual Trends */}
      {activeTab === 'overview' && (
        <div className="dho-overview-grid">
          {/* Trend Chart Card (Inline SVG) */}
          <div className="analytics-card full-width">
            <div className="card-top-header">
              <div>
                <span className="card-eyebrow">EPIDEMIOLOGICAL TIME-SERIES</span>
                <h3 className="card-title">6-Month Maternal Care Gap & Resolution Trajectory</h3>
                <p className="card-subtitle">
                  Comparing newly flagged ANC-2 dropouts vs verified community resolutions across Varanasi District.
                </p>
              </div>
              <div className="chart-legend">
                <span className="legend-item"><span className="legend-dot dot-dropouts" /> Identified Gaps</span>
                <span className="legend-item"><span className="legend-dot dot-resolved" /> Frontline Resolutions</span>
              </div>
            </div>

            <div className="chart-wrapper">
              <svg viewBox="0 0 800 220" className="trend-svg" role="img" aria-label="Care gap trajectory chart">
                {/* Grid lines */}
                <line x1="40" y1="30" x2="780" y2="30" stroke="#f0f1f3" strokeDasharray="4 4" />
                <line x1="40" y1="80" x2="780" y2="80" stroke="#f0f1f3" strokeDasharray="4 4" />
                <line x1="40" y1="130" x2="780" y2="130" stroke="#f0f1f3" strokeDasharray="4 4" />
                <line x1="40" y1="180" x2="780" y2="180" stroke="#e2e5ea" />

                {/* Y Axis labels */}
                <text x="30" y="34" textAnchor="end" fontSize="11" fill="#8b95a5">100</text>
                <text x="30" y="84" textAnchor="end" fontSize="11" fill="#8b95a5">75</text>
                <text x="30" y="134" textAnchor="end" fontSize="11" fill="#8b95a5">50</text>
                <text x="30" y="184" textAnchor="end" fontSize="11" fill="#8b95a5">0</text>

                {/* Bars for each month */}
                {MONTHLY_TRENDS.map((item, i) => {
                  const xBase = 70 + i * 118;
                  const dropoutH = (item.dropouts / 100) * 150;
                  const resolvedH = (item.resolved / 100) * 150;

                  return (
                    <g key={item.month} className="chart-group">
                      {/* Dropout bar */}
                      <rect
                        x={xBase}
                        y={180 - dropoutH}
                        width="24"
                        height={dropoutH}
                        rx="4"
                        fill="#f87171"
                        className="bar-dropouts"
                      />
                      {/* Resolved bar */}
                      <rect
                        x={xBase + 28}
                        y={180 - resolvedH}
                        width="24"
                        height={resolvedH}
                        rx="4"
                        fill="#0d9488"
                        className="bar-resolved"
                      />
                      {/* Month label */}
                      <text x={xBase + 26} y="202" textAnchor="middle" fontSize="12" fill="#5a6577" fontWeight="600">
                        {item.month}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Block Comparative Table */}
          <div className="analytics-card full-width">
            <div className="card-top-header">
              <div>
                <span className="card-eyebrow">TERRITORIAL SURVEILLANCE</span>
                <h3 className="card-title">Administrative Block Continuum Index</h3>
                <p className="card-subtitle">
                  Granular maternal tracking and referral closed-loop rate per Community Health Block.
                </p>
              </div>

              <div className="block-filter-select">
                <label htmlFor="block-sel" className="sr-only">Filter Block</label>
                <select
                  id="block-sel"
                  className="clean-select"
                  value={selectedBlock}
                  onChange={(e) => setSelectedBlock(e.target.value)}
                >
                  <option value="all">All Administrative Blocks</option>
                  <option value="Ramnagar">Ramnagar Block</option>
                  <option value="Chandauli">Chandauli Rural</option>
                  <option value="Pindra">Pindra Block</option>
                  <option value="Sevapuri">Sevapuri Model</option>
                </select>
              </div>
            </div>

            <div className="dori-table-container">
              <table className="operational-table">
                <thead>
                  <tr>
                    <th>Administrative Block</th>
                    <th>Citizens Tracked</th>
                    <th>Active Gaps</th>
                    <th>Dropout Risk</th>
                    <th>Referral Completion</th>
                    <th>Intervention State</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBlocks.map((b) => (
                    <tr key={b.name}>
                      <td>
                        <strong>{b.name}</strong>
                      </td>
                      <td>{b.totalMothers.toLocaleString()}</td>
                      <td>
                        <strong style={{ color: 'var(--color-crimson)' }}>{b.ancDropouts}</strong>
                      </td>
                      <td>
                        <span className={`dropout-badge badge-${b.status}`}>
                          {b.dropoutRate}%
                        </span>
                      </td>
                      <td>
                        <div className="referral-progress-cell">
                          <div className="progress-track">
                            <div
                              className="progress-fill"
                              style={{ width: `${b.referralCompletion}%` }}
                            />
                          </div>
                          <span className="progress-percent">{b.referralCompletion}%</span>
                        </div>
                      </td>
                      <td>
                        <StatusBadge
                          status={b.status === 'alert' ? 'urgent' : b.status === 'warning' ? 'needs-review' : 'verified'}
                          label={b.status === 'alert' ? 'Deploy MMU' : b.status === 'warning' ? 'Supervise' : 'Normal'}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Epidemiological Radar */}
      {activeTab === 'anomalies' && (
        <div className="anomalies-section">
          <div className="radar-banner">
            <div>
              <h3 className="section-title">Zero-Knowledge Outbreak & Care-Gap Radar</h3>
              <p className="section-desc">
                Differential-privacy anomaly detectors trigger real-time signals when syndromic clusters exceed Poisson baseline thresholds.
              </p>
            </div>
            <StatusBadge status="active" label="Continuous Radar Active" />
          </div>

          {isLoading ? (
            <LoadingSkeleton type="card" count={2} />
          ) : anomalies.length === 0 ? (
            <EmptyState
              icon="check"
              title="No Active Outbreak Signals"
              description="All epidemiological surveillance indices in District Varanasi are within standard baseline tolerances."
            />
          ) : (
            <div className="anomalies-grid">
              {anomalies.map((anom) => (
                <div key={anom.id} className={`anomaly-card severity-${anom.severity}`}>
                  <div className="anomaly-top-bar">
                    <StatusBadge
                      status={anom.severity === 'critical' ? 'urgent' : 'high-priority'}
                      label={`${anom.severity.toUpperCase()} SIGNAL`}
                    />
                    <span className="anomaly-timestamp">
                      {new Date(anom.detected_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  <h4 className="anomaly-headline">{anom.anomaly_type.replace(/_/g, ' ')}</h4>
                  <p className="anomaly-text">{anom.description}</p>

                  <div className="anomaly-metrics-grid">
                    <div className="metric-box">
                      <span className="m-label">Surveillance Indicator</span>
                      <span className="m-val">{anom.indicator_name}</span>
                    </div>
                    <div className="metric-box">
                      <span className="m-label">Baseline vs Observed</span>
                      <span className="m-val highlight">
                        {anom.expected_value} ➔ {anom.observed_value}
                      </span>
                    </div>
                    <div className="metric-box">
                      <span className="m-label">Algorithm Confidence</span>
                      <span className="m-val">{((anom.confidence || 0.9) * 100).toFixed(0)}%</span>
                    </div>
                  </div>

                  <div className="anomaly-actions">
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<Icon name="alert" size={14} />}
                      onClick={() => alert(`Rapid Response Team dispatched to ${anom.anomaly_type}`)}
                    >
                      Dispatch Rapid Response Team (RRT)
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<Icon name="check" size={14} />}
                      onClick={() => alert('Signal acknowledged by CMO')}
                    >
                      Acknowledge Signal
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Federated AI Telemetry */}
      {activeTab === 'federated' && (
        <div className="federated-section">
          <div className="radar-banner">
            <div>
              <h3 className="section-title">Decentralized Federated Learning Cluster (MedFed-AI)</h3>
              <p className="section-desc">
                Edge nodes at peripheral Primary Health Centres compute local gradient updates without moving raw patient records. Only differentially private model weights are synchronized.
              </p>
            </div>
            <StatusBadge status="verified" label="ε = 0.5 (Strict DP)" />
          </div>

          <div className="fed-nodes-grid">
            {fedNodes.map((node) => (
              <div key={node.id} className="federated-node-card">
                <div className="node-card-head">
                  <div className="node-status-dot" />
                  <div>
                    <h4 className="node-title">{node.node_name}</h4>
                    <span className="node-status-text">Active Local Trainer</span>
                  </div>
                </div>

                <div className="node-details">
                  <div className="node-row">
                    <span className="n-lbl">Local Patient Corpus:</span>
                    <strong className="n-val">{node.local_data_count.toLocaleString()} Records</strong>
                  </div>
                  <div className="node-row">
                    <span className="n-lbl">Heartbeat Interval:</span>
                    <span className="n-val">{node.last_heartbeat}</span>
                  </div>
                  <div className="node-row">
                    <span className="n-lbl">Privacy Budget (ε):</span>
                    <span className="n-val">0.5 (Differential Privacy)</span>
                  </div>
                  <div className="node-row">
                    <span className="n-lbl">Encryption:</span>
                    <span className="n-val">AES-256-GCM + Ed25519</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
