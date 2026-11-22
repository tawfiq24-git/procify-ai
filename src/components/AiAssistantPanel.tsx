import React, { useState } from 'react';
import { ArrowRight, Bot, Loader2, Send, X } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  suggestedWorkflowPrompt?: string | null;
}

const SUGGESTED_QUERIES = [
  'What tasks are due soon?',
  'Summarize my active workflows.',
  'Which tasks are overdue?',
  'Create a workflow for organizing an annual product launch event.',
];

export function AiAssistantPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { workflows, tasks, documents, setPendingAssistantPrompt, setEditingWorkflowId, setActiveSection } =
    useWorkspace();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Ask me about your active workflows, upcoming or overdue tasks, or request a draft workflow plan. I use your real workspace records and never modify data without your review.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const sendMessage = async (textOverride?: string) => {
    const queryText = (textOverride ?? input).trim();
    if (!queryText || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: queryText };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    if (!textOverride) setInput('');
    setLoading(true);

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 60000);

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          message: queryText,
          history: nextHistory.slice(-6).map((m) => ({ role: m.role, content: m.content })),
          workspaceContext: {
            workflows: workflows.map((w) => ({
              id: w.id,
              title: w.title,
              status: w.status,
              progress: w.progress,
              priority: w.priority,
            })),
            tasks: tasks.map((t) => ({
              id: t.id,
              title: t.title,
              status: t.status,
              priority: t.priority,
              dueDate: t.dueDate || null,
              workflowTitle: t.workflowTitle,
            })),
            documentsCount: documents.length,
          },
        }),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        throw new Error('The assistant returned an unreadable response. Please try again.');
      }

      if (!res.ok) {
        throw new Error(data?.error || 'Assistant is temporarily unavailable. Please try again.');
      }
      if (typeof data?.reply !== 'string' || !data.reply.trim()) {
        throw new Error('The assistant returned an incomplete response. Please try again.');
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.reply,
          suggestedWorkflowPrompt: data.suggestedWorkflowPrompt ?? null,
        },
      ]);
    } catch (err: any) {
      const msg =
        err?.name === 'AbortError'
          ? 'The assistant request timed out. Please try again.'
          : err?.message || 'Unable to reach Gemini assistant.';
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: msg,
        },
      ]);
    } finally {
      window.clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[400px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col shadow-xl">
      <div className="h-16 px-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Bot className="w-5 h-5 text-[#4361EE]" />
          <span className="font-display text-sm font-bold text-[#10172A] dark:text-white">
            Workspace Assistant
          </span>
        </div>
        <button
          onClick={onClose}
          aria-label="Close assistant"
          className="p-1.5 rounded-lg text-[#64748B] hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Prompts */}
      <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex flex-wrap gap-1.5">
        {SUGGESTED_QUERIES.map((q) => (
          <button
            key={q}
            onClick={() => sendMessage(q)}
            className="text-left text-[11px] px-2.5 py-1 rounded-md bg-[#F7F9FC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-[#4361EE] transition-colors"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`p-3 rounded-xl text-xs leading-relaxed whitespace-pre-wrap ${
              m.role === 'user'
                ? 'bg-[#4361EE] text-white ml-8'
                : 'bg-[#F7F9FC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[#172033] dark:text-slate-200 mr-6'
            }`}
          >
            {m.content}
            {m.suggestedWorkflowPrompt && (
              <button
                onClick={() => {
                  setEditingWorkflowId(null);
                  setPendingAssistantPrompt(m.suggestedWorkflowPrompt!);
                  setActiveSection('create-workflow');
                  onClose();
                }}
                className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#10172A] dark:bg-[#4361EE] text-white text-xs font-semibold"
              >
                Review Draft in Workflow Builder
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-[#64748B] px-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Checking workspace records...
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage();
        }}
        className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about deadlines, workflows, or plans..."
          className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs focus:outline-none focus:ring-2 focus:ring-[#4361EE]"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="p-2 rounded-lg bg-[#4361EE] text-white hover:bg-[#3651D4] disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
