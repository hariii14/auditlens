import React, { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import {
  ShieldAlert,
  AlertTriangle,
  FileText,
  DollarSign,
  ArrowRight,
  ChevronRight,
  GitFork,
  CheckCircle2,
  Clock,
  Upload,
  Circle,
  TrendingUp,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { AnomalyRecord, InvestigationRecord } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtAmt(n: number, currency = 'USD') {
  if (n >= 1000) return `${currency} ${fmt(n)}`;
  return `${currency} ${n.toFixed(2)}`;
}

function SeverityDot({ sev }: { sev: string }) {
  const color =
    sev === 'high' ? 'bg-red-500' : sev === 'medium' ? 'bg-amber-500' : 'bg-charcoal-400';
  return <span className={`inline-block w-2 h-2 rounded-full ${color} shrink-0`} />;
}

function SeverityBadge({ sev }: { sev: string }) {
  if (sev === 'high') return <span className="badge-high">High</span>;
  if (sev === 'medium') return <span className="badge-medium">Med</span>;
  return <span className="badge-low">Low</span>;
}

function StatusPill({ status }: { status: string }) {
  if (status === 'ESCALATED') return <span className="status-escalated">Escalated</span>;
  if (status === 'VERIFIED_LEGITIMATE') return <span className="status-verified">Verified</span>;
  if (status === 'RESOLVED') return <span className="status-resolved">Resolved</span>;
  return <span className="status-needs-review">Needs Review</span>;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface MetricStripProps {
  openCount: number;
  highRiskCount: number;
  amountAtStake: number;
  docsProcessed: number;
}

function MetricStrip({ openCount, highRiskCount, amountAtStake, docsProcessed }: MetricStripProps) {
  const metrics = [
    {
      id: 'open-inv',
      icon: <ShieldAlert className="w-4 h-4 text-amber-600" />,
      label: 'Open Investigations',
      value: openCount,
      sub: 'unresolved findings',
      href: '/investigations',
    },
    {
      id: 'high-risk',
      icon: <AlertTriangle className="w-4 h-4 text-red-600" />,
      label: 'High Risk',
      value: highRiskCount,
      sub: 'priority findings',
      href: '/investigations',
      highlight: highRiskCount > 0,
    },
    {
      id: 'amount-stake',
      icon: <DollarSign className="w-4 h-4 text-charcoal-600" />,
      label: 'Potential Exposure',
      value: `${amountAtStake >= 1000 ? fmt(amountAtStake) : amountAtStake.toFixed(0)}`,
      prefix: 'USD ',
      sub: 'across open cases',
      href: '/investigations',
    },
    {
      id: 'docs-processed',
      icon: <FileText className="w-4 h-4 text-forest-700" />,
      label: 'Documents Processed',
      value: docsProcessed,
      sub: 'invoices, receipts & feeds',
      href: '/documents',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-paper-300 border border-paper-300 rounded-xl overflow-hidden">
      {metrics.map((m, i) => (
        <NavLink
          key={m.id}
          to={m.href}
          className={`flex items-start gap-3 px-4 py-3 bg-white hover:bg-paper-50 transition-colors ${
            m.highlight ? 'bg-red-50 hover:bg-red-50' : ''
          }`}
        >
          <div className="mt-0.5 shrink-0">{m.icon}</div>
          <div className="min-w-0">
            <p className="text-[11px] text-charcoal-500 font-medium leading-tight mb-0.5">{m.label}</p>
            <p className={`text-xl font-extrabold tracking-tight leading-none ${m.highlight ? 'text-red-700' : 'text-charcoal-900'}`}>
              {m.prefix && <span className="text-xs font-semibold text-charcoal-500 mr-0.5">{m.prefix}</span>}
              {m.value}
            </p>
            <p className="text-[10px] text-charcoal-400 mt-0.5">{m.sub}</p>
          </div>
        </NavLink>
      ))}
    </div>
  );
}

// Risk distribution bar
function RiskBar({ anomalies }: { anomalies: AnomalyRecord[] }) {
  const open = anomalies.filter(a => a.status === 'NEEDS_REVIEW' || a.status === 'ESCALATED');
  const high = open.filter(a => a.severity === 'high').length;
  const med = open.filter(a => a.severity === 'medium').length;
  const low = open.filter(a => a.severity === 'low').length;
  const total = open.length || 1;

  const byCategory: Record<string, number> = {};
  open.forEach(a => {
    const cat = a.category.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
    byCategory[cat] = (byCategory[cat] || 0) + 1;
  });

  return (
    <div className="panel">
      <div className="panel-header">
        <h3 className="panel-title">Risk Distribution</h3>
        <span className="text-[11px] text-charcoal-400">{open.length} open</span>
      </div>
      <div className="px-4 py-3 space-y-3">
        {/* Stacked bar */}
        <div className="h-2 rounded-full overflow-hidden flex gap-px bg-paper-200">
          {high > 0 && (
            <div className="bg-red-500 h-full rounded-l-full" style={{ width: `${(high / total) * 100}%` }} />
          )}
          {med > 0 && (
            <div className="bg-amber-400 h-full" style={{ width: `${(med / total) * 100}%` }} />
          )}
          {low > 0 && (
            <div className="bg-charcoal-300 h-full rounded-r-full" style={{ width: `${(low / total) * 100}%` }} />
          )}
        </div>

        {/* Legend */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          {[
            { label: 'High', count: high, color: 'bg-red-500' },
            { label: 'Medium', count: med, color: 'bg-amber-400' },
            { label: 'Low', count: low, color: 'bg-charcoal-300' },
          ].map(r => (
            <div key={r.label} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-sm ${r.color} shrink-0`} />
              <span className="text-charcoal-600">{r.label}</span>
              <span className="font-bold text-charcoal-900 ml-auto">{r.count}</span>
            </div>
          ))}
        </div>

        {/* Category breakdown */}
        {Object.keys(byCategory).length > 0 && (
          <div className="pt-3 border-t border-paper-200 space-y-2">
            {Object.entries(byCategory).map(([cat, cnt]) => (
              <div key={cat} className="flex items-center gap-2 text-xs">
                <div className="flex-1 h-1 bg-paper-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-charcoal-400 rounded-full"
                    style={{ width: `${(cnt / total) * 100}%` }}
                  />
                </div>
                <span className="text-charcoal-600 text-[11px] w-28 truncate text-right">{cat}</span>
                <span className="font-semibold text-charcoal-800 w-4 text-right">{cnt}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Priority queue — compact table style
function PriorityQueue({ investigations, anomalies }: { investigations: InvestigationRecord[]; anomalies: AnomalyRecord[] }) {
  const pending = investigations
    .filter(i => i.status === 'NEEDS_REVIEW' || i.status === 'ESCALATED')
    .sort((a, b) => {
      const sevOrder = { high: 0, medium: 1, low: 2 };
      return (sevOrder[a.severity] - sevOrder[b.severity]) ||
        (a.status === 'ESCALATED' ? -1 : 1);
    })
    .slice(0, 5);

  return (
    <div className="panel">
      <div className="panel-header">
        <h3 className="panel-title">Priority Review Queue</h3>
        <NavLink to="/investigations" className="text-[11px] text-forest-700 font-semibold hover:underline flex items-center gap-0.5">
          View all <ChevronRight className="w-3.5 h-3.5" />
        </NavLink>
      </div>

      {pending.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <CheckCircle2 className="w-6 h-6 text-forest-600 mx-auto mb-2" />
          <p className="text-xs text-charcoal-600 font-medium">No pending findings</p>
          <p className="text-[11px] text-charcoal-400">All investigations resolved</p>
        </div>
      ) : (
        <div className="divide-y divide-paper-200">
          {pending.map((inv) => {
            const anomaly = anomalies.find(a => inv.anomalyIds.includes(a.id));
            const amount = anomaly?.amountInDispute;
            const vendorName = anomaly?.explanation
              ? anomaly.explanation.split(' ').slice(0, 4).join(' ') + '…'
              : null;

            return (
              <NavLink
                key={inv.id}
                to={`/investigations/${inv.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-paper-50 transition-colors group"
              >
                <SeverityDot sev={inv.severity} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-charcoal-900 truncate group-hover:text-forest-800 transition-colors">
                    {inv.title}
                  </p>
                  {anomaly?.explanation && (
                    <p className="text-[11px] text-charcoal-500 truncate mt-0.5">
                      {anomaly.explanation.slice(0, 80)}…
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {amount && (
                    <span className="text-[11px] font-bold text-charcoal-900 hidden sm:inline">
                      {anomaly?.currency} {fmt(amount)}
                    </span>
                  )}
                  <StatusPill status={inv.status} />
                  <ChevronRight className="w-3.5 h-3.5 text-charcoal-300 group-hover:text-forest-600 transition-colors" />
                </div>
              </NavLink>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Recent activity feed
function RecentActivity({ documents, investigations }: { documents: any[]; investigations: InvestigationRecord[] }) {
  const events = useMemo(() => {
    const docEvents = documents.slice(0, 3).map(d => ({
      id: d.id,
      type: 'document' as const,
      text: `Document ingested: ${d.filename.split('_').slice(-1)[0] || d.filename}`,
      sub: d.processingStatus === 'flagged' ? 'Flagged for review' : 'Successfully parsed',
      date: d.uploadDate,
      alert: d.processingStatus === 'flagged',
    }));

    const invEvents = investigations
      .filter(i => i.reviewHistory.length > 0)
      .flatMap(i => i.reviewHistory.slice(-1).map(h => ({
        id: h.id,
        type: 'review' as const,
        text: `Finding reviewed: ${i.title.slice(0, 40)}${i.title.length > 40 ? '…' : ''}`,
        sub: h.action.replace(/_/g, ' '),
        date: h.timestamp.slice(0, 10),
        alert: false,
      })));

    return [...docEvents, ...invEvents]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 6);
  }, [documents, investigations]);

  return (
    <div className="panel">
      <div className="panel-header">
        <h3 className="panel-title">Recent Activity</h3>
      </div>
      <div className="divide-y divide-paper-200">
        {events.length === 0 ? (
          <p className="px-4 py-4 text-xs text-charcoal-400">No recent activity</p>
        ) : (
          events.map(ev => (
            <div key={ev.id} className="px-4 py-2.5 flex items-start gap-2.5">
              <div className="mt-1 shrink-0">
                {ev.type === 'document' ? (
                  <FileText className={`w-3.5 h-3.5 ${ev.alert ? 'text-red-500' : 'text-charcoal-400'}`} />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-forest-600" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-charcoal-800 truncate">{ev.text}</p>
                <p className={`text-[10px] mt-0.5 ${ev.alert ? 'text-red-600 font-semibold' : 'text-charcoal-400'}`}>
                  {ev.sub} · {ev.date}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Evidence graph preview
function GraphPreview({ investigations }: { investigations: InvestigationRecord[] }) {
  const openCount = investigations.filter(i => i.status === 'NEEDS_REVIEW' || i.status === 'ESCALATED').length;
  const totalEdges = 18; // from mock data structure

  return (
    <div className="panel">
      <div className="panel-header">
        <h3 className="panel-title">Evidence Graph</h3>
        <NavLink
          to="/graph"
          className="text-[11px] text-forest-700 font-semibold hover:underline flex items-center gap-0.5"
        >
          Open <ArrowRight className="w-3.5 h-3.5" />
        </NavLink>
      </div>
      <div className="px-4 py-3">
        {/* Mini preview — schematic nodes */}
        <div className="h-24 bg-paper-50 rounded-lg border border-paper-200 flex items-center justify-center relative overflow-hidden">
          {/* Static illustrative graph preview */}
          <svg viewBox="0 0 200 80" className="w-full h-full" fill="none">
            {/* Edges */}
            <line x1="100" y1="40" x2="40" y2="20" stroke="#DEDFD8" strokeWidth="1" />
            <line x1="100" y1="40" x2="160" y2="20" stroke="#DEDFD8" strokeWidth="1" />
            <line x1="100" y1="40" x2="60" y2="60" stroke="#DC2626" strokeWidth="1.5" strokeDasharray="3,2" />
            <line x1="100" y1="40" x2="150" y2="65" stroke="#DEDFD8" strokeWidth="1" />
            <line x1="40" y1="20" x2="60" y2="60" stroke="#DEDFD8" strokeWidth="1" />
            {/* Nodes */}
            <circle cx="100" cy="40" r="7" fill="#176B4D" />
            <circle cx="40" cy="20" r="5" fill="#E4F4ED" stroke="#176B4D" strokeWidth="1.5" />
            <circle cx="160" cy="20" r="5" fill="#E4F4ED" stroke="#176B4D" strokeWidth="1.5" />
            <circle cx="60" cy="60" r="6" fill="#FEF2F2" stroke="#DC2626" strokeWidth="1.5" />
            <circle cx="150" cy="65" r="4" fill="#F7F7F4" stroke="#DEDFD8" strokeWidth="1" />
          </svg>
          {/* Labels */}
          <div className="absolute bottom-1.5 left-3 text-[9px] text-charcoal-400 font-medium">Vendors · Invoices · Anomalies</div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          {[
            { label: 'Nodes', value: '24' },
            { label: 'Edges', value: String(totalEdges) },
            { label: 'Flagged', value: String(openCount) },
          ].map(s => (
            <div key={s.label} className="px-2 py-1.5 bg-paper-50 rounded border border-paper-200">
              <p className="text-sm font-bold text-charcoal-900">{s.value}</p>
              <p className="text-[10px] text-charcoal-400">{s.label}</p>
            </div>
          ))}
        </div>

        <NavLink
          to="/graph"
          className="mt-3 w-full py-1.5 px-3 rounded-lg bg-paper-100 hover:bg-paper-200 border border-paper-300 text-xs font-semibold text-charcoal-700 flex items-center justify-center gap-1.5 transition-colors"
        >
          <GitFork className="w-3.5 h-3.5 text-forest-700" />
          Open Evidence Graph
        </NavLink>
      </div>
    </div>
  );
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────

export const DashboardPage: React.FC = () => {
  const { company, anomalies, investigations, documents, metrics } = useData();

  const openInvestigations = investigations.filter(
    i => i.status === 'NEEDS_REVIEW' || i.status === 'ESCALATED'
  );
  const highRiskCount = anomalies.filter(
    a => a.severity === 'high' && (a.status === 'NEEDS_REVIEW' || a.status === 'ESCALATED')
  ).length;

  const amountAtStake = useMemo(() => {
    return anomalies
      .filter(a => a.status === 'NEEDS_REVIEW' || a.status === 'ESCALATED')
      .reduce((sum, a) => sum + (a.amountInDispute || 0), 0);
  }, [anomalies]);

  const docsProcessed = documents.filter(
    d => d.processingStatus === 'parsed' || d.processingStatus === 'flagged'
  ).length;

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* High-risk banner */}
      {highRiskCount > 0 && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-red-50 border border-red-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <p className="text-xs font-semibold text-red-800">
              {highRiskCount} high-risk {highRiskCount === 1 ? 'finding requires' : 'findings require'} your attention
            </p>
          </div>
          <NavLink
            to="/investigations"
            className="text-xs font-bold text-red-700 hover:underline flex items-center gap-1 shrink-0"
          >
            Review now <ArrowRight className="w-3.5 h-3.5" />
          </NavLink>
        </div>
      )}

      {/* Metric strip */}
      <MetricStrip
        openCount={openInvestigations.length}
        highRiskCount={highRiskCount}
        amountAtStake={amountAtStake}
        docsProcessed={docsProcessed}
      />

      {/* Main two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main column (2/3): Priority queue + recent transactions */}
        <div className="lg:col-span-2 space-y-4">
          {/* Priority review queue */}
          <PriorityQueue investigations={investigations} anomalies={anomalies} />

          {/* All open investigations compact table */}
          <div className="panel">
            <div className="panel-header">
              <h3 className="panel-title">All Open Investigations</h3>
              <NavLink to="/investigations" className="text-[11px] text-forest-700 font-semibold hover:underline flex items-center gap-0.5">
                Manage <ChevronRight className="w-3.5 h-3.5" />
              </NavLink>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-paper-200">
                    <th className="data-cell font-semibold text-[10px] uppercase tracking-wider text-charcoal-400 w-16">Sev</th>
                    <th className="data-cell font-semibold text-[10px] uppercase tracking-wider text-charcoal-400">Finding</th>
                    <th className="data-cell font-semibold text-[10px] uppercase tracking-wider text-charcoal-400 text-right hidden sm:table-cell">Amount</th>
                    <th className="data-cell font-semibold text-[10px] uppercase tracking-wider text-charcoal-400 hidden md:table-cell">Status</th>
                    <th className="data-cell w-8" />
                  </tr>
                </thead>
                <tbody>
                  {investigations.map(inv => {
                    const anomaly = anomalies.find(a => inv.anomalyIds.includes(a.id));
                    return (
                      <tr key={inv.id} className="data-row inv-row">
                        <td className="data-cell">
                          <SeverityBadge sev={inv.severity} />
                        </td>
                        <td className="data-cell">
                          <NavLink to={`/investigations/${inv.id}`} className="font-semibold text-charcoal-900 hover:text-forest-700 transition-colors block truncate max-w-xs">
                            {inv.title}
                          </NavLink>
                          {anomaly && (
                            <p className="text-[10px] text-charcoal-400 truncate max-w-xs mt-0.5">
                              {anomaly.detectionMethod}
                            </p>
                          )}
                        </td>
                        <td className="data-cell text-right font-bold text-charcoal-900 hidden sm:table-cell">
                          {anomaly?.amountInDispute
                            ? `${anomaly.currency} ${fmt(anomaly.amountInDispute)}`
                            : '—'}
                        </td>
                        <td className="data-cell hidden md:table-cell">
                          <StatusPill status={inv.status} />
                        </td>
                        <td className="data-cell">
                          <NavLink to={`/investigations/${inv.id}`} className="text-charcoal-300 hover:text-forest-600 transition-colors">
                            <ChevronRight className="w-4 h-4" />
                          </NavLink>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Secondary column (1/3): Risk + activity + graph */}
        <div className="space-y-4">
          <RiskBar anomalies={anomalies} />
          <RecentActivity documents={documents} investigations={investigations} />
          <GraphPreview investigations={investigations} />
        </div>
      </div>
    </div>
  );
};
