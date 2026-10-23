import express from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import Tesseract from 'tesseract.js';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

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
  currency: z.string().default('INR'),
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

const suspiciousSignalRules: Array<[string, RegExp]> = [
  ['Changed or altered remittance instructions', /changed?\s+(?:bank|payment|remittance)|altered\s+(?:bank|payment|remittance)/i],
  ['Urgent payment instruction requires verification', /urgent|immediate payment|pay immediately/i],
  ['Offshore or unusual beneficiary detected', /offshore|cayman|escrow|crypto|wallet/i],
  ['Unverified account-change language detected', /new\s+(?:bank|account)|updated\s+(?:bank|account)|account\s+change/i],
  ['Possible duplicate invoice language detected', /duplicate|already paid|second invoice/i],
  ['Amount discrepancy language detected', /mismatch|discrepancy|different amount/i],
];

async function extractLocalDocumentText(file?: Express.Multer.File, pastedText?: string) {
  if (pastedText?.trim()) return { text: pastedText.trim(), source: 'Pasted text extraction', confidence: 0.98 };
  if (!file) return { text: '', source: 'No local content', confidence: 0 };

  if (file.mimetype.includes('pdf')) {
    const pdf = await getDocument({ data: new Uint8Array(file.buffer), useSystemFonts: true, isEvalSupported: false }).promise;
    const pageTexts: string[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      pageTexts.push(content.items.map((item: any) => `${item.str || ''}${item.hasEOL ? '\n' : ' '}`).join('').trim());
      page.cleanup();
    }
    const text = pageTexts.join('\n').trim();
    await pdf.destroy();
    return { text, source: `Local PDF extraction (${pageTexts.length} page${pageTexts.length === 1 ? '' : 's'})`, confidence: text ? 0.94 : 0 };
  }
  if (file.mimetype.includes('image')) {
    const result = await Tesseract.recognize(file.buffer, 'eng');
    return { text: result.data.text.trim(), source: 'Local Tesseract OCR', confidence: Math.max(0, Math.min(1, result.data.confidence / 100)) };
  }
  if (file.mimetype.includes('text') || file.mimetype.includes('csv')) {
    return { text: file.buffer.toString('utf-8').trim(), source: 'Local text extraction', confidence: 0.98 };
  }
  return { text: '', source: 'Unsupported local binary format', confidence: 0 };
}

