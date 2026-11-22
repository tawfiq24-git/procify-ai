import React, { useMemo, useState } from 'react';
import { Archive, Copy, ExternalLink, Plus, Search, Trash2 } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { WorkflowStatus } from '../../types/procify';

const FILTER_TABS: Array<{ id: 'all' | WorkflowStatus | 'active'; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Draft' },
  { id: 'pending_review', label: 'Pending Approval' },
  { id: 'active', label: 'Active' },
  { id: 'completed', label: 'Completed' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'archived', label: 'Archived' },
];

export function WorkflowHistoryView() {
  const {
    workflows,
    setEditingWorkflowId,
    setActiveSection,
    duplicateWorkflow,
    transitionWorkflowStatus,
    deleteWorkflow,
  } = useWorkspace();

  const [filter, setFilter] = useState<'all' | WorkflowStatus | 'active'>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return workflows.filter((w) => {
      const matchesFilter =
        filter === 'all'
          ? true
          : filter === 'active'
          ? w.status === 'approved' || w.status === 'in_progress'
          : w.status === filter;

      const matchesSearch =
        !search.trim() ||
        w.title.toLowerCase().includes(search.toLowerCase()) ||
        w.category.toLowerCase().includes(search.toLowerCase()) ||
        w.documentTitle.toLowerCase().includes(search.toLowerCase());

      return matchesFilter && matchesSearch;
    });
  }, [workflows, filter, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-[#10172A] dark:text-white">
            My Workflows & History
          </h1>
          <p className="text-sm text-[#64748B] dark:text-slate-400 mt-1">
            Review approval status, completion progress, linked documents, and audit history.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingWorkflowId(null);
            setActiveSection('create-workflow');
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4361EE] hover:bg-[#3651D4] text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          New Workflow
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-[#F7F9FC] dark:bg-slate-800 rounded-lg">
          {FILTER_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setFilter(t.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                filter === t.id
                  ? 'bg-white dark:bg-slate-900 text-[#10172A] dark:text-white shadow-sm'
                  : 'text-[#64748B] dark:text-slate-400 hover:text-[#10172A] dark:hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search workflows..."
            className="w-full pl-9 pr-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs focus:outline-none focus:ring-2 focus:ring-[#4361EE]"
          />
        </div>
      </div>

      {/* Table / Cards */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        {filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-[#64748B] dark:text-slate-400 bg-[#F7F9FC] dark:bg-slate-950/60">
                  <th className="py-3 px-4 font-semibold">Workflow</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Source Document</th>
                  <th className="py-3 px-4 font-semibold text-right">Tasks</th>
                  <th className="py-3 px-4 font-semibold text-right">Completion</th>
                  <th className="py-3 px-4 font-semibold">Updated</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {filtered.map((wf) => (
                  <tr key={wf.id} className="hover:bg-[#F7F9FC]/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#10172A] dark:text-white">{wf.title}</div>
                      <div className="text-xs text-[#64748B] mt-0.5">
                        {wf.category} · {wf.priority} priority{wf.isDemo ? ' · Demo' : ''}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium capitalize">
                      <span
                        className={
                          wf.status === 'completed'
                            ? 'text-emerald-600'
                            : wf.status === 'rejected'
                            ? 'text-red-600'
                            : wf.status === 'pending_review'
                            ? 'text-amber-600'
                            : 'text-[#4361EE]'
                        }
                      >
                        {wf.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[#64748B] dark:text-slate-400 max-w-[200px] truncate">
                      {wf.documentTitle || `${wf.sourceMethod} prompt`}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-xs tabular-nums">
                      {wf.completedTaskCount}/{wf.taskCount}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-xs font-semibold tabular-nums">
                      {wf.progress}%
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-[#64748B] tabular-nums">
                      {new Date(wf.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setEditingWorkflowId(wf.id);
                            setActiveSection('create-workflow');
                          }}
                          title="Open in Workflow Builder"
                          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-[#4361EE]"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => duplicateWorkflow(wf.id)}
                          title="Duplicate workflow"
                          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-[#64748B]"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        {wf.status !== 'archived' && (
                          <button
                            onClick={() => transitionWorkflowStatus(wf.id, 'archived', 'Archived from Workflow History')}
                            title="Archive workflow"
                            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-[#64748B]"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteWorkflow(wf.id)}
                          title="Delete workflow"
                          className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-sm text-[#64748B]">
            No workflows match the selected filter.
          </div>
        )}
      </div>
    </div>
  );
}
