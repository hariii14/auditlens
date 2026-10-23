import React, { useState } from 'react';
import {
  FileText,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  AlertTriangle,
  UploadCloud,
  FileSearch,
  Camera,
  Mail,
  Download,
  X,
  Sparkles,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { DocumentRecord, DocumentType } from '../types';
import { IngestModal } from '../components/modals/IngestModal';

export const DocumentsPage: React.FC = () => {
  const { documents } = useData();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | DocumentType>('all');
  const [selectedDoc, setSelectedDoc] = useState<DocumentRecord | null>(null);
  const [isIngestOpen, setIsIngestOpen] = useState(false);

  const filteredDocs = documents.filter((doc) => {
    if (typeFilter !== 'all' && doc.type !== typeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        doc.filename.toLowerCase().includes(q) ||
        doc.sourceReference.toLowerCase().includes(q) ||
        (doc.extractedFields.vendorName && doc.extractedFields.vendorName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-paper-300 gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-charcoal-900 tracking-tight">
            Multimodal Ingest Center & Document Vault
          </h2>
          <p className="text-xs text-charcoal-500 mt-0.5">
            PDF invoices, mobile receipt photos, bank statement feeds, and inbound vendor communications.
          </p>
        </div>

        <button
          onClick={() => setIsIngestOpen(true)}
          className="px-4 py-2 rounded-lg bg-forest-700 hover:bg-forest-800 text-white font-semibold text-xs flex items-center gap-2 shadow-subtle self-start"
        >
          <UploadCloud className="w-4 h-4 text-lime-accent" />
          <span>Ingest New Document</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Type Tabs */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-paper-200/70 rounded-lg border border-paper-300 text-xs font-medium">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              typeFilter === 'all' ? 'bg-white text-charcoal-900 font-semibold shadow-sm' : 'text-charcoal-600 hover:text-charcoal-900'
            }`}
          >
            All Docs ({documents.length})
          </button>
          <button
            onClick={() => setTypeFilter('invoice_pdf')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              typeFilter === 'invoice_pdf' ? 'bg-white text-charcoal-900 font-semibold shadow-sm' : 'text-charcoal-600 hover:text-charcoal-900'
            }`}
          >
            PDF Invoices
          </button>
          <button
            onClick={() => setTypeFilter('receipt_img')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              typeFilter === 'receipt_img' ? 'bg-white text-charcoal-900 font-semibold shadow-sm' : 'text-charcoal-600 hover:text-charcoal-900'
            }`}
          >
            Receipt Photos
          </button>
          <button
            onClick={() => setTypeFilter('contract_doc')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              typeFilter === 'contract_doc' ? 'bg-white text-charcoal-900 font-semibold shadow-sm' : 'text-charcoal-600 hover:text-charcoal-900'
            }`}
          >
            Contracts
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-charcoal-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-3 py-1.5 rounded-lg border border-paper-300 text-xs w-56 focus:outline-none focus:ring-1 focus:ring-forest-600 bg-white"
          />
        </div>
      </div>

      {/* Document Vault Table */}
      <div className="bg-white rounded-xl border border-paper-300 shadow-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-paper-200 text-charcoal-500 font-semibold uppercase text-[10px] tracking-wider bg-paper-50/50">
                <th className="py-3 px-4">Filename / Source</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Extracted Entity</th>
                <th className="py-3 px-4">Amount / Total</th>
                <th className="py-3 px-4">Confidence</th>
                <th className="py-3 px-4">Forensic Status</th>
                <th className="py-3 px-4 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-paper-200">
              {filteredDocs.map((doc) => (
                <tr key={doc.id} className="hover:bg-paper-50 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-paper-100 text-charcoal-700 flex items-center justify-center flex-shrink-0 border border-paper-200">
                        {doc.type === 'receipt_img' ? (
                          <Camera className="w-4 h-4 text-forest-700" />
                        ) : (
                          <FileText className="w-4 h-4 text-charcoal-700" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-charcoal-900 truncate">{doc.filename}</p>
                        <p className="text-[11px] text-charcoal-500 truncate">{doc.sourceReference}</p>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 font-mono text-[11px] text-charcoal-600 uppercase">
                    {doc.type.replace('_', ' ')}
                  </td>

                  <td className="py-3.5 px-4 font-semibold text-charcoal-800">
                    {doc.extractedFields.vendorName || 'Identified'}
                  </td>

                  <td className="py-3.5 px-4 font-bold text-charcoal-900">
                    {doc.extractedFields.total != null
                      ? `${doc.extractedFields.currency || 'USD'} ${doc.extractedFields.total.toFixed(2)}`
                      : '—'}
                  </td>

                  <td className="py-3.5 px-4 text-charcoal-600">
                    <span className="font-semibold text-forest-800">
                      {Math.round((doc.extractedFields.confidenceScore || 0.95) * 100)}%
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    {doc.processingStatus === 'flagged' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-alert-redBg border border-alert-redBorder text-alert-red text-[10px] font-bold">
                        <AlertTriangle className="w-3 h-3" />
                        Flagged
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-forest-50 border border-forest-600/20 text-forest-800 text-[10px] font-bold">
                        <CheckCircle2 className="w-3 h-3 text-forest-700" />
                        Parsed
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => setSelectedDoc(doc)}
                      className="px-2.5 py-1 rounded-md border border-paper-300 text-charcoal-700 hover:bg-paper-100 font-semibold text-xs flex items-center gap-1 ml-auto"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Document Inspector Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-xl shadow-elevated border border-paper-300 w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-paper-300 flex items-center justify-between bg-paper-50">
              <div className="flex items-center gap-2.5">
                <FileSearch className="w-5 h-5 text-forest-700" />
                <div>
                  <h3 className="text-sm font-bold text-charcoal-900">{selectedDoc.filename}</h3>
                  <p className="text-[11px] text-charcoal-500">{selectedDoc.sourceReference}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDoc(null)}
                className="p-1.5 rounded-lg text-charcoal-400 hover:text-charcoal-700 hover:bg-paper-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              {/* Extracted Fields Grid */}
              <div className="bg-paper-50 border border-paper-300 rounded-lg p-4 space-y-2">
                <h4 className="font-bold text-charcoal-900 text-xs uppercase tracking-wider mb-2">
                  Extracted Structured Metadata
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-charcoal-500 block">Vendor:</span>
                    <strong className="text-charcoal-900">{selectedDoc.extractedFields.vendorName || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-charcoal-500 block">Invoice Number:</span>
                    <strong className="font-mono text-charcoal-900">{selectedDoc.extractedFields.invoiceNumber || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-charcoal-500 block">Amount / Total:</span>
                    <strong className="text-forest-800">
                      {selectedDoc.extractedFields.currency} {selectedDoc.extractedFields.total?.toFixed(2) || '0.00'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-charcoal-500 block">Confidence Score:</span>
                    <strong className="text-charcoal-900">{Math.round((selectedDoc.extractedFields.confidenceScore || 0.95) * 100)}%</strong>
                  </div>
                  {selectedDoc.extractedFields.bankName && (
                    <div className="col-span-2 pt-1 border-t border-paper-200">
                      <span className="text-charcoal-500 block">Remittance Instructions:</span>
                      <strong className="font-mono text-charcoal-800">
                        {selectedDoc.extractedFields.bankName} (Acct ending in {selectedDoc.extractedFields.accountNumberLast4})
                      </strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Visual & Forensic Flags */}
              {selectedDoc.visualFlags && selectedDoc.visualFlags.length > 0 && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 space-y-1">
                  <span className="text-[10px] font-bold text-amber-900 uppercase">DPI & Layout Forensic Flags</span>
                  <ul className="list-disc list-inside text-amber-800 text-[11px] space-y-0.5">
                    {selectedDoc.visualFlags.map((flag, idx) => (
                      <li key={idx}>{flag}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Raw Extracted Document Content / Text */}
              {selectedDoc.rawContent && (
                <div>
                  <h4 className="font-bold text-charcoal-900 mb-1">Raw Document Excerpt / Content</h4>
                  <pre className="p-3 rounded-lg bg-paper-100 border border-paper-300 font-mono text-[11px] text-charcoal-800 whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {selectedDoc.rawContent}
                  </pre>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-paper-300 bg-paper-50 flex justify-end">
              <button
                onClick={() => setSelectedDoc(null)}
                className="px-4 py-2 rounded-lg bg-forest-700 text-white font-semibold text-xs"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Ingest Modal */}
      <IngestModal isOpen={isIngestOpen} onClose={() => setIsIngestOpen(false)} />
    </div>
  );
};
