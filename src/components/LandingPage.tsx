import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  BarChart3,
  BellRing,
  CalendarClock,
  CheckCircle2,
  FileSearch,
  GitBranch,
  Layers,
  Moon,
  ShieldCheck,
  Sun,
} from 'lucide-react';
import { ProcifyLogo } from './ProcifyLogo';
import { useWorkspace } from '../context/WorkspaceContext';

interface LandingPageProps {
  onOpenAuth: (mode: 'signin' | 'signup') => void;
  onExploreDemo: () => void;
}

const PIPELINE_STEPS = [
  {
    step: '01',
    title: 'Input Document',
    detail: 'PDF circulars, images, pasted emails, or plain briefs',
  },
  {
    step: '02',
    title: 'Gemini AI Analysis',
    detail: 'Multimodal parsing with strict factual grounding',
  },
  {
    step: '03',
    title: 'Information Extraction',
    detail: 'Dates, tasks, owners, risks, and source quotes',
  },
  {
    step: '04',
    title: 'Workflow Generation',
    detail: 'Ordered task graph with explicit dependencies',
  },
  {
    step: '05',
    title: 'Human Approval',
    detail: 'Editable review gate before tasks go live',
  },
  {
    step: '06',
    title: 'Automated Task Management',
    detail: 'List, Kanban, Calendar, reminders, and analytics',
  },
];

const FEATURES = [
  {
    icon: FileSearch,
    title: 'Intelligent Document Processing',
    description:
      'Extract titles, deadlines, action items, responsible roles, and uncertain clauses from PDFs, scanned notices, or emails without inventing facts.',
    span: 'lg:col-span-2',
  },
  {
    icon: GitBranch,
    title: 'AI Workflow Generation',
    description:
      'Convert analyzed documents or natural-language goals into connected task graphs with prerequisite dependencies and visual node editing.',
    span: 'lg:col-span-1',
  },
  {
    icon: ShieldCheck,
    title: 'Human Approval Gates',
    description:
      'AI never publishes blindly. Every workflow moves through Draft, Pending Review, and explicit Human Approval before tasks go active.',
    span: 'lg:col-span-1',
  },
  {
    icon: CalendarClock,
    title: 'Deadline Detection & Calendar',
    description:
      'Automatically surface dates from source text into Monthly, Weekly, and Daily schedules with one-click .ics calendar exports.',
    span: 'lg:col-span-1',
  },
  {
    icon: BellRing,
    title: 'Automated Reminders & Duplicate Guard',
    description:
      'Detect duplicate or overlapping circulars via SHA-256 and content similarity before saving, while tracking upcoming and overdue tasks.',
    span: 'lg:col-span-1',
  },
  {
    icon: BarChart3,
    title: 'Workflow Analytics & CSV Reports',
    description:
      'Measure completion rates, productivity trends, task distribution, and turnaround times computed directly from stored workspace records.',
    span: 'lg:col-span-2',
  },
];

const HOW_IT_WORKS = [
  {
    num: '01',
    title: 'Upload or enter information',
    body: 'Drop a PDF circular, photo of a notice, TXT file, or paste raw email instructions into the Document Analyzer.',
  },
  {
    num: '02',
    title: 'Let AI understand the content',
    body: 'Gemini extracts structured dates, events, tasks, dependencies, and flags any ambiguous details for review.',
  },
  {
    num: '03',
    title: 'Generate an actionable workflow',
    body: 'Build a visual sequence of connected task nodes automatically from the document or from a plain-text goal.',
  },
  {
    num: '04',
    title: 'Review and approve the workflow',
    body: 'Edit descriptions, adjust deadlines, assign owners, and confirm approval before activating execution.',
  },
  {
    num: '05',
    title: 'Track tasks and automation progress',
    body: 'Manage execution across List, Kanban, and Calendar views with automated reminders and live analytics.',
  },
];

