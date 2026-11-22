import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock,
  FileText,
  GitBranch,
  Layers,
  Plus,
  Sparkles,
  UploadCloud,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useWorkspace } from '../../context/WorkspaceContext';

const STATUS_COLORS: Record<string, string> = {
  Completed: '#16A34A',
  'In Progress': '#4361EE',
  'Under Review': '#22D3EE',
  'To Do': '#94A3B8',
  Overdue: '#DC2626',
};

const DEMO_STEPS = [
  { step: 1, label: 'Explore Dashboard KPIs & charts', target: 'dashboard' as const },
  { step: 2, label: 'Upload or load a sample notice', target: 'document-analyzer' as const },
  { step: 3, label: 'Inspect Gemini structured extraction', target: 'document-analyzer' as const },
  { step: 4, label: 'Generate an AI workflow graph', target: 'create-workflow' as const },
  { step: 5, label: 'Review & approve the workflow', target: 'create-workflow' as const },
  { step: 6, label: 'Open Task Manager (List/Kanban)', target: 'task-manager' as const },
  { step: 7, label: 'Complete a task & watch progress update', target: 'task-manager' as const },
  { step: 8, label: 'Verify updated Dashboard statistics', target: 'dashboard' as const },
  { step: 9, label: 'Inspect Analytics & export CSV', target: 'analytics' as const },
];

