import React, { useState, useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Node,
  Edge,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import {
  Building2,
  FileText,
  CreditCard,
  Mail,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Search,
  Filter,
  Maximize2,
  RotateCcw,
  Sparkles,
  X,
  ArrowRight,
  ExternalLink,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { AnomalyRecord, VendorRecord, InvoiceRecord, TransactionRecord, EmailRecord, SubscriptionRecord, DocumentRecord } from '../types';
import { NavLink } from 'react-router-dom';

// ----------------------------------------------------
// Custom Node Renderers
// ----------------------------------------------------

const VendorNode = ({ data, selected }: any) => (
  <div className={`p-3 rounded-xl bg-white border-2 transition-all shadow-subtle min-w-[180px] max-w-[220px] ${
    selected ? 'border-forest-700 ring-4 ring-forest-100 shadow-card' : 'border-paper-300 hover:border-forest-600'
  }`}>
    <Handle type="target" position={Position.Top} className="!bg-forest-600 !w-2.5 !h-2.5" />
    <div className="flex items-center gap-2 mb-1.5">
      <div className="w-6 h-6 rounded bg-forest-100 text-forest-800 flex items-center justify-center flex-shrink-0">
        <Building2 className="w-3.5 h-3.5" />
      </div>
      <div className="min-w-0">
        <span className="text-[10px] uppercase font-bold text-charcoal-400 block tracking-wider">Vendor</span>
        <h4 className="text-xs font-bold text-charcoal-900 truncate">{data.name}</h4>
      </div>
    </div>
    <div className="text-[10px] text-charcoal-500 flex justify-between border-t border-paper-200 pt-1.5 mt-1">
      <span>{data.category}</span>
      <span className="font-semibold text-charcoal-800">${data.monthlySpend}/mo</span>
    </div>
    <Handle type="source" position={Position.Bottom} className="!bg-forest-600 !w-2.5 !h-2.5" />
  </div>
);

const InvoiceNode = ({ data, selected }: any) => (
  <div className={`p-3 rounded-xl bg-white border-2 transition-all shadow-subtle min-w-[170px] max-w-[210px] ${
    data.hasAnomaly ? 'border-amber-400 bg-amber-50/20' : ''
  } ${selected ? 'border-forest-700 ring-4 ring-forest-100 shadow-card' : 'border-paper-300 hover:border-paper-400'}`}>
    <Handle type="target" position={Position.Top} className="!bg-charcoal-600 !w-2.5 !h-2.5" />
    <div className="flex items-center gap-2 mb-1">
      <div className="w-6 h-6 rounded bg-paper-200 text-charcoal-700 flex items-center justify-center flex-shrink-0">
        <FileText className="w-3.5 h-3.5" />
      </div>
      <div className="min-w-0">
        <span className="text-[10px] uppercase font-bold text-charcoal-400 block tracking-wider">Invoice</span>
        <h4 className="text-xs font-mono font-bold text-charcoal-900 truncate">{data.invoiceNumber}</h4>
      </div>
    </div>
    <div className="text-[11px] font-bold text-charcoal-800 mt-1">
      {data.currency} {data.total?.toFixed(2)}
    </div>
    <div className="text-[10px] text-charcoal-500 font-mono mt-0.5">{data.date}</div>
    {data.visualFlags && data.visualFlags.length > 0 && (
      <div className="mt-1.5 text-[9px] font-semibold text-alert-amber truncate">
        ⚠ {data.visualFlags[0]}
      </div>
    )}
    <Handle type="source" position={Position.Bottom} className="!bg-charcoal-600 !w-2.5 !h-2.5" />
  </div>
);

const TransactionNode = ({ data, selected }: any) => (
  <div className={`p-3 rounded-xl bg-white border-2 transition-all shadow-subtle min-w-[180px] max-w-[220px] ${
    data.status === 'flagged' ? 'border-alert-red/70 bg-red-50/20' : ''
  } ${selected ? 'border-forest-700 ring-4 ring-forest-100 shadow-card' : 'border-paper-300 hover:border-paper-400'}`}>
    <Handle type="target" position={Position.Top} className="!bg-charcoal-600 !w-2.5 !h-2.5" />
    <div className="flex items-center gap-2 mb-1">
      <div className="w-6 h-6 rounded bg-cobalt-50 text-cobalt-600 flex items-center justify-center flex-shrink-0">
        <CreditCard className="w-3.5 h-3.5" />
      </div>
      <div className="min-w-0">
        <span className="text-[10px] uppercase font-bold text-charcoal-400 block tracking-wider">Bank Debit</span>
        <h4 className="text-xs font-bold text-charcoal-900 truncate">{data.currency} {data.amount?.toFixed(2)}</h4>
      </div>
    </div>
    <p className="text-[10px] text-charcoal-600 truncate">{data.accountName}</p>
    <div className="text-[9px] text-charcoal-400 font-mono mt-0.5">{data.date} · {data.reference}</div>
    <Handle type="source" position={Position.Bottom} className="!bg-charcoal-600 !w-2.5 !h-2.5" />
  </div>
);

const EmailNode = ({ data, selected }: any) => (
  <div className={`p-3 rounded-xl bg-white border-2 transition-all shadow-subtle min-w-[180px] max-w-[220px] ${
    data.isSpoof ? 'border-alert-red bg-alert-redBg/30 ring-2 ring-red-200' : 'border-paper-300'
  } ${selected ? 'border-forest-700 ring-4 ring-forest-100 shadow-card' : 'hover:border-paper-400'}`}>
    <Handle type="target" position={Position.Top} className="!bg-amber-600 !w-2.5 !h-2.5" />
    <div className="flex items-center gap-2 mb-1">
      <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${
        data.isSpoof ? 'bg-alert-red text-white' : 'bg-amber-100 text-amber-800'
      }`}>
        <Mail className="w-3.5 h-3.5" />
      </div>
      <div className="min-w-0">
        <span className="text-[10px] uppercase font-bold text-charcoal-400 block tracking-wider">Vendor Email</span>
        <h4 className="text-xs font-semibold text-charcoal-900 truncate">{data.senderDomain}</h4>
      </div>
    </div>
    <p className="text-[10px] text-charcoal-600 line-clamp-1">{data.subject}</p>
    {data.isSpoof && (
      <span className="mt-1 block text-[9px] font-bold text-alert-red uppercase">
        ⚠ Homoglyph Spoof
      </span>
    )}
    <Handle type="source" position={Position.Bottom} className="!bg-amber-600 !w-2.5 !h-2.5" />
  </div>
);

const SubscriptionNode = ({ data, selected }: any) => (
  <div className={`p-3 rounded-xl bg-white border-2 transition-all shadow-subtle min-w-[180px] max-w-[220px] ${
    data.status === 'zombie' ? 'border-purple-300 bg-purple-50/30' : data.status === 'duplicate' ? 'border-amber-300 bg-amber-50/20' : 'border-paper-300'
  } ${selected ? 'border-forest-700 ring-4 ring-forest-100 shadow-card' : 'hover:border-paper-400'}`}>
    <Handle type="target" position={Position.Top} className="!bg-purple-600 !w-2.5 !h-2.5" />
    <div className="flex items-center gap-2 mb-1">
      <div className="w-6 h-6 rounded bg-purple-100 text-purple-800 flex items-center justify-center flex-shrink-0">
        <Layers className="w-3.5 h-3.5" />
      </div>
      <div className="min-w-0">
        <span className="text-[10px] uppercase font-bold text-charcoal-400 block tracking-wider">SaaS Contract</span>
        <h4 className="text-xs font-bold text-charcoal-900 truncate">{data.productName}</h4>
      </div>
    </div>
    <div className="text-[10px] text-charcoal-600 flex justify-between mt-1">
      <span>{data.currency} {data.amount}/{data.billingPeriod}</span>
      <span className="font-semibold text-charcoal-800">{data.seatCount} Seats</span>
    </div>
    {data.status === 'zombie' && (
      <div className="mt-1 text-[9px] font-bold text-purple-700 uppercase">
        0 logins in 90+ days
      </div>
    )}
    <Handle type="source" position={Position.Bottom} className="!bg-purple-600 !w-2.5 !h-2.5" />
  </div>
);

const AnomalyNode = ({ data, selected }: any) => (
  <div className={`p-3.5 rounded-xl bg-alert-redBg border-2 border-alert-red transition-all shadow-card min-w-[200px] max-w-[240px] animate-pulse ${
    selected ? 'ring-4 ring-red-200' : ''
  }`}>
    <Handle type="target" position={Position.Top} className="!bg-alert-red !w-3 !h-3" />
    <div className="flex items-start gap-2">
      <div className="w-6 h-6 rounded bg-alert-red text-white flex items-center justify-center flex-shrink-0 mt-0.5">
        <AlertTriangle className="w-3.5 h-3.5" />
      </div>
      <div>
        <span className="text-[9px] uppercase font-extrabold text-alert-red tracking-wider block">
          Anomaly Finding
        </span>
        <h4 className="text-xs font-bold text-charcoal-900 line-clamp-2 leading-snug">
          {data.title}
        </h4>
      </div>
    </div>
    <div className="mt-2 pt-1.5 border-t border-alert-redBorder flex justify-between items-center text-[10px]">
      <span className="font-bold text-alert-red">{data.severity.toUpperCase()}</span>
      <span className="font-semibold text-charcoal-700">Dispute: {data.currency} {data.amountInDispute}</span>
    </div>
    <Handle type="source" position={Position.Bottom} className="!bg-alert-red !w-3 !h-3" />
  </div>
);

const DocumentNode = ({ data, selected }: any) => (
  <div className={`p-3 rounded-xl bg-paper-50 border-2 transition-all shadow-subtle min-w-[170px] max-w-[200px] ${
    selected ? 'border-forest-700 ring-4 ring-forest-100 shadow-card' : 'border-paper-300 hover:border-paper-400'
  }`}>
    <Handle type="target" position={Position.Top} className="!bg-charcoal-500 !w-2 !h-2" />
    <div className="flex items-center gap-2 mb-1">
      <FileText className="w-4 h-4 text-charcoal-600" />
      <span className="text-[10px] uppercase font-bold text-charcoal-400 tracking-wider">Source Doc</span>
    </div>
    <p className="text-xs font-semibold text-charcoal-800 truncate">{data.filename}</p>
    <p className="text-[10px] text-charcoal-400">{data.type}</p>
    <Handle type="source" position={Position.Bottom} className="!bg-charcoal-500 !w-2 !h-2" />
  </div>
);

const nodeTypes = {
  vendor: VendorNode,
  invoice: InvoiceNode,
  transaction: TransactionNode,
  email: EmailNode,
  subscription: SubscriptionNode,
  anomaly: AnomalyNode,
  document: DocumentNode,
};

// ----------------------------------------------------
// Main Evidence Graph Page Component
// ----------------------------------------------------

export const EvidenceGraphPage: React.FC = () => {
  const { vendors, invoices, transactions, emails, subscriptions, anomalies, edges: dataEdges, documents } = useData();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVendorFilter, setSelectedVendorFilter] = useState<string>('all');
  const [selectedAnomalyFilter, setSelectedAnomalyFilter] = useState<string>('all');
  const [activeInspectorItem, setActiveInspectorItem] = useState<{ type: 'node' | 'edge'; data: any } | null>(null);

  // Generate nodes from shared model
  const rawNodes: Node[] = useMemo(() => {
    const list: Node[] = [];

    // Vendor Nodes
    vendors.forEach((v, idx) => {
      list.push({
        id: v.id,
        type: 'vendor',
        position: { x: 350 + idx * 280, y: 50 },
        data: { ...v },
      });
    });

    // Invoice Nodes
    invoices.forEach((inv, idx) => {
      list.push({
        id: inv.id,
        type: 'invoice',
        position: { x: 200 + (idx % 4) * 260, y: 220 + Math.floor(idx / 4) * 120 },
        data: {
          ...inv,
          hasAnomaly: anomalies.some(a => a.supportingRecordIds.includes(inv.id)),
        },
      });
    });

    // Transaction Nodes
    transactions.forEach((tx, idx) => {
      list.push({
        id: tx.id,
        type: 'transaction',
        position: { x: 150 + (idx % 4) * 260, y: 400 + Math.floor(idx / 4) * 120 },
        data: { ...tx },
      });
    });

    // Email Nodes
    emails.forEach((em, idx) => {
      list.push({
        id: em.id,
        type: 'email',
        position: { x: 80 + idx * 320, y: 220 },
        data: {
          ...em,
          isSpoof: em.domainFlags?.isTyposquatCandidate,
        },
      });
    });

    // Subscription Nodes
    subscriptions.forEach((sub, idx) => {
      list.push({
        id: sub.id,
        type: 'subscription',
        position: { x: 750 + (idx % 2) * 260, y: 220 + Math.floor(idx / 2) * 140 },
        data: { ...sub },
      });
    });

    // Anomaly Nodes
    anomalies.forEach((anom, idx) => {
      list.push({
        id: anom.id,
        type: 'anomaly',
        position: { x: 260 + idx * 310, y: 580 },
        data: { ...anom },
      });
    });

    return list;
  }, [vendors, invoices, transactions, emails, subscriptions, anomalies]);

  // Generate edges from shared model
  const rawEdges: Edge[] = useMemo(() => {
    return dataEdges.map((e) => {
      let strokeColor = '#949B92';
      let strokeDasharray = undefined;
      let strokeWidth = 2;

      if (e.relationship === 'CONFLICTS_WITH') {
        strokeColor = '#DC2626';
        strokeDasharray = '5 5';
        strokeWidth = 2.5;
      } else if (e.relationship === 'POSSIBLE_DUPLICATE_OF') {
        strokeColor = '#D97706';
        strokeDasharray = '4 4';
        strokeWidth = 2.5;
      } else if (e.relationship === 'SUPPORTS_ANOMALY') {
        strokeColor = '#DC2626';
        strokeWidth = 2.5;
      } else if (e.relationship === 'MATCHES') {
        strokeColor = '#16A34A';
      }

      return {
        id: e.id,
        source: e.sourceNodeId,
        target: e.targetNodeId,
        label: e.relationship.replace(/_/g, ' '),
        animated: e.isFlagged,
        style: {
          stroke: strokeColor,
          strokeWidth,
          strokeDasharray,
        },
        labelStyle: {
          fontSize: 9,
          fontWeight: 700,
          fill: strokeColor,
          fontFamily: 'monospace',
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: strokeColor,
        },
        data: { ...e },
      };
    });
  }, [dataEdges]);

  // Filter nodes & edges based on search, selected vendor mode, or anomaly focus mode
  const { filteredNodes, filteredEdges } = useMemo(() => {
    let activeNodeIds = new Set<string>();

    if (selectedAnomalyFilter !== 'all') {
      // Focus on specific Anomaly and its supporting path!
      const targetAnomaly = anomalies.find(a => a.id === selectedAnomalyFilter);
      if (targetAnomaly) {
        activeNodeIds.add(targetAnomaly.id);
        targetAnomaly.supportingRecordIds.forEach(id => activeNodeIds.add(id));
      }
    } else if (selectedVendorFilter !== 'all') {
      // Focus on selected Vendor cluster!
      const targetVendor = vendors.find(v => v.id === selectedVendorFilter);
      if (targetVendor) {
        activeNodeIds.add(targetVendor.id);
        targetVendor.associatedRecordIds.forEach(id => activeNodeIds.add(id));
      }
    }

    let nodes = rawNodes;
    if (activeNodeIds.size > 0) {
      nodes = rawNodes.filter(n => activeNodeIds.has(n.id));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      nodes = nodes.filter(n => {
        const d = n.data as any;
        return (
          d.name?.toLowerCase().includes(q) ||
          d.title?.toLowerCase().includes(q) ||
          d.invoiceNumber?.toLowerCase().includes(q) ||
          d.reference?.toLowerCase().includes(q)
        );
      });
    }

    const currentVisibleNodeIds = new Set(nodes.map(n => n.id));
    const edges = rawEdges.filter(
      e => currentVisibleNodeIds.has(e.source) && currentVisibleNodeIds.has(e.target)
    );

    return { filteredNodes: nodes, filteredEdges: edges };
  }, [rawNodes, rawEdges, selectedAnomalyFilter, selectedVendorFilter, searchQuery, anomalies, vendors]);

  const [nodes, setNodes, onNodesChange] = useNodesState(filteredNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(filteredEdges);

  // Sync state when filters update
  React.useEffect(() => {
    setNodes(filteredNodes);
    setEdges(filteredEdges);
  }, [filteredNodes, filteredEdges, setNodes, setEdges]);

  const onNodeClick = useCallback((_: any, node: Node) => {
    setActiveInspectorItem({ type: 'node', data: node.data });
  }, []);

  const onEdgeClick = useCallback((_: any, edge: Edge) => {
    setActiveInspectorItem({ type: 'edge', data: edge.data });
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] -m-6 relative overflow-hidden bg-paper-100">
      {/* Top Filter and Mode Switcher Bar */}
      <div className="p-3 bg-white border-b border-paper-300 flex flex-wrap items-center justify-between gap-3 z-10 px-6 shadow-subtle">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-charcoal-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search graph (vendor, invoice #, ref)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg border border-paper-300 text-xs w-56 focus:outline-none focus:ring-1 focus:ring-forest-600 bg-paper-50"
            />
          </div>

          {/* Mode A: Vendor Filter */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-charcoal-500 font-semibold text-[11px]">Vendor Cluster:</span>
            <select
              value={selectedVendorFilter}
              onChange={(e) => {
                setSelectedVendorFilter(e.target.value);
                if (e.target.value !== 'all') setSelectedAnomalyFilter('all');
              }}
              className="py-1 px-2.5 rounded-lg border border-paper-300 text-xs bg-white text-charcoal-800 font-medium focus:outline-none focus:ring-1 focus:ring-forest-600"
            >
              <option value="all">All Vendors ({vendors.length})</option>
              {vendors.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>

          {/* Mode B: Anomaly Path Focus Filter */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-charcoal-500 font-semibold text-[11px]">Focus Anomaly Path:</span>
            <select
              value={selectedAnomalyFilter}
              onChange={(e) => {
                setSelectedAnomalyFilter(e.target.value);
                if (e.target.value !== 'all') setSelectedVendorFilter('all');
              }}
              className="py-1 px-2.5 rounded-lg border border-alert-redBorder text-xs bg-alert-redBg text-alert-red font-semibold focus:outline-none focus:ring-1 focus:ring-alert-red"
            >
              <option value="all">All Discrepancy Paths ({anomalies.length})</option>
              {anomalies.map(a => (
                <option key={a.id} value={a.id}>{a.title.slice(0, 42)}...</option>
              ))}
            </select>
          </div>

          {(selectedVendorFilter !== 'all' || selectedAnomalyFilter !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedVendorFilter('all');
                setSelectedAnomalyFilter('all');
                setSearchQuery('');
              }}
              className="text-xs text-charcoal-500 hover:text-charcoal-800 flex items-center gap-1 underline font-medium"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset View</span>
            </button>
          )}
        </div>

        {/* Legend teaser */}
        <div className="hidden xl:flex items-center gap-4 text-[10px] text-charcoal-500">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded bg-forest-600"></span> Vendor
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded bg-charcoal-400"></span> Invoice
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded bg-cobalt-600"></span> Bank Debit
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded bg-purple-600"></span> SaaS Contract
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded bg-alert-red"></span> Anomaly
          </span>
          <span className="flex items-center gap-1 text-alert-red font-semibold">
            <span className="border-b-2 border-dashed border-red-500 w-4 inline-block"></span> Conflict
          </span>
        </div>
      </div>

      {/* Main Flow Canvas */}
      <div className="flex-1 w-full h-full relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          minZoom={0.2}
          maxZoom={1.8}
        >
          <Background color="#DEDFD8" gap={20} size={1} />
          <Controls className="!bg-white !border-paper-300 !shadow-subtle rounded-lg" />
          <MiniMap
            nodeColor={(n) => {
              if (n.type === 'anomaly') return '#DC2626';
              if (n.type === 'vendor') return '#176B4D';
              if (n.type === 'transaction') return '#2B59FF';
              return '#DEDFD8';
            }}
            className="!bg-white/90 !border-paper-300 !rounded-lg overflow-hidden !bottom-4 !right-4"
          />
        </ReactFlow>

        {/* Floating Instruction Pill */}
        <div className="absolute top-4 left-6 z-10 bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg border border-paper-300 shadow-subtle text-[11px] text-charcoal-600 flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-forest-700" />
          <span>Click any node or edge to inspect source provenance & documents</span>
        </div>
      </div>

      {/* Slide-Out Detail Inspector Drawer */}
      {activeInspectorItem && (
        <div className="absolute top-0 right-0 w-96 h-full bg-white border-l border-paper-300 shadow-elevated z-30 flex flex-col animate-slideLeft">
          <div className="p-4 border-b border-paper-300 flex items-center justify-between bg-paper-50">
            <div>
              <span className="text-[10px] uppercase font-bold text-charcoal-400 tracking-wider">
                {activeInspectorItem.type === 'node' ? 'Record Inspector' : 'Evidence Edge Inspector'}
              </span>
              <h3 className="text-xs font-bold text-charcoal-900 truncate">
                {activeInspectorItem.data.name ||
                 activeInspectorItem.data.title ||
                 activeInspectorItem.data.invoiceNumber ||
                 activeInspectorItem.data.relationship ||
                 'Details'}
              </h3>
            </div>
            <button
              onClick={() => setActiveInspectorItem(null)}
              className="p-1.5 rounded-lg text-charcoal-400 hover:text-charcoal-700 hover:bg-paper-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
            {activeInspectorItem.type === 'edge' ? (
              /* Edge Details */
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-paper-50 border border-paper-300">
                  <span className="text-[10px] uppercase font-bold text-charcoal-400">Relationship</span>
                  <p className="font-mono font-bold text-sm text-charcoal-900 mt-0.5">
                    {activeInspectorItem.data.relationship}
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-charcoal-900 mb-1">Forensic Explanation</h4>
                  <p className="text-charcoal-700 leading-relaxed bg-paper-50 p-3 rounded-lg border border-paper-200">
                    {activeInspectorItem.data.explanation}
                  </p>
                </div>

                {activeInspectorItem.data.detectionRule && (
                  <div>
                    <h4 className="font-bold text-charcoal-900 mb-1">Enforced Forensic Rule</h4>
                    <p className="font-mono text-[11px] bg-paper-100 p-2 rounded border border-paper-300 text-charcoal-800">
                      {activeInspectorItem.data.detectionRule}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* Node Details */
              <div className="space-y-3">
                {activeInspectorItem.data.category === 'DUPLICATE_PAYMENT' || activeInspectorItem.data.category === 'BENEFICIARY_ALTERATION' || activeInspectorItem.data.category === 'AMOUNT_MISMATCH' || activeInspectorItem.data.category === 'SAAS_OVERLAP' ? (
                  /* Anomaly details */
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-alert-redBg border border-alert-redBorder">
                      <span className="text-[10px] font-bold text-alert-red uppercase">Discrepancy Category</span>
                      <p className="font-bold text-charcoal-900 mt-0.5">{activeInspectorItem.data.category}</p>
                      <p className="text-[11px] text-charcoal-600 mt-1">Amount in dispute: <strong>{activeInspectorItem.data.currency} {activeInspectorItem.data.amountInDispute}</strong></p>
                    </div>

                    <div>
                      <h4 className="font-bold text-charcoal-900 mb-1">Plain-English Explanation</h4>
                      <p className="text-charcoal-700 leading-relaxed bg-paper-50 p-3 rounded-lg border border-paper-200">
                        {activeInspectorItem.data.explanation}
                      </p>
                    </div>

                    <div>
                      <h4 className="font-bold text-charcoal-900 mb-1">Uncertainty & Human Check</h4>
                      <p className="text-charcoal-600 bg-amber-50/60 p-3 rounded-lg border border-amber-200">
                        {activeInspectorItem.data.uncertainty}
                      </p>
                    </div>

                    <div className="pt-2">
                      <NavLink
                        to="/investigations"
                        className="w-full py-2 px-3 rounded-lg bg-forest-700 hover:bg-forest-800 text-white font-semibold text-xs flex items-center justify-center gap-1.5"
                      >
                        <span>Open Full Investigation Detail</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </NavLink>
                    </div>
                  </div>
                ) : (
                  /* Standard Node Details */
                  <div className="space-y-3">
                    <div className="bg-paper-50 rounded-lg p-3 border border-paper-200 space-y-1.5">
                      <div className="flex justify-between py-1 border-b border-paper-200">
                        <span className="text-charcoal-500">Node ID:</span>
                        <span className="font-mono font-medium text-charcoal-900">{activeInspectorItem.data.id}</span>
                      </div>
                      {activeInspectorItem.data.invoiceNumber && (
                        <div className="flex justify-between py-1 border-b border-paper-200">
                          <span className="text-charcoal-500">Invoice Number:</span>
                          <span className="font-bold text-charcoal-900">{activeInspectorItem.data.invoiceNumber}</span>
                        </div>
                      )}
                      {activeInspectorItem.data.total && (
                        <div className="flex justify-between py-1 border-b border-paper-200">
                          <span className="text-charcoal-500">Authorized Total:</span>
                          <span className="font-bold text-forest-800">{activeInspectorItem.data.currency} {activeInspectorItem.data.total}</span>
                        </div>
                      )}
                      {activeInspectorItem.data.amount && (
                        <div className="flex justify-between py-1 border-b border-paper-200">
                          <span className="text-charcoal-500">Billed Amount:</span>
                          <span className="font-bold text-charcoal-900">{activeInspectorItem.data.currency} {activeInspectorItem.data.amount}</span>
                        </div>
                      )}
                      {activeInspectorItem.data.paymentDetails?.bankName && (
                        <div className="flex justify-between py-1 border-b border-paper-200">
                          <span className="text-charcoal-500">Remittance Bank:</span>
                          <span className="font-medium text-charcoal-900">{activeInspectorItem.data.paymentDetails.bankName} (*{activeInspectorItem.data.paymentDetails.accountNumberLast4})</span>
                        </div>
                      )}
                    </div>

                    {/* Excerpt if available */}
                    {activeInspectorItem.data.documentId && (
                      <div className="pt-2">
                        <h4 className="font-bold text-charcoal-900 mb-1">Source Provenance</h4>
                        <p className="text-[11px] text-charcoal-600 bg-paper-100 p-2.5 rounded border border-paper-300 font-mono break-all">
                          Ref Document: {activeInspectorItem.data.documentId}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
