import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar as CalendarIcon,
  CheckCircle2,
  Columns,
  Edit3,
  List,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { PriorityLevel, TaskRecord, TaskStatus } from '../../types/procify';

const KANBAN_COLUMNS: Array<{ id: TaskStatus; label: string }> = [
  { id: 'todo', label: 'To Do' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'under_review', label: 'Under Review' },
  { id: 'completed', label: 'Completed' },
  { id: 'overdue', label: 'Overdue' },
];

export function TaskManagerView() {
  const { workflows, tasks, createTask, updateTask, deleteTask } = useWorkspace();

  const [viewMode, setViewMode] = useState<'list' | 'kanban' | 'calendar'>('list');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | TaskStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | PriorityLevel>('all');
  const [workflowFilter, setWorkflowFilter] = useState<string>('all');
  const [sortByDeadline, setSortByDeadline] = useState(true);
  const [dependencyWarning, setDependencyWarning] = useState('');

  // Modal state for Create/Edit task
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskRecord | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formWorkflowId, setFormWorkflowId] = useState(workflows[0]?.id || '');
  const [formAssignee, setFormAssignee] = useState('');
  const [formPriority, setFormPriority] = useState<PriorityLevel>('medium');
  const [formStartDate, setFormStartDate] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formStatus, setFormStatus] = useState<TaskStatus>('todo');
  const [formReminderDate, setFormReminderDate] = useState('');
  const [formReminderTime, setFormReminderTime] = useState('09:00');

  const todayStr = new Date().toISOString().split('T')[0];

  const effectiveTasks = useMemo(() => {
    return tasks.map((t) => {
      if (t.status !== 'completed' && t.dueDate && t.dueDate < todayStr) {
        return { ...t, effectiveStatus: 'overdue' as TaskStatus };
      }
      return { ...t, effectiveStatus: t.status };
    });
  }, [tasks, todayStr]);

  const filteredTasks = useMemo(() => {
    const list = effectiveTasks.filter((t) => {
      if (statusFilter !== 'all' && t.effectiveStatus !== statusFilter) return false;
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
      if (workflowFilter !== 'all' && t.workflowId !== workflowFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hit =
          t.title.toLowerCase().includes(q) ||
          t.workflowTitle.toLowerCase().includes(q) ||
          t.assignedUser.toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });

    if (sortByDeadline) {
      list.sort((a, b) => (a.dueDate || '9999-12-31').localeCompare(b.dueDate || '9999-12-31'));
    }
    return list;
  }, [effectiveTasks, statusFilter, priorityFilter, workflowFilter, search, sortByDeadline]);

  const openCreateModal = () => {
    setEditingTask(null);
    setFormTitle('');
    setFormDesc('');
    setFormWorkflowId(workflows[0]?.id || '');
    setFormAssignee('');
    setFormPriority('medium');
    setFormStartDate(todayStr);
    setFormDueDate('');
    setFormStatus('todo');
    setFormReminderDate('');
    setFormReminderTime('09:00');
    setModalOpen(true);
  };

  const openEditModal = (t: TaskRecord) => {
    setEditingTask(t);
    setFormTitle(t.title);
    setFormDesc(t.description);
    setFormWorkflowId(t.workflowId);
    setFormAssignee(t.assignedUser);
    setFormPriority(t.priority);
    setFormStartDate(t.startDate);
    setFormDueDate(t.dueDate);
    setFormStatus(t.status);
    setFormReminderDate(t.reminderDate);
    setFormReminderTime(t.reminderTime || '09:00');
    setModalOpen(true);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formWorkflowId) return;
    const wf = workflows.find((w) => w.id === formWorkflowId);

    if (editingTask) {
      await updateTask(editingTask.id, {
        title: formTitle.trim(),
        description: formDesc.trim(),
        assignedUser: formAssignee.trim(),
        priority: formPriority,
        startDate: formStartDate,
        dueDate: formDueDate,
        status: formStatus,
        reminderDate: formReminderDate,
        reminderTime: formReminderTime,
      });
    } else {
      await createTask({
        workflowId: formWorkflowId,
        workflowTitle: wf?.title || 'Workflow',
        title: formTitle.trim(),
        description: formDesc.trim(),
        assignedUser: formAssignee.trim(),
        priority: formPriority,
        startDate: formStartDate,
        dueDate: formDueDate,
        status: formStatus,
        dependencies: [],
        orderIndex: tasks.length,
        reminderDate: formReminderDate,
        reminderTime: formReminderTime,
      });
    }
    setModalOpen(false);
  };

  const handleStatusChange = async (task: TaskRecord, nextStatus: TaskStatus) => {
    setDependencyWarning('');
    if (nextStatus === 'completed' && task.dependencies.length > 0) {
      const incompleteDeps = task.dependencies
        .map((depId) => tasks.find((x) => x.id === depId))
        .filter((d): d is TaskRecord => d !== undefined && d.status !== 'completed');

      if (incompleteDeps.length > 0) {
        setDependencyWarning(
          `Blocked by incomplete prerequisite task(s): ${incompleteDeps.map((d) => `"${d.title}"`).join(', ')}. Complete prerequisites first.`
        );
        return;
      }
    }
    await updateTask(task.id, { status: nextStatus });
  };

  // Tasks grouped by due date for Task Calendar mini-view
  const tasksByDate = useMemo(() => {
    const map = new Map<string, typeof filteredTasks>();
    filteredTasks.forEach((t) => {
      const key = t.dueDate || 'Unscheduled';
      const arr = map.get(key) || [];
      arr.push(t);
      map.set(key, arr);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredTasks]);

  const statusColorText = (s: TaskStatus) => {
    if (s === 'completed') return 'text-emerald-600';
    if (s === 'overdue') return 'text-red-600';
    if (s === 'in_progress') return 'text-[#4361EE]';
    if (s === 'under_review') return 'text-amber-600';
    return 'text-[#64748B]';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-[#10172A] dark:text-white">
            Task Manager
          </h1>
          <p className="text-sm text-[#64748B] dark:text-slate-400 mt-1">
            Track execution across List, Kanban, and Schedule views with dependency enforcement.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
            <button
              onClick={() => setViewMode('list')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium ${
                viewMode === 'list' ? 'bg-[#4361EE] text-white' : 'text-[#64748B] hover:text-[#10172A] dark:hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              List
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium ${
                viewMode === 'kanban' ? 'bg-[#4361EE] text-white' : 'text-[#64748B] hover:text-[#10172A] dark:hover:text-white'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              Kanban
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium ${
                viewMode === 'calendar' ? 'bg-[#4361EE] text-white' : 'text-[#64748B] hover:text-[#10172A] dark:hover:text-white'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              Schedule
            </button>
          </div>

          <button
            onClick={openCreateModal}
            disabled={workflows.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4361EE] hover:bg-[#3651D4] text-white text-sm font-semibold transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add Task
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks or assignees..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
        >
          <option value="all">All Statuses</option>
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="under_review">Under Review</option>
          <option value="completed">Completed</option>
          <option value="overdue">Overdue</option>
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as any)}
          className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
        >
          <option value="all">All Priorities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select
          value={workflowFilter}
          onChange={(e) => setWorkflowFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
        >
          <option value="all">All Workflows</option>
          {workflows.map((w) => (
            <option key={w.id} value={w.id}>
              {w.title}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-xs text-[#172033] dark:text-slate-300 px-2 cursor-pointer">
          <input
            type="checkbox"
            checked={sortByDeadline}
            onChange={(e) => setSortByDeadline(e.target.checked)}
            className="rounded border-slate-300 text-[#4361EE]"
          />
          Sort by deadline
        </label>
      </div>

      {dependencyWarning && (
        <div className="p-3.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{dependencyWarning}</span>
          </div>
          <button onClick={() => setDependencyWarning('')} className="font-semibold underline">
            Dismiss
          </button>
        </div>
      )}

      {/* VIEW 1: LIST VIEW */}
      {viewMode === 'list' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          {filteredTasks.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-[#64748B] bg-[#F7F9FC] dark:bg-slate-950/60">
                    <th className="py-3 px-4 font-semibold">Done</th>
                    <th className="py-3 px-4 font-semibold">Task</th>
                    <th className="py-3 px-4 font-semibold">Assignee</th>
                    <th className="py-3 px-4 font-semibold">Priority</th>
                    <th className="py-3 px-4 font-semibold">Due Date</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                  {filteredTasks.map((t) => (
                    <tr key={t.id} className="hover:bg-[#F7F9FC]/60 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleStatusChange(t, t.status === 'completed' ? 'todo' : 'completed')}
                          aria-label={`Toggle ${t.title} completion`}
                          className={`p-1 rounded transition-colors ${
                            t.status === 'completed' ? 'text-emerald-600' : 'text-slate-400 hover:text-[#4361EE]'
                          }`}
                        >
                          <CheckCircle2 className="w-5 h-5" />
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <div
                          className={`font-medium ${
                            t.status === 'completed'
                              ? 'line-through text-[#64748B]'
                              : 'text-[#10172A] dark:text-white'
                          }`}
                        >
                          {t.title}
                        </div>
                        <div className="text-xs text-[#64748B] mt-0.5">
                          {t.workflowTitle}
                          {t.dependencies.length > 0 && ` · ${t.dependencies.length} dependency`}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-[#172033] dark:text-slate-300">
                        {t.assignedUser || 'Unassigned'}
                      </td>
                      <td className="py-3 px-4 text-xs capitalize font-medium">
                        <span
                          className={
                            t.priority === 'critical'
                              ? 'text-red-600'
                              : t.priority === 'high'
                              ? 'text-amber-600'
                              : 'text-[#64748B]'
                          }
                        >
                          {t.priority}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs tabular-nums">
                        <span className={t.effectiveStatus === 'overdue' ? 'text-red-600 font-semibold' : 'text-[#64748B]'}>
                          {t.dueDate || '—'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={t.effectiveStatus}
                          onChange={(e) => handleStatusChange(t, e.target.value as TaskStatus)}
                          className={`text-xs font-semibold bg-transparent border border-slate-200 dark:border-slate-700 rounded px-2 py-1 ${statusColorText(
                            t.effectiveStatus
                          )}`}
                        >
                          <option value="todo">To Do</option>
                          <option value="in_progress">In Progress</option>
                          <option value="under_review">Under Review</option>
                          <option value="completed">Completed</option>
                          <option value="overdue">Overdue</option>
                        </select>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => openEditModal(t)}
                            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-[#64748B]"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteTask(t.id)}
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
              No tasks match your filters.
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: KANBAN BOARD */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
          {KANBAN_COLUMNS.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.effectiveStatus === col.id);
            return (
              <div
                key={col.id}
                className="bg-[#F7F9FC] dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-col min-h-[380px]"
              >
                <div className="flex items-center justify-between px-1 pb-3 mb-3 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-xs font-semibold text-[#10172A] dark:text-white">
                    {col.label}
                  </span>
                  <span className="font-mono text-xs text-[#64748B] tabular-nums">
                    {colTasks.length}
                  </span>
                </div>
                <div className="space-y-2.5 flex-1">
                  {colTasks.map((t) => (
                    <div
                      key={t.id}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 space-y-2"
                    >
                      <div className="text-xs font-semibold text-[#10172A] dark:text-white leading-snug">
                        {t.title}
                      </div>
                      <div className="text-[11px] text-[#64748B]">
                        {t.workflowTitle} · {t.priority}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-[#64748B] pt-1 border-t border-slate-100 dark:border-slate-800">
                        <span className="font-mono">{t.dueDate || 'No date'}</span>
                        <select
                          value={t.effectiveStatus}
                          onChange={(e) => handleStatusChange(t, e.target.value as TaskStatus)}
                          className="text-[11px] bg-transparent border border-slate-200 dark:border-slate-700 rounded px-1 py-0.5"
                        >
                          {KANBAN_COLUMNS.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 3: CALENDAR SCHEDULE */}
      {viewMode === 'calendar' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-200 dark:divide-slate-800">
          {tasksByDate.length > 0 ? (
            tasksByDate.map(([dateKey, group]) => (
              <div key={dateKey} className="p-5 flex flex-col md:flex-row gap-4">
                <div className="md:w-44 shrink-0">
                  <div className="font-mono text-sm font-semibold text-[#10172A] dark:text-white tabular-nums">
                    {dateKey}
                  </div>
                  <div className="text-xs text-[#64748B]">{group.length} task(s)</div>
                </div>
                <div className="flex-1 space-y-2">
                  {group.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between gap-4 p-3 rounded-lg bg-[#F7F9FC] dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700"
                    >
                      <div>
                        <div className="text-sm font-medium text-[#10172A] dark:text-white">{t.title}</div>
                        <div className="text-xs text-[#64748B]">
                          {t.workflowTitle} · {t.assignedUser || 'Unassigned'}
                        </div>
                      </div>
                      <button
                        onClick={() => handleStatusChange(t, t.status === 'completed' ? 'todo' : 'completed')}
                        className="px-3 py-1 rounded border border-slate-300 dark:border-slate-600 text-xs font-semibold hover:border-[#4361EE]"
                      >
                        {t.status === 'completed' ? 'Completed' : 'Mark Done'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-sm text-[#64748B]">No scheduled tasks.</div>
          )}
        </div>
      )}

      {/* Create / Edit Task Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveTask}
            className="max-w-lg w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4"
          >
            <h3 className="font-display text-lg font-bold text-[#10172A] dark:text-white">
              {editingTask ? 'Edit Task' : 'Create Task'}
            </h3>
            <div>
              <label className="block text-xs font-medium text-[#64748B] mb-1">Workflow</label>
              <select
                value={formWorkflowId}
                onChange={(e) => setFormWorkflowId(e.target.value)}
                disabled={Boolean(editingTask)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              >
                {workflows.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#64748B] mb-1">Task Title</label>
              <input
                type="text"
                required
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#64748B] mb-1">Description</label>
              <textarea
                rows={2}
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">Assigned To</label>
                <input
                  type="text"
                  value={formAssignee}
                  onChange={(e) => setFormAssignee(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">Priority</label>
                <select
                  value={formPriority}
                  onChange={(e) => setFormPriority(e.target.value as PriorityLevel)}
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
                  value={formStartDate}
                  onChange={(e) => setFormStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">Due Date</label>
                <input
                  type="date"
                  value={formDueDate}
                  onChange={(e) => setFormDueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">Reminder Date</label>
                <input
                  type="date"
                  value={formReminderDate}
                  onChange={(e) => setFormReminderDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">Reminder Time</label>
                <input
                  type="time"
                  value={formReminderTime}
                  onChange={(e) => setFormReminderTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-[#4361EE] hover:bg-[#3651D4] text-white text-xs font-semibold"
              >
                {editingTask ? 'Save Changes' : 'Create Task'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
