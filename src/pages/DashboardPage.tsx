import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  TrendingUp,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  CreditCard,
  Building2,
  FileText,
  DollarSign,
  ArrowUpRight,
  ExternalLink,
  Clock,
  Sparkles,
  GitFork,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { useData } from '../context/DataContext';

const TREND_DATA = [
  { month: 'Jun', recovered: 1200, prevented: 2500, leaks: 800 },
  { month: 'Jul', recovered: 1900, prevented: 3200, leaks: 650 },
  { month: 'Aug', recovered: 2400, prevented: 4100, leaks: 520 },
  { month: 'Sep', recovered: 3100, prevented: 5800, leaks: 410 },
  { month: 'Oct', recovered: 4180, prevented: 8000, leaks: 300 },
];

export const DashboardPage: React.FC = () => {
  const { company, anomalies, transactions, investigations, metrics, documents } = useData();

  const highSeverityAnomalies = anomalies.filter(
    (a) => a.severity === 'high' && (a.status === 'NEEDS_REVIEW' || a.status === 'ESCALATED')
  );

  const pendingInvestigations = investigations.filter(
    (i) => i.status === 'NEEDS_REVIEW' || i.status === 'ESCALATED'
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner / Triage Alert if any High-Severity findings exist */}
      {highSeverityAnomalies.length > 0 && (
        <div className="p-4 rounded-xl bg-alert-redBg border border-alert-redBorder flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-subtle animate-fadeIn">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-alert-red text-white flex items-center justify-center flex-shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-alert-red">
                Action Required: {highSeverityAnomalies.length} High-Risk Discrepancies Require Approval
              </h3>
              <p className="text-xs text-charcoal-700 mt-0.5">
                Suspected wire redirection to Cayman Trust (Apex Logistics) & duplicate CloudBox debit detected.
              </p>
            </div>
          </div>
          <NavLink
            to="/investigations"
            className="px-4 py-2 rounded-lg bg-alert-red hover:bg-red-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 flex-shrink-0 transition-colors shadow-subtle"
          >
            <span>Enter Triage Queue</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </NavLink>
        </div>
      )}

      {/* Hero Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Net Recovered & Prevented */}
        <div className="p-5 rounded-xl bg-white border border-paper-300 shadow-subtle space-y-3">
          <div className="flex items-center justify-between text-charcoal-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Net Recovered & Prevented</span>
            <div className="w-7 h-7 rounded bg-forest-100 text-forest-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-charcoal-900 tracking-tight">
              ${(metrics.recoveredAmount + metrics.preventedFraudAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-bold text-forest-700">+18.4%</span>
              <span className="text-[11px] text-charcoal-500">vs last month</span>
            </div>
          </div>
          <div className="pt-2 border-t border-paper-200 flex justify-between text-[11px] text-charcoal-500">
            <span>SaaS Recovered: <strong className="text-charcoal-800">${metrics.recoveredAmount.toLocaleString()}</strong></span>
            <span>Fraud Halted: <strong className="text-charcoal-800">${metrics.preventedFraudAmount.toLocaleString()}</strong></span>
          </div>
        </div>

        {/* Metric 2: Audit Cleanliness Score */}
        <div className="p-5 rounded-xl bg-white border border-paper-300 shadow-subtle space-y-3">
          <div className="flex items-center justify-between text-charcoal-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Audit Cleanliness Score</span>
            <div className="w-7 h-7 rounded bg-forest-100 text-forest-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-forest-800 tracking-tight">
              {metrics.overallScore.toFixed(1)}%
            </div>
            <div className="w-full bg-paper-200 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-forest-600 h-full rounded-full"
                style={{ width: `${metrics.overallScore}%` }}
              ></div>
            </div>
          </div>
          <div className="pt-2 border-t border-paper-200 flex justify-between text-[11px] text-charcoal-500">
            <span>IRS Deductibility: <strong className="text-forest-700">{metrics.taxReadinessPercent}%</strong></span>
            <span>Bank Match: <strong className="text-forest-700">95%</strong></span>
          </div>
        </div>

        {/* Metric 3: Open Anomalies & Triage */}
        <div className="p-5 rounded-xl bg-white border border-paper-300 shadow-subtle space-y-3">
          <div className="flex items-center justify-between text-charcoal-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Forensic Findings</span>
            <div className="w-7 h-7 rounded bg-alert-amberBg text-alert-amber flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-charcoal-900 tracking-tight flex items-baseline gap-2">
              <span>{pendingInvestigations.length}</span>
              <span className="text-xs font-semibold text-charcoal-500">Investigations Pending</span>
            </div>
            <p className="text-[11px] text-charcoal-500 mt-1">
              {highSeverityAnomalies.length} High Severity · 0 Pauses Without Approval
            </p>
          </div>
          <div className="pt-2 border-t border-paper-200 flex justify-between text-[11px]">
            <NavLink to="/investigations" className="text-forest-700 hover:underline font-semibold flex items-center gap-1">
              <span>Review All Findings</span>
              <ArrowRight className="w-3 h-3" />
            </NavLink>
          </div>
        </div>

        {/* Metric 4: Multimodal Ingestion Stream */}
        <div className="p-5 rounded-xl bg-white border border-paper-300 shadow-subtle space-y-3">
          <div className="flex items-center justify-between text-charcoal-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Monitored Ingestion</span>
            <div className="w-7 h-7 rounded bg-cobalt-50 text-cobalt-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-charcoal-900 tracking-tight">
              {documents.length}
            </div>
            <p className="text-[11px] text-charcoal-500 mt-1">
              PDFs, Receipts, Bank Feeds & Inbound Mails
            </p>
          </div>
          <div className="pt-2 border-t border-paper-200 flex justify-between text-[11px] text-charcoal-500">
            <span>Reconciled: <strong className="text-charcoal-800">{metrics.reconciledCount}/{metrics.totalTransactions}</strong></span>
            <NavLink to="/documents" className="text-forest-700 hover:underline font-semibold">
              Document Vault
            </NavLink>
          </div>
        </div>
      </div>

      {/* Main Content Grid: Chart + Triage Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Monthly Capital Recovery Trend Chart */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-white border border-paper-300 shadow-subtle space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-paper-200">
            <div>
              <h3 className="text-sm font-bold text-charcoal-900">Capital Leakage Recovery & Fraud Prevention</h3>
              <p className="text-[11px] text-charcoal-500">Month-over-month autonomous financial recovery for {company.name}</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-forest-700 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-forest-600"></span> Recovered ($)
              </span>
              <span className="flex items-center gap-1 text-charcoal-600 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-charcoal-400"></span> Fraud Halted ($)
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={TREND_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="recoveredGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#176B4D" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#176B4D" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="preventedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2B59FF" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#2B59FF" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ECECE8" />
                <XAxis dataKey="month" stroke="#949B92" fontSize={11} tickLine={false} />
                <YAxis stroke="#949B92" fontSize={11} tickLine={false} tickFormatter={(val) => `$${val}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DEDFD8', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(value: any) => [`$${value}`, '']}
                />
                <Area type="monotone" dataKey="recovered" stroke="#176B4D" strokeWidth={2.5} fillOpacity={1} fill="url(#recoveredGrad)" name="SaaS Leakage Recovered" />
                <Area type="monotone" dataKey="prevented" stroke="#2B59FF" strokeWidth={2} fillOpacity={1} fill="url(#preventedGrad)" name="Wire/Invoice Fraud Halted" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right 1 Col: Action Required Triage List */}
        <div className="p-5 rounded-xl bg-white border border-paper-300 shadow-subtle flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-paper-200">
              <h3 className="text-sm font-bold text-charcoal-900">Urgent Triage Queue</h3>
              <NavLink to="/investigations" className="text-xs text-forest-700 hover:underline font-semibold">
                View All
              </NavLink>
            </div>

            <div className="space-y-3 mt-3">
              {pendingInvestigations.slice(0, 3).map((inv) => (
                <NavLink
                  key={inv.id}
                  to={`/investigations/${inv.id}`}
                  className="block p-3 rounded-lg border border-paper-200 hover:border-forest-600/40 hover:bg-paper-50 transition-all text-xs space-y-1.5 group"
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      inv.severity === 'high' ? 'bg-alert-redBg text-alert-red border border-alert-redBorder' : 'bg-alert-amberBg text-alert-amber border border-alert-amberBorder'
                    }`}>
                      {inv.severity.toUpperCase()} PRIORITY
                    </span>
                    <span className="text-[10px] text-charcoal-400 font-mono">
                      {new Date(inv.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h4 className="font-bold text-charcoal-900 group-hover:text-forest-800 transition-colors line-clamp-1">
                    {inv.title}
                  </h4>
                  <p className="text-[11px] text-charcoal-500 line-clamp-2">
                    {inv.summaryNote || 'Multi-document forensic finding.'}
                  </p>
                </NavLink>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <NavLink
              to="/graph"
              className="w-full py-2.5 px-3.5 rounded-lg bg-paper-100 hover:bg-paper-200 border border-paper-300 text-charcoal-800 font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <GitFork className="w-4 h-4 text-forest-700" />
              <span>Inspect Findings in Evidence Graph</span>
            </NavLink>
          </div>
        </div>
      </div>

      {/* Bottom Section: Live Protected Activity Feed */}
      <div className="p-5 rounded-xl bg-white border border-paper-300 shadow-subtle space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-paper-200 gap-2">
          <div>
            <h3 className="text-sm font-bold text-charcoal-900">Live Protected Activity Feed</h3>
            <p className="text-[11px] text-charcoal-500">Real-time monitored corporate card and bank ledger matched to digital invoices</p>
          </div>
          <NavLink to="/transactions" className="text-xs text-forest-700 hover:underline font-semibold flex items-center gap-1">
            <span>Open Reconciled Ledger</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </NavLink>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-paper-200 text-charcoal-500 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3">Account / Card</th>
                <th className="py-2.5 px-3">Amount</th>
                <th className="py-2.5 px-3">Forensic Match</th>
                <th className="py-2.5 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-paper-200">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-paper-50/70 transition-colors">
                  <td className="py-3 px-3 font-mono text-charcoal-500">{tx.date}</td>
                  <td className="py-3 px-3 font-semibold text-charcoal-900">{tx.description}</td>
                  <td className="py-3 px-3 text-charcoal-600">{tx.accountName}</td>
                  <td className="py-3 px-3 font-bold text-charcoal-900">
                    {tx.currency} {tx.amount.toFixed(2)}
                  </td>
                  <td className="py-3 px-3 text-charcoal-600">
                    {tx.reconciledInvoiceId ? (
                      <span className="font-mono text-charcoal-800 bg-paper-100 px-1.5 py-0.5 rounded border border-paper-200">
                        {tx.reconciledInvoiceId}
                      </span>
                    ) : (
                      <span className="text-charcoal-400">Unlinked expense</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right">
                    {tx.status === 'reconciled' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-forest-50 border border-forest-600/20 text-forest-800 text-[10px] font-bold">
                        <CheckCircle2 className="w-3 h-3 text-forest-700" />
                        Reconciled
                      </span>
                    ) : tx.status === 'flagged' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-alert-redBg border border-alert-redBorder text-alert-red text-[10px] font-bold">
                        <AlertTriangle className="w-3 h-3" />
                        Discrepancy Flagged
                      </span>
                    ) : (
                      <span className="text-[10px] text-charcoal-500">Unmatched</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
