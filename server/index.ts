import express from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

import {
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
  MOCK_COMPANY,
} from '../src/data/mockData';
import { AnomalyEngine } from '../src/engine/anomalyEngine';
import {
  DocumentRecord,
  InvestigationRecord,
  AnomalyRecord,
  ReviewEvent,
  EvidenceEdgeRecord,
  VendorRecord,
  InvoiceRecord,
  TransactionRecord,
  EmailRecord,
  SubscriptionRecord,
} from '../src/types';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '20mb' }));

// Ensure upload directory exists
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB limit
});

// In-Memory Repository initialized with PixelCraft Studio demo data
let state = {
  documents: JSON.parse(JSON.stringify(MOCK_DOCUMENTS)) as DocumentRecord[],
  vendors: JSON.parse(JSON.stringify(MOCK_VENDORS)) as VendorRecord[],
  invoices: JSON.parse(JSON.stringify(MOCK_INVOICES)) as InvoiceRecord[],
  transactions: JSON.parse(JSON.stringify(MOCK_TRANSACTIONS)) as TransactionRecord[],
  emails: JSON.parse(JSON.stringify(MOCK_EMAILS)) as EmailRecord[],
  subscriptions: JSON.parse(JSON.stringify(MOCK_SUBSCRIPTIONS)) as SubscriptionRecord[],
  anomalies: JSON.parse(JSON.stringify(MOCK_ANOMALIES)) as AnomalyRecord[],
  edges: JSON.parse(JSON.stringify(MOCK_EVIDENCE_EDGES)) as EvidenceEdgeRecord[],
  investigations: JSON.parse(JSON.stringify(MOCK_INVESTIGATIONS)) as InvestigationRecord[],
  metrics: { ...MOCK_METRICS },
  company: { ...MOCK_COMPANY },
  customGeminiKey: process.env.GEMINI_API_KEY || '',
};

// Zod Schema for Structured Extraction Validation
const ExtractionSchema = z.object({
  vendorName: z.string().optional().nullable(),
  invoiceNumber: z.string().optional().nullable(),
  date: z.string().optional().nullable(),
  currency: z.string().default('USD'),
  subtotal: z.number().optional().nullable(),
  tax: z.number().optional().nullable(),
  total: z.number().optional().nullable(),
  bankName: z.string().optional().nullable(),
  accountNumberLast4: z.string().optional().nullable(),
  routingNumber: z.string().optional().nullable(),
  visualFlags: z.array(z.string()).default([]),
  confidenceScore: z.number().min(0).max(1).default(0.85),
  notes: z.string().optional(),
});

// Helper: Get active Gemini Client if key exists
function getGeminiModel() {
  const apiKey = state.customGeminiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return null;
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    // Use gemini-1.5-flash for speed and multimodal capabilities
    return genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  } catch (err) {
    console.error('Error initializing Gemini client:', err);
    return null;
  }
}

// ----------------------------------------------------
// ROUTES
// ----------------------------------------------------

// 1. Health & Config status
app.get('/api/health', (req, res) => {
  const hasKey = Boolean(state.customGeminiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
  res.json({
    status: 'online',
    version: '1.0.0',
    service: 'AuditLens Multimodal Forensic Core',
    geminiConfigured: hasKey,
    mode: hasKey ? 'live_gemini' : 'demo_synthetic',
    activeRecords: {
      documents: state.documents.length,
      anomalies: state.anomalies.length,
      investigations: state.investigations.length,
    }
  });
});

// 2. Fetch full repository data
app.get('/api/data', (req, res) => {
  res.json({
    company: state.company,
    documents: state.documents,
    vendors: state.vendors,
    invoices: state.invoices,
    transactions: state.transactions,
    emails: state.emails,
    subscriptions: state.subscriptions,
    anomalies: state.anomalies,
    edges: state.edges,
    investigations: state.investigations,
    metrics: state.metrics,
  });
});

// 3. Save or Test Gemini API Key
app.post('/api/settings/key', async (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey || typeof apiKey !== 'string') {
    return res.status(400).json({ error: 'Valid apiKey string required.' });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const testResult = await model.generateContent('Echo test: AuditLens online.');
    const responseText = testResult.response.text();

    state.customGeminiKey = apiKey;
    res.json({
      success: true,
      message: 'Gemini API Key verified and active for live multimodal extraction.',
      sampleEcho: responseText.trim(),
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: `Gemini API Key verification failed: ${err.message || 'Invalid key'}`,
    });
  }
});

