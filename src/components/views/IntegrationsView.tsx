import React, { useState } from 'react';
import { Calendar, CheckCircle2, Link2, Loader2, Mail, MessageSquare, Settings2, Webhook, Workflow } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { IntegrationProvider } from '../../types/procify';

interface IntegrationMeta {
  provider: IntegrationProvider;
  name: string;
  description: string;
  type: 'oauth' | 'webhook';
  setupGuide: string;
  icon: React.ComponentType<{ className?: string }>;
}

const INTEGRATIONS_CATALOG: IntegrationMeta[] = [
  {
    provider: 'google_calendar',
    name: 'Google Calendar',
    description: 'Sync approved workflow milestones and task deadlines to Google Calendar.',
    type: 'oauth',
    setupGuide: 'Requires Google Workspace OAuth Client configuration with calendar.events scope. In the meantime, export .ics files from the Calendar module.',
    icon: Calendar,
  },
  {
    provider: 'gmail',
    name: 'Gmail',
    description: 'Ingest incoming announcement emails and send verified task reminder digests.',
    type: 'oauth',
    setupGuide: 'Requires Google Workspace OAuth Client configuration with gmail.readonly / gmail.send scopes.',
    icon: Mail,
  },
  {
    provider: 'slack',
    name: 'Slack',
    description: 'Post workflow approvals and overdue task alerts to a team Slack channel via Incoming Webhooks.',
    type: 'webhook',
    setupGuide: 'Create a Slack Incoming Webhook URL in your Slack App settings and paste it below to verify live delivery.',
    icon: MessageSquare,
  },
  {
    provider: 'microsoft_teams',
    name: 'Microsoft Teams',
    description: 'Deliver workflow status notifications into Microsoft Teams channels.',
    type: 'webhook',
    setupGuide: 'Configure a Teams Incoming Webhook / Workflows URL in your channel connectors and paste it below.',
    icon: MessageSquare,
  },
  {
    provider: 'webhooks',
    name: 'Custom Webhooks',
    description: 'Send signed JSON payloads when workflows are approved or tasks change status.',
    type: 'webhook',
    setupGuide: 'Provide any public HTTPS endpoint to receive POST event payloads.',
    icon: Webhook,
  },
  {
    provider: 'n8n',
    name: 'n8n Automation',
    description: 'Trigger downstream n8n automation scenarios via webhook nodes.',
    type: 'webhook',
    setupGuide: 'Create an n8n Webhook Trigger node and paste its production webhook URL below.',
    icon: Workflow,
  },
];

export function IntegrationsView() {
  const { integrations, saveIntegrationConfig } = useWorkspace();

  const [activeMeta, setActiveMeta] = useState<IntegrationMeta | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [configNotes, setConfigNotes] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const openConfig = (meta: IntegrationMeta) => {
    const existing = integrations.find((i) => i.provider === meta.provider);
    setActiveMeta(meta);
    setWebhookUrl(existing?.webhookUrl || '');
    setConfigNotes(existing?.configNotes || '');
    setTestResult(null);
  };

  const handleSaveAndTestWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMeta) return;
    setTestResult(null);

    if (activeMeta.type === 'oauth') {
      await saveIntegrationConfig(activeMeta.provider, 'not_connected', '', configNotes);
      setTestResult({
        ok: false,
        msg: 'OAuth credentials are not authorized yet. Status remains Not Connected until OAuth verification succeeds.',
      });
      return;
    }

    if (!webhookUrl.trim()) {
      await saveIntegrationConfig(activeMeta.provider, 'not_connected', '', configNotes);
      setActiveMeta(null);
      return;
    }

    setTesting(true);
    try {
      const res = await fetch('/api/webhooks/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl: webhookUrl.trim(), provider: activeMeta.provider }),
      });
      const data = await res.json();
      if (res.ok && data.delivered) {
        await saveIntegrationConfig(activeMeta.provider, 'connected', webhookUrl.trim(), configNotes);
        setTestResult({ ok: true, msg: `Verified live HTTP ${data.statusCode} delivery. Integration marked Connected.` });
      } else {
        await saveIntegrationConfig(activeMeta.provider, 'configured', webhookUrl.trim(), configNotes);
        setTestResult({
          ok: false,
          msg: data?.error || `Endpoint responded with HTTP ${data?.statusCode || 'error'}. Saved as Configured (not verified).`,
        });
      }
    } catch (err: any) {
      setTestResult({ ok: false, msg: err?.message || 'Could not reach webhook endpoint.' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-[#10172A] dark:text-white">
          Integrations & Webhooks
        </h1>
        <p className="text-sm text-[#64748B] dark:text-slate-400 mt-1">
          Connect external messaging and automation endpoints. Connected status is shown only after real endpoint verification.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {INTEGRATIONS_CATALOG.map((meta) => {
          const Icon = meta.icon;
          const record = integrations.find((i) => i.provider === meta.provider);
          const status = record?.status || 'not_connected';

          return (
            <div
              key={meta.provider}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col justify-between gap-5"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-[#F7F9FC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[#4361EE]">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span
                    className={`text-xs font-semibold ${
                      status === 'connected'
                        ? 'text-emerald-600'
                        : status === 'configured'
                        ? 'text-amber-600'
                        : 'text-[#64748B]'
                    }`}
                  >
                    {status === 'connected'
                      ? 'Connected'
                      : status === 'configured'
                      ? 'Configured (Unverified)'
                      : 'Not Connected'}
                  </span>
                </div>
                <h2 className="font-display text-base font-semibold text-[#10172A] dark:text-white mb-1.5">
                  {meta.name}
                </h2>
                <p className="text-xs text-[#64748B] dark:text-slate-400 leading-relaxed">
                  {meta.description}
                </p>
              </div>

              <button
                onClick={() => openConfig(meta)}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:border-[#4361EE] transition-colors"
              >
                <Settings2 className="w-3.5 h-3.5" />
                Configure
              </button>
            </div>
          );
        })}
      </div>

      {/* Config Modal */}
      {activeMeta && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveAndTestWebhook}
            className="max-w-lg w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-[#4361EE]" />
                <h3 className="font-display text-lg font-bold">Configure {activeMeta.name}</h3>
              </div>
              <button type="button" onClick={() => setActiveMeta(null)} className="text-xs text-[#64748B]">
                Close
              </button>
            </div>

            <p className="text-xs text-[#64748B] dark:text-slate-400 leading-relaxed bg-[#F7F9FC] dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
              {activeMeta.setupGuide}
            </p>

            {activeMeta.type === 'webhook' && (
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">
                  Webhook Endpoint URL (HTTPS)
                </label>
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://hooks.example.com/services/..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[#64748B] mb-1">Configuration Notes</label>
              <textarea
                rows={2}
                value={configNotes}
                onChange={(e) => setConfigNotes(e.target.value)}
                placeholder="Channel name, routing rules, or setup notes..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
              />
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-lg text-xs border flex items-start gap-2 ${
                  testResult.ok
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 text-emerald-700 dark:text-emerald-300'
                    : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 text-amber-800 dark:text-amber-200'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{testResult.msg}</span>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActiveMeta(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={testing}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4361EE] text-white text-xs font-semibold disabled:opacity-60"
              >
                {testing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {activeMeta.type === 'webhook' ? 'Save & Verify Endpoint' : 'Save Setup Notes'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
