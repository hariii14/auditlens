import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ShieldAlert,
  GitFork,
  FileText,
  CreditCard,
  Building2,
  FileSpreadsheet,
  Settings,
  PlusCircle,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { useData } from '../../context/DataContext';

interface SidebarProps {
  onOpenIngest: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenIngest }) => {
  const { company, anomalies, metrics } = useData();
  const highRiskCount = anomalies.filter(a => a.severity === 'high' && (a.status === 'NEEDS_REVIEW' || a.status === 'ESCALATED')).length;

  const navItems = [
    { label: 'Overview Radar', path: '/dashboard', icon: LayoutDashboard },
    {
      label: 'Investigations',
      path: '/investigations',
      icon: ShieldAlert,
      badge: highRiskCount > 0 ? highRiskCount : undefined,
      badgeColor: 'bg-alert-red text-white'
    },
    { label: 'Evidence Graph', path: '/graph', icon: GitFork, isSpecial: true },
    { label: 'Document Vault', path: '/documents', icon: FileText },
    { label: 'Transactions', path: '/transactions', icon: CreditCard },
    { label: 'Vendor Vault', path: '/vendors', icon: Building2 },
    { label: 'CPA & Reports', path: '/reports', icon: FileSpreadsheet },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 border-r border-paper-300 bg-paper-50 flex flex-col h-screen sticky top-0 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-paper-300">
        <NavLink to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-lg bg-forest-700 flex items-center justify-center text-white font-bold text-lg shadow-subtle group-hover:bg-forest-800 transition-colors">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <circle cx="12" cy="11" r="3" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg tracking-tight text-charcoal-900">AuditLens</span>
              <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-lime-soft text-forest-900 border border-lime-accent/40">AI Core</span>
            </div>
            <p className="text-[11px] text-charcoal-500 font-medium tracking-tight">Autonomous Financial Forensics</p>
          </div>
        </NavLink>

        {/* Company Switcher Pill */}
        <div className="mt-4 p-2.5 rounded-lg bg-white border border-paper-300 shadow-subtle flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded bg-forest-100 text-forest-800 flex items-center justify-center text-xs font-bold">
              PC
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-charcoal-800 truncate">{company.name}</p>
              <p className="text-[10px] text-charcoal-400">24 Employees · Active Feed</p>
            </div>
          </div>
          <span className="w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-emerald-100" title="Bank feeds synced"></span>
        </div>
      </div>

      {/* Primary Ingestion CTA */}
      <div className="px-4 pt-4 pb-2">
        <button
          onClick={onOpenIngest}
          className="w-full py-2.5 px-3.5 rounded-lg bg-forest-700 hover:bg-forest-800 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-subtle transition-all active:scale-[0.98]"
        >
          <PlusCircle className="w-4 h-4 text-lime-accent" />
          <span>Ingest Bill or Receipt</span>
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        <div className="text-[10px] font-bold uppercase tracking-wider text-charcoal-400 px-3 py-1.5">
          Forensic Workspace
        </div>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-forest-100 text-forest-900 font-semibold'
                  : 'text-charcoal-600 hover:text-charcoal-900 hover:bg-paper-200/70'
              } ${item.isSpecial ? 'border border-dashed border-forest-600/30' : ''}`
            }
          >
            <div className="flex items-center gap-2.5">
              <item.icon className={`w-4 h-4 ${item.isSpecial ? 'text-forest-700' : 'text-charcoal-500'}`} />
              <span>{item.label}</span>
              {item.isSpecial && (
                <span className="text-[9px] font-bold text-forest-700 bg-forest-50 border border-forest-600/30 px-1 rounded">
                  Graph
                </span>
              )}
            </div>
            {item.badge && (
              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${item.badgeColor}`}>
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom Health & Assurance */}
      <div className="p-4 border-t border-paper-300 bg-paper-100/60">
        <div className="p-2.5 rounded-lg bg-white border border-paper-300">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-charcoal-600">Audit Cleanliness</span>
            <span className="font-bold text-forest-700">{metrics.overallScore}%</span>
          </div>
          <div className="w-full bg-paper-200 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-forest-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${metrics.overallScore}%` }}
            ></div>
          </div>
          <p className="text-[10px] text-charcoal-500 mt-1.5 flex items-center justify-between">
            <span>IRS & Ledger Ready</span>
            <span className="text-forest-700 font-semibold">96% Confident</span>
          </p>
        </div>

        <div className="mt-2.5 flex items-center justify-between text-[11px] text-charcoal-500 px-1">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-forest-600"></span>
            Zero Disruption Policy
          </span>
          <NavLink to="/" className="text-charcoal-400 hover:text-charcoal-700">
            <ExternalLink className="w-3 h-3" />
          </NavLink>
        </div>
      </div>
    </aside>
  );
};