export function LandingPage({ onOpenAuth, onExploreDemo }: LandingPageProps) {
  const { theme, toggleTheme } = useWorkspace();
  const [heroImgError, setHeroImgError] = useState(false);
  const [docImgError, setDocImgError] = useState(false);
  const [avatarImgError, setAvatarImgError] = useState(false);

  return (
    <div id="home" className="min-h-screen bg-[#F7F9FC] dark:bg-[#0B1120] text-[#172033] dark:text-slate-100">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-40 bg-[#F7F9FC]/95 dark:bg-[#0B1120]/95 backdrop-blur border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Brand Wordmark */}
          <a href="#home" className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
            <ProcifyLogo size={32} />
            <span className="font-display text-lg font-bold tracking-tight text-[#10172A] dark:text-white">
              Procify AI
            </span>
          </a>

          {/* Zone 2: 4 single-line nav links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#64748B] dark:text-slate-300">
            <a href="#home" className="hover:text-[#10172A] dark:hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0">
              Home
            </a>
            <a href="#features" className="hover:text-[#10172A] dark:hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-[#10172A] dark:hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0">
              How It Works
            </a>
            <a href="#about" className="hover:text-[#10172A] dark:hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0">
              About
            </a>
          </nav>

          {/* Zone 3: Primary action */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={toggleTheme}
              aria-label="Toggle color theme"
              className="p-2 rounded-lg text-[#64748B] dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={() => onOpenAuth('signin')}
              className="hidden sm:inline-flex px-3 py-2 text-sm font-medium text-[#172033] dark:text-slate-200 hover:text-[#4361EE] transition-colors whitespace-nowrap shrink-0"
            >
              Sign In
            </button>
            <button
              onClick={() => onOpenAuth('signup')}
              className="px-4 py-2 text-sm font-semibold text-white bg-[#4361EE] hover:bg-[#3651D4] rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-16 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
          {/* Left Hero Copy */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            <p className="text-sm font-medium text-[#4361EE] dark:text-[#22D3EE] mb-4">
              From Documents to Decisions. From Tasks to Automation.
            </p>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-[3.5rem] font-bold tracking-tight text-[#10172A] dark:text-white leading-[1.1] text-balance mb-6">
              Stop Managing Tasks. Start Automating Work.
            </h1>
            <p className="text-base sm:text-lg text-[#64748B] dark:text-slate-300 leading-relaxed max-w-2xl mb-8">
              Procify AI transforms documents, information and repetitive processes into intelligent workflows. Upload, analyze, automate and track everything in one place.
            </p>

            <div className="flex flex-wrap items-center gap-4 mb-10">
              <button
                onClick={() => onOpenAuth('signup')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#10172A] dark:bg-[#4361EE] text-white text-sm font-semibold hover:bg-[#1E293B] dark:hover:bg-[#3651D4] transition-colors whitespace-nowrap shrink-0"
              >
                Start Automating
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={onExploreDemo}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-[#172033] dark:text-slate-100 text-sm font-semibold hover:border-[#4361EE] transition-colors whitespace-nowrap shrink-0"
              >
                Explore Demo
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[#64748B] dark:text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-6">
              <span>PDF, Image & Text Ingestion</span>
              <span aria-hidden="true">·</span>
              <span>Structured JSON Extraction</span>
              <span aria-hidden="true">·</span>
              <span>Mandatory Human Approval</span>
              <span aria-hidden="true">·</span>
              <span>Firestore Persistence</span>
            </div>
          </div>

          {/* Right Hero Automated Pipeline Diagram */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
              <span className="text-sm font-semibold text-[#10172A] dark:text-white">
                Automated Execution Pipeline
              </span>
              <span className="text-xs font-mono text-[#4361EE] dark:text-[#22D3EE]">
                6 Stages
              </span>
            </div>

            <div className="space-y-2">
              {PIPELINE_STEPS.map((item, idx) => (
                <React.Fragment key={item.step}>
                  <div className="flex items-start gap-3.5 p-2.5 rounded-lg bg-[#F7F9FC] dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
                    <span className="font-mono text-xs font-semibold text-[#4361EE] dark:text-[#22D3EE] pt-0.5 tabular-nums">
                      {item.step}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#10172A] dark:text-white leading-snug">
                        {item.title}
                      </div>
                      <div className="text-xs text-[#64748B] dark:text-slate-400 leading-snug mt-0.5">
                        {item.detail}
                      </div>
                    </div>
                  </div>
                  {idx < PIPELINE_STEPS.length - 1 && (
                    <div className="flex justify-center">
                      <ArrowDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Studio Context Banner */}
      <section className="max-w-7xl mx-auto px-6 pb-20">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-7 min-h-[260px] bg-slate-100 dark:bg-slate-800 relative">
            {!heroImgError ? (
              <img
                src="/src/assets/images/hero_procify_studio_1795326567297.jpg"
                alt="Procify AI architectural operations studio"
                referrerPolicy="no-referrer"
                onError={() => setHeroImgError(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-8 text-[#64748B]">
                <Layers className="w-10 h-10 mb-2 text-[#4361EE]" />
                <span className="text-sm font-medium">Unified Operations Workspace</span>
              </div>
            )}
          </div>
          <div className="lg:col-span-5 p-8 lg:p-10 flex flex-col justify-center">
            <h2 className="font-display text-2xl font-bold text-[#10172A] dark:text-white mb-3">
              Built for teams drowning in circulars, notices, and manual checklists.
            </h2>
            <p className="text-sm text-[#64748B] dark:text-slate-400 leading-relaxed mb-6">
              Whether you are coordinating university examinations, running a technical symposium, managing client onboarding, or keeping an academic department on schedule, Procify AI turns static text into living, trackable operations.
            </p>
            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-200 dark:border-slate-800">
              <div>
                <div className="font-mono text-2xl font-bold text-[#10172A] dark:text-white tabular-nums">
                  3 Inputs
                </div>
                <div className="text-xs text-[#64748B] dark:text-slate-400 mt-1">
                  Document, Text Prompt, or Manual Builder
                </div>
              </div>
              <div>
                <div className="font-mono text-2xl font-bold text-[#4361EE] dark:text-[#22D3EE] tabular-nums">
                  100%
                </div>
                <div className="text-xs text-[#64748B] dark:text-slate-400 mt-1">
                  Human-approved before execution
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Bento Grid */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-16 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-2xl mb-10">
          <h2 className="font-display text-3xl font-bold tracking-tight text-[#10172A] dark:text-white mb-3">
            Operational capabilities designed for precision
          </h2>
          <p className="text-base text-[#64748B] dark:text-slate-400">
            Every stage from ingestion to completion is structured, auditable, and backed by persistent cloud storage.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.title}
                className={`${feat.span} bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col justify-between`}
              >
                <div>
                  <div className="w-10 h-10 rounded-lg bg-[#F7F9FC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[#4361EE] dark:text-[#22D3EE] flex items-center justify-center mb-5">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-[#10172A] dark:text-white mb-2">
                    {feat.title}
                  </h3>
                  <p className="text-sm text-[#64748B] dark:text-slate-400 leading-relaxed">
                    {feat.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-6 py-16 border-t border-slate-200 dark:border-slate-800">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
          <div className="lg:col-span-5 flex flex-col justify-between">
            <div>
              <h2 className="font-display text-3xl font-bold tracking-tight text-[#10172A] dark:text-white mb-3">
                How Procify AI works
              </h2>
              <p className="text-base text-[#64748B] dark:text-slate-400 mb-8">
                Five structured steps take raw institutional or business documents into verified task execution.
              </p>
            </div>
            <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 aspect-[4/3]">
              {!docImgError ? (
                <img
                  src="/src/assets/images/doc_analysis_visual_1795326567952.jpg"
                  alt="Document specification beside digital analysis interface"
                  referrerPolicy="no-referrer"
                  onError={() => setDocImgError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center p-8 text-[#64748B]">
                  <FileSearch className="w-10 h-10 text-[#4361EE]" />
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-200 dark:divide-slate-800">
            {HOW_IT_WORKS.map((step) => (
              <div key={step.num} className="p-6 flex items-start gap-5">
                <span className="font-mono text-sm font-semibold text-[#4361EE] dark:text-[#22D3EE] tabular-nums pt-0.5">
                  {step.num}
                </span>
                <div>
                  <h3 className="font-display text-base font-semibold text-[#10172A] dark:text-white mb-1">
                    {step.title}
                  </h3>
                  <p className="text-sm text-[#64748B] dark:text-slate-400 leading-relaxed">
                    {step.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About & Target Audience */}
      <section id="about" className="max-w-7xl mx-auto px-6 py-16 border-t border-slate-200 dark:border-slate-800">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 lg:p-10">
          <div className="lg:col-span-7">
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#10172A] dark:text-white mb-4">
              Reusable automation across institutions and teams
            </h2>
            <p className="text-sm sm:text-base text-[#64748B] dark:text-slate-400 leading-relaxed mb-6">
              Procify AI is engineered for students, educators, college administrators, project managers, small businesses, and operations teams handling recurring circulars, compliance tasks, and event checklists.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-[#172033] dark:text-slate-200">
              {[
                'Students & Academic Coordinators',
                'Teachers & College Administrators',
                'Small Business Operations',
                'Project & Event Managers',
              ].map((role) => (
                <div key={role} className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#4361EE] dark:text-[#22D3EE] shrink-0" />
                  <span>{role}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col justify-between bg-[#F7F9FC] dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
            <p className="text-sm text-[#172033] dark:text-slate-200 leading-relaxed mb-6">
              "Turning exam circulars and symposium briefs into approved task dependencies used to take hours of spreadsheet coordination. With Procify AI, the draft workflow is ready in seconds and nothing goes live without our sign-off."
            </p>
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-700 shrink-0">
                {!avatarImgError ? (
                  <img
                    src="/src/assets/images/avatar_ops_director_1795326568476.jpg"
                    alt="Elena Vance, Academic Operations Lead"
                    referrerPolicy="no-referrer"
                    onError={() => setAvatarImgError(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-semibold text-sm text-[#10172A]">
                    EV
                  </div>
                )}
              </div>
              <div>
                <div className="text-sm font-semibold text-[#10172A] dark:text-white">
                  Elena Vance
                </div>
                <div className="text-xs text-[#64748B] dark:text-slate-400">
                  Operations Director · Northbridge Institute
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Final Conversion CTA */}
        <div className="mt-12 bg-[#10172A] text-white rounded-xl p-8 lg:p-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight mb-2">
              Ready to automate your first workflow?
            </h2>
            <p className="text-sm text-slate-300 max-w-xl">
              Sign in with your account for persistent cloud storage, or launch the interactive demo workspace with sample circulars immediately.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={onExploreDemo}
              className="px-5 py-2.5 rounded-lg border border-slate-600 text-sm font-semibold text-white hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              Explore Demo
            </button>
            <button
              onClick={() => onOpenAuth('signup')}
              className="px-5 py-2.5 rounded-lg bg-[#4361EE] text-sm font-semibold text-white hover:bg-[#3651D4] transition-colors whitespace-nowrap shrink-0"
            >
              Start Automating
            </button>
          </div>
        </div>
      </section>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#64748B] dark:text-slate-400">
          <div className="flex items-center gap-2.5">
            <ProcifyLogo size={24} />
            <span className="font-semibold text-[#10172A] dark:text-white">Procify AI</span>
            <span aria-hidden="true">·</span>
            <span>From Documents to Decisions. From Tasks to Automation.</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#features" className="hover:text-[#10172A] dark:hover:text-white transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-[#10172A] dark:hover:text-white transition-colors">
              How It Works
            </a>
            <a href="#about" className="hover:text-[#10172A] dark:hover:text-white transition-colors">
              About
            </a>
            <button
              onClick={() => onOpenAuth('signin')}
              className="hover:text-[#10172A] dark:hover:text-white transition-colors"
            >
              Sign In
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
