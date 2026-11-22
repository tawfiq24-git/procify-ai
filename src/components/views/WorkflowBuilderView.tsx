import React, { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Eye,
  FileText,
  GitBranch,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Send,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  XCircle,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { PriorityLevel, SourceMethod, TaskStatus, WorkflowStatus } from '../../types/procify';

interface NodeTaskDraft {
  tempId: string;
  existingTaskId?: string;
  title: string;
  description: string;
  assignedUser: string;
  priority: PriorityLevel;
  startDate: string;
  dueDate: string;
  status: TaskStatus;
  dependencies: string[]; // stores tempIds of prerequisite nodes
  reminderDate: string;
  reminderTime: string;
}

const EXAMPLE_PROMPT =
  'Organize a college technical symposium. We need registration, event scheduling, participant confirmation, venue preparation and final reporting.';

const APPROVAL_STAGES: WorkflowStatus[] = [
  'draft',
  'pending_review',
  'approved',
  'in_progress',
  'completed',
  'rejected',
];

function makeTempId() {
  return `node_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

interface FailedGenerationAttempt {
  method: SourceMethod;
  docId?: string;
  feedback?: string;
}

function getFriendlyWorkflowError(status: number, serverMessage?: string): string {
  if (serverMessage && !serverMessage.trim().startsWith('{')) {
    return serverMessage;
  }
  if (status === 503) {
    return 'Gemini AI is temporarily experiencing high demand. Your workflow prompt has been preserved—click Retry Generation to try again.';
  }
  if (status === 429) {
    return 'AI rate limit reached. Please wait a few seconds and click Retry Generation.';
  }
  if (status === 504 || status === 408) {
    return 'The AI request timed out while generating your workflow. Your prompt has been preserved—click Retry Generation.';
  }
  if (status >= 500) {
    return 'The AI service is temporarily unavailable. Your workflow prompt has been preserved—click Retry Generation.';
  }
  return 'Unable to generate workflow right now. Please check your input and click Retry Generation.';
}

interface ValidatedWorkflowTask {
  title: string;
  description?: string;
  assignedRole?: string;
  priority?: PriorityLevel;
  suggestedDueDate?: string | null;
  dependsOnIndices?: number[];
}

interface ValidatedWorkflowPayload {
  title: string;
  description?: string;
  category?: string;
  objective?: string;
  priority?: PriorityLevel;
  responsibleRoles?: string[];
  completionConditions?: string[];
  requiredApprovals?: string[];
  tasks: ValidatedWorkflowTask[];
}

function validateGeneratedWorkflowPayload(workflow: unknown): ValidatedWorkflowPayload {
  if (!workflow || typeof workflow !== 'object' || Array.isArray(workflow)) {
    throw new Error('Received an invalid workflow structure from the server. Please click Retry Generation.');
  }
  const obj = workflow as Record<string, unknown>;
  if (typeof obj.title !== 'string' || !obj.title.trim()) {
    throw new Error('The AI response was missing a workflow title. Please click Retry Generation.');
  }
  if (!Array.isArray(obj.tasks) || obj.tasks.length === 0) {
    throw new Error('The AI response did not include any workflow tasks. Please click Retry Generation.');
  }
  for (let i = 0; i < obj.tasks.length; i++) {
    const task = obj.tasks[i] as Record<string, unknown> | null;
    if (!task || typeof task !== 'object' || typeof task.title !== 'string' || !task.title.trim()) {
      throw new Error(`The AI response contained an incomplete task at step ${i + 1}. Please click Retry Generation.`);
    }
  }
  return workflow as ValidatedWorkflowPayload;
}

export function WorkflowBuilderView() {
  const {
    documents,
    workflows,
    tasks,
    pendingDocumentForBuilder,
    setPendingDocumentForBuilder,
    editingWorkflowId,
    setEditingWorkflowId,
    pendingAssistantPrompt,
    setPendingAssistantPrompt,
    saveWorkflowWithTasks,
    setActiveSection,
  } = useWorkspace();

  const [sourceMethod, setSourceMethod] = useState<SourceMethod>('text');
  const [selectedDocId, setSelectedDocId] = useState<string>(documents[0]?.id || '');
  const [nlPrompt, setNlPrompt] = useState('');
  const [refinementNote, setRefinementNote] = useState('');

  const [workflowId, setWorkflowId] = useState<string | undefined>(undefined);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Operations');
  const [objective, setObjective] = useState('');
  const [priority, setPriority] = useState<PriorityLevel>('high');
  const [status, setStatus] = useState<WorkflowStatus>('draft');
  const [responsibleRoles, setResponsibleRoles] = useState<string[]>([]);
  const [completionConditions, setCompletionConditions] = useState<string[]>([]);
  const [requiredApprovals, setRequiredApprovals] = useState<string[]>([]);
  const [nodes, setNodes] = useState<NodeTaskDraft[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [lastFailedAttempt, setLastFailedAttempt] = useState<FailedGenerationAttempt | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectBox, setShowRejectBox] = useState(false);

  // Load existing workflow when editingWorkflowId changes
  useEffect(() => {
    if (!editingWorkflowId) return;
    const wf = workflows.find((w) => w.id === editingWorkflowId);
    if (!wf) return;

    const wfTasks = tasks
      .filter((t) => t.workflowId === wf.id)
      .sort((a, b) => a.orderIndex - b.orderIndex);

    const idToTemp = new Map<string, string>();
    wfTasks.forEach((t) => idToTemp.set(t.id, t.id));

    setWorkflowId(wf.id);
    setSourceMethod(wf.sourceMethod);
    setSelectedDocId(wf.documentId || '');
    setTitle(wf.title);
    setDescription(wf.description);
    setCategory(wf.category);
    setObjective(wf.objective);
    setPriority(wf.priority);
    setStatus(wf.status);
    setResponsibleRoles(wf.responsibleRoles || []);
    setCompletionConditions(wf.completionConditions || []);
    setRequiredApprovals(wf.requiredApprovals || []);
    setNodes(
      wfTasks.map((t) => ({
        tempId: t.id,
        existingTaskId: t.id,
        title: t.title,
        description: t.description,
        assignedUser: t.assignedUser,
        priority: t.priority,
        startDate: t.startDate,
        dueDate: t.dueDate,
        status: t.status,
        dependencies: (t.dependencies || []).filter((d) => idToTemp.has(d)),
        reminderDate: t.reminderDate,
        reminderTime: t.reminderTime,
      }))
    );
    setSelectedNodeId(wfTasks[0]?.id || null);
  }, [editingWorkflowId, workflows, tasks]);

  // Handle handoff from Document Analyzer
  useEffect(() => {
    if (!pendingDocumentForBuilder) return;
    setSourceMethod('document');
    setSelectedDocId(pendingDocumentForBuilder.id);
    setWorkflowId(undefined);
    setStatus('draft');
    handleGenerateAI('document', pendingDocumentForBuilder.id);
    setPendingDocumentForBuilder(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingDocumentForBuilder]);

  // Handle handoff from AI Assistant
  useEffect(() => {
    if (!pendingAssistantPrompt) return;
    setSourceMethod('text');
    setNlPrompt(pendingAssistantPrompt);
    setWorkflowId(undefined);
    setStatus('draft');
    setPendingAssistantPrompt(null);
  }, [pendingAssistantPrompt, setPendingAssistantPrompt]);

  const handleGenerateAI = async (methodOverride?: SourceMethod, docIdOverride?: string, feedback?: string) => {
    const activeMethod = methodOverride || sourceMethod;
    const docId = docIdOverride || selectedDocId;
    const docObj = documents.find((d) => d.id === docId);

    if (activeMethod === 'document' && !docObj) {
      setErrorMsg('Please select an analyzed document first.');
      setLastFailedAttempt(null);
      return;
    }
    if (activeMethod === 'text' && !nlPrompt.trim()) {
      setErrorMsg('Please describe the workflow you want to automate.');
      setLastFailedAttempt(null);
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');
    setLastFailedAttempt(null);
    setGenerating(true);

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 90000);

    try {
      const response = await fetch('/api/generate-workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          prompt: activeMethod === 'text' ? nlPrompt.trim() : undefined,
          analysis: activeMethod === 'document' ? docObj?.analysis : undefined,
          refinementFeedback: feedback || undefined,
        }),
      });

      let data: any = null;
      try {
        data = await response.json();
      } catch {
        throw new Error(getFriendlyWorkflowError(response.status));
      }

      if (!response.ok) {
        throw new Error(getFriendlyWorkflowError(response.status, data?.error));
      }

      const generated = validateGeneratedWorkflowPayload(data?.workflow);
      const tempIds = generated.tasks.map(() => makeTempId());

      const nextNodes: NodeTaskDraft[] = generated.tasks.map((t, idx) => ({
        tempId: tempIds[idx],
        title: t.title.trim(),
        description: typeof t.description === 'string' ? t.description : '',
        assignedUser: t.assignedRole || 'Coordinator',
        priority: t.priority || 'medium',
        startDate: '',
        dueDate: t.suggestedDueDate || '',
        status: 'todo',
        dependencies: Array.isArray(t.dependsOnIndices)
          ? t.dependsOnIndices
              .filter((depIdx: number) => Number.isInteger(depIdx) && depIdx >= 0 && depIdx < idx && tempIds[depIdx])
              .map((depIdx: number) => tempIds[depIdx])
          : [],
        reminderDate: t.suggestedDueDate || '',
        reminderTime: '09:00',
      }));

      setTitle(generated.title.trim());
      setDescription(generated.description || '');
      setCategory(generated.category || 'Operations');
      setObjective(generated.objective || '');
      setPriority(generated.priority || 'high');
      setResponsibleRoles(Array.isArray(generated.responsibleRoles) ? generated.responsibleRoles : []);
      setCompletionConditions(Array.isArray(generated.completionConditions) ? generated.completionConditions : []);
      setRequiredApprovals(Array.isArray(generated.requiredApprovals) ? generated.requiredApprovals : []);
      setNodes(nextNodes);
      setStatus('draft');
      setSelectedNodeId(nextNodes[0]?.tempId || null);
      setLastFailedAttempt(null);
      setSuccessMsg('AI generated a structured workflow draft. Review nodes and submit for human approval.');
    } catch (err: any) {
      // Preserve nlPrompt, selectedDocId, refinementNote, and any existing nodes on error
      setLastFailedAttempt({
        method: activeMethod,
        docId: activeMethod === 'document' ? docId : undefined,
        feedback,
      });

      if (err?.name === 'AbortError') {
        setErrorMsg(
          'Workflow generation timed out waiting for Gemini AI. Your prompt has been preserved—please click Retry Generation.'
        );
      } else {
        setErrorMsg(
          err?.message || 'Unable to generate workflow right now. Your prompt has been preserved—please click Retry Generation.'
        );
      }
    } finally {
      window.clearTimeout(timeoutId);
      setGenerating(false);
    }
  };

  const addManualNode = () => {
    const newId = makeTempId();
    const prevId = nodes.length > 0 ? nodes[nodes.length - 1].tempId : null;
    const newNode: NodeTaskDraft = {
      tempId: newId,
      title: `Task ${nodes.length + 1}`,
      description: '',
      assignedUser: 'Coordinator',
      priority: 'medium',
      startDate: '',
      dueDate: '',
      status: 'todo',
      dependencies: prevId ? [prevId] : [],
      reminderDate: '',
      reminderTime: '09:00',
    };
    setNodes([...nodes, newNode]);
    setSelectedNodeId(newId);
  };

  const removeNode = (tempId: string) => {
    setNodes((prev) =>
      prev
        .filter((n) => n.tempId !== tempId)
        .map((n) => ({ ...n, dependencies: n.dependencies.filter((d) => d !== tempId) }))
    );
    if (selectedNodeId === tempId) setSelectedNodeId(null);
  };

  const moveNode = (idx: number, direction: -1 | 1) => {
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= nodes.length) return;
    const next = [...nodes];
    const [item] = next.splice(idx, 1);
    next.splice(targetIdx, 0, item);
    setNodes(next);
  };

  const toggleDependency = (nodeId: string, prereqId: string) => {
    if (nodeId === prereqId) return;
    setNodes((prev) =>
      prev.map((n) => {
        if (n.tempId !== nodeId) return n;
        const exists = n.dependencies.includes(prereqId);
        return {
          ...n,
          dependencies: exists
            ? n.dependencies.filter((d) => d !== prereqId)
            : [...n.dependencies, prereqId],
        };
      })
    );
  };

  const persistWorkflow = async (targetStatus: WorkflowStatus, note: string) => {
    if (!title.trim()) {
      setErrorMsg('Workflow title is required.');
      return;
    }
    if (nodes.length === 0) {
      setErrorMsg('Add at least one task node before saving.');
      return;
    }

    setErrorMsg('');
    setSaving(true);
    try {
      const docObj = documents.find((d) => d.id === selectedDocId);

      // Assign stable task IDs for dependency mapping
      const tempToRealId = new Map<string, string>();
      nodes.forEach((n, idx) => {
        const realId = n.existingTaskId || `task_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`;
        tempToRealId.set(n.tempId, realId);
      });

      const saved = await saveWorkflowWithTasks({
        id: workflowId,
        documentId: sourceMethod === 'document' ? docObj?.id || '' : '',
        documentTitle: sourceMethod === 'document' ? docObj?.title || '' : '',
        title: title.trim(),
        description: description.trim(),
        category: category.trim(),
        objective: objective.trim(),
        sourceMethod,
        status: targetStatus,
        priority,
        responsibleRoles,
        completionConditions,
        requiredApprovals,
        historyNote: note,
        tasks: nodes.map((n, idx) => ({
          id: tempToRealId.get(n.tempId)!,
          title: n.title,
          description: n.description,
          assignedUser: n.assignedUser,
          priority: n.priority,
          startDate: n.startDate,
          dueDate: n.dueDate,
          status: n.status,
          dependencies: n.dependencies.map((d) => tempToRealId.get(d)!).filter(Boolean),
          orderIndex: idx,
          reminderDate: n.reminderDate,
          reminderTime: n.reminderTime,
        })),
      });

      setWorkflowId(saved.id);
      setStatus(saved.status);
      setEditingWorkflowId(saved.id);
      setSuccessMsg(`Workflow saved as "${targetStatus.replace('_', ' ')}".`);
      setShowApproveModal(false);
      setShowRejectBox(false);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save workflow.');
    } finally {
      setSaving(false);
    }
  };

  const selectedNode = nodes.find((n) => n.tempId === selectedNodeId) || null;
  const activeWorkflowRecord = workflows.find((w) => w.id === workflowId);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-[#10172A] dark:text-white">
            AI Workflow Builder & Human Approval
          </h1>
          <p className="text-sm text-[#64748B] dark:text-slate-400 mt-1">
            Generate workflows from documents, natural language, or manual design—then review and approve before tasks go live.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setEditingWorkflowId(null);
              setWorkflowId(undefined);
              setTitle('');
              setDescription('');
              setObjective('');
              setNodes([]);
              setStatus('draft');
              setErrorMsg('');
              setLastFailedAttempt(null);
              setSuccessMsg('');
            }}
            className="px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:border-[#4361EE] transition-colors"
          >
            New Blank Workflow
          </button>
          <button
            type="button"
            onClick={() => setShowPreviewModal(true)}
            disabled={nodes.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:border-[#4361EE] transition-colors disabled:opacity-50"
          >
            <Eye className="w-3.5 h-3.5" />
            Preview
          </button>
        </div>
      </div>

      {/* Approval Stage Pipeline Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-[#64748B] dark:text-slate-400">
            Approval Lifecycle:
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {APPROVAL_STAGES.map((stage) => {
              const isCurrent = status === stage;
              return (
                <span
                  key={stage}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize ${
                    isCurrent
                      ? stage === 'rejected'
                        ? 'bg-red-600 text-white'
                        : stage === 'approved' || stage === 'in_progress' || stage === 'completed'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[#4361EE] text-white'
                      : 'bg-[#F7F9FC] dark:bg-slate-800 text-[#64748B] dark:text-slate-400'
                  }`}
                >
                  {stage.replace('_', ' ')}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Generation Method Selector */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-[#F7F9FC] dark:bg-slate-800 rounded-lg w-fit">
          {(
            [
              { id: 'document', label: 'A. From Document' },
              { id: 'text', label: 'B. Natural Language AI' },
              { id: 'manual', label: 'C. Manual Builder' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSourceMethod(tab.id)}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                sourceMethod === tab.id
                  ? 'bg-white dark:bg-slate-900 text-[#10172A] dark:text-white shadow-sm'
                  : 'text-[#64748B] dark:text-slate-400 hover:text-[#10172A] dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {sourceMethod === 'document' && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-[#64748B] mb-1">
                Select Analyzed Document
              </label>
              <select
                value={selectedDocId}
                onChange={(e) => setSelectedDocId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              >
                <option value="">-- Choose a processed document --</option>
                {documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title} ({d.category})
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => handleGenerateAI('document')}
              disabled={generating || !selectedDocId}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#4361EE] hover:bg-[#3651D4] text-white text-sm font-semibold transition-colors disabled:opacity-60 whitespace-nowrap shrink-0"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitBranch className="w-4 h-4" />}
              Generate from Document
            </button>
          </div>
        )}

        {sourceMethod === 'text' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-[#64748B]">
                Describe your goal or operational process
              </label>
              <button
                type="button"
                onClick={() => setNlPrompt(EXAMPLE_PROMPT)}
                className="text-xs font-medium text-[#4361EE] hover:underline"
              >
                Insert Symposium Example
              </button>
            </div>
            <textarea
              rows={3}
              value={nlPrompt}
              onChange={(e) => setNlPrompt(e.target.value)}
              placeholder={EXAMPLE_PROMPT}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-[#4361EE]"
            />
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => handleGenerateAI('text')}
                disabled={generating}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#4361EE] hover:bg-[#3651D4] text-white text-sm font-semibold transition-colors disabled:opacity-60"
              >
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitBranch className="w-4 h-4" />}
                {generating ? 'Generating Workflow...' : 'Generate Workflow with AI'}
              </button>
              {nodes.length > 0 && (
                <div className="flex-1 flex items-center gap-2 min-w-[240px]">
                  <input
                    type="text"
                    value={refinementNote}
                    onChange={(e) => setRefinementNote(e.target.value)}
                    placeholder="Optional refinement (e.g., Add budget approval step)..."
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => handleGenerateAI('text', undefined, refinementNote)}
                    disabled={generating}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:border-[#4361EE] whitespace-nowrap shrink-0"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Regenerate with AI
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {sourceMethod === 'manual' && (
          <div className="flex items-center justify-between text-xs text-[#64748B]">
            <span>Build your workflow directly using the form and visual node builder below.</span>
            <button
              type="button"
              onClick={addManualNode}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#4361EE] text-white font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              Add First Task Node
            </button>
          </div>
        )}

        {errorMsg && (
          <div
            role="alert"
            className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="leading-relaxed">{errorMsg}</div>
            {lastFailedAttempt && (
              <button
                type="button"
                disabled={generating}
                onClick={() =>
                  handleGenerateAI(
                    lastFailedAttempt.method,
                    lastFailedAttempt.docId,
                    lastFailedAttempt.feedback
                  )
                }
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors disabled:opacity-60 whitespace-nowrap shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
                Retry Generation
              </button>
            )}
          </div>
        )}
        {successMsg && (
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {successMsg}
          </div>
        )}
      </div>

      {/* Workflow Metadata + Visual Node Builder */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Visual Connected Node Graph */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[#64748B] mb-1">Workflow Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Technical Symposium Organization"
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#64748B] mb-1">Category</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#64748B] mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[#64748B] mb-1">Objective / Description</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe expected completion outcomes..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
          </div>

          {/* Connected Task Nodes */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-base font-semibold text-[#10172A] dark:text-white">
                Visual Workflow Graph ({nodes.length} nodes)
              </h2>
              <button
                type="button"
                onClick={addManualNode}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F7F9FC] dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:border-[#4361EE] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Node
              </button>
            </div>

            {nodes.length > 0 ? (
              <div className="space-y-2">
                {nodes.map((node, idx) => {
                  const isSelected = selectedNodeId === node.tempId;
                  const depLabels = node.dependencies
                    .map((dId) => {
                      const depIdx = nodes.findIndex((x) => x.tempId === dId);
                      return depIdx >= 0 ? `Task ${depIdx + 1}` : null;
                    })
                    .filter(Boolean);

                  return (
                    <React.Fragment key={node.tempId}>
                      <div
                        onClick={() => setSelectedNodeId(node.tempId)}
                        className={`cursor-pointer rounded-xl border p-4 transition-colors ${
                          isSelected
                            ? 'border-[#4361EE] bg-blue-50/40 dark:bg-blue-950/20'
                            : 'border-slate-200 dark:border-slate-800 bg-[#F7F9FC] dark:bg-slate-950/60 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-semibold text-[#4361EE] dark:text-[#22D3EE] tabular-nums">
                                Node {String(idx + 1).padStart(2, '0')}
                              </span>
                              <span className="text-sm font-semibold text-[#10172A] dark:text-white truncate">
                                {node.title}
                              </span>
                            </div>
                            <div className="text-xs text-[#64748B] dark:text-slate-400 mt-1">
                              {node.assignedUser || 'Unassigned'} · {node.priority} · Due: {node.dueDate || 'TBD'}
                              {depLabels.length > 0 && ` · Depends on: ${depLabels.join(', ')}`}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => moveNode(idx, -1)}
                              disabled={idx === 0}
                              aria-label="Move node up"
                              className="p-1.5 rounded text-slate-500 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-30"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveNode(idx, 1)}
                              disabled={idx === nodes.length - 1}
                              aria-label="Move node down"
                              className="p-1.5 rounded text-slate-500 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-30"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeNode(node.tempId)}
                              aria-label="Delete node"
                              className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-white dark:hover:bg-slate-800"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Directional Connector SVG Arrow */}
                      {idx < nodes.length - 1 && (
                        <div className="flex justify-center py-0.5" aria-hidden="true">
                          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <line x1="10" y1="0" x2="10" y2="15" stroke="#4361EE" strokeWidth="1.75" />
                            <path d="M6 12L10 17L14 12" stroke="#4361EE" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center border border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-sm text-[#64748B]">
                Generate a workflow with AI above or click "Add Node" to build manually.
              </div>
            )}
          </div>
        </div>

        {/* Right: Selected Node Inspector & Human Approval Panel */}
        <div className="lg:col-span-5 space-y-6">
          {/* Node Inspector */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
            <h2 className="font-display text-base font-semibold text-[#10172A] dark:text-white mb-4">
              {selectedNode ? 'Node Properties & Dependencies' : 'Select a Node to Edit'}
            </h2>
            {selectedNode ? (
              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-[#64748B] mb-1">Task Title</label>
                  <input
                    type="text"
                    value={selectedNode.title}
                    onChange={(e) =>
                      setNodes((prev) =>
                        prev.map((n) => (n.tempId === selectedNode.tempId ? { ...n, title: e.target.value } : n))
                      )
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#64748B] mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={selectedNode.description}
                    onChange={(e) =>
                      setNodes((prev) =>
                        prev.map((n) => (n.tempId === selectedNode.tempId ? { ...n, description: e.target.value } : n))
                      )
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#64748B] mb-1">Assigned Role / Owner</label>
                    <input
                      type="text"
                      value={selectedNode.assignedUser}
                      onChange={(e) =>
                        setNodes((prev) =>
                          prev.map((n) =>
                            n.tempId === selectedNode.tempId ? { ...n, assignedUser: e.target.value } : n
                          )
                        )
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#64748B] mb-1">Priority</label>
                    <select
                      value={selectedNode.priority}
                      onChange={(e) =>
                        setNodes((prev) =>
                          prev.map((n) =>
                            n.tempId === selectedNode.tempId ? { ...n, priority: e.target.value as PriorityLevel } : n
                          )
                        )
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#64748B] mb-1">Start Date</label>
                    <input
                      type="date"
                      value={selectedNode.startDate}
                      onChange={(e) =>
                        setNodes((prev) =>
                          prev.map((n) => (n.tempId === selectedNode.tempId ? { ...n, startDate: e.target.value } : n))
                        )
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#64748B] mb-1">Due Date</label>
                    <input
                      type="date"
                      value={selectedNode.dueDate}
                      onChange={(e) =>
                        setNodes((prev) =>
                          prev.map((n) => (n.tempId === selectedNode.tempId ? { ...n, dueDate: e.target.value } : n))
                        )
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Dependencies Selector */}
                <div>
                  <label className="block text-xs font-medium text-[#64748B] mb-1.5">
                    Prerequisite Dependencies (must finish before this node)
                  </label>
                  <div className="max-h-36 overflow-y-auto space-y-1 border border-slate-200 dark:border-slate-800 rounded-lg p-2">
                    {nodes
                      .map((candidate, cIdx) => ({ candidate, cIdx }))
                      .filter(({ candidate }) => candidate.tempId !== selectedNode.tempId)
                      .map(({ candidate, cIdx }) => {
                        const checked = selectedNode.dependencies.includes(candidate.tempId);
                        return (
                          <label
                            key={candidate.tempId}
                            className="flex items-center gap-2 text-xs py-1 px-1.5 rounded hover:bg-[#F7F9FC] dark:hover:bg-slate-800 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleDependency(selectedNode.tempId, candidate.tempId)}
                              className="rounded border-slate-300 text-[#4361EE]"
                            />
                            <span className="truncate">
                              Node {cIdx + 1}: {candidate.title}
                            </span>
                          </label>
                        );
                      })}
                    {nodes.length <= 1 && (
                      <div className="text-xs text-[#64748B] py-1">Add more nodes to connect dependencies.</div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-[#64748B]">
                Click any task node on the left graph to edit its schedule, owner, priority, and prerequisite dependencies.
              </p>
            )}
          </div>

          {/* Human Approval Action Box */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#4361EE]" />
              <h2 className="font-display text-base font-semibold text-[#10172A] dark:text-white">
                Human Review & Approval Gate
              </h2>
            </div>
            <p className="text-xs text-[#64748B] dark:text-slate-400 leading-relaxed">
              AI-generated workflows always start as drafts. Review all task assignments and deadlines before approving execution.
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={saving || status === 'archived'}
                onClick={() => persistWorkflow('draft', 'Saved draft for further editing')}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:border-[#4361EE] disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                Save as Draft
              </button>
              <button
                type="button"
                disabled={saving || status === 'archived'}
                onClick={() => persistWorkflow('pending_review', 'Submitted for human approval')}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-[#4361EE] text-[#4361EE] text-xs font-semibold hover:bg-blue-50 dark:hover:bg-blue-950/30 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                Submit for Review
              </button>
              <button
                type="button"
                disabled={saving || nodes.length === 0 || status === 'archived'}
                onClick={() => setShowApproveModal(true)}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold disabled:opacity-50"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Approve Workflow
              </button>
              <button
                type="button"
                disabled={saving || status === 'archived'}
                onClick={() => setShowRejectBox((v) => !v)}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 text-xs font-semibold hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50"
              >
                <XCircle className="w-3.5 h-3.5" />
                Reject
              </button>
            </div>

            {showRejectBox && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 space-y-2">
                <input
                  type="text"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Reason for rejection..."
                  className="w-full px-3 py-1.5 rounded border border-red-300 dark:border-red-700 bg-white dark:bg-slate-900 text-xs"
                />
                <button
                  type="button"
                  onClick={() => persistWorkflow('rejected', rejectionReason || 'Rejected during human review')}
                  className="px-3 py-1.5 rounded bg-red-600 text-white text-xs font-semibold"
                >
                  Confirm Rejection
                </button>
              </div>
            )}

            {(status === 'approved' || status === 'in_progress') && (
              <button
                type="button"
                onClick={() => setActiveSection('task-manager')}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#10172A] dark:bg-[#4361EE] text-white text-xs font-semibold"
              >
                Open Tasks in Task Manager
              </button>
            )}

            {/* Workflow History Timeline */}
            {activeWorkflowRecord && activeWorkflowRecord.history.length > 0 && (
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                <div className="text-xs font-semibold text-[#10172A] dark:text-white mb-2">
                  Approval & Audit History
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto text-xs">
                  {activeWorkflowRecord.history.map((h, i) => (
                    <div key={i} className="flex items-start justify-between gap-2 text-[#64748B]">
                      <div>
                        <span className="font-semibold text-[#172033] dark:text-slate-200 capitalize">
                          {h.stage.replace('_', ' ')}
                        </span>{' '}
                        · {h.actor} — {h.note}
                      </div>
                      <span className="font-mono text-[11px] shrink-0">
                        {new Date(h.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal before Approval */}
      {showApproveModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-5 h-5 text-emerald-600" />
              <h3 className="font-display text-lg font-bold text-[#10172A] dark:text-white">
                Confirm Workflow Approval
              </h3>
            </div>
            <p className="text-sm text-[#64748B] dark:text-slate-400 leading-relaxed">
              Approving <strong>{title || 'this workflow'}</strong> will publish{' '}
              <strong className="font-mono">{nodes.length}</strong> actionable tasks into your Task Manager and schedule active deadline reminders.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowApproveModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => persistWorkflow('approved', 'Approved by human reviewer')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Confirm & Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Workflow Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full max-h-[85vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-display text-lg font-bold text-[#10172A] dark:text-white">
                  {title || 'Workflow Preview'}
                </h3>
                <p className="text-xs text-[#64748B]">
                  {category} · {priority} priority · {nodes.length} tasks
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="text-xs font-semibold text-[#64748B] hover:text-[#10172A]"
              >
                Close
              </button>
            </div>
            <p className="text-sm text-[#172033] dark:text-slate-300">{description}</p>
            <div className="space-y-2">
              {nodes.map((n, i) => (
                <div key={n.tempId} className="p-3 rounded-lg bg-[#F7F9FC] dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span>
                      {i + 1}. {n.title}
                    </span>
                    <span className="font-mono text-xs text-[#64748B]">{n.dueDate || 'No due date'}</span>
                  </div>
                  <div className="text-xs text-[#64748B] mt-1">
                    {n.description} · Owner: {n.assignedUser || 'Unassigned'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
