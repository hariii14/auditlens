import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Filter,
  Search,
  Building2,
  DollarSign,
  ChevronRight,
  Sparkles,
  GitFork,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { AnomalySeverity, ReviewStatus } from '../types';

export const InvestigationsPage: React.FC = () => {
  const { investigations, anomalies, vendors } = useData();

  const [activeTab, setActiveTab] = useState<'all' | 'needs_review' | 'escalated' | 'verified'>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | AnomalySeverity>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredInvestigations = investigations.filter((inv) => {
    // Status tab filter
    if (activeTab === 'needs_review' && inv.status !== 'NEEDS_REVIEW') return false;
    if (activeTab === 'escalated' && inv.status !== 'ESCALATED') return false;
    if (activeTab === 'verified' && inv.status !== 'VERIFIED_LEGITIMATE' && inv.status !== 'RESOLVED') return false;

    // Severity filter
    if (severityFilter !== 'all' && inv.severity !== severityFilter) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        inv.title.toLowerCase().includes(q) ||
        (inv.summaryNote && inv.summaryNote.toLowerCase().includes(q))
      );
    }

    return true;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header with Title and Graph Shortcut */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-paper-300 gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-charcoal-900 tracking-tight">
            Forensic Investigation Workspace
          </h2>
          <p className="text-xs text-charcoal-500 mt-0.5">
            Human-in-the-loop triage for cross-document discrepancies, altered wire remittances, and SaaS leaks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <NavLink
            to="/graph"
            className="px-3 py-1.5 rounded-lg border border-paper-300 bg-white hover:bg-paper-50 text-charcoal-800 text-xs font-semibold flex items-center gap-1.5 shadow-subtle transition-colors"
          >
            <GitFork className="w-3.5 h-3.5 text-forest-700" />
            <span>Open in Evidence Graph</span>
          </NavLink>
        </div>
      </div>

      {/* Tabs & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 p-1 bg-paper-200/70 rounded-lg border border-paper-300 text-xs font-medium self-start">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'all' ? 'bg-white text-charcoal-900 font-semibold shadow-sm' : 'text-charcoal-600 hover:text-charcoal-900'
            }`}
          >
            All Findings ({investigations.length})
          </button>
          <button
            onClick={() => setActiveTab('needs_review')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'needs_review' ? 'bg-white text-charcoal-900 font-semibold shadow-sm' : 'text-charcoal-600 hover:text-charcoal-900'
            }`}
          >
            Needs Review ({investigations.filter(i => i.status === 'NEEDS_REVIEW').length})
          </button>
          <button
            onClick={() => setActiveTab('escalated')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'escalated' ? 'bg-white text-alert-red font-semibold shadow-sm' : 'text-charcoal-600 hover:text-charcoal-900'
            }`}
          >
            Escalated / On Hold ({investigations.filter(i => i.status === 'ESCALATED').length})
          </button>
          <button
            onClick={() => setActiveTab('verified')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'verified' ? 'bg-white text-forest-800 font-semibold shadow-sm' : 'text-charcoal-600 hover:text-charcoal-900'
            }`}
          >
            Resolved ({investigations.filter(i => i.status === 'VERIFIED_LEGITIMATE' || i.status === 'RESOLVED').length})
          </button>
        </div>

        {/* Search & Severity Filter */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-charcoal-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter findings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg border border-paper-300 text-xs w-48 focus:outline-none focus:ring-1 focus:ring-forest-600 bg-white"
            />
          </div>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as any)}
            className="py-1.5 px-2.5 rounded-lg border border-paper-300 text-xs bg-white text-charcoal-800 font-medium focus:outline-none focus:ring-1 focus:ring-forest-600"
          >
            <option value="all">All Severities</option>
            <option value="high">High Severity</option>
            <option value="medium">Medium Severity</option>
            <option value="low">Low Severity</option>
          </select>
        </div>
      </div>

      {/* Investigations List Cards */}
      <div className="space-y-3">
        {filteredInvestigations.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-xl border border-paper-300 text-charcoal-500 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-forest-700 mx-auto" />
            <h4 className="text-sm font-bold text-charcoal-800">No Discrepancies In Selected Filter</h4>
            <p className="text-xs">All records match the configured forensic criteria.</p>
          </div>
        ) : (
          filteredInvestigations.map((inv) => {
            const relatedVendor = vendors.find(v => inv.relatedVendorIds.includes(v.id));
            const mainAnomaly = anomalies.find(a => inv.anomalyIds.includes(a.id));

            return (
              <NavLink
                key={inv.id}
                to={`/investigations/${inv.id}`}
                className="block p-5 rounded-xl bg-white border border-paper-300 hover:border-forest-600/50 hover:shadow-card transition-all text-xs space-y-3 group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className={`px-2 py-0.5 rounded font-extrabold text-[10px] tracking-wider uppercase ${
                      inv.severity === 'high'
                        ? 'bg-alert-redBg border border-alert-redBorder text-alert-red'
                        : inv.severity === 'medium'
                        ? 'bg-alert-amberBg border border-alert-amberBorder text-alert-amber'
                        : 'bg-paper-200 border border-paper-300 text-charcoal-700'
                    }`}>
                      {inv.severity} Priority
                    </span>

                    <span className={`px-2 py-0.5 rounded font-semibold text-[10px] ${
                      inv.status === 'ESCALATED'
                        ? 'bg-alert-red text-white'
                        : inv.status === 'VERIFIED_LEGITIMATE' || inv.status === 'RESOLVED'
                        ? 'bg-forest-100 text-forest-900'
                        : 'bg-amber-100 text-amber-900'
                    }`}>
                      {inv.status.replace(/_/g, ' ')}
                    </span>

                    {relatedVendor && (
                      <span className="text-charcoal-600 font-medium flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-charcoal-400" />
                        {relatedVendor.name}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-charcoal-400 font-mono">
                    <Clock className="w-3 h-3" />
                    <span>Created: {new Date(inv.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-charcoal-900 group-hover:text-forest-800 transition-colors">
                    {inv.title}
                  </h3>
                  <p className="text-charcoal-600 text-xs mt-1 leading-relaxed">
                    {inv.summaryNote || mainAnomaly?.explanation}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between pt-2 border-t border-paper-200 text-charcoal-500 gap-2">
                  <div className="flex items-center gap-4 text-[11px]">
                    {mainAnomaly?.amountInDispute && (
                      <span>
                        Amount at Stake: <strong className="text-charcoal-900">{mainAnomaly.currency} {mainAnomaly.amountInDispute.toLocaleString()}</strong>
                      </span>
                    )}
                    <span>Detection: <strong className="text-charcoal-800">{mainAnomaly?.detectionMethod || 'Multimodal Rule'}</strong></span>
                  </div>

                  <span className="text-forest-700 font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    <span>Inspect Investigation Dossier</span>
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </div>
              </NavLink>
            );
          })
        )}
      </div>
    </div>
  );
};
