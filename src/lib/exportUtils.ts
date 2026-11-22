import { CalendarEventRecord, TaskRecord } from '../types/procify';

function escapeIcsText(val: string): string {
  return val.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function formatIcsDate(dateStr: string, timeStr?: string): string {
  const cleanDate = dateStr.replace(/[^0-9]/g, '').slice(0, 8);
  if (cleanDate.length !== 8) {
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    return `${today}T090000`;
  }
  const cleanTime = (timeStr || '09:00').replace(/[^0-9]/g, '').padEnd(4, '0').slice(0, 4);
  return `${cleanDate}T${cleanTime}00`;
}

export function downloadCalendarIcs(events: CalendarEventRecord[], tasks: TaskRecord[]) {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Procify AI//Workflow Automation Calendar//EN',
    'CALSCALE:GREGORIAN',
  ];

  const stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  for (const evt of events) {
    if (!evt.eventDate) continue;
    const dtStart = formatIcsDate(evt.eventDate, evt.eventTime);
    lines.push(
      'BEGIN:VEVENT',
      `UID:procify-evt-${evt.id}@procify.ai`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${dtStart}`,
      `SUMMARY:${escapeIcsText(evt.title)}`,
      `DESCRIPTION:${escapeIcsText(evt.description || `${evt.eventType} (${evt.priority})`)}`,
      'END:VEVENT'
    );
  }

  for (const task of tasks) {
    if (!task.dueDate) continue;
    const dtStart = formatIcsDate(task.dueDate, task.reminderTime || '09:00');
    lines.push(
      'BEGIN:VEVENT',
      `UID:procify-task-${task.id}@procify.ai`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${dtStart}`,
      `SUMMARY:${escapeIcsText(`[Task Due] ${task.title}`)}`,
      `DESCRIPTION:${escapeIcsText(`Workflow: ${task.workflowTitle}\nAssignee: ${task.assignedUser}\nStatus: ${task.status}`)}`,
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');

  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `procify-schedule-${new Date().toISOString().split('T')[0]}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadCsvReport(rows: Array<Record<string, string | number>>, filename: string) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csvLines = [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = String(row[h] ?? '');
          return `"${val.replace(/"/g, '""')}"`;
        })
        .join(',')
    ),
  ];
  const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
