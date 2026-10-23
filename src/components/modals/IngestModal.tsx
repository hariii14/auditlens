import React, { useState, useRef } from 'react';
import {
  X,
  UploadCloud,
  Camera,
  Mail,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Eye,
} from 'lucide-react';
import { useData } from '../../context/DataContext';

interface IngestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IngestModal: React.FC<IngestModalProps> = ({ isOpen, onClose }) => {
  const { uploadDocument } = useData();
  const [activeTab, setActiveTab] = useState<'upload' | 'camera' | 'email'>('upload');
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedResult, setProcessedResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleIngest = async () => {
    if (!selectedFile && !pastedText.trim()) {
      setError('Please select a file or paste text to ingest.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const source = activeTab === 'camera' ? 'Mobile Smart Viewfinder' : activeTab === 'email' ? 'Pasted Email Forward' : 'Manual Upload';
      const doc = await uploadDocument(selectedFile || undefined, pastedText.trim() || undefined, source);
      if (doc) {
        setProcessedResult(doc);
      } else {
        setError('Extraction completed with warnings.');
      }
    } catch (err: any) {
      setError(err.message || 'Error processing document');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPastedText('');
    setProcessedResult(null);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-xl shadow-elevated border border-paper-300 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-paper-300 flex items-center justify-between bg-paper-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-forest-700 text-white flex items-center justify-center">
              <UploadCloud className="w-4 h-4 text-lime-accent" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-charcoal-900">Multimodal Ingestion Pipeline</h2>
              <p className="text-[11px] text-charcoal-500">Autonomous OCR, DPI inspection, and entity matching</p>
            </div>
          </div>
          <button
            onClick={() => { handleReset(); onClose(); }}
            className="p-1.5 rounded-lg text-charcoal-400 hover:text-charcoal-700 hover:bg-paper-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {processedResult ? (
            /* Result Success View */
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4 rounded-xl bg-forest-50 border border-forest-600/30 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-forest-700 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-forest-900">Document Successfully Ingested & Analyzed</h4>
                  <p className="text-xs text-forest-800 mt-0.5">
                    Extracted metadata and verified against historical vendor profiles.
                  </p>
                </div>
              </div>

              <div className="bg-paper-50 border border-paper-300 rounded-lg p-4 space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-paper-200">
                  <span className="text-charcoal-500">Document ID:</span>
                  <span className="font-mono font-medium text-charcoal-900">{processedResult.id}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-paper-200">
                  <span className="text-charcoal-500">Extracted Vendor:</span>
                  <span className="font-semibold text-charcoal-900">{processedResult.extractedFields.vendorName || 'Identified'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-paper-200">
                  <span className="text-charcoal-500">Amount / Total:</span>
                  <span className="font-bold text-forest-800">
                    {processedResult.extractedFields.currency || 'USD'} {processedResult.extractedFields.total?.toFixed(2) || '0.00'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-paper-200">
                  <span className="text-charcoal-500">Forensic Confidence:</span>
                  <span className="font-medium text-emerald-700">{Math.round((processedResult.extractedFields.confidenceScore || 0.95) * 100)}% Match</span>
                </div>
                <div className="py-1">
                  <span className="text-charcoal-500 block mb-1">Visual / DPI Flags:</span>
                  <div className="flex flex-wrap gap-1">
                    {(processedResult.visualFlags || ['Standard Resolution Verified']).map((flag: string, idx: number) => (
                      <span key={idx} className="px-2 py-0.5 rounded bg-white border border-paper-300 text-[11px] text-charcoal-700">
                        {flag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={handleReset}
                  className="px-3.5 py-2 rounded-lg border border-paper-300 text-xs font-medium text-charcoal-700 hover:bg-paper-100"
                >
                  Ingest Another
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg bg-forest-700 hover:bg-forest-800 text-white text-xs font-semibold"
                >
                  View In Ledger
                </button>
              </div>
            </div>
          ) : (
            /* Upload / Input Tabs */
            <>
              {/* Tab Selector */}
              <div className="grid grid-cols-3 gap-1 p-1 bg-paper-100 rounded-lg border border-paper-300 text-xs font-medium">
                <button
                  onClick={() => setActiveTab('upload')}
                  className={`py-1.5 rounded-md flex items-center justify-center gap-1.5 transition-colors ${
                    activeTab === 'upload' ? 'bg-white text-charcoal-900 shadow-sm font-semibold' : 'text-charcoal-500 hover:text-charcoal-800'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>PDF / File</span>
                </button>
                <button
                  onClick={() => setActiveTab('camera')}
                  className={`py-1.5 rounded-md flex items-center justify-center gap-1.5 transition-colors ${
                    activeTab === 'camera' ? 'bg-white text-charcoal-900 shadow-sm font-semibold' : 'text-charcoal-500 hover:text-charcoal-800'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Mobile Scan</span>
                </button>
                <button
                  onClick={() => setActiveTab('email')}
                  className={`py-1.5 rounded-md flex items-center justify-center gap-1.5 transition-colors ${
                    activeTab === 'email' ? 'bg-white text-charcoal-900 shadow-sm font-semibold' : 'text-charcoal-500 hover:text-charcoal-800'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Paste Email</span>
                </button>
              </div>

              {/* Tab Content: Upload File */}
              {activeTab === 'upload' && (
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                    dragActive
                      ? 'border-forest-600 bg-forest-50/50'
                      : 'border-paper-300 hover:border-forest-600/50 bg-paper-50/50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.csv,.txt"
                    onChange={handleFileChange}
                  />
                  <div className="w-12 h-12 rounded-full bg-forest-100 text-forest-700 flex items-center justify-center mx-auto mb-3">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  {selectedFile ? (
                    <div>
                      <p className="text-xs font-bold text-charcoal-900">{selectedFile.name}</p>
                      <p className="text-[11px] text-charcoal-500 mt-0.5">{(selectedFile.size / 1024).toFixed(1)} KB · Ready to analyze</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-semibold text-charcoal-800">
                        Drop PDF invoice, receipt photo, or bank CSV
                      </p>
                      <p className="text-[11px] text-charcoal-400 mt-1">
                        Supports PDF, PNG, JPG, CSV (Up to 15MB)
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab Content: Camera / Viewfinder Simulator */}
              {activeTab === 'camera' && (
                <div className="space-y-3">
                  <div className="relative rounded-xl overflow-hidden bg-charcoal-900 text-white aspect-[4/3] flex flex-col items-center justify-center border border-charcoal-700 p-4">
                    {/* Viewfinder crosshairs and guidelines */}
                    <div className="absolute inset-4 border border-dashed border-lime-accent/60 rounded-lg pointer-events-none">
                      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-lime-accent"></div>
                      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-lime-accent"></div>
                      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-lime-accent"></div>
                      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-lime-accent"></div>
                    </div>

                    <div className="text-center z-10 px-4">
                      <Camera className="w-8 h-8 text-lime-accent mx-auto mb-2 animate-pulse" />
                      <p className="text-xs font-semibold">Smart Viewfinder Active</p>
                      <p className="text-[10px] text-paper-300 mt-1">
                        Auto edge-detection, glare compensation, and 300+ DPI check enabled
                      </p>
                    </div>

                    <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-[10px] text-paper-300 bg-charcoal-800/80 px-2.5 py-1.5 rounded-md backdrop-blur">
                      <span>DPI: 340 (Optimal)</span>
                      <span>Lighting: Balanced</span>
                      <span className="text-lime-accent font-medium">Ready</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      // Generate simulated receipt capture
                      const dummyBlob = new Blob(
                        ['Delta Air Lines In-Flight Meal & Baggage Receipt\nAmount: $64.00\nCard: Chase *4491'],
                        { type: 'text/plain' }
                      );
                      const file = new File([dummyBlob], 'Camera_Scan_Receipt_001.txt', { type: 'text/plain' });
                      setSelectedFile(file);
                    }}
                    className="w-full py-2.5 rounded-lg bg-forest-700 hover:bg-forest-800 text-white font-medium text-xs flex items-center justify-center gap-2"
                  >
                    <Camera className="w-4 h-4 text-lime-accent" />
                    <span>Capture Receipt Snapshot</span>
                  </button>
                  {selectedFile && (
                    <p className="text-[11px] text-forest-700 font-semibold text-center">
                      ✓ Snapshot captured: {selectedFile.name}
                    </p>
                  )}
                </div>
              )}

              {/* Tab Content: Paste Email */}
              {activeTab === 'email' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-charcoal-500">
                    <span>Forwarding address: <strong className="text-charcoal-800">receipts@auditlens.com</strong></span>
                    <button
                      type="button"
                      onClick={() => setPastedText(
                        "From: Elena Rostova <accounts@apex-loglstics.com>\nSubject: Updated Wire Details for Invoice INV-8821\n\nHi Sarah,\nOur bank has changed due to an internal audit. Please route the pending ₹5,000 to Cayman Trust Account #9012."
                      )}
                      className="text-forest-700 hover:underline font-semibold"
                    >
                      Fill Suspicious Example
                    </button>
                  </div>
                  <textarea
                    rows={6}
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="Paste raw vendor email headers, invoice text, or wire remittance instructions here..."
                    className="w-full p-3 rounded-lg border border-paper-300 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-forest-600 bg-white"
                  ></textarea>
                </div>
              )}

              {error && (
                <div className="p-3 rounded-lg bg-alert-redBg border border-alert-redBorder text-alert-red text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-1.5 text-[11px] text-charcoal-500">
                  <ShieldCheck className="w-3.5 h-3.5 text-forest-700" />
                  <span>Encrypted & Read-Only Ingestion</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={onClose}
                    className="px-3.5 py-2 rounded-lg border border-paper-300 text-xs font-medium text-charcoal-700 hover:bg-paper-100"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleIngest}
                    disabled={isProcessing}
                    className="px-4 py-2 rounded-lg bg-forest-700 hover:bg-forest-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-subtle disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Analyzing Multimodal Stream...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-lime-accent" />
                        <span>Run Forensic Extraction</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
