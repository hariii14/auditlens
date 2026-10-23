import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  DocumentRecord,
  VendorRecord,
  InvoiceRecord,
  TransactionRecord,
  EmailRecord,
  SubscriptionRecord,
  AnomalyRecord,
  EvidenceEdgeRecord,
  InvestigationRecord,
  AuditCleanlinessMetric,
  ReviewStatus,
} from '../types';
import {
  MOCK_COMPANY,
  MOCK_DOCUMENTS,
  MOCK_VENDORS,
  MOCK_INVOICES,
  MOCK_TRANSACTIONS,
  MOCK_EMAILS,
  MOCK_SUBSCRIPTIONS,
  MOCK_ANOMALIES,
  MOCK_EVIDENCE_EDGES,
  MOCK_INVESTIGATIONS,
  MOCK_METRICS,
} from '../data/mockData';

interface DataContextType {
  company: typeof MOCK_COMPANY;
  documents: DocumentRecord[];
  vendors: VendorRecord[];
  invoices: InvoiceRecord[];
  transactions: TransactionRecord[];
  emails: EmailRecord[];
  subscriptions: SubscriptionRecord[];
  anomalies: AnomalyRecord[];
  edges: EvidenceEdgeRecord[];
  investigations: InvestigationRecord[];
  metrics: AuditCleanlinessMetric;
  isLoading: boolean;
  isLiveApi: boolean;
  refreshData: () => Promise<void>;
  updateInvestigationReview: (investigationId: string, action: ReviewStatus | 'NOTE_ADDED', notes: string, author?: string) => Promise<boolean>;
  uploadDocument: (file?: File, pastedText?: string, source?: string) => Promise<DocumentRecord | null>;
  resetToBaseline: () => Promise<void>;
  saveApiKey: (apiKey: string) => Promise<{ success: boolean; message?: string; error?: string }>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [company, setCompany] = useState(MOCK_COMPANY);
  const [documents, setDocuments] = useState<DocumentRecord[]>(MOCK_DOCUMENTS);
  const [vendors, setVendors] = useState<VendorRecord[]>(MOCK_VENDORS);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>(MOCK_INVOICES);
  const [transactions, setTransactions] = useState<TransactionRecord[]>(MOCK_TRANSACTIONS);
  const [emails, setEmails] = useState<EmailRecord[]>(MOCK_EMAILS);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>(MOCK_SUBSCRIPTIONS);
  const [anomalies, setAnomalies] = useState<AnomalyRecord[]>(MOCK_ANOMALIES);
  const [edges, setEdges] = useState<EvidenceEdgeRecord[]>(MOCK_EVIDENCE_EDGES);
  const [investigations, setInvestigations] = useState<InvestigationRecord[]>(MOCK_INVESTIGATIONS);
  const [metrics, setMetrics] = useState<AuditCleanlinessMetric>(MOCK_METRICS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLiveApi, setIsLiveApi] = useState<boolean>(false);

