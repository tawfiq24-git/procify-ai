import React, { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useWorkspace } from '../../context/WorkspaceContext';
import { downloadCsvReport } from '../../lib/exportUtils';

const PIE_COLORS: Record<string, string> = {
  Completed: '#16A34A',
  'In Progress': '#4361EE',
  'Under Review': '#22D3EE',
  'To Do': '#94A3B8',
  Overdue: '#DC2626',
};

export function AnalyticsView() {
  const { documents, workflows, tasks } = useWorkspace();
  const [range, setRange] = useState<'7d' | '30d' | '90d' | 'all'>('all');

  const todayStr = new Date().toISOString().split('T')[0];

  const filteredData = useMemo(() => {
    if (range === 'all') {
      return { documents, workflows, tasks };
    }
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffIso = cutoff.toISOString();

    return {
      documents: documents.filter((d) => d.createdAt >= cutoffIso),
      workflows: workflows.filter((w) => w.createdAt >= cutoffIso),
      tasks: tasks.filter((t) => t.createdAt >= cutoffIso),
    };
  }, [documents, workflows, tasks, range]);

  const metrics = useMemo(() => {
    const docsCount = filteredData.documents.length;
    const wfCreated = filteredData.workflows.length;
    const wfCompleted = filteredData.workflows.filter((w) => w.status === 'completed').length;
    const tasksGen = filteredData.tasks.length;
    const tasksDone = filteredData.tasks.filter((t) => t.status === 'completed').length;
    const tasksOverdue = filteredData.tasks.filter(
      (t) => t.status === 'overdue' || (t.status !== 'completed' && Boolean(t.dueDate) && t.dueDate < todayStr)
    ).length;

    const wfCompletionRate = wfCreated > 0 ? Math.round((wfCompleted / wfCreated) * 100) : 0;

    // Average completion duration across completed tasks with startDate & updatedAt
    const completedWithDates = filteredData.tasks.filter((t) => t.status === 'completed' && t.startDate);
    let avgDays = 0;
    if (completedWithDates.length > 0) {
      const totalDays = completedWithDates.reduce((acc, t) => {
        const s = new Date(t.startDate).getTime();
        const e = new Date(t.updatedAt).getTime();
        const diff = Math.max(1, Math.round(Math.abs(e - s) / (1000 * 60 * 60 * 24)));
        return acc + diff;
      }, 0);
      avgDays = Math.round((totalDays / completedWithDates.length) * 10) / 10;
    }

    return {
      docsCount,
      wfCreated,
      wfCompleted,
      tasksGen,
      tasksDone,
      tasksOverdue,
      wfCompletionRate,
      avgDays,
    };
  }, [filteredData, todayStr]);

  const productivityTrendData = useMemo(() => {
    const byDate = new Map<string, { date: string; generated: number; completed: number }>();
    filteredData.tasks.forEach((t) => {
      const key = (t.dueDate || t.createdAt.split('T')[0]).slice(0, 10);
      const curr = byDate.get(key) || { date: key, generated: 0, completed: 0 };
      curr.generated += 1;
      if (t.status === 'completed') curr.completed += 1;
      byDate.set(key, curr);
    });
    return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredData.tasks]);

  const workflowActivityBar = useMemo(() => {
    return filteredData.workflows.map((w) => ({
      name: w.title.length > 16 ? `${w.title.slice(0, 16)}…` : w.title,
      total: w.taskCount,
      completed: w.completedTaskCount,
    }));
  }, [filteredData.workflows]);

  const taskDistPie = useMemo(() => {
    const counts = {
      Completed: 0,
      'In Progress': 0,
      'Under Review': 0,
      'To Do': 0,
      Overdue: 0,
    };
    filteredData.tasks.forEach((t) => {
      if (t.status === 'completed') counts.Completed++;
      else if (t.status === 'overdue' || (t.dueDate && t.dueDate < todayStr)) counts.Overdue++;
      else if (t.status === 'in_progress') counts['In Progress']++;
      else if (t.status === 'under_review') counts['Under Review']++;
      else counts['To Do']++;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .filter((x) => x.value > 0);
  }, [filteredData.tasks, todayStr]);

  const handleExportCsv = () => {
    const rows = filteredData.workflows.map((w) => ({
      WorkflowID: w.id,
      Title: w.title,
      Category: w.category,
      Status: w.status,
      Priority: w.priority,
      TotalTasks: w.taskCount,
      CompletedTasks: w.completedTaskCount,
      ProgressPercent: w.progress,
      SourceDocument: w.documentTitle || w.sourceMethod,
      UpdatedAt: w.updatedAt,
    }));
    downloadCsvReport(rows, `procify-analytics-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const metricCards = [
    { label: 'Documents Processed', value: metrics.docsCount },
    { label: 'Workflows Created', value: metrics.wfCreated },
    { label: 'Workflows Completed', value: metrics.wfCompleted },
    { label: 'Tasks Generated', value: metrics.tasksGen },
    { label: 'Tasks Completed', value: metrics.tasksDone },
    { label: 'Tasks Overdue', value: metrics.tasksOverdue },
    { label: 'Completion Rate', value: `${metrics.wfCompletionRate}%` },
    { label: 'Avg Task Cycle', value: metrics.avgDays > 0 ? `${metrics.avgDays}d` : '—' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-[#10172A] dark:text-white">
            Reports & Analytics
          </h1>
          <p className="text-sm text-[#64748B] dark:text-slate-400 mt-1">
            All metrics and charts are calculated live from actual workspace database records.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
            {(['7d', '30d', '90d', 'all'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1 rounded text-xs font-medium uppercase ${
                  range === r ? 'bg-[#4361EE] text-white' : 'text-[#64748B]'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <button
            onClick={handleExportCsv}
            disabled={filteredData.workflows.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#10172A] dark:bg-[#4361EE] text-white text-xs font-semibold disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {metricCards.map((m) => (
          <div
            key={m.label}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4"
          >
            <div className="text-xs text-[#64748B] dark:text-slate-400">{m.label}</div>
            <div className="font-mono text-2xl font-bold text-[#10172A] dark:text-white mt-2 tabular-nums">
              {m.value}
            </div>
          </div>
        ))}
      </div>

      {/* Line Chart + Doughnut Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
          <h2 className="font-display text-base font-semibold text-[#10172A] dark:text-white mb-4">
            Task Productivity Trend by Date
          </h2>
          {productivityTrendData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={productivityTrendData} margin={{ top: 8, right: 16, left: -16, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" opacity={0.5} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="generated" name="Scheduled Tasks" stroke="#4361EE" strokeWidth={2} />
                  <Line type="monotone" dataKey="completed" name="Completed Tasks" stroke="#16A34A" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-sm text-[#64748B]">No task timeline data in range.</div>
          )}
        </div>

        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
          <h2 className="font-display text-base font-semibold text-[#10172A] dark:text-white mb-4">
            Task Status Breakdown
          </h2>
          {taskDistPie.length > 0 ? (
            <div className="h-64 flex items-center">
              <div className="w-3/5 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={taskDistPie} dataKey="value" nameKey="name" innerRadius={48} outerRadius={76}>
                      {taskDistPie.map((entry) => (
                        <Cell key={entry.name} fill={PIE_COLORS[entry.name] || '#4361EE'} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-2/5 space-y-2 text-xs">
                {taskDistPie.map((d) => (
                  <div key={d.name} className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: PIE_COLORS[d.name] }} />
                      {d.name}
                    </span>
                    <span className="font-mono font-semibold tabular-nums">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-sm text-[#64748B]">No tasks in range.</div>
          )}
        </div>
      </div>

      {/* Bar Chart + Progress Indicators */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
          <h2 className="font-display text-base font-semibold text-[#10172A] dark:text-white mb-4">
            Workflow Task Volume vs Completion
          </h2>
          {workflowActivityBar.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={workflowActivityBar} margin={{ top: 8, right: 16, left: -16, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" opacity={0.5} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                  <Tooltip />
                  <Bar dataKey="total" name="Total Tasks" fill="#94A3B8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="completed" name="Completed Tasks" fill="#4361EE" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-sm text-[#64748B]">No workflows in range.</div>
          )}
        </div>

        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
          <h2 className="font-display text-base font-semibold text-[#10172A] dark:text-white">
            Workflow Completion Progress
          </h2>
          {filteredData.workflows.length > 0 ? (
            <div className="space-y-4 max-h-60 overflow-y-auto pr-1">
              {filteredData.workflows.map((w) => (
                <div key={w.id} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium truncate pr-2">{w.title}</span>
                    <span className="font-mono font-semibold tabular-nums">{w.progress}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-[#4361EE] transition-all"
                      style={{ width: `${w.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-sm text-[#64748B]">No workflows available.</div>
          )}
        </div>
      </div>
    </div>
  );
}