export function DashboardView() {
  const {
    profile,
    isDemoMode,
    documents,
    workflows,
    tasks,
    activities,
    setActiveSection,
    setEditingWorkflowId,
    resetDemoWorkspace,
  } = useWorkspace();

  const [showDemoGuide, setShowDemoGuide] = useState(true);
  const [completedDemoSteps, setCompletedDemoSteps] = useState<number[]>([1]);

  const todayStr = new Date().toISOString().split('T')[0];

  const stats = useMemo(() => {
    const totalWorkflows = workflows.length;
    const activeWorkflows = workflows.filter((w) => w.status === 'approved' || w.status === 'in_progress').length;
    const tasksCompleted = tasks.filter((t) => t.status === 'completed').length;
    const overdueTasks = tasks.filter(
      (t) => t.status === 'overdue' || (t.status !== 'completed' && Boolean(t.dueDate) && t.dueDate < todayStr)
    ).length;
    const pendingTasks = tasks.filter((t) => t.status !== 'completed').length;
    const documentsProcessed = documents.length;

    return {
      totalWorkflows,
      activeWorkflows,
      tasksCompleted,
      pendingTasks,
      overdueTasks,
      documentsProcessed,
    };
  }, [workflows, tasks, documents, todayStr]);

  const taskDistributionData = useMemo(() => {
    const counts = {
      Completed: 0,
      'In Progress': 0,
      'Under Review': 0,
      'To Do': 0,
      Overdue: 0,
    };
    tasks.forEach((t) => {
      if (t.status === 'completed') counts.Completed++;
      else if (t.status === 'overdue' || (t.dueDate && t.dueDate < todayStr)) counts.Overdue++;
      else if (t.status === 'in_progress') counts['In Progress']++;
      else if (t.status === 'under_review') counts['Under Review']++;
      else counts['To Do']++;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .filter((d) => d.value > 0);
  }, [tasks, todayStr]);

  const workflowProgressData = useMemo(() => {
    return workflows.slice(0, 6).map((w) => ({
      name: w.title.length > 18 ? `${w.title.slice(0, 18)}…` : w.title,
      progress: w.progress,
      tasks: w.taskCount,
    }));
  }, [workflows]);

  const upcomingDeadlines = useMemo(() => {
    return tasks
      .filter((t) => t.status !== 'completed' && Boolean(t.dueDate))
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 5);
  }, [tasks]);

  const kpiCards = [
    { label: 'Total Workflows', value: stats.totalWorkflows, icon: Layers, accent: 'text-[#4361EE]' },
    { label: 'Active Workflows', value: stats.activeWorkflows, icon: GitBranch, accent: 'text-[#22D3EE]' },
    { label: 'Tasks Completed', value: stats.tasksCompleted, icon: CheckCircle2, accent: 'text-emerald-600' },
    { label: 'Pending Tasks', value: stats.pendingTasks, icon: Clock, accent: 'text-amber-600' },
    { label: 'Overdue Tasks', value: stats.overdueTasks, icon: AlertCircle, accent: 'text-red-600' },
    { label: 'Documents Processed', value: stats.documentsProcessed, icon: FileText, accent: 'text-[#10172A] dark:text-slate-200' },
  ];

  return (
    <div className="space-y-8">
      {/* Header & Quick Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#10172A] dark:text-white">
            Welcome back{profile?.fullName ? `, ${profile.fullName.split(' ')[0]}` : ''}!
          </h1>
          <p className="text-sm text-[#64748B] dark:text-slate-400 mt-1">
            Your intelligent workspace is ready.
            {isDemoMode && ' · Viewing Interactive Demo Workspace (Sample Data)'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setActiveSection('document-analyzer')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4361EE] hover:bg-[#3651D4] text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
          >
            <UploadCloud className="w-4 h-4" />
            Analyze Document
          </button>
          <button
            onClick={() => {
              setEditingWorkflowId(null);
              setActiveSection('create-workflow');
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-[#172033] dark:text-slate-100 text-sm font-semibold hover:border-[#4361EE] transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            Create Workflow
          </button>
        </div>
      </div>

      {/* Guided Demonstration Banner for Judges */}
      {isDemoMode && showDemoGuide && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-[#4361EE]" />
              <h2 className="font-display text-base font-semibold text-[#10172A] dark:text-white">
                Guided Demo Walkthrough (Sample Workspace)
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={resetDemoWorkspace}
                className="text-xs font-medium text-[#4361EE] hover:underline"
              >
                Reset Sample Data
              </button>
              <button
                onClick={() => setShowDemoGuide(false)}
                className="text-xs text-[#64748B] hover:text-[#172033] dark:hover:text-white"
              >
                Hide Guide
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-2.5">
            {DEMO_STEPS.map((item) => {
              const done = completedDemoSteps.includes(item.step);
              return (
                <button
                  key={item.step}
                  onClick={() => {
                    if (!done) setCompletedDemoSteps((prev) => [...prev, item.step]);
                    setActiveSection(item.target);
                  }}
                  className={`flex items-center justify-between gap-2 text-left px-3 py-2.5 rounded-lg border text-xs transition-colors ${
                    done
                      ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                      : 'bg-[#F7F9FC] dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-[#172033] dark:text-slate-200 hover:border-[#4361EE]'
                  }`}
                >
                  <span className="truncate">
                    <span className="font-mono font-semibold mr-1.5">{String(item.step).padStart(2, '0')}.</span>
                    {item.label}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 shrink-0 opacity-70" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 6 KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-[#64748B] dark:text-slate-400">
                  {kpi.label}
                </span>
                <Icon className={`w-4 h-4 ${kpi.accent}`} />
              </div>
              <div className="font-mono text-2xl font-bold text-[#10172A] dark:text-white tabular-nums">
                {kpi.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-display text-base font-semibold text-[#10172A] dark:text-white">
                Workflow Completion Progress
              </h2>
              <p className="text-xs text-[#64748B] dark:text-slate-400">
                Calculated from completed tasks across stored workflows
              </p>
            </div>
            <button
              onClick={() => setActiveSection('analytics')}
              className="text-xs font-medium text-[#4361EE] hover:underline"
            >
              Full Reports
            </button>
          </div>
          {workflowProgressData.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={workflowProgressData} margin={{ top: 8, right: 12, left: -16, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" opacity={0.5} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748B' }} unit="%" />
                  <Tooltip />
                  <Bar dataKey="progress" name="Completion %" fill="#4361EE" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-center text-sm text-[#64748B]">
              <p className="mb-3">No workflows created yet.</p>
              <button
                onClick={() => setActiveSection('create-workflow')}
                className="px-4 py-2 rounded-lg bg-[#4361EE] text-white text-xs font-semibold"
              >
                Create First Workflow
              </button>
            </div>
          )}
        </div>

        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-display text-base font-semibold text-[#10172A] dark:text-white">
                Task Status Distribution
              </h2>
              <p className="text-xs text-[#64748B] dark:text-slate-400">
                Real-time breakdown of {tasks.length} workspace tasks
              </p>
            </div>
          </div>
          {taskDistributionData.length > 0 ? (
            <div className="h-64 w-full flex flex-col sm:flex-row items-center">
              <div className="w-full sm:w-3/5 h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={taskDistributionData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={76}
                      paddingAngle={2}
                    >
                      {taskDistributionData.map((entry) => (
                        <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || '#4361EE'} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full sm:w-2/5 space-y-2 text-xs">
                {taskDistributionData.map((d) => (
                  <div key={d.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-sm shrink-0"
                        style={{ backgroundColor: STATUS_COLORS[d.name] || '#4361EE' }}
                      />
                      <span className="text-[#172033] dark:text-slate-200">{d.name}</span>
                    </div>
                    <span className="font-mono font-semibold text-[#10172A] dark:text-white tabular-nums">
                      {d.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-sm text-[#64748B]">
              No tasks tracked yet.
            </div>
          )}
        </div>
      </div>

      {/* Bottom 3-Column Section: Upcoming Deadlines, Recent Workflows, Activity Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Deadlines */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-base font-semibold text-[#10172A] dark:text-white">
              Upcoming Deadlines
            </h2>
            <button
              onClick={() => setActiveSection('calendar')}
              className="text-xs font-medium text-[#4361EE] hover:underline"
            >
              Calendar
            </button>
          </div>
          {upcomingDeadlines.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {upcomingDeadlines.map((t) => {
                const isOverdue = t.dueDate < todayStr;
                return (
                  <div key={t.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium text-[#10172A] dark:text-white line-clamp-1">
                        {t.title}
                      </span>
                      <span
                        className={`font-mono text-xs shrink-0 tabular-nums ${
                          isOverdue ? 'text-red-600 font-semibold' : 'text-[#64748B] dark:text-slate-400'
                        }`}
                      >
                        {t.dueDate}
                      </span>
                    </div>
                    <div className="text-xs text-[#64748B] dark:text-slate-400 mt-1">
                      {t.workflowTitle} · {t.assignedUser || 'Unassigned'}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-[#64748B] py-6 text-center">No upcoming task deadlines.</p>
          )}
        </div>

        {/* Recently Generated Workflows */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-base font-semibold text-[#10172A] dark:text-white">
              Recent Workflows
            </h2>
            <button
              onClick={() => setActiveSection('my-workflows')}
              className="text-xs font-medium text-[#4361EE] hover:underline"
            >
              View All
            </button>
          </div>
          {workflows.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {workflows.slice(0, 4).map((wf) => (
                <button
                  key={wf.id}
                  onClick={() => {
                    setEditingWorkflowId(wf.id);
                    setActiveSection('create-workflow');
                  }}
                  className="w-full text-left py-3 first:pt-0 last:pb-0 hover:opacity-80 transition-opacity"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-[#10172A] dark:text-white truncate">
                      {wf.title}
                    </span>
                    <span className="font-mono text-xs text-[#4361EE] dark:text-[#22D3EE] tabular-nums shrink-0">
                      {wf.progress}%
                    </span>
                  </div>
                  <div className="text-xs text-[#64748B] dark:text-slate-400 mt-1 capitalize">
                    {wf.status.replace('_', ' ')} · {wf.taskCount} tasks · {wf.priority}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#64748B] py-6 text-center">No workflows generated yet.</p>
          )}
        </div>

        {/* Recent Activity Feed */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-base font-semibold text-[#10172A] dark:text-white">
              Recent Activity
            </h2>
            <Activity className="w-4 h-4 text-[#64748B]" />
          </div>
          {activities.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {activities.slice(0, 5).map((act) => (
                <div key={act.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="text-sm font-medium text-[#10172A] dark:text-white">
                    {act.action}
                  </div>
                  <div className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5 line-clamp-1">
                    {act.details}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#64748B] py-6 text-center">Workspace activity will appear here.</p>
          )}
        </div>
      </div>
    </div>
  );
}