function parseInvoiceText(text: string, filename: string, confidence: number): z.infer<typeof ExtractionSchema> {
  const normalized = text.replace(/\r/g, '').replace(/[ \t]+/g, ' ');
  const lines = normalized.split('\n').map(line => line.trim()).filter(Boolean);
  const amountPattern = /(?:₹|INR|Rs\.?|USD|\$)\s*([0-9][0-9,]*(?:\.\d{1,2})?)/ig;
  const labelledTotal = normalized.match(/^\s*(?:grand\s+total|invoice\s+total|amount\s+due|total\s+due|net\s+payable|total)\b[^\d₹$]{0,18}(?:₹|INR|Rs\.?|USD|\$)?\s*([0-9][0-9,]*(?:\.\d{1,2})?)/im);
  const amounts = Array.from(normalized.matchAll(amountPattern)).map(match => Number(match[1].replace(/,/g, ''))).filter(Number.isFinite);
  const subtotal = normalized.match(/subtotal[^\d₹$]{0,15}(?:₹|INR|Rs\.?|USD|\$)?\s*([0-9][0-9,]*(?:\.\d{1,2})?)/i)?.[1];
  const tax = normalized.match(/(?:gst|vat|tax)[^\d₹$]{0,15}(?:₹|INR|Rs\.?|USD|\$)?\s*([0-9][0-9,]*(?:\.\d{1,2})?)/i)?.[1];
  const invoiceNumber = normalized.match(/invoice\s*(?:no\.?|number|#)\s*[:#-]?\s*([a-z0-9][a-z0-9\/-]*)/i)?.[1]
    || normalized.match(/(?:invoice|inv)\s*[:#-]\s*([a-z0-9][a-z0-9\/-]*)/i)?.[1];
  const date = normalized.match(/(?:invoice\s+date|date)[\s:#-]*(\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i)?.[1];
  const accountNumberLast4 = normalized.match(/(?:account|acct|a\/c)[^\d]{0,20}(?:x+|\*+)?(\d{4})(?!\d)/i)?.[1];
  const vendorLine = lines.find(line => /(?:ltd|llp|inc|llc|logistics|technologies|services|solutions|enterprises|company|corp)/i.test(line) && line.length < 90);
  const fallbackVendor = filename.replace(/\.[^/.]+$/, '').split(/[-_]/).filter(Boolean).slice(0, 3).join(' ');
  const signals = suspiciousSignalRules.filter(([, pattern]) => pattern.test(normalized)).map(([label]) => label);
  const total = labelledTotal ? Number(labelledTotal[1].replace(/,/g, '')) : (amounts.length > 0 ? Math.max(...amounts) : null);
  const bankLine = lines.find(line => /bank|beneficiary|remit/i.test(line));

  return {
    vendorName: vendorLine?.replace(/^(from|vendor|bill from)\s*[:\-]?\s*/i, '').slice(0, 100) || fallbackVendor || 'Unknown Vendor',
    invoiceNumber: invoiceNumber || null,
    date: date || null,
    currency: /\$|USD/i.test(normalized) ? 'USD' : 'INR',
    subtotal: subtotal ? Number(subtotal.replace(/,/g, '')) : null,
    tax: tax ? Number(tax.replace(/,/g, '')) : null,
    total,
    bankName: bankLine?.slice(0, 100) || null,
    accountNumberLast4: accountNumberLast4 || null,
    visualFlags: signals.length > 0 ? signals : ['No high-risk payment language detected'],
    confidenceScore: confidence,
    notes: `Extracted from ${lines.length} recognized text lines.`,
  };
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

    let localExtraction = { text: '', source: 'No local content', confidence: 0 };
    try {
      localExtraction = await extractLocalDocumentText(file, pastedText);
    } catch (extractionError: any) {
      console.warn('Local document extraction failed:', extractionError.message);
      localExtraction.source = `Local extraction failed: ${extractionError.message}`;
    }

    let extractedData = parseInvoiceText(localExtraction.text, filename, localExtraction.confidence);
    let extractionSource = localExtraction.source;
    let geminiExtracted = false;
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
          const localSignals = suspiciousSignalRules.filter(([, pattern]) => pattern.test(localExtraction.text)).map(([label]) => label);
          extractedData = {
            ...validated,
            visualFlags: Array.from(new Set([...(validated.visualFlags || []), ...localSignals])),
          };
          extractionSource = 'Gemini 1.5 Flash Multimodal Ingestion';
          geminiExtracted = true;
        }
      } catch (geminiErr: any) {
        console.warn('Gemini extraction error, falling back to local heuristic extraction:', geminiErr.message);
        extractionSource = `${localExtraction.source} (Gemini error: ${geminiErr.message})`;
      }
    }

    const recognizedVendor = state.vendors.find(vendor =>
      [vendor.name, ...vendor.aliases].some(alias => localExtraction.text.toLowerCase().includes(alias.toLowerCase()))
    );
    if (recognizedVendor) extractedData.vendorName = recognizedVendor.name;

    const qualityFlags: string[] = [];
    if (!extractedData.vendorName || extractedData.vendorName === 'Unknown Vendor') qualityFlags.push('Vendor could not be reliably identified');
    if (!extractedData.invoiceNumber) qualityFlags.push('Invoice number could not be read');
    if (extractedData.total == null || extractedData.total <= 0) qualityFlags.push('Invoice total could not be read');
    if (!geminiExtracted && localExtraction.confidence < 0.65) qualityFlags.push('Low-confidence document extraction requires manual review');
    extractedData.visualFlags = Array.from(new Set([...(extractedData.visualFlags || []), ...qualityFlags]));

    // Create the document record
    const newDoc: DocumentRecord = {
      id: docId,
      filename,
      type: docType,
      uploadDate: new Date().toISOString().slice(0, 10),
      processingStatus: extractedData.visualFlags.some(flag => /suspicious|mismatch|altered|changed|offshore|unverified|duplicate|divergence|urgent|could not be read|low-confidence/i.test(flag)) ? 'flagged' : 'parsed',
      fileSize: file ? file.size : pastedText.length,
      extractedFields: extractedData,
      sourceReference: `${source} (Via ${extractionSource})`,
      rawContent: localExtraction.text.slice(0, 12000),
      visualFlags: extractedData.visualFlags,
    };

    state.documents.unshift(newDoc);

    // Synchronize an invoice only when its core identity and amount were actually read.
    if (extractedData.total && extractedData.total > 0 && extractedData.invoiceNumber && extractedData.vendorName && extractedData.vendorName !== 'Unknown Vendor') {
      const extractedVendorName = extractedData.vendorName.toLowerCase();
      let vendor = state.vendors.find(v =>
        v.name.toLowerCase() === extractedVendorName || v.aliases.some(alias => alias.toLowerCase() === extractedVendorName)
      );
      if (!vendor) {
        vendor = {
          id: `vend-${Date.now()}`,
          name: extractedData.vendorName || 'New Vendor',
          category: 'General Services',
          aliases: [extractedData.vendorName || 'New Vendor'],
          availableIdentifiers: {
            verifiedEmailDomains: [],
            verifiedBankAccounts: newDoc.processingStatus !== 'flagged' && extractedData.accountNumberLast4 ? [
              { bankName: extractedData.bankName || 'Bank', last4: extractedData.accountNumberLast4, country: 'US' }
            ] : [],
          },
          associatedRecordIds: [docId],
          riskRating: 'low',
          monthlySpend: extractedData.total,
          currency: extractedData.currency || 'INR',
        };
        state.vendors.push(vendor);
      }
      if (!vendor.associatedRecordIds.includes(docId)) vendor.associatedRecordIds.push(docId);
      if (newDoc.processingStatus === 'flagged') vendor.riskRating = 'high';

      const invId = `inv-${Date.now()}`;
      const newInvoice = {
        id: invId,
        vendorId: vendor.id,
        invoiceNumber: extractedData.invoiceNumber || `INV-${Date.now()}`,
        invoiceDate: extractedData.date || new Date().toISOString().slice(0, 10),
        currency: extractedData.currency || 'INR',
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
      vendor.associatedRecordIds.push(invId);

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

      if (newDoc.processingStatus === 'flagged' && !freshAnomalies.some(finding => finding.supportingRecordIds.includes(docId))) {
        freshAnomalies.unshift({
          id: `anom-upload-${docId}`,
          title: `Suspicious Invoice Requires Review: ${newInvoice.invoiceNumber}`,
          category: 'VISUAL_OR_DOMAIN_IRREGULARITY',
          severity: 'high',
          amountInDispute: newInvoice.total,
          currency: newInvoice.currency,
          explanation: `The uploaded invoice contains high-risk forensic signals: ${(newDoc.visualFlags || []).join('; ')}. Payment instructions must be independently verified before approval.`,
          supportingRecordIds: [docId, invId, vendor.id],
          detectionMethod: 'Upload Content & Payment Instruction Risk Classifier',
          detectionRule: 'RULE_SUSPICIOUS_UPLOADED_INVOICE',
          uncertainty: 'The language may reflect a legitimate vendor account update, but it cannot be trusted without out-of-band verification.',
          verificationChecklist: [
            'Do not approve payment using instructions from this invoice.',
            'Call the vendor using a previously verified phone number.',
            'Compare the beneficiary account with the vendor master record.',
          ],
          status: 'NEEDS_REVIEW',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      // Update state anomalies and retain findings caused by this upload.
      const uploadFindings: AnomalyRecord[] = [];
      for (const fresh of freshAnomalies) {
        if (fresh.supportingRecordIds.includes(docId)) uploadFindings.push(fresh);
        if (!state.anomalies.some(a => a.id === fresh.id || a.title === fresh.title)) {
          state.anomalies.unshift(fresh);
          // Auto create investigation for fresh anomaly
          const investigationId = `inv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
          state.investigations.unshift({
            id: investigationId,
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
                investigationId,
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

      if (uploadFindings.length > 0) {
        newDoc.processingStatus = 'flagged';
        newDoc.visualFlags = Array.from(new Set([
          ...(newDoc.visualFlags || []),
          ...uploadFindings.map(finding => finding.title),
        ]));
        newDoc.extractedFields.forensicFindings = uploadFindings.map(finding => ({
          id: finding.id,
          title: finding.title,
          severity: finding.severity,
          explanation: finding.explanation,
          category: finding.category,
        }));
      }
    }

    if (newDoc.processingStatus === 'flagged' && !Array.isArray(newDoc.extractedFields.forensicFindings)) {
      const finding: AnomalyRecord = {
        id: `anom-upload-${docId}`,
        title: `Uploaded Invoice Requires Manual Review: ${extractedData.invoiceNumber || filename}`,
        category: 'VISUAL_OR_DOMAIN_IRREGULARITY',
        severity: 'high',
        amountInDispute: extractedData.total || undefined,
        currency: extractedData.currency || 'INR',
        explanation: `AuditLens could not safely synchronize this invoice because: ${(newDoc.visualFlags || []).join('; ')}. Verify the source document before approving payment.`,
        supportingRecordIds: [docId],
        detectionMethod: 'Document Extraction Completeness & Payment Risk Validator',
        detectionRule: 'RULE_UNREADABLE_OR_SUSPICIOUS_UPLOAD',
        uncertainty: 'The source may be low-resolution or use an unsupported layout; manual confirmation is required.',
        verificationChecklist: [
          'Confirm the vendor, invoice number, and total against the original document.',
          'Verify payment instructions through an established vendor contact.',
          'Upload a higher-resolution copy if key fields are unreadable.',
        ],
        status: 'NEEDS_REVIEW',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const investigationId = `inv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      state.anomalies.unshift(finding);
      state.investigations.unshift({
        id: investigationId,
        title: finding.title,
        relatedVendorIds: [],
        anomalyIds: [finding.id],
        severity: finding.severity,
        status: finding.status,
        createdAt: finding.createdAt,
        updatedAt: finding.updatedAt,
        summaryNote: finding.explanation,
        reviewHistory: [{
          id: `rev-${Date.now()}`,
          investigationId,
          anomalyId: finding.id,
          action: 'NEEDS_REVIEW',
          notes: 'Created because the uploaded document could not be safely synchronized.',
          author: 'AuditLens Autonomous Sentinel',
          timestamp: new Date().toISOString(),
        }],
      });
      newDoc.extractedFields.forensicFindings = [{
        id: finding.id,
        title: finding.title,
        severity: finding.severity,
        explanation: finding.explanation,
        category: finding.category,
      }];
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