// 4. Multimodal File Ingestion & Processing
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    const { pastedText, source = 'Manual Upload' } = req.body;

    if (!file && !pastedText) {
      return res.status(400).json({ error: 'Please provide a file or pasted text.' });
    }

    const docId = `doc-${Date.now()}`;
    const filename = file ? file.originalname : `Pasted_Communication_${new Date().toISOString().slice(0, 10)}.txt`;
    const mimeType = file ? file.mimetype : 'text/plain';

    let docType: DocumentRecord['type'] = 'invoice_pdf';
    if (mimeType.includes('image')) docType = 'receipt_img';
    else if (mimeType.includes('csv')) docType = 'csv_transactions';
    else if (filename.toLowerCase().includes('statement')) docType = 'bank_statement';
    else if (mimeType.includes('text') || pastedText) docType = 'vendor_email';

    let extractedData: z.infer<typeof ExtractionSchema> = {
      vendorName: 'Unknown Vendor',
      invoiceNumber: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toISOString().slice(0, 10),
      currency: 'USD',
      total: 0,
      visualFlags: [],
      confidenceScore: 0.85,
    };

    let extractionSource = 'Local Forensic Engine (Demo/Synthetic mode)';
    const geminiModel = getGeminiModel();

    if (geminiModel) {
      try {
        const prompt = `You are the AuditLens Multimodal Financial Forensics parser.
Analyze this financial document or communication thoroughly.
Extract the following fields in strict JSON format:
{
  "vendorName": string or null,
  "invoiceNumber": string or null,
  "date": "YYYY-MM-DD" or null,
  "currency": "USD" or "INR" or "EUR" (3 letter code),
  "subtotal": number or null,
  "tax": number or null,
  "total": number or null,
  "bankName": string or null,
  "accountNumberLast4": string or null,
  "routingNumber": string or null,
  "visualFlags": array of string observations (e.g. "Font misalignment", "Suspicious remittance address", "DPI variation", or "Clean layout"),
  "confidenceScore": number between 0.5 and 1.0,
  "notes": brief plain-English summary of what this document represents
}
Only output the JSON object. Do not wrap in markdown or backticks if possible.`;

        let contents: any[] = [prompt];

        if (file && (mimeType.includes('image') || mimeType.includes('pdf'))) {
          contents.push({
            inlineData: {
              data: file.buffer.toString('base64'),
              mimeType: file.mimetype,
            },
          });
        } else {
          contents.push(`Document Content:\n${pastedText || (file ? file.buffer.toString('utf-8') : '')}`);
        }

        const result = await geminiModel.generateContent(contents);
        const rawResponse = result.response.text();
        const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          const validated = ExtractionSchema.parse(parsed);
          extractedData = validated;
          extractionSource = 'Gemini 1.5 Flash Multimodal Ingestion';
        }
      } catch (geminiErr: any) {
        console.warn('Gemini extraction error, falling back to local heuristic extraction:', geminiErr.message);
        extractionSource = `Local Heuristic Parser (Gemini call error: ${geminiErr.message})`;
      }
    } else {
      // Local Heuristic parsing for demo
      const textToParse = pastedText || (file ? file.buffer.toString('utf-8').slice(0, 2000) : '');
      const lower = textToParse.toLowerCase();

      if (lower.includes('cloudbox')) {
        extractedData = {
          vendorName: 'CloudBox Inc',
          invoiceNumber: 'CB-102',
          date: new Date().toISOString().slice(0, 10),
          currency: 'INR',
          subtotal: 846.61,
          tax: 152.39,
          total: 999.00,
          bankName: 'HDFC Tech Banking',
          accountNumberLast4: '5512',
          visualFlags: ['Verified Standard DPI', 'Digital Signature Valid'],
          confidenceScore: 0.95,
          notes: 'November Cloud Storage Cycle - Auto detected',
        };
      } else if (lower.includes('apex') || lower.includes('freight')) {
        extractedData = {
          vendorName: 'Apex Logistics',
          invoiceNumber: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
          date: new Date().toISOString().slice(0, 10),
          currency: 'INR',
          subtotal: 5084.75,
          tax: 915.25,
          total: 6000.00,
          bankName: 'Cayman Trust Offshore Bank',
          accountNumberLast4: '9012',
          visualFlags: ['Suspicious Remittance Shift', 'Offshore IBAN Divergence'],
          confidenceScore: 0.82,
          notes: 'Logistics remittance update - flagged for offshore divergence',
        };
      } else {
        // Generic fallback parser
        const amountMatch = textToParse.match(/\$([0-9,]+(?:\.[0-9]{2})?)|(?:₹|INR)\s*([0-9,]+(?:\.[0-9]{2})?)/);
        const total = amountMatch ? parseFloat((amountMatch[1] || amountMatch[2]).replace(/,/g, '')) : 250.00;
        extractedData = {
          vendorName: filename.replace(/\.[^/.]+$/, '').split(/[-_]/)[0] || 'Enterprise Vendor',
          invoiceNumber: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
          date: new Date().toISOString().slice(0, 10),
          currency: textToParse.includes('₹') || textToParse.includes('INR') ? 'INR' : 'USD',
          total,
          visualFlags: ['Standard Document Resolution Verified'],
          confidenceScore: 0.90,
          notes: `Parsed via ${extractionSource}`,
        };
      }
    }

    // Create the document record
    const newDoc: DocumentRecord = {
      id: docId,
      filename,
      type: docType,
      uploadDate: new Date().toISOString().slice(0, 10),
      processingStatus: extractedData.visualFlags.some(f => f.toLowerCase().includes('suspicious') || f.toLowerCase().includes('mismatch')) ? 'flagged' : 'parsed',
      fileSize: file ? file.size : pastedText.length,
      extractedFields: extractedData,
      sourceReference: `${source} (Via ${extractionSource})`,
      rawContent: pastedText || (file ? `Binary attachment [${file.originalname}] processed` : ''),
      visualFlags: extractedData.visualFlags,
    };

    state.documents.unshift(newDoc);

    // If an invoice was extracted, create corresponding invoice record and link to graph
    if (extractedData.total && extractedData.total > 0) {
      let vendor = state.vendors.find(v => v.name.toLowerCase() === (extractedData.vendorName || '').toLowerCase());
      if (!vendor) {
        vendor = {
          id: `vend-${Date.now()}`,
          name: extractedData.vendorName || 'New Vendor',
          category: 'General Services',
          aliases: [extractedData.vendorName || 'New Vendor'],
          availableIdentifiers: {
            verifiedEmailDomains: [],
            verifiedBankAccounts: extractedData.accountNumberLast4 ? [
              { bankName: extractedData.bankName || 'Bank', last4: extractedData.accountNumberLast4, country: 'US' }
            ] : [],
          },
          associatedRecordIds: [docId],
          riskRating: 'low',
          monthlySpend: extractedData.total,
          currency: extractedData.currency || 'USD',
        };
        state.vendors.push(vendor);
      }

      const invId = `inv-${Date.now()}`;
      const newInvoice = {
        id: invId,
        vendorId: vendor.id,
        invoiceNumber: extractedData.invoiceNumber || `INV-${Date.now()}`,
        invoiceDate: extractedData.date || new Date().toISOString().slice(0, 10),
        currency: extractedData.currency || 'USD',
        subtotal: extractedData.subtotal || extractedData.total,
        tax: extractedData.tax || 0,
        total: extractedData.total,
        paymentDetails: {
          bankName: extractedData.bankName,
          accountNumberLast4: extractedData.accountNumberLast4,
          routingNumber: extractedData.routingNumber,
        },
        documentId: docId,
        visualFlags: extractedData.visualFlags,
      };
      state.invoices.push(newInvoice);

      // Add Evidence Edges
      state.edges.push({
        id: `edge-${Date.now()}-1`,
        sourceNodeId: docId,
        targetNodeId: invId,
        relationship: 'MATCHES',
        explanation: `Document processed with extracted invoice #${newInvoice.invoiceNumber}`,
        supportingRecordIds: [docId, invId],
      });
      state.edges.push({
        id: `edge-${Date.now()}-2`,
        sourceNodeId: invId,
        targetNodeId: vendor.id,
        relationship: 'ISSUED_BY',
        explanation: `Invoice issued by ${vendor.name}`,
        supportingRecordIds: [invId, vendor.id],
      });

      // Run Anomaly Rules dynamically!
      const freshAnomalies = AnomalyEngine.runAllRules({
        invoices: state.invoices,
        transactions: state.transactions,
        vendors: state.vendors,
        emails: state.emails,
        subscriptions: state.subscriptions,
        documents: state.documents,
      });

      // Update state anomalies
      for (const fresh of freshAnomalies) {
        if (!state.anomalies.some(a => a.id === fresh.id || a.title === fresh.title)) {
          state.anomalies.unshift(fresh);
          // Auto create investigation for fresh anomaly
          state.investigations.unshift({
            id: `inv-${Date.now()}`,
            title: fresh.title,
            relatedVendorIds: [vendor.id],
            anomalyIds: [fresh.id],
            severity: fresh.severity,
            status: fresh.status,
            createdAt: fresh.createdAt,
            updatedAt: fresh.updatedAt,
            summaryNote: fresh.explanation,
            reviewHistory: [
              {
                id: `rev-${Date.now()}`,
                investigationId: `inv-${Date.now()}`,
                anomalyId: fresh.id,
                action: 'NEEDS_REVIEW',
                notes: `Triggered by rule ${fresh.detectionRule} upon document upload.`,
                author: 'AuditLens Autonomous Sentinel',
                timestamp: new Date().toISOString(),
              }
            ]
          });
        }
      }
    }

    res.json({
      success: true,
      document: newDoc,
      extractionSource,
    });
  } catch (err: any) {
    console.error('Upload processing error:', err);
    res.status(500).json({ error: err.message || 'Error processing document.' });
  }
});

