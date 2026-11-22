import React, { useState } from 'react';
import { Bell, CheckCheck, Info } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';

export function NotificationsView() {
  const {
    profile,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    updateUserProfile,
    createInAppNotification,
    tasks,
  } = useWorkspace();

  const [leadDays, setLeadDays] = useState(profile?.reminderPreferences?.leadDays ?? 3);
  const [digestTime, setDigestTime] = useState(profile?.reminderPreferences?.dailyDigestTime ?? '09:00');
  const [inAppEnabled, setInAppEnabled] = useState(profile?.reminderPreferences?.inAppEnabled ?? true);
  const [savedMsg, setSavedMsg] = useState('');

  const handleSavePrefs = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateUserProfile({
      reminderPreferences: {
        inAppEnabled,
        emailEnabled: false,
        dailyDigestTime: digestTime,
        leadDays: Number(leadDays),
      },
    });
    setSavedMsg('Reminder schedule updated.');
    setTimeout(() => setSavedMsg(''), 2500);
  };

  const generateDailySummary = async () => {
    const pending = tasks.filter((t) => t.status !== 'completed').length;
    const overdue = tasks.filter(
      (t) => t.status === 'overdue' || (t.status !== 'completed' && t.dueDate && t.dueDate < new Date().toISOString().split('T')[0])
    ).length;
    await createInAppNotification(
      'Daily Task Summary',
      `You currently have ${pending} pending task(s) and ${overdue} overdue task(s) requiring attention.`,
      'summary'
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-[#10172A] dark:text-white">
            Smart Reminders & Notifications
          </h1>
          <p className="text-sm text-[#64748B] dark:text-slate-400 mt-1">
            Automated in-app deadline reminders, overdue alerts, and workflow approval notifications.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={generateDailySummary}
            className="px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:border-[#4361EE]"
          >
            Generate Daily Summary
          </button>
          <button
            onClick={markAllNotificationsRead}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#4361EE] text-white text-xs font-semibold hover:bg-[#3651D4]"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark All Read
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* In-App Notification Feed */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
          <h2 className="font-display text-base font-semibold text-[#10172A] dark:text-white mb-4">
            Notification Center ({notifications.filter((n) => !n.read).length} unread)
          </h2>

          {notifications.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`py-3.5 flex items-start justify-between gap-4 ${
                    !n.read ? 'bg-blue-50/30 dark:bg-blue-950/10 -mx-3 px-3 rounded-lg' : ''
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-semibold text-[#10172A] dark:text-white">
                      <span>{n.title}</span>
                      {!n.read && <span className="text-[11px] font-mono text-[#4361EE]">Unread</span>}
                    </div>
                    <p className="text-xs text-[#64748B] dark:text-slate-400">{n.message}</p>
                    <div className="text-[11px] font-mono text-[#64748B]">
                      {n.type} · {new Date(n.createdAt).toLocaleString()}
                    </div>
                  </div>
                  {!n.read && (
                    <button
                      onClick={() => markNotificationRead(n.id)}
                      className="text-xs font-semibold text-[#4361EE] hover:underline shrink-0"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-sm text-[#64748B]">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
              You are all caught up.
            </div>
          )}
        </div>

        {/* Reminder Schedule Configuration */}
        <div className="lg:col-span-4 space-y-4">
          <form
            onSubmit={handleSavePrefs}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4"
          >
            <h2 className="font-display text-base font-semibold text-[#10172A] dark:text-white">
              Reminder Preferences
            </h2>
            <label className="flex items-center gap-2.5 text-xs font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={inAppEnabled}
                onChange={(e) => setInAppEnabled(e.target.checked)}
                className="rounded border-slate-300 text-[#4361EE]"
              />
              Enable in-app deadline & overdue alerts
            </label>
            <div>
              <label className="block text-xs font-medium text-[#64748B] mb-1">
                Advance Warning Window (days before due date)
              </label>
              <input
                type="number"
                min={1}
                max={30}
                value={leadDays}
                onChange={(e) => setLeadDays(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#64748B] mb-1">
                Daily Summary Schedule Time
              </label>
              <input
                type="time"
                value={digestTime}
                onChange={(e) => setDigestTime(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-[#4361EE] hover:bg-[#3651D4] text-white text-xs font-semibold"
            >
              Save Schedule
            </button>
            {savedMsg && <div className="text-xs text-emerald-600 font-medium">{savedMsg}</div>}
          </form>

          <div className="bg-[#F7F9FC] dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-xs text-[#64748B] flex items-start gap-2.5">
            <Info className="w-4 h-4 text-[#4361EE] shrink-0 mt-0.5" />
            <div>
              <strong>External Delivery Notice:</strong> In-app reminders run automatically in your workspace. External Email, SMS, or Slack delivery requires configuring an integration or webhook under the <strong>Integrations</strong> tab.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
