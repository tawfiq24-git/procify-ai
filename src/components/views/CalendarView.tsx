import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Edit3, Plus, Trash2 } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { downloadCalendarIcs } from '../../lib/exportUtils';
import { CalendarEventRecord, PriorityLevel } from '../../types/procify';

interface UnifiedCalendarItem {
  id: string;
  title: string;
  date: string;
  time: string;
  kind: 'task' | 'deadline' | 'milestone' | 'event' | 'reminder';
  priority: PriorityLevel;
  workflowId: string;
  sourceEvent?: CalendarEventRecord;
}

export function CalendarView() {
  const {
    tasks,
    workflows,
    calendarEvents,
    addCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
    setEditingWorkflowId,
    setActiveSection,
  } = useWorkspace();

  const [viewMode, setViewMode] = useState<'monthly' | 'weekly' | 'daily'>('monthly');
  const [cursorDate, setCursorDate] = useState(() => new Date());

  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvt, setEditingEvt] = useState<CalendarEventRecord | null>(null);
  const [evtTitle, setEvtTitle] = useState('');
  const [evtDesc, setEvtDesc] = useState('');
  const [evtDate, setEvtDate] = useState(new Date().toISOString().split('T')[0]);
  const [evtTime, setEvtTime] = useState('09:00');
  const [evtType, setEvtType] = useState<CalendarEventRecord['eventType']>('event');
  const [evtPriority, setEvtPriority] = useState<PriorityLevel>('medium');
  const [evtWorkflowId, setEvtWorkflowId] = useState('');

  const allItems = useMemo<UnifiedCalendarItem[]>(() => {
    const items: UnifiedCalendarItem[] = [];
    calendarEvents.forEach((e) => {
      items.push({
        id: e.id,
        title: e.title,
        date: e.eventDate,
        time: e.eventTime || '',
        kind: e.eventType,
        priority: e.priority,
        workflowId: e.workflowId,
        sourceEvent: e,
      });
    });
    tasks.forEach((t) => {
      if (t.dueDate) {
        items.push({
          id: `task_${t.id}`,
          title: `Due: ${t.title}`,
          date: t.dueDate,
          time: t.reminderTime || '',
          kind: 'task',
          priority: t.priority,
          workflowId: t.workflowId,
        });
      }
    });
    return items.sort((a, b) => a.date.localeCompare(b.date));
  }, [calendarEvents, tasks]);

  const year = cursorDate.getFullYear();
  const month = cursorDate.getMonth();
  const monthName = cursorDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const cursorIso = cursorDate.toISOString().split('T')[0];

  const monthGridDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Array<{ iso: string; dayNum: number } | null> = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const mm = String(month + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      cells.push({ iso: `${year}-${mm}-${dd}`, dayNum: d });
    }
    return cells;
  }, [year, month]);

  const weekDays = useMemo(() => {
    const start = new Date(cursorDate);
    start.setDate(start.getDate() - start.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return {
        iso: d.toISOString().split('T')[0],
        label: d.toLocaleDateString('default', { weekday: 'short', month: 'short', day: 'numeric' }),
      };
    });
  }, [cursorDate]);

  const shiftPeriod = (dir: -1 | 1) => {
    const next = new Date(cursorDate);
    if (viewMode === 'monthly') next.setMonth(next.getMonth() + dir);
    else if (viewMode === 'weekly') next.setDate(next.getDate() + dir * 7);
    else next.setDate(next.getDate() + dir);
    setCursorDate(next);
  };

  const openNewEvent = (presetDate?: string) => {
    setEditingEvt(null);
    setEvtTitle('');
    setEvtDesc('');
    setEvtDate(presetDate || cursorIso);
    setEvtTime('09:00');
    setEvtType('event');
    setEvtPriority('medium');
    setEvtWorkflowId(workflows[0]?.id || '');
    setModalOpen(true);
  };

  const openEditEvent = (evt: CalendarEventRecord) => {
    setEditingEvt(evt);
    setEvtTitle(evt.title);
    setEvtDesc(evt.description);
    setEvtDate(evt.eventDate);
    setEvtTime(evt.eventTime || '09:00');
    setEvtType(evt.eventType);
    setEvtPriority(evt.priority);
    setEvtWorkflowId(evt.workflowId || '');
    setModalOpen(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evtTitle.trim() || !evtDate) return;
    if (editingEvt) {
      await updateCalendarEvent(editingEvt.id, {
        title: evtTitle.trim(),
        description: evtDesc.trim(),
        eventDate: evtDate,
        eventTime: evtTime,
        eventType: evtType,
        priority: evtPriority,
        workflowId: evtWorkflowId,
      });
    } else {
      await addCalendarEvent({
        title: evtTitle.trim(),
        description: evtDesc.trim(),
        eventDate: evtDate,
        eventTime: evtTime,
        eventType: evtType,
        priority: evtPriority,
        workflowId: evtWorkflowId,
      });
    }
    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-[#10172A] dark:text-white">
            Calendar & Milestones
          </h1>
          <p className="text-sm text-[#64748B] dark:text-slate-400 mt-1">
            Real stored task deadlines, workflow milestones, and custom events with .ics calendar export.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => downloadCalendarIcs(calendarEvents, tasks)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold hover:border-[#4361EE] whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            Export .ics
          </button>
          <button
            onClick={() => openNewEvent()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4361EE] hover:bg-[#3651D4] text-white text-xs font-semibold whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add Event
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => shiftPeriod(-1)}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-[#F7F9FC] dark:hover:bg-slate-800"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-display text-base font-semibold min-w-[160px] text-center">
            {viewMode === 'daily' ? cursorIso : monthName}
          </span>
          <button
            onClick={() => shiftPeriod(1)}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-[#F7F9FC] dark:hover:bg-slate-800"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCursorDate(new Date())}
            className="ml-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium"
          >
            Today
          </button>
        </div>

        <div className="flex items-center gap-1 p-1 bg-[#F7F9FC] dark:bg-slate-800 rounded-lg">
          {(['monthly', 'weekly', 'daily'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize ${
                viewMode === m ? 'bg-white dark:bg-slate-900 text-[#10172A] dark:text-white shadow-sm' : 'text-[#64748B]'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Monthly Grid */}
      {viewMode === 'monthly' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-[#64748B] bg-[#F7F9FC] dark:bg-slate-950/60">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="py-2.5 px-3 text-center">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {monthGridDays.map((cell, idx) => {
              if (!cell) {
                return (
                  <div
                    key={`empty-${idx}`}
                    className="min-h-[104px] border-b border-r border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/20"
                  />
                );
              }
              const dayItems = allItems.filter((i) => i.date === cell.iso);
              const isToday = cell.iso === new Date().toISOString().split('T')[0];
              return (
                <div
                  key={cell.iso}
                  onClick={() => openNewEvent(cell.iso)}
                  className="min-h-[104px] p-2 border-b border-r border-slate-100 dark:border-slate-800 hover:bg-[#F7F9FC]/80 dark:hover:bg-slate-800/30 cursor-pointer flex flex-col gap-1"
                >
                  <div className="flex justify-between items-center">
                    <span
                      className={`font-mono text-xs tabular-nums ${
                        isToday
                          ? 'px-1.5 py-0.5 rounded bg-[#4361EE] text-white font-semibold'
                          : 'text-[#64748B]'
                      }`}
                    >
                      {cell.dayNum}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {dayItems.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (item.sourceEvent) openEditEvent(item.sourceEvent);
                          else if (item.workflowId) {
                            setEditingWorkflowId(item.workflowId);
                            setActiveSection('create-workflow');
                          }
                        }}
                        className={`text-[11px] px-1.5 py-0.5 rounded truncate ${
                          item.kind === 'task'
                            ? 'bg-blue-50 dark:bg-blue-950/50 text-[#4361EE] dark:text-[#22D3EE]'
                            : item.priority === 'critical'
                            ? 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-[#172033] dark:text-slate-200'
                        }`}
                      >
                        {item.title}
                      </div>
                    ))}
                    {dayItems.length > 3 && (
                      <div className="text-[10px] text-[#64748B]">+{dayItems.length - 3} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Weekly View */}
      {viewMode === 'weekly' && (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {weekDays.map((day) => {
            const items = allItems.filter((i) => i.date === day.iso);
            return (
              <div
                key={day.iso}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 min-h-[260px]"
              >
                <div className="text-xs font-semibold text-[#10172A] dark:text-white pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                  {day.label}
                </div>
                <div className="space-y-2">
                  {items.map((it) => (
                    <div
                      key={it.id}
                      className="p-2 rounded-lg bg-[#F7F9FC] dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs"
                    >
                      <div className="font-medium text-[#10172A] dark:text-white">{it.title}</div>
                      <div className="text-[11px] text-[#64748B] mt-0.5 capitalize">
                        {it.kind} · {it.time || 'All day'}
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && <div className="text-xs text-[#64748B]">No items</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Daily View */}
      {viewMode === 'daily' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
          <h2 className="font-display text-base font-semibold">Schedule for {cursorIso}</h2>
          {allItems.filter((i) => i.date === cursorIso).length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {allItems
                .filter((i) => i.date === cursorIso)
                .map((it) => (
                  <div key={it.id} className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold">{it.title}</div>
                      <div className="text-xs text-[#64748B] capitalize">
                        {it.kind} · {it.priority} priority · {it.time || 'All day'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {it.sourceEvent && (
                        <>
                          <button onClick={() => openEditEvent(it.sourceEvent!)} className="p-1.5 text-[#64748B]">
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button onClick={() => deleteCalendarEvent(it.sourceEvent!.id)} className="p-1.5 text-red-500">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-sm text-[#64748B]">No events or deadlines scheduled on this date.</p>
          )}
        </div>
      )}

      {/* Event Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveEvent}
            className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold">{editingEvt ? 'Edit Event' : 'Add Calendar Event'}</h3>
              {editingEvt && (
                <button
                  type="button"
                  onClick={async () => {
                    await deleteCalendarEvent(editingEvt.id);
                    setModalOpen(false);
                  }}
                  className="text-xs text-red-600 font-semibold"
                >
                  Delete
                </button>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-[#64748B] mb-1">Title</label>
              <input
                type="text"
                required
                value={evtTitle}
                onChange={(e) => setEvtTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#64748B] mb-1">Description</label>
              <textarea
                rows={2}
                value={evtDesc}
                onChange={(e) => setEvtDesc(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={evtDate}
                  onChange={(e) => setEvtDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">Time</label>
                <input
                  type="time"
                  value={evtTime}
                  onChange={(e) => setEvtTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">Type</label>
                <select
                  value={evtType}
                  onChange={(e) => setEvtType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                >
                  <option value="event">Event</option>
                  <option value="milestone">Milestone</option>
                  <option value="deadline">Deadline</option>
                  <option value="reminder">Reminder</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">Priority</label>
                <select
                  value={evtPriority}
                  onChange={(e) => setEvtPriority(e.target.value as PriorityLevel)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#64748B] mb-1">Associated Workflow (optional)</label>
              <select
                value={evtWorkflowId}
                onChange={(e) => setEvtWorkflowId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
              >
                <option value="">None</option>
                {workflows.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.title}
                  </option>
                ))}
              </select>
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
                className="px-4 py-2 rounded-lg bg-[#4361EE] text-white text-xs font-semibold"
              >
                {editingEvt ? 'Update Event' : 'Save Event'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
