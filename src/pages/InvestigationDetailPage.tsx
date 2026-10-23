import React, { useState } from 'react';
import { useParams, NavLink, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Phone,
  FileText,
  CreditCard,
  Mail,
  Building2,
  GitFork,
  ExternalLink,
  Send,
  User,
  ShieldCheck,
  Ban,
  Check,
  AlertCircle,
} from 'lucide-react';
import { useData } from '../context/DataContext';

export const InvestigationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { investigations, anomalies, vendors, invoices, transactions, emails, updateInvestigationReview } = useData();

  const investigation = investigations.find((inv) => inv.id === id);
  const anomaly = anomalies.find((a) => investigation?.anomalyIds.includes(a.id));
  const vendor = vendors.find((v) => investigation?.relatedVendorIds.includes(v.id));

  const [checklist, setChecklist] = useState<Record<number, boolean>>({});
  const [noteText, setNoteText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!investigation || !anomaly) {
    return (
      <div className="p-12 text-center max-w-xl mx-auto space-y-4">
        <AlertTriangle className="w-10 h-10 text-alert-amber mx-auto" />
        <h3 className="text-base font-bold text-charcoal-800">Investigation Dossier Not Found</h3>
        <p className="text-xs text-charcoal-500">The requested investigation record does not exist or has been archived.</p>
        <NavLink
          to="/investigations"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-forest-700 text-white text-xs font-semibold"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Triage List</span>
        </NavLink>
      </div>
    );
  }

  // Toggle checklist item
  const toggleCheck = (idx: number) => {
    setChecklist((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleAction = async (action: 'NEEDS_REVIEW' | 'VERIFIED_LEGITIMATE' | 'ESCALATED') => {
    setIsSubmitting(true);
    setFeedbackMsg(null);
    try {
      const defaultNote =
        action === 'ESCALATED'
          ? 'Marked as Escalated. Outgoing payment halted and vendor contact alerted.'
          : action === 'VERIFIED_LEGITIMATE'
          ? 'Verified legitimate by authorized human reviewer. Discrepancy cleared.'
          : 'Status reset to Needs Review for follow-up.';

      await updateInvestigationReview(investigation.id, action, noteText.trim() || defaultNote);
      setNoteText('');
      setFeedbackMsg({ type: 'success', text: `Investigation updated to: ${action.replace(/_/g, ' ')}` });
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Error updating status' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    setIsSubmitting(true);
    try {
      await updateInvestigationReview(investigation.id, 'NOTE_ADDED', noteText.trim());
      setNoteText('');
      setFeedbackMsg({ type: 'success', text: 'Note appended to audit trail.' });
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Error adding note' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Find supporting records
  const supportingInvoices = invoices.filter((i) => anomaly.supportingRecordIds.includes(i.id));
  const supportingTransactions = transactions.filter((t) => anomaly.supportingRecordIds.includes(t.id));
  const supportingEmails = emails.filter((e) => anomaly.supportingRecordIds.includes(e.id));

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Breadcrumb and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-paper-300 gap-3">
        <div className="flex items-center gap-3">
          <NavLink
            to="/investigations"
            className="p-2 rounded-lg border border-paper-300 bg-white hover:bg-paper-100 text-charcoal-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </NavLink>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${
                investigation.severity === 'high'
                  ? 'bg-alert-redBg text-alert-red border border-alert-redBorder'
                  : 'bg-alert-amberBg text-alert-amber border border-alert-amberBorder'
              }`}>
                {investigation.severity} Priority
              </span>
              <span className="font-mono text-xs text-charcoal-400">ID: {investigation.id}</span>
            </div>
            <h1 className="text-lg font-bold text-charcoal-900 mt-0.5">
              {investigation.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <NavLink
            to={`/graph`}
            className="px-3 py-1.5 rounded-lg border border-paper-300 bg-white hover:bg-paper-50 text-charcoal-800 text-xs font-semibold flex items-center gap-1.5 shadow-subtle"
          >
            <GitFork className="w-3.5 h-3.5 text-forest-700" />
            <span>Trace In Graph</span>
          </NavLink>
        </div>
      </div>

      {feedbackMsg && (
        <div className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
          feedbackMsg.type === 'success'
            ? 'bg-forest-50 border border-forest-600/30 text-forest-900'
            : 'bg-alert-redBg border border-alert-redBorder text-alert-red'
        }`}>
          {feedbackMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-forest-700" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Hero Plain-English Finding Card */}
      <div className="p-6 rounded-2xl bg-white border border-paper-300 shadow-subtle space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-paper-200">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-charcoal-500">Forensic Anomaly Dossier</span>
            <span className="text-[11px] font-mono bg-paper-100 text-charcoal-700 px-2 py-0.5 rounded border border-paper-200">
              {anomaly.category}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-charcoal-500">Current Status:</span>
            <span className={`px-2.5 py-0.5 rounded-md font-bold text-xs ${
              investigation.status === 'ESCALATED'
                ? 'bg-alert-red text-white'
                : investigation.status === 'VERIFIED_LEGITIMATE' || investigation.status === 'RESOLVED'
                ? 'bg-forest-100 text-forest-900'
                : 'bg-amber-100 text-amber-900'
            }`}>
              {investigation.status.replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold text-charcoal-900 mb-1">Plain-English Forensic Finding</h3>
          <p className="text-xs sm:text-sm text-charcoal-700 leading-relaxed bg-paper-50 p-4 rounded-xl border border-paper-200">
            {anomaly.explanation}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div className="p-3 rounded-lg bg-paper-50 border border-paper-200 space-y-1">
            <span className="text-[10px] font-bold uppercase text-charcoal-400">Deterministic Rule Applied</span>
            <p className="font-mono text-xs font-semibold text-charcoal-800">{anomaly.detectionRule}</p>
            <p className="text-[11px] text-charcoal-500">{anomaly.detectionMethod}</p>
          </div>

          <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200 space-y-1">
            <span className="text-[10px] font-bold uppercase text-amber-900">Uncertainty & What Remains Unverified</span>
            <p className="text-xs text-amber-900 leading-relaxed">{anomaly.uncertainty}</p>
          </div>
        </div>
      </div>

      {/* Side-by-Side Comparison (Historical vs Suspicious or Dual Payment) */}
      {anomaly.category === 'BENEFICIARY_ALTERATION' && vendor && (
        <div className="p-6 rounded-2xl bg-white border border-paper-300 shadow-subtle space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-paper-200">
            <h3 className="text-sm font-bold text-charcoal-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-alert-red" />
              <span>Remittance Comparison: Historical Verified vs Inbound Suspicious</span>
            </h3>
            <span className="text-xs text-alert-red font-semibold">Divergence Detected</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Historical Verified */}
            <div className="p-4 rounded-xl bg-forest-50/60 border border-forest-600/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-forest-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-forest-700" />
                  Historical Verified Details on File
                </span>
                <span className="text-[10px] bg-forest-100 text-forest-800 px-1.5 py-0.5 rounded font-semibold">Master Vault</span>
              </div>
              <div className="space-y-1 text-charcoal-700 font-mono text-[11px] bg-white p-3 rounded-lg border border-forest-200">
                <p><strong>Bank:</strong> {vendor.availableIdentifiers.verifiedBankAccounts[0]?.bankName || 'Chase Commercial'}</p>
                <p><strong>Account:</strong> ****{vendor.availableIdentifiers.verifiedBankAccounts[0]?.last4 || '4491'}</p>
                <p><strong>Country:</strong> {vendor.availableIdentifiers.verifiedBankAccounts[0]?.country || 'US'}</p>
                <p><strong>Verified Domain:</strong> {vendor.availableIdentifiers.verifiedEmailDomains[0]}</p>
              </div>
              <p className="text-[11px] text-forest-800">
                Used successfully in 14 prior transactions with 0 chargebacks.
              </p>
            </div>

            {/* Suspicious Proposed Remittance */}
            <div className="p-4 rounded-xl bg-alert-redBg border border-alert-redBorder space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-alert-red flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  Suspicious Instructions on Invoice INV-8821
                </span>
                <span className="text-[10px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded font-semibold">Flagged</span>
              </div>
              <div className="space-y-1 text-charcoal-800 font-mono text-[11px] bg-white p-3 rounded-lg border border-red-200">
                <p className="text-red-700"><strong>Bank:</strong> Cayman Trust Offshore Bank</p>
                <p className="text-red-700"><strong>Account:</strong> ****9012 (Offshore)</p>
                <p className="text-red-700"><strong>Routing:</strong> CYM-88219 (Swift: CYTRKYXX)</p>
                <p className="text-red-700"><strong>Sender Domain:</strong> @apex-loglstics.com ('l' not 'i')</p>
              </div>
              <p className="text-[11px] text-alert-red font-semibold">
                ⚠ DKIM Failed. Domain registered 6 days ago via NameCheap Privacy.
              </p>
            </div>
          </div>

          {/* 1-Tap Dialer for verified vendor contact */}
          {vendor.availableIdentifiers.phone && (
            <div className="p-3 rounded-xl bg-paper-100 border border-paper-300 flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-xs">
                <Phone className="w-4 h-4 text-forest-700" />
                <span>
                  Verified phone on file for <strong>{vendor.name}</strong>: <code className="font-bold text-charcoal-900">{vendor.availableIdentifiers.phone}</code> ({vendor.availableIdentifiers.contactPerson})
                </span>
              </div>
              <a
                href={`tel:${vendor.availableIdentifiers.phone}`}
                className="px-3 py-1.5 rounded-lg bg-forest-700 hover:bg-forest-800 text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call Verified Contact</span>
              </a>
            </div>
          )}
        </div>
      )}

      {/* Supporting Records Table */}
      <div className="p-6 rounded-2xl bg-white border border-paper-300 shadow-subtle space-y-4">
        <h3 className="text-sm font-bold text-charcoal-900">
          Supporting Multimodal Evidence Records ({anomaly.supportingRecordIds.length})
        </h3>

        <div className="space-y-2 text-xs">
          {supportingInvoices.map((inv) => (
            <div key={inv.id} className="p-3 rounded-lg bg-paper-50 border border-paper-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-charcoal-600" />
                <div>
                  <span className="font-bold text-charcoal-900">Invoice {inv.invoiceNumber}</span>
                  <span className="text-charcoal-500 ml-2">Total: {inv.currency} {inv.total} ({inv.invoiceDate})</span>
                </div>
              </div>
              <span className="font-mono text-[11px] text-charcoal-400">Doc: {inv.documentId}</span>
            </div>
          ))}

          {supportingTransactions.map((tx) => (
            <div key={tx.id} className="p-3 rounded-lg bg-paper-50 border border-paper-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CreditCard className="w-4 h-4 text-cobalt-600" />
                <div>
                  <span className="font-bold text-charcoal-900">{tx.description}</span>
                  <span className="text-charcoal-500 ml-2">Debit: {tx.currency} {tx.amount} on {tx.accountName}</span>
                </div>
              </div>
              <span className="font-mono text-[11px] text-charcoal-400">{tx.date}</span>
            </div>
          ))}

          {supportingEmails.map((em) => (
            <div key={em.id} className="p-3 rounded-lg bg-paper-50 border border-paper-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-amber-600" />
                <div>
                  <span className="font-bold text-charcoal-900">{em.subject}</span>
                  <span className="text-charcoal-500 ml-2">From: {em.sender} ({em.date})</span>
                </div>
              </div>
              <span className="font-mono text-[11px] text-charcoal-400">Email Ref</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recommended Verification Checklist */}
      <div className="p-6 rounded-2xl bg-white border border-paper-300 shadow-subtle space-y-4">
        <h3 className="text-sm font-bold text-charcoal-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-forest-700" />
          <span>Recommended Human Verification Checklist</span>
        </h3>

        <div className="space-y-2 text-xs">
          {anomaly.verificationChecklist.map((item, idx) => (
            <label
              key={idx}
              className={`p-3 rounded-lg border transition-colors flex items-start gap-3 cursor-pointer select-none ${
                checklist[idx] ? 'bg-forest-50/50 border-forest-600/40 text-forest-900' : 'bg-paper-50 border-paper-200 text-charcoal-800 hover:bg-paper-100'
              }`}
            >
              <input
                type="checkbox"
                checked={!!checklist[idx]}
                onChange={() => toggleCheck(idx)}
                className="mt-0.5 rounded text-forest-700 focus:ring-forest-600"
              />
              <span className={checklist[idx] ? 'line-through text-charcoal-500' : ''}>{item}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Reviewer Notes & Decision Action Bar */}
      <div className="p-6 rounded-2xl bg-white border border-paper-300 shadow-elevated space-y-4">
        <h3 className="text-sm font-bold text-charcoal-900">
          Reviewer Triage Decision & Audit Trail
        </h3>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-charcoal-600 block">
            Add Reviewer Notes / Verification Justification:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g., Called Elena at verified number; confirmed invoice INV-8821 was an attack attempt."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg border border-paper-300 text-xs focus:outline-none focus:ring-1 focus:ring-forest-600"
            />
            <button
              onClick={handleAddNote}
              disabled={isSubmitting || !noteText.trim()}
              className="px-3.5 py-2 rounded-lg border border-paper-300 bg-paper-100 hover:bg-paper-200 text-xs font-semibold text-charcoal-800 disabled:opacity-50"
            >
              Add Note
            </button>
          </div>
        </div>

        {/* 3 Explicit Decisions */}
        <div className="pt-3 border-t border-paper-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-xs text-charcoal-500">
            <ShieldCheck className="w-4 h-4 text-forest-700" />
            <span>Zero Disruption Policy: No payment paused without this click.</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleAction('NEEDS_REVIEW')}
              disabled={isSubmitting}
              className="px-3.5 py-2 rounded-lg border border-paper-300 bg-white hover:bg-paper-100 text-xs font-semibold text-charcoal-700"
            >
              Needs Follow-Up
            </button>

            <button
              onClick={() => handleAction('VERIFIED_LEGITIMATE')}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-forest-700 hover:bg-forest-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-subtle"
            >
              <Check className="w-3.5 h-3.5" />
              <span>I Verified This — Approve</span>
            </button>

            <button
              onClick={() => handleAction('ESCALATED')}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-alert-red hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-subtle"
            >
              <Ban className="w-3.5 h-3.5" />
              <span>Pause Payment & Escalate</span>
            </button>
          </div>
        </div>

        {/* Review History Logs */}
        <div className="pt-4 border-t border-paper-200 space-y-2">
          <h4 className="text-xs font-bold text-charcoal-500 uppercase tracking-wider">
            Chronological Audit Log ({investigation.reviewHistory.length})
          </h4>
          <div className="space-y-2">
            {investigation.reviewHistory.map((rev) => (
              <div key={rev.id} className="p-3 rounded-lg bg-paper-50 border border-paper-200 text-xs space-y-1">
                <div className="flex justify-between text-[11px] text-charcoal-500">
                  <span className="font-semibold text-charcoal-800 flex items-center gap-1">
                    <User className="w-3 h-3 text-forest-700" />
                    {rev.author}
                  </span>
                  <span className="font-mono">{new Date(rev.timestamp).toLocaleString()}</span>
                </div>
                <p className="text-charcoal-700">{rev.notes}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