  // Fetch initial data from backend if available, fallback gracefully to mockData
  const refreshData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/data');
      if (res.ok) {
        const data = await res.json();
        setCompany(data.company || MOCK_COMPANY);
        setDocuments(data.documents || MOCK_DOCUMENTS);
        setVendors(data.vendors || MOCK_VENDORS);
        setInvoices(data.invoices || MOCK_INVOICES);
        setTransactions(data.transactions || MOCK_TRANSACTIONS);
        setEmails(data.emails || MOCK_EMAILS);
        setSubscriptions(data.subscriptions || MOCK_SUBSCRIPTIONS);
        setAnomalies(data.anomalies || MOCK_ANOMALIES);
        setEdges(data.edges || MOCK_EVIDENCE_EDGES);
        setInvestigations(data.investigations || MOCK_INVESTIGATIONS);
        setMetrics(data.metrics || MOCK_METRICS);
        setIsLiveApi(true);
      }
    } catch (err) {
      console.warn('API fetch failed, utilizing client-side forensic repository.');
      setIsLiveApi(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const updateInvestigationReview = async (
    investigationId: string,
    action: ReviewStatus | 'NOTE_ADDED',
    notes: string,
    author: string = 'Sarah Jenkins (Founder)'
  ): Promise<boolean> => {
    try {
      const res = await fetch(`/api/investigations/${investigationId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes, author }),
      });

      if (res.ok) {
        const result = await res.json();
        // Update local state
        setInvestigations(prev =>
          prev.map(inv => inv.id === investigationId ? result.investigation : inv)
        );
        if (action !== 'NOTE_ADDED') {
          const inv = investigations.find(i => i.id === investigationId);
          if (inv) {
            setAnomalies(prev =>
              prev.map(a => inv.anomalyIds.includes(a.id) ? { ...a, status: action, updatedAt: new Date().toISOString() } : a)
            );
          }
        }
        await refreshData();
        return true;
      }
    } catch (err) {
      console.warn('Backend unavailable, updating local client state.');
    }

    // Client-side fallback update
    const now = new Date().toISOString();
    const newEvent = {
      id: `rev-${Date.now()}`,
      investigationId,
      anomalyId: '',
      action,
      notes,
      author,
      timestamp: now,
    };

    setInvestigations(prev =>
      prev.map(inv => {
        if (inv.id === investigationId) {
          return {
            ...inv,
            status: action !== 'NOTE_ADDED' ? action : inv.status,
            updatedAt: now,
            reviewHistory: [...inv.reviewHistory, newEvent],
          };
        }
        return inv;
      })
    );

    if (action !== 'NOTE_ADDED') {
      const targetInv = investigations.find(i => i.id === investigationId);
      if (targetInv) {
        setAnomalies(prev =>
          prev.map(a =>
            targetInv.anomalyIds.includes(a.id)
              ? { ...a, status: action, updatedAt: now }
              : a
          )
        );
      }
      setMetrics(prev => ({
        ...prev,
        overallScore: action === 'RESOLVED' || action === 'VERIFIED_LEGITIMATE' ? Math.min(99.5, prev.overallScore + 0.8) : prev.overallScore,
        unresolvedAnomalies: Math.max(0, prev.unresolvedAnomalies - (action === 'RESOLVED' || action === 'VERIFIED_LEGITIMATE' ? 1 : 0)),
      }));
    }

    return true;
  };

  const uploadDocument = async (file?: File, pastedText?: string, source: string = 'Manual Upload'): Promise<DocumentRecord | null> => {
    try {
      const formData = new FormData();
      if (file) formData.append('file', file);
      if (pastedText) formData.append('pastedText', pastedText);
      formData.append('source', source);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        await refreshData();
        return data.document;
      }
    } catch (err) {
      console.warn('Upload API call failed, generating simulated forensic parse in local state.');
    }

    // Client-side fallback ingestion
    const docId = `doc-${Date.now()}`;
    const newDoc: DocumentRecord = {
      id: docId,
      filename: file ? file.name : `Pasted_Note_${new Date().toISOString().slice(0, 10)}.txt`,
      type: file?.type.includes('image') ? 'receipt_img' : 'invoice_pdf',
      uploadDate: new Date().toISOString().slice(0, 10),
      processingStatus: 'parsed',
      fileSize: file?.size || pastedText?.length || 1024,
      extractedFields: {
        vendorName: 'Direct Ingest Vendor',
        invoiceNumber: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
        date: new Date().toISOString().slice(0, 10),
        currency: 'USD',
        total: 120.00,
        confidenceScore: 0.92,
        notes: 'Locally parsed financial record',
      },
      sourceReference: `${source} (Offline local mode)`,
      rawContent: pastedText || `Processed file ${file?.name}`,
      visualFlags: ['Standard Resolution Verified'],
    };

    setDocuments(prev => [newDoc, ...prev]);
    return newDoc;
  };

  const resetToBaseline = async () => {
    try {
      await fetch('/api/reset', { method: 'POST' });
    } catch (err) {
      // ignore
    }
    setCompany(MOCK_COMPANY);
    setDocuments(MOCK_DOCUMENTS);
    setVendors(MOCK_VENDORS);
    setInvoices(MOCK_INVOICES);
    setTransactions(MOCK_TRANSACTIONS);
    setEmails(MOCK_EMAILS);
    setSubscriptions(MOCK_SUBSCRIPTIONS);
    setAnomalies(MOCK_ANOMALIES);
    setEdges(MOCK_EVIDENCE_EDGES);
    setInvestigations(MOCK_INVESTIGATIONS);
    setMetrics(MOCK_METRICS);
  };

  const saveApiKey = async (apiKey: string): Promise<{ success: boolean; message?: string; error?: string }> => {
    try {
      const res = await fetch('/api/settings/key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      });
      const data = await res.json();
      if (res.ok) {
        return { success: true, message: data.message };
      }
      return { success: false, error: data.error };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error saving API key' };
    }
  };

  return (
    <DataContext.Provider
      value={{
        company,
        documents,
        vendors,
        invoices,
        transactions,
        emails,
        subscriptions,
        anomalies,
        edges,
        investigations,
        metrics,
        isLoading,
        isLiveApi,
        refreshData,
        updateInvestigationReview,
        uploadDocument,
        resetToBaseline,
        saveApiKey,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
