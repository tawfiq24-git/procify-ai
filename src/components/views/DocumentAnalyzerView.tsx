import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileText,
  GitBranch,
  Image as ImageIcon,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import { DuplicateMatch, useWorkspace } from '../../context/WorkspaceContext';
import { SAMPLE_DOCUMENTS_FOR_UPLOAD } from '../../lib/demoData';
import { DocumentAnalysis, DocumentRecord } from '../../types/procify';

interface PendingAnalysisResult {
  sourceType: 'pdf' | 'image' | 'txt' | 'text';
  fileName: string;
  fileHash: string;
  normalizedHash: string;
  contentExcerpt: string;
  analysis: DocumentAnalysis;
}

export function DocumentAnalyzerView() {
  const {
    documents,
    checkDuplicateDocument,
    saveDocument,
    updateDocumentAnalysis,
    deleteDocument,
    setPendingDocumentForBuilder,
    setEditingWorkflowId,
    setActiveSection,
  } = useWorkspace();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [customTitle, setCustomTitle] = useState('');

  const [analyzing, setAnalyzing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  const [duplicateMatches, setDuplicateMatches] = useState<DuplicateMatch[]>([]);
  const [pendingSavePayload, setPendingSavePayload] = useState<PendingAnalysisResult | null>(null);
  const [activeDoc, setActiveDoc] = useState<DocumentRecord | null>(documents[0] || null);

  // Editable extraction state for activeDoc
  const [editTitle, setEditTitle] = useState(activeDoc?.title || '');
  const [editCategory, setEditCategory] = useState(activeDoc?.category || '');
  const [editAnalysis, setEditAnalysis] = useState<DocumentAnalysis | null>(activeDoc?.analysis || null);
  const [savedNotice, setSavedNotice] = useState('');

  const selectDocForView = (docItem: DocumentRecord) => {
    setActiveDoc(docItem);
    setEditTitle(docItem.title);
    setEditCategory(docItem.category);
    setEditAnalysis(JSON.parse(JSON.stringify(docItem.analysis)));
    setSavedNotice('');
  };

  const handleFileSelect = (file: File | undefined) => {
    if (!file) return;
    setErrorMsg('');
    const allowedExt = /\.(pdf|png|jpe?g|txt|md|csv)$/i;
    if (!allowedExt.test(file.name)) {
      setErrorMsg('Unsupported file format. Please upload PDF, PNG, JPG, JPEG, or TXT.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('File exceeds the 10 MB limit.');
      return;
    }

    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setFilePreviewUrl(url);
    } else {
      setFilePreviewUrl(null);
    }
    if (!customTitle) {
      setCustomTitle(file.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const clearSelectedFile = () => {
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    setSelectedFile(null);
    setFilePreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const finalizeSaveDocument = async (payload: PendingAnalysisResult) => {
    const saved = await saveDocument({
      title: payload.analysis.documentTitle || customTitle || payload.fileName,
      category: payload.analysis.category || 'General',
      sourceType: payload.sourceType,
      fileName: payload.fileName,
      fileHash: payload.fileHash,
      normalizedHash: payload.normalizedHash,
      contentExcerpt: payload.contentExcerpt,
      analysis: payload.analysis,
    });
    setPendingSavePayload(null);
    setDuplicateMatches([]);
    selectDocForView(saved);
  };

  const handleAnalyze = async () => {
    if (!selectedFile && !pastedText.trim()) {
      setErrorMsg('Please upload a file or paste text to analyze.');
      return;
    }

    setErrorMsg('');
    setAnalyzing(true);
    setUploadProgress(20);
    setDuplicateMatches([]);
    setPendingSavePayload(null);

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 95000);

    try {
      let response: Response;
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        if (customTitle.trim()) formData.append('title', customTitle.trim());
        setUploadProgress(45);
        response = await fetch('/api/analyze-document', {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        });
      } else {
        setUploadProgress(45);
        response = await fetch('/api/analyze-document', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            text: pastedText.trim(),
            title: customTitle.trim() || undefined,
          }),
        });
      }

      setUploadProgress(85);
      let data: any = null;
      try {
        data = await response.json();
      } catch {
        throw new Error('The server returned an unexpected response during document analysis. Please retry.');
      }

      if (!response.ok) {
        throw new Error(
          data?.error && !String(data.error).trim().startsWith('{')
            ? data.error
            : response.status === 503
            ? 'Gemini AI is temporarily experiencing high demand. Your input has been preserved—please retry.'
            : 'Document analysis failed. Your input has been preserved—please retry.'
        );
      }

      if (
        !data?.analysis ||
        typeof data.analysis !== 'object' ||
        typeof data.analysis.documentTitle !== 'string' ||
        !Array.isArray(data.analysis.tasks)
      ) {
        throw new Error('Gemini returned an incomplete analysis structure. Please retry.');
      }

      const payload: PendingAnalysisResult = {
        sourceType: data.sourceType,
        fileName: data.fileName,
        fileHash: data.fileHash,
        normalizedHash: data.normalizedHash,
        contentExcerpt: data.contentExcerpt,
        analysis: data.analysis,
      };

      setUploadProgress(100);

      // Run Duplicate Detection before saving
      const matches = checkDuplicateDocument(
        payload.fileHash,
        payload.normalizedHash,
        payload.contentExcerpt
      );

      if (matches.length > 0) {
        setDuplicateMatches(matches);
        setPendingSavePayload(payload);
      } else {
        await finalizeSaveDocument(payload);
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        setErrorMsg('Document analysis timed out waiting for Gemini AI. Your input was preserved—please retry.');
      } else {
        setErrorMsg(err?.message || 'Failed to analyze document. Your input was preserved—please retry.');
      }
    } finally {
      window.clearTimeout(timeoutId);
      setAnalyzing(false);
      setTimeout(() => setUploadProgress(0), 500);
    }
  };

  const handleSaveEdits = async () => {
    if (!activeDoc || !editAnalysis) return;
    await updateDocumentAnalysis(activeDoc.id, editTitle, editCategory, editAnalysis);
    setSavedNotice('Changes saved to document record.');
    setTimeout(() => setSavedNotice(''), 2500);
  };

  const handleGenerateWorkflowFromDoc = async () => {
    if (!activeDoc) return;
    if (editAnalysis) {
      await updateDocumentAnalysis(activeDoc.id, editTitle, editCategory, editAnalysis);
    }
    const updatedDoc: DocumentRecord = {
      ...activeDoc,
      title: editTitle || activeDoc.title,
      category: editCategory || activeDoc.category,
      analysis: editAnalysis || activeDoc.analysis,
    };
    setEditingWorkflowId(null);
    setPendingDocumentForBuilder(updatedDoc);
    setActiveSection('create-workflow');
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-[#10172A] dark:text-white">
            AI Document Analyzer
          </h1>
          <p className="text-sm text-[#64748B] dark:text-slate-400 mt-1">
            Upload PDFs, images, or paste raw emails/notices. Gemini extracts structured dates, tasks, and risks without fabricating facts.
          </p>
        </div>
      </div>

      {/* Input & Sample Selector Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
          {/* Quick Sample Loader */}
          <div>
            <div className="text-xs font-medium text-[#64748B] dark:text-slate-400 mb-2">
              Load sample notice for instant testing:
            </div>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_DOCUMENTS_FOR_UPLOAD.map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => {
                    clearSelectedFile();
                    setCustomTitle(sample.title);
                    setPastedText(sample.text);
                    setErrorMsg('');
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F7F9FC] dark:bg-slate-800 text-xs font-medium text-[#172033] dark:text-slate-200 hover:border-[#4361EE] transition-colors"
                >
                  {sample.label}
                </button>
              ))}
            </div>
          </div>

          {/* Drag & Drop Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              handleFileSelect(e.dataTransfer.files?.[0]);
            }}
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
              dragActive
                ? 'border-[#4361EE] bg-blue-50/40 dark:bg-blue-950/20'
                : 'border-slate-300 dark:border-slate-700 bg-[#F7F9FC] dark:bg-slate-950/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.txt,.md,.csv"
              onChange={(e) => handleFileSelect(e.target.files?.[0])}
              className="hidden"
            />
            {!selectedFile ? (
              <div className="space-y-2">
                <UploadCloud className="w-8 h-8 text-[#4361EE] mx-auto" />
                <div className="text-sm font-medium text-[#10172A] dark:text-white">
                  Drag and drop PDF, JPG, PNG, or TXT here
                </div>
                <div className="text-xs text-[#64748B] dark:text-slate-400">
                  Max 10 MB · Processed securely via server-side Gemini Vision & Text extraction
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:border-[#4361EE] transition-colors"
                >
                  Browse Files
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4 text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3">
                <div className="flex items-center gap-3 min-w-0">
                  {filePreviewUrl ? (
                    <img
                      src={filePreviewUrl}
                      alt="Uploaded document preview"
                      className="w-12 h-12 rounded-md object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-md bg-[#F7F9FC] dark:bg-slate-800 flex items-center justify-center shrink-0 text-[#4361EE]">
                      {selectedFile.type.startsWith('image/') ? <ImageIcon className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#10172A] dark:text-white truncate">
                      {selectedFile.name}
                    </div>
                    <div className="text-xs font-mono text-[#64748B] tabular-nums">
                      {(selectedFile.size / 1024).toFixed(1)} KB · {selectedFile.type || 'document'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={clearSelectedFile}
                  aria-label="Remove file"
                  className="p-2 rounded-lg text-[#64748B] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Optional Document Title + Text Alternative */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-[#172033] dark:text-slate-300 mb-1">
                Document Title (optional)
              </label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="e.g., Semester VI Exam Circular"
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-[#4361EE]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#172033] dark:text-slate-300 mb-1">
                Or Paste Email / Circular / Notice Text
              </label>
              <textarea
                rows={6}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Paste announcement text, meeting notes, or email instructions here..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-[#4361EE]"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-center justify-between gap-3">
              <span>{errorMsg}</span>
              <button
                type="button"
                onClick={handleAnalyze}
                className="inline-flex items-center gap-1 font-semibold underline shrink-0"
              >
                <RefreshCw className="w-3 h-3" />
                Retry
              </button>
            </div>
          )}

          {uploadProgress > 0 && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-[#64748B]">
                <span>Processing with Gemini AI...</span>
                <span className="font-mono tabular-nums">{uploadProgress}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-[#4361EE] transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleAnalyze}
            disabled={analyzing}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#4361EE] hover:bg-[#3651D4] text-white text-sm font-semibold transition-colors disabled:opacity-60"
          >
            {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
            {analyzing ? 'Analyzing Document...' : 'Analyze with Gemini AI'}
          </button>
        </div>

        {/* Previously Processed Documents List */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-base font-semibold text-[#10172A] dark:text-white">
              Processed Documents ({documents.length})
            </h2>
          </div>
          {documents.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 overflow-y-auto max-h-[420px]">
              {documents.map((docItem) => {
                const isSelected = activeDoc?.id === docItem.id;
                return (
                  <div
                    key={docItem.id}
                    className={`py-3 flex items-start justify-between gap-3 px-2 rounded-lg transition-colors ${
                      isSelected ? 'bg-[#F7F9FC] dark:bg-slate-800/70' : ''
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => selectDocForView(docItem)}
                      className="text-left min-w-0 flex-1"
                    >
                      <div className="text-sm font-semibold text-[#10172A] dark:text-white truncate">
                        {docItem.title}
                      </div>
                      <div className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
                        {docItem.category} · {docItem.sourceType.toUpperCase()} · {docItem.analysis.tasks.length} tasks
                        {docItem.isDemo ? ' · Demo' : ''}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        deleteDocument(docItem.id);
                        if (activeDoc?.id === docItem.id) setActiveDoc(null);
                      }}
                      aria-label="Delete document"
                      className="p-1.5 text-slate-400 hover:text-red-600 transition-colors shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-10 text-sm text-[#64748B]">
              <FileText className="w-8 h-8 mb-2 opacity-50" />
              No documents analyzed yet. Upload or paste text on the left to begin.
            </div>
          )}
        </div>
      </div>

      {/* Duplicate Detection Warning Panel */}
      {duplicateMatches.length > 0 && pendingSavePayload && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-xl p-6">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-display text-base font-semibold text-amber-900 dark:text-amber-200">
                Potential Duplicate or Similar Document Detected
              </h3>
              <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">
                Procify AI compared file SHA-256 hashes and normalized content against your existing documents:
              </p>
            </div>
          </div>

          <div className="space-y-2 mb-5">
            {duplicateMatches.map((m) => (
              <div
                key={m.document.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 rounded-lg p-3"
              >
                <div>
                  <div className="text-sm font-semibold text-[#10172A] dark:text-white">
                    {m.document.title}
                  </div>
                  <div className="text-xs text-[#64748B]">
                    Match type: {m.matchType.replace('_', ' ')} · Similarity: <span className="font-mono font-semibold">{m.similarityPercent}%</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    selectDocForView(m.document);
                    setDuplicateMatches([]);
                    setPendingSavePayload(null);
                  }}
                  className="text-xs font-semibold text-[#4361EE] hover:underline shrink-0"
                >
                  View Existing Document
                </button>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setDuplicateMatches([]);
                setPendingSavePayload(null);
              }}
              className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
            >
              Cancel Upload
            </button>
            <button
              type="button"
              onClick={() => finalizeSaveDocument(pendingSavePayload)}
              className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold"
            >
              Continue & Save Anyway
            </button>
          </div>
        </div>
      )}

      {/* Structured Extraction Review & Editor */}
      {activeDoc && editAnalysis && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
            <div>
              <span className="text-xs font-medium text-[#4361EE] dark:text-[#22D3EE]">
                Editable Extraction Review · {activeDoc.fileName}
              </span>
              <h2 className="font-display text-xl font-bold text-[#10172A] dark:text-white mt-0.5">
                {editTitle || activeDoc.title}
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleSaveEdits}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:border-[#4361EE] transition-colors"
              >
                Save Edits
              </button>
              <button
                type="button"
                onClick={handleGenerateWorkflowFromDoc}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#10172A] dark:bg-[#4361EE] text-white text-xs font-semibold hover:bg-[#1E293B] dark:hover:bg-[#3651D4] transition-colors"
              >
                <GitBranch className="w-4 h-4" />
                Generate Workflow from Analysis
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {savedNotice && (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {savedNotice}
            </div>
          )}

          {/* Core Metadata Editable Fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-[#64748B] mb-1">Document Title</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => {
                  setEditTitle(e.target.value);
                  setEditAnalysis({ ...editAnalysis, documentTitle: e.target.value });
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#64748B] mb-1">Category</label>
              <input
                type="text"
                value={editCategory}
                onChange={(e) => {
                  setEditCategory(e.target.value);
                  setEditAnalysis({ ...editAnalysis, category: e.target.value });
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#64748B] mb-1">Main Purpose</label>
              <textarea
                rows={3}
                value={editAnalysis.mainPurpose}
                onChange={(e) => setEditAnalysis({ ...editAnalysis, mainPurpose: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#64748B] mb-1">Executive Summary</label>
              <textarea
                rows={3}
                value={editAnalysis.summary}
                onChange={(e) => setEditAnalysis({ ...editAnalysis, summary: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
          </div>

          {/* Dates, Deadlines & Events */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
              <div className="text-sm font-semibold text-[#10172A] dark:text-white">
                Extracted Dates & Deadlines ({editAnalysis.datesAndDeadlines.length})
              </div>
              {editAnalysis.datesAndDeadlines.length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {editAnalysis.datesAndDeadlines.map((d, i) => (
                    <div key={i} className="py-2.5 first:pt-0 last:pb-0">
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="font-medium text-[#10172A] dark:text-white">{d.label}</span>
                        <span className="font-mono text-xs text-[#4361EE] dark:text-[#22D3EE] tabular-nums">
                          {d.date || 'Unspecified (null)'}
                        </span>
                      </div>
                      {d.sourceQuote && (
                        <div className="text-xs text-[#64748B] italic mt-0.5">
                          Source: "{d.sourceQuote}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#64748B]">No explicit dates identified in source text.</p>
              )}
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
              <div className="text-sm font-semibold text-[#10172A] dark:text-white">
                Stakeholders, Audience & Risks
              </div>
              <div className="text-xs space-y-2 text-[#172033] dark:text-slate-300">
                <div>
                  <span className="font-semibold">Target Audience:</span> {editAnalysis.targetAudience}
                </div>
                <div>
                  <span className="font-semibold">Priority Level:</span>{' '}
                  <span className="capitalize">{editAnalysis.priority}</span>
                </div>
                <div>
                  <span className="font-semibold">Responsible Entities:</span>{' '}
                  {editAnalysis.responsibleEntities.join(', ') || 'None specified'}
                </div>
                {editAnalysis.potentialRisks.length > 0 && (
                  <div>
                    <span className="font-semibold">Potential Risks:</span>{' '}
                    {editAnalysis.potentialRisks.join(' · ')}
                  </div>
                )}
                {editAnalysis.uncertainInformation.length > 0 && (
                  <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200">
                    <span className="font-semibold">Uncertain Information:</span>{' '}
                    {editAnalysis.uncertainInformation.join(' · ')}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Editable Actionable Tasks Extracted */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-[#10172A] dark:text-white">
                Extracted Actionable Tasks ({editAnalysis.tasks.length})
              </div>
              <button
                type="button"
                onClick={() =>
                  setEditAnalysis({
                    ...editAnalysis,
                    tasks: [
                      ...editAnalysis.tasks,
                      {
                        title: 'New Extracted Task',
                        description: '',
                        deadline: null,
                        priority: 'medium',
                        assignee: null,
                        sourceQuote: null,
                      },
                    ],
                  })
                }
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#4361EE] hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Task
              </button>
            </div>

            <div className="space-y-3">
              {editAnalysis.tasks.map((t, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-[#F7F9FC] dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-12 gap-3 items-start"
                >
                  <div className="md:col-span-5">
                    <input
                      type="text"
                      value={t.title}
                      onChange={(e) => {
                        const next = [...editAnalysis.tasks];
                        next[idx] = { ...t, title: e.target.value };
                        setEditAnalysis({ ...editAnalysis, tasks: next });
                      }}
                      className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                    />
                    <input
                      type="text"
                      value={t.description}
                      onChange={(e) => {
                        const next = [...editAnalysis.tasks];
                        next[idx] = { ...t, description: e.target.value };
                        setEditAnalysis({ ...editAnalysis, tasks: next });
                      }}
                      placeholder="Task description..."
                      className="w-full mt-1.5 px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-[#64748B]"
                    />
                    {t.sourceQuote && (
                      <div className="text-[11px] text-[#64748B] italic mt-1">
                        Evidence: "{t.sourceQuote}"
                      </div>
                    )}
                  </div>
                  <div className="md:col-span-3">
                    <input
                      type="text"
                      value={t.assignee || ''}
                      onChange={(e) => {
                        const next = [...editAnalysis.tasks];
                        next[idx] = { ...t, assignee: e.target.value || null };
                        setEditAnalysis({ ...editAnalysis, tasks: next });
                      }}
                      placeholder="Assignee / Role"
                      className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <input
                      type="date"
                      value={t.deadline || ''}
                      onChange={(e) => {
                        const next = [...editAnalysis.tasks];
                        next[idx] = { ...t, deadline: e.target.value || null };
                        setEditAnalysis({ ...editAnalysis, tasks: next });
                      }}
                      className="w-full px-2 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                    />
                  </div>
                  <div className="md:col-span-2 flex items-center gap-2">
                    <select
                      value={t.priority}
                      onChange={(e) => {
                        const next = [...editAnalysis.tasks];
                        next[idx] = { ...t, priority: e.target.value as any };
                        setEditAnalysis({ ...editAnalysis, tasks: next });
                      }}
                      className="w-full px-2 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        const next = editAnalysis.tasks.filter((_, i) => i !== idx);
                        setEditAnalysis({ ...editAnalysis, tasks: next });
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600"
                      aria-label="Delete extracted task"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Instructions & Next Steps */}
          {(editAnalysis.instructions.length > 0 || editAnalysis.suggestedNextSteps.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                <div className="font-semibold text-[#10172A] dark:text-white mb-2">Key Instructions</div>
                <ul className="list-disc pl-4 space-y-1 text-[#64748B] dark:text-slate-400">
                  {editAnalysis.instructions.map((ins, i) => (
                    <li key={i}>{ins}</li>
                  ))}
                </ul>
              </div>
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                <div className="font-semibold text-[#10172A] dark:text-white mb-2">Suggested Next Steps</div>
                <ul className="list-disc pl-4 space-y-1 text-[#64748B] dark:text-slate-400">
                  {editAnalysis.suggestedNextSteps.map((st, i) => (
                    <li key={i}>{st}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
