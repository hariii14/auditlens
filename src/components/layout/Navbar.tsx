import React from 'react';
import { useLocation, NavLink } from 'react-router-dom';
import {
  Bell,
  Search,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { useData } from '../../context/DataContext';

interface NavbarProps {
  onOpenIngest: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenIngest }) => {
  const location = useLocation();
  const { anomalies, metrics, resetToBaseline, isLiveApi } = useData();

  const getPageTitle = (path: string) => {
    if (path === '/dashboard') return 'Autonomous Radar & Overview';
    if (path.startsWith('/investigations')) return 'Forensic Investigations';
    if (path === '/graph') return 'Signature Evidence Graph';
    if (path === '/documents') return 'Multimodal Document Vault';
    if (path === '/transactions') return 'Unified Reconciled Ledger';
    if (path.startsWith('/vendors')) return 'Vendor Master Vault';
    if (path === '/reports') return 'CPA Audit & Tax Export';
    if (path === '/settings') return 'Forensic Configuration & API Key';
    return 'Financial Forensics';
  };

  const highSeverityAnomalies = anomalies.filter(
    (a) => a.severity === 'high' && (a.status === 'NEEDS_REVIEW' || a.status === 'ESCALATED')
  );

  return (
    <header className="h-16 border-b border-paper-300 bg-white/80 backdrop-blur px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Breadcrumb & Title */}
      <div className="flex items-center gap-3">
        <div>
          <div className="flex items-center gap-2 text-[11px] text-charcoal-400 font-medium">
            <span>PixelCraft Studio</span>
            <span>/</span>
            <span className="text-charcoal-600 font-semibold">{getPageTitle(location.pathname)}</span>
          </div>
          <h1 className="text-base font-bold text-charcoal-900 tracking-tight">
            {getPageTitle(location.pathname)}
          </h1>
        </div>

        {/* Live Sentinel Status Pill */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-forest-50 border border-forest-600/20 text-[11px] text-forest-800 font-medium ml-3">
          <span className="w-2 h-2 rounded-full bg-forest-600 animate-pulse"></span>
          <span>Sentinel Active</span>
        </div>
      </div>

      {/* Right: Actions, API Mode & Indicators */}
      <div className="flex items-center gap-3">
        {/* Mode Pill */}
        <NavLink
          to="/settings"
          className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors bg-paper-100 hover:bg-paper-200 text-charcoal-700 border-paper-300"
          title="Click to configure Gemini API Key in Settings"
        >
          <Sparkles className="w-3.5 h-3.5 text-forest-700" />
          <span>Demo Mode (Deterministic Engine)</span>
        </NavLink>

        {/* Reset Demo State Button */}
        <button
          onClick={resetToBaseline}
          className="p-2 text-charcoal-500 hover:text-charcoal-800 hover:bg-paper-200 rounded-lg text-xs flex items-center gap-1.5 border border-transparent hover:border-paper-300 transition-colors"
          title="Reset dataset back to pristine PixelCraft baseline"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline text-[11px] font-medium">Reset Demo</span>
        </button>

        {/* Triage Alert Pill */}
        {highSeverityAnomalies.length > 0 && (
          <NavLink
            to="/investigations"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-alert-redBg border border-alert-redBorder text-alert-red text-xs font-semibold animate-pulse"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{highSeverityAnomalies.length} High Risk</span>
          </NavLink>
        )}

        {/* Direct Ingest Modal trigger */}
        <button
          onClick={onOpenIngest}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-forest-700 hover:bg-forest-800 text-white text-xs font-semibold shadow-subtle transition-colors"
        >
          <span>+ Upload / Scan</span>
        </button>
      </div>
    </header>
  );
};