// 5. Update Investigation Review Status
app.post('/api/investigations/:id/review', (req, res) => {
  const { id } = req.params;
  const { action, notes, author = 'Reviewer' } = req.body;

  const investigation = state.investigations.find(inv => inv.id === id);
  if (!investigation) {
    return res.status(404).json({ error: 'Investigation not found.' });
  }

  const validActions = ['NEEDS_REVIEW', 'VERIFIED_LEGITIMATE', 'ESCALATED', 'RESOLVED', 'NOTE_ADDED'];
  if (!validActions.includes(action)) {
    return res.status(400).json({ error: `Invalid action. Must be one of: ${validActions.join(', ')}` });
  }

  // Create review event
  const reviewEvent: ReviewEvent = {
    id: `rev-${Date.now()}`,
    investigationId: id,
    anomalyId: investigation.anomalyIds[0] || '',
    action: action as any,
    notes: notes || `Status updated to ${action}`,
    author,
    timestamp: new Date().toISOString(),
  };

  investigation.reviewHistory.push(reviewEvent);

  if (action !== 'NOTE_ADDED') {
    investigation.status = action as any;
    investigation.updatedAt = new Date().toISOString();

    // Update the corresponding anomalies
    for (const anomId of investigation.anomalyIds) {
      const anom = state.anomalies.find(a => a.id === anomId);
      if (anom) {
        anom.status = action as any;
        anom.updatedAt = new Date().toISOString();
      }
    }
  }

  // Recalculate metrics
  const unresolved = state.anomalies.filter(a => a.status === 'NEEDS_REVIEW' || a.status === 'ESCALATED').length;
  state.metrics.unresolvedAnomalies = unresolved;
  state.metrics.overallScore = Math.max(88, Math.min(99.5, 99.5 - (unresolved * 1.8)));

  res.json({
    success: true,
    investigation,
    reviewEvent,
  });
});

