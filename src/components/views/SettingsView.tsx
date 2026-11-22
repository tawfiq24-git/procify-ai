import React, { useState } from 'react';
import { CheckCircle2, LogOut, Moon, RotateCcw, Sun } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { UserProfile } from '../../types/procify';

export function SettingsView() {
  const {
    profile,
    isDemoMode,
    theme,
    toggleTheme,
    updateUserProfile,
    resetDemoWorkspace,
    logout,
  } = useWorkspace();

  const [fullName, setFullName] = useState(profile?.fullName || '');
  const [role, setRole] = useState<UserProfile['role']>(profile?.role || 'operations');
  const [organization, setOrganization] = useState(profile?.organization || '');
  const [savedMsg, setSavedMsg] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateUserProfile({ fullName, role, organization });
    setSavedMsg('Profile settings saved.');
    setTimeout(() => setSavedMsg(''), 2500);
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-[#10172A] dark:text-white">
          Profile & Workspace Settings
        </h1>
        <p className="text-sm text-[#64748B] dark:text-slate-400 mt-1">
          Manage your profile details, appearance theme, and workspace session.
        </p>
      </div>

      <form
        onSubmit={handleSave}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4"
      >
        <h2 className="font-display text-base font-semibold text-[#10172A] dark:text-white">
          Account Information
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#64748B] mb-1">Full Name</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#64748B] mb-1">Email Address</label>
            <input
              type="email"
              disabled
              value={profile?.email || ''}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F7F9FC] dark:bg-slate-950/60 text-sm text-[#64748B]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#64748B] mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserProfile['role'])}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            >
              <option value="student">Student</option>
              <option value="educator">Teacher / Administrator</option>
              <option value="manager">Project Manager</option>
              <option value="operations">Operations / Team Lead</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#64748B] mb-1">Organization / Institution</label>
            <input
              type="text"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              placeholder="e.g., Northbridge Institute"
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-[#4361EE] hover:bg-[#3651D4] text-white text-xs font-semibold"
          >
            Save Profile
          </button>
          {savedMsg && (
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
              <CheckCircle2 className="w-4 h-4" />
              {savedMsg}
            </span>
          )}
        </div>
      </form>

      {/* Appearance & Session */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-[#10172A] dark:text-white">Color Theme</div>
            <div className="text-xs text-[#64748B]">Switch between Light (default) and Dark mode.</div>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
          </button>
        </div>

        {isDemoMode && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
            <div>
              <div className="text-sm font-semibold text-[#10172A] dark:text-white">Demo Sample Data</div>
              <div className="text-xs text-[#64748B]">Restore the 3 initial sample documents and workflows.</div>
            </div>
            <button
              type="button"
              onClick={resetDemoWorkspace}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Demo Data
            </button>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-sm font-semibold text-[#10172A] dark:text-white">Session</div>
            <div className="text-xs text-[#64748B]">
              {isDemoMode ? 'Exit Demo Workspace and return to sign-in.' : 'Sign out of your Firebase session.'}
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-300 dark:border-red-800 text-red-600 text-xs font-semibold hover:bg-red-50 dark:hover:bg-red-950/30"
          >
            <LogOut className="w-3.5 h-3.5" />
            {isDemoMode ? 'Exit Demo' : 'Sign Out'}
          </button>
        </div>
      </div>
    </div>
  );
}
