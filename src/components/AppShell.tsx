import React, { useState } from 'react';
import {
  BarChart3,
  Bell,
  Bot,
  Calendar,
  CheckSquare,
  FileSearch,
  GitBranch,
  Layers,
  LayoutDashboard,
  Link2,
  LogOut,
  Menu,
  Moon,
  PlusCircle,
  Settings,
  Sun,
  X,
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { NavSection } from '../types/procify';
import { AiAssistantPanel } from './AiAssistantPanel';
import { ProcifyLogo } from './ProcifyLogo';
import { AnalyticsView } from './views/AnalyticsView';
import { CalendarView } from './views/CalendarView';
import { DashboardView } from './views/DashboardView';
import { DocumentAnalyzerView } from './views/DocumentAnalyzerView';
import { IntegrationsView } from './views/IntegrationsView';
import { NotificationsView } from './views/NotificationsView';
import { SettingsView } from './views/SettingsView';
import { TaskManagerView } from './views/TaskManagerView';
import { WorkflowBuilderView } from './views/WorkflowBuilderView';
import { WorkflowHistoryView } from './views/WorkflowHistoryView';

const NAV_ITEMS: Array<{ id: NavSection; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'create-workflow', label: 'Create Workflow', icon: PlusCircle },
  { id: 'document-analyzer', label: 'AI Document Analyzer', icon: FileSearch },
  { id: 'my-workflows', label: 'My Workflows', icon: GitBranch },
  { id: 'task-manager', label: 'Task Manager', icon: CheckSquare },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'analytics', label: 'Reports & Analytics', icon: BarChart3 },
  { id: 'integrations', label: 'Integrations', icon: Link2 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function AppShell({ onNavigateLanding }: { onNavigateLanding: () => void }) {
  const {
    profile,
    isDemoMode,
    activeSection,
    setActiveSection,
    notifications,
    theme,
    toggleTheme,
    logout,
    setEditingWorkflowId,
  } = useWorkspace();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const activeNav = NAV_ITEMS.find((i) => i.id === activeSection);

  const handleNavClick = (id: NavSection) => {
    if (id === 'create-workflow') {
      // keep existing editingWorkflowId if coming from edit; otherwise clicking sidebar stays clean
    }
    setActiveSection(id);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#F7F9FC] dark:bg-[#0B1120] text-[#172033] dark:text-slate-100 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-[260px] shrink-0 flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 sticky top-0 h-screen">
        <div className="h-16 px-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            onClick={onNavigateLanding}
            className="flex items-center gap-2.5 text-left"
          >
            <ProcifyLogo size={30} />
            <span className="font-display text-base font-bold tracking-tight text-[#10172A] dark:text-white">
              Procify AI
            </span>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'create-workflow') setEditingWorkflowId(null);
                  handleNavClick(item.id);
                }}
                className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-[#10172A] dark:bg-[#4361EE] text-white'
                    : 'text-[#64748B] dark:text-slate-400 hover:bg-[#F7F9FC] dark:hover:bg-slate-800 hover:text-[#10172A] dark:hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0 truncate">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </span>
                {item.id === 'notifications' && unreadCount > 0 && (
                  <span
                    className={`font-mono text-[11px] px-1.5 py-0.5 rounded tabular-nums ${
                      active ? 'bg-white/20 text-white' : 'bg-[#4361EE] text-white'
                    }`}
                  >
                    {unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
          {isDemoMode && (
            <div className="px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-[11px] font-medium text-[#4361EE] dark:text-[#22D3EE]">
              Demo Mode · Sample Workspace
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-xs font-semibold text-[#10172A] dark:text-white truncate">
                {profile?.fullName || 'Workspace User'}
              </div>
              <div className="text-[11px] text-[#64748B] truncate">
                {profile?.email || ''}
              </div>
            </div>
            <button
              onClick={logout}
              title={isDemoMode ? 'Exit Demo' : 'Sign Out'}
              className="p-2 rounded-lg text-[#64748B] hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-black/40" onClick={() => setMobileMenuOpen(false)} />
          <aside className="relative w-72 max-w-[85vw] bg-white dark:bg-slate-900 h-full flex flex-col z-10 border-r border-slate-200 dark:border-slate-800">
            <div className="h-16 px-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ProcifyLogo size={28} />
                <span className="font-display text-base font-bold">Procify AI</span>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-1.5 text-[#64748B]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium ${
                      active
                        ? 'bg-[#10172A] dark:bg-[#4361EE] text-white'
                        : 'text-[#64748B] dark:text-slate-400'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </span>
                    {item.id === 'notifications' && unreadCount > 0 && (
                      <span className="font-mono text-xs">{unreadCount}</span>
                    )}
                  </button>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Header */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 rounded-lg text-[#64748B] hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-xs text-[#64748B] dark:text-slate-400 truncate">
              <Layers className="w-3.5 h-3.5 text-[#4361EE] shrink-0" />
              <span>Workspace</span>
              <span>/</span>
              <span className="font-semibold text-[#10172A] dark:text-white truncate">
                {activeNav?.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-[#64748B] hover:text-[#10172A] dark:hover:text-white"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setAssistantOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#10172A] dark:bg-[#4361EE] text-white text-xs font-semibold hover:bg-[#1E293B] dark:hover:bg-[#3651D4] transition-colors whitespace-nowrap shrink-0"
            >
              <Bot className="w-4 h-4" />
              AI Assistant
            </button>
          </div>
        </header>

        {/* Active Module Viewport */}
        <main className="flex-1 p-4 sm:p-8 max-w-[1440px] w-full mx-auto">
          {activeSection === 'dashboard' && <DashboardView />}
          {activeSection === 'create-workflow' && <WorkflowBuilderView />}
          {activeSection === 'document-analyzer' && <DocumentAnalyzerView />}
          {activeSection === 'my-workflows' && <WorkflowHistoryView />}
          {activeSection === 'task-manager' && <TaskManagerView />}
          {activeSection === 'calendar' && <CalendarView />}
          {activeSection === 'notifications' && <NotificationsView />}
          {activeSection === 'analytics' && <AnalyticsView />}
          {activeSection === 'integrations' && <IntegrationsView />}
          {activeSection === 'settings' && <SettingsView />}
        </main>
      </div>

      <AiAssistantPanel open={assistantOpen} onClose={() => setAssistantOpen(false)} />
    </div>
  );
}