// 6. Reset dataset to initial pristine PixelCraft demo state
app.post('/api/reset', (req, res) => {
  state.documents = JSON.parse(JSON.stringify(MOCK_DOCUMENTS));
  state.vendors = JSON.parse(JSON.stringify(MOCK_VENDORS));
  state.invoices = JSON.parse(JSON.stringify(MOCK_INVOICES));
  state.transactions = JSON.parse(JSON.stringify(MOCK_TRANSACTIONS));
  state.emails = JSON.parse(JSON.stringify(MOCK_EMAILS));
  state.subscriptions = JSON.parse(JSON.stringify(MOCK_SUBSCRIPTIONS));
  state.anomalies = JSON.parse(JSON.stringify(MOCK_ANOMALIES));
  state.edges = JSON.parse(JSON.stringify(MOCK_EVIDENCE_EDGES));
  state.investigations = JSON.parse(JSON.stringify(MOCK_INVESTIGATIONS));
  state.metrics = { ...MOCK_METRICS };
  state.company = { ...MOCK_COMPANY };

  res.json({
    success: true,
    message: 'Reset data to pristine PixelCraft Studio baseline.',
  });
});

app.listen(PORT, () => {
  console.log(`[AuditLens Core] API Server running on port ${PORT}`);
  console.log(`[AuditLens Core] Mode: ${state.customGeminiKey ? 'Live Gemini 1.5 Flash' : 'Synthetic Demo Mode'}`);
});
