import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, FileText, CheckCircle2, XCircle, Loader2,
  Database, Trash2, FileSpreadsheet, AlertTriangle,
  HardDrive, Layers, Sparkles, Cpu, RefreshCw, FileCheck
} from 'lucide-react';
import {
  uploadDocuments, processDocuments, getDocuments,
  uploadCustomerData, deleteDocument
} from '../services/api';

export default function UploadPage() {
  const [files, setFiles] = useState([]);
  const [customerFile, setCustomerFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [uploadingCustomer, setUploadingCustomer] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [processResult, setProcessResult] = useState(null);
  const [customerResult, setCustomerResult] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [activeTab, setActiveTab] = useState('documents');
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const res = await getDocuments();
      setDocuments(res.data || []);
    } catch (e) {
      console.error('Failed to load documents:', e);
    }
  };

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const dropped = Array.from(e.dataTransfer.files).filter(
      f => f.name.endsWith('.pdf') || f.name.endsWith('.txt')
    );
    setFiles(prev => [...prev, ...dropped]);
  }, []);

  const handleFileSelect = (e) => {
    const selected = Array.from(e.target.files);
    setFiles(prev => [...prev, ...selected]);
  };

  const handleUpload = async () => {
    if (!files.length) return;
    setUploading(true);
    setUploadError('');
    try {
      await uploadDocuments(files);
      setFiles([]);
      await loadDocuments();
    } catch (e) {
      setUploadError(e?.response?.data?.detail || 'Upload failed. Ensure files are valid PDFs/TXTs.');
    }
    setUploading(false);
  };

  const handleProcess = async () => {
    setProcessing(true);
    setProcessResult(null);
    setUploadError('');
    try {
      const res = await processDocuments();
      setProcessResult(res.data);
      await loadDocuments();
    } catch (e) {
      setProcessResult({ message: `Error: ${e.message}`, documents_processed: 0, chunks_created: {} });
      setUploadError(e?.response?.data?.detail || 'Processing failed. Ensure documents are uploaded first.');
    }
    setProcessing(false);
  };

  const handleDelete = async (docId) => {
    try {
      await deleteDocument(docId);
      await loadDocuments();
    } catch (e) {
      console.error('Delete failed:', e);
    }
  };

  const handleCustomerFileSelect = (e) => {
    setCustomerFile(e.target.files[0]);
  };

  const handleCustomerUpload = async () => {
    if (!customerFile) return;
    setUploadingCustomer(true);
    setCustomerResult(null);
    try {
      const res = await uploadCustomerData(customerFile);
      setCustomerResult(res.data);
      setCustomerFile(null);
    } catch (e) {
      setCustomerResult({ message: `Error: ${e.message}`, records_ingested: 0, records_indexed: 0, source_file: '' });
    }
    setUploadingCustomer(false);
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-400 text-xs font-mono font-bold mb-2">
            <Database className="w-3.5 h-3.5" /> DATA INGESTION VAULT
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white flex items-center gap-3">
            Policy &amp; Customer Data Vault
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Upload PDF policies, claims, or structured customer datasets for 4-way strategy chunking and vector indexing.
          </p>
        </div>

        <button
          onClick={loadDocuments}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-cyan/30 text-xs font-mono text-slate-300 hover:text-cyan transition-all w-fit"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Sync Vault
        </button>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex gap-2 p-1.5 rounded-2xl bg-white/[0.03] border border-white/10 w-fit backdrop-blur-xl">
        <button
          onClick={() => setActiveTab('documents')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold font-mono transition-all ${
            activeTab === 'documents'
              ? 'bg-gradient-to-r from-pink-500 to-purple text-white shadow-glow-pink'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          PDF Policy Documents
        </button>
        <button
          onClick={() => setActiveTab('customer')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold font-mono transition-all ${
            activeTab === 'customer'
              ? 'bg-gradient-to-r from-cyan to-purple text-white shadow-glow-cyan'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Customer Datasets (.CSV, .XLSX)
        </button>
      </div>

      {/* Error Banner */}
      {uploadError && (
        <div className="glass-card p-4 flex items-center gap-3 border-red-500/30">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <span className="text-sm text-red-300 font-mono">{uploadError}</span>
        </div>
      )}

      {/* Tab 1: PDF Documents Ingestion */}
      {activeTab === 'documents' && (
        <div className="space-y-6">
          {/* Drop Zone Card */}
          <div
            className={`glass-card p-10 border-2 border-dashed transition-all cursor-pointer text-center relative overflow-hidden ${
              dragActive
                ? 'border-pink-400 bg-pink-500/10 shadow-glow-pink'
                : 'border-white/15 hover:border-pink-500/40 hover:bg-white/[0.04]'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-input').click()}
          >
            <input
              id="file-input"
              type="file"
              multiple
              accept=".pdf,.txt"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500/20 to-purple/20 border border-pink-500/30 flex items-center justify-center shadow-glow-pink">
                <Upload className={`w-8 h-8 ${dragActive ? 'text-pink-400 animate-bounce' : 'text-pink-400'}`} />
              </div>
              <div>
                <p className="text-lg font-bold text-white mb-1">
                  Drag &amp; Drop PDF or TXT Insurance Documents
                </p>
                <p className="text-xs text-slate-400 font-mono">
                  Supports Auto, Health, Life, and Property Policies • Table Extraction via pdfplumber
                </p>
              </div>
            </div>
          </div>

          {/* Staged Files List */}
          {files.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-5 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-white flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-pink-400" />
                  Staged Files ({files.length})
                </span>
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="btn-gradient !py-2 !px-5 !text-xs !rounded-xl disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Upload to Vault'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                    <FileText className="w-4 h-4 text-pink-400 flex-shrink-0" />
                    <span className="text-xs text-slate-200 truncate flex-1 font-mono">{f.name}</span>
                    <span className="text-[10px] font-mono text-slate-400">{(f.size / 1024).toFixed(1)} KB</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFiles(prev => prev.filter((_, j) => j !== i));
                      }}
                      className="text-slate-400 hover:text-red-400 p-1"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Pipeline Execution Action */}
          <div className="glass-card p-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple" />
                Trigger 4-Way Chunking &amp; Embedding Pipeline
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Extracts text → Creates Fixed, Recursive, Semantic, Adaptive chunks → Indexes ChromaDB
              </p>
            </div>

            <button
              onClick={handleProcess}
              disabled={processing}
              className="btn-gradient !py-3 !px-7 flex items-center gap-2 disabled:opacity-50 whitespace-nowrap shadow-glow-purple"
            >
              {processing ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Indexing Vectors...</>
              ) : (
                <><HardDrive className="w-4 h-4" /> Process &amp; Build Vectors</>
              )}
            </button>
          </div>

          {/* Processing Results Matrix */}
          <AnimatePresence>
            {processResult && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card-neon p-6 space-y-4"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span className="text-sm font-bold text-emerald-400">{processResult.message}</span>
                </div>

                {processResult.chunks_created && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Object.entries(processResult.chunks_created).map(([strategy, count]) => (
                      <div key={strategy} className="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 text-center">
                        <p className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">{strategy}</p>
                        <p className="text-2xl font-black text-pink-400 font-mono my-0.5">{count}</p>
                        <p className="text-[10px] text-cyan font-mono">Chunks Indexed</p>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Indexed Documents Table */}
          {documents.length > 0 && (
            <div className="glass-card p-6 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
                <Database className="w-4 h-4 text-cyan" />
                Indexed Policy Library ({documents.length} File{documents.length > 1 ? 's' : ''})
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono text-left">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider">
                      <th className="pb-3 pr-4">Document Name</th>
                      <th className="pb-3 pr-4">Pages</th>
                      <th className="pb-3 pr-4">Indexing Status</th>
                      <th className="pb-3 pr-4">Tables Detected</th>
                      <th className="pb-3 pr-4">OCR Status</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {documents.map((doc) => (
                      <tr key={doc.id} className="hover:bg-white/[0.02]">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-pink-400 flex-shrink-0" />
                            <span className="text-slate-200 font-semibold truncate max-w-[240px]">{doc.filename}</span>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-slate-400">{doc.page_count}</td>
                        <td className="py-3 pr-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                            doc.status === 'indexed'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}>
                            {doc.status}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-slate-400">
                          {doc.has_tables ? '✅ Yes' : '— None'}
                        </td>
                        <td className="py-3 pr-4 text-slate-400">
                          {doc.used_ocr ? '🔍 Native OCR' : '⚡ Text Extractor'}
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => handleDelete(doc.id)}
                            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all"
                            title="Delete Document"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Structured Customer Dataset Upload */}
      {activeTab === 'customer' && (
        <div className="space-y-6">
          <div className="glass-card p-8 space-y-6">
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-cyan" />
                Ingest Customer &amp; Claims Dataset
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Upload CSV, Excel (.xlsx), or JSON data containing customer policies, claims history, or demographic profiles.
              </p>
            </div>

            <div className="flex flex-col md:flex-row items-stretch gap-4">
              <label className="flex-1 cursor-pointer">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls,.json"
                  onChange={handleCustomerFileSelect}
                  className="hidden"
                  id="customer-file-input"
                />
                <div
                  onClick={() => document.getElementById('customer-file-input').click()}
                  className="p-5 rounded-2xl border-2 border-dashed border-white/15 hover:border-cyan/40 bg-white/[0.02] hover:bg-white/[0.04] transition-all flex items-center gap-4 h-full"
                >
                  <FileSpreadsheet className="w-8 h-8 text-cyan flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-white">
                      {customerFile ? customerFile.name : 'Select .CSV, .XLSX, or .JSON File'}
                    </p>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      {customerFile ? `${(customerFile.size / 1024).toFixed(1)} KB` : 'Auto-detects customer_id, policy_no, claim_id'}
                    </p>
                  </div>
                </div>
              </label>

              <button
                onClick={handleCustomerUpload}
                disabled={!customerFile || uploadingCustomer}
                className="btn-gradient !py-4 !px-8 disabled:opacity-50 font-bold text-sm whitespace-nowrap shadow-glow-cyan"
              >
                {uploadingCustomer ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Ingest Customer Dataset'
                )}
              </button>
            </div>

            <AnimatePresence>
              {customerResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 rounded-xl border ${
                    customerResult.records_ingested > 0
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-red-500/10 border-red-500/30 text-red-400'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2 font-mono font-bold text-sm">
                    {customerResult.records_ingested > 0 ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <AlertTriangle className="w-4 h-4" />
                    )}
                    {customerResult.message}
                  </div>
                  {customerResult.records_ingested > 0 && (
                    <div className="flex gap-6 text-xs font-mono text-slate-300">
                      <span>Records Parsed: <strong className="text-white">{customerResult.records_ingested}</strong></span>
                      <span>Embeddings Indexed: <strong className="text-cyan">{customerResult.records_indexed}</strong></span>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Schema Match Cards */}
          <div className="glass-card p-6 space-y-4">
            <h4 className="text-sm font-bold text-white font-mono">Supported Column Mappings</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { field: 'customer_id', aliases: 'customerid, cust_id, member_id' },
                { field: 'customer_name', aliases: 'name, full_name, policyholder' },
                { field: 'policy_number', aliases: 'policy_no, policy_id' },
                { field: 'insurance_type', aliases: 'type, product, plan_name' },
                { field: 'claim_id', aliases: 'claimid, claim_no, claim_number' },
                { field: 'Additional Columns', aliases: 'Auto-indexed into searchable text' },
              ].map(({ field, aliases }) => (
                <div key={field} className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <p className="text-xs font-bold text-pink-400 font-mono">{field}</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-1">Aliases: {aliases}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
