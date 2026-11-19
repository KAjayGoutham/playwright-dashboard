import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart2,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  FileText,
  Folder,
  Globe,
  HelpCircle,
  Image as ImageIcon,
  Layers,
  Moon,
  RefreshCw,
  Search,
  Shield,
  Smartphone,
  Sun,
  Terminal,
  Video,
  Wrench,
  X,
  XCircle,
} from 'lucide-react';
import {
  RunData,
  SuiteMediaSelection,
  SyncFeedback,
  TestCase,
  TestStatus,
  TestStep,
} from './types/dashboard';
import { SAMPLE_RUN_DATA } from './data/sampleRunData';
import {
  SAMPLE_CUSTOM_REPORTER_TS,
  SAMPLE_PLAYWRIGHT_CONFIG,
} from './constants/reporterSnippets';
import {
  MAX_HISTORY_RUNS,
  countSteps,
  formatDuration,
  formatEnvironmentLabel,
  formatFriendlyDate,
  formatStepCategory,
  isImageAttachment,
  isVideoAttachment,
  loadStoredHistory,
  loadThemePreference,
  mergeRunHistory,
  parsePlaywrightHistory,
  saveStoredHistory,
  saveThemePreference,
} from './utils/playwrightParser';
import { TestDetailsModal } from './components/TestDetailsModal';
import { SuiteMediaModal } from './components/SuiteMediaModal';

interface PlaywrightDashboardProps {
  data?: any;
  initialData?: any;
}

export default function PlaywrightDashboard({
  data,
  initialData,
}: PlaywrightDashboardProps = {}) {
  const [runHistory, setRunHistory] = useState<RunData[]>(() => {
    const fromProps = parsePlaywrightHistory(data || initialData);
    const stored = loadStoredHistory();
    const initial =
      fromProps.length > 0
        ? mergeRunHistory(fromProps, stored)
        : stored.length > 0
          ? stored
          : [SAMPLE_RUN_DATA];
    if (fromProps.length > 0) saveStoredHistory(initial);
    return initial;
  });
  const [selectedRunIndex, setSelectedRunIndex] = useState<number>(0);

  const runData =
    runHistory[selectedRunIndex] || runHistory[0] || SAMPLE_RUN_DATA;

  useEffect(() => {
    const incoming = parsePlaywrightHistory(data || initialData);
    if (incoming.length > 0) {
      setRunHistory((prev) => {
        const next = mergeRunHistory(incoming, prev);
        saveStoredHistory(next);
        return next;
      });
      setSelectedRunIndex(0);
    }
  }, [data, initialData]);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'results' | 'setup'>(
    'dashboard'
  );
  const [selectedStatus, setSelectedStatus] = useState<'all' | TestStatus>('all');
  const [selectedBrowser, setSelectedBrowser] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [darkMode, setDarkMode] = useState<boolean>(loadThemePreference);
  const [selectedTest, setSelectedTest] = useState<TestCase | null>(null);
  const [selectedSuiteMedia, setSelectedSuiteMedia] =
    useState<SuiteMediaSelection | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<SyncFeedback | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState<'config' | 'reporter' | null>(
    null
  );
  const [copyError, setCopyError] = useState<string | null>(null);
  const [expandedSuites, setExpandedSuites] = useState<Record<string, boolean>>(
    {}
  );
  const [expandedTests, setExpandedTests] = useState<Record<string, boolean>>({});

  useEffect(() => {
    saveThemePreference(darkMode);
  }, [darkMode]);

  useEffect(() => {
    if (!syncFeedback) return;
    const timer = setTimeout(() => setSyncFeedback(null), 5000);
    return () => clearTimeout(timer);
  }, [syncFeedback]);

  const getSuiteKey = (file: string, project: string) => `${file}::${project}`;

  const isSuiteExpanded = (file: string, project: string) => {
    const key = getSuiteKey(file, project);
    return expandedSuites[key] ?? true;
  };

  const toggleSuite = (file: string, project: string) => {
    const key = getSuiteKey(file, project);
    setExpandedSuites((prev) => ({
      ...prev,
      [key]: !(prev[key] ?? true),
    }));
  };

  const setAllSuitesExpanded = (expanded: boolean) => {
    const next: Record<string, boolean> = {};
    for (const s of runData.suites) {
      next[getSuiteKey(s.file, s.project)] = expanded;
    }
    setExpandedSuites(next);
  };

  const toggleTestSteps = (testId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedTests((prev) => ({ ...prev, [testId]: !prev[testId] }));
  };

  const browserOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of runData.projects) {
      if (p.name) set.add(p.name);
    }
    for (const s of runData.suites) {
      if (s.project) set.add(s.project);
    }
    return Array.from(set);
  }, [runData]);

  const filteredSuites = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return runData.suites
      .map((suite) => {
        const filteredTests = suite.tests.filter((t) => {
          const matchesStatus =
            selectedStatus === 'all' || t.status === selectedStatus;
          const matchesBrowser =
            selectedBrowser === 'all' ||
            suite.project.toLowerCase() === selectedBrowser.toLowerCase();
          const matchesSearch =
            !q ||
            t.title.toLowerCase().includes(q) ||
            suite.file.toLowerCase().includes(q);
          return matchesStatus && matchesBrowser && matchesSearch;
        });
        return { ...suite, tests: filteredTests };
      })
      .filter((suite) => suite.tests.length > 0);
  }, [runData, selectedStatus, selectedBrowser, searchQuery]);

  const hasActiveFilters =
    selectedStatus !== 'all' ||
    selectedBrowser !== 'all' ||
    searchQuery.trim() !== '';

  const clearFilters = () => {
    setSelectedStatus('all');
    setSelectedBrowser('all');
    setSearchQuery('');
  };

  const handleRefreshResults = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);

    const applyFreshJson = (json: any): boolean => {
      const incoming = parsePlaywrightHistory(json);
      if (incoming.length === 0) return false;
      setRunHistory((prev) => {
        const next = mergeRunHistory(incoming, prev);
        saveStoredHistory(next);
        return next;
      });
      setSelectedRunIndex(0);
      const latest = incoming[0];
      setSyncFeedback({
        type: 'success',
        message: `Results refreshed — showing ${latest.stats.total} ${
          latest.stats.total === 1 ? 'test' : 'tests'
        } (${latest.stats.successRate}% pass rate).`,
      });
      return true;
    };

    const endpoints = ['/data/playwright-results.json', '/data/results.json'];
    for (const endpoint of endpoints) {
      try {
        const res = await fetch(`${endpoint}?t=${Date.now()}`);
        if (res.ok) {
          const json = await res.json();
          if (applyFreshJson(json)) {
            setIsSyncing(false);
            return;
          }
        }
      } catch {
        // Continue to next source
      }
    }

    if (applyFreshJson(data || initialData)) {
      setSyncFeedback({
        type: 'info',
        message:
          'Showing bundled test results. Run your test suite to generate a newer report.',
      });
    } else {
      setSyncFeedback({
        type: 'error',
        message:
          'Could not find a new results file. Check the Setup Guide tab to connect your test suite.',
      });
    }
    setIsSyncing(false);
  };

  const copySnippet = async (code: string, target: 'config' | 'reporter') => {
    setCopyError(null);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = code;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(textarea);
        if (!ok) throw new Error('Copy command was unsuccessful');
      }
      setCopiedSnippet(target);
      setTimeout(() => setCopiedSnippet(null), 2000);
    } catch {
      setCopyError(
        'Unable to copy automatically. Please select the code block and copy it manually.'
      );
    }
  };

  const renderInlineSteps = (steps: TestStep[], depth = 0): React.ReactNode => (
    <div
      className={
        depth === 0
          ? 'space-y-1.5'
          : 'space-y-1.5 mt-1.5 pl-4 border-l border-slate-700/50'
      }
    >
      {steps.map((step, idx) => {
        const friendlyCategory = formatStepCategory(step.category);
        return (
          <div key={`${depth}-${idx}`}>
            <div
              className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                darkMode
                  ? 'bg-slate-950/60 border-slate-800'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                {step.status === 'passed' ? (
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                )}
                {friendlyCategory && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${
                      darkMode
                        ? 'bg-slate-800 text-cyan-400'
                        : 'bg-slate-100 text-cyan-700'
                    }`}
                  >
                    {friendlyCategory}
                  </span>
                )}
                <span className="font-medium font-mono truncate">
                  {step.title}
                </span>
              </div>
              <span className="text-slate-400 font-mono shrink-0">
                {step.durationMs}ms
              </span>
            </div>
            {step.error && (
              <div className="mt-1 ml-4 px-2.5 py-1.5 rounded-lg bg-rose-950/30 border border-rose-900/40 text-[11px] font-mono text-rose-300">
                {step.error}
              </div>
            )}
            {step.steps &&
              step.steps.length > 0 &&
              renderInlineSteps(step.steps, depth + 1)}
          </div>
        );
      })}
    </div>
  );

  const totalTests = runData.stats.total;
  const pct = (value: number) =>
    totalTests > 0 ? `${(value / totalTests) * 100}%` : '0%';
  const browserCount = runData.projects.length;

  const navItems: {
    id: 'dashboard' | 'results' | 'setup';
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }[] = [
    {
      id: 'dashboard',
      label: 'Overview',
      icon: <BarChart2 className="w-3.5 h-3.5" />,
    },
    {
      id: 'results',
      label: 'Test Results',
      icon: <Layers className="w-3.5 h-3.5" />,
      badge: totalTests,
    },
    {
      id: 'setup',
      label: 'Setup Guide',
      icon: <Wrench className="w-3.5 h-3.5" />,
    },
  ];

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-300 ${
        darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'
      }`}
    >
      {/* TOP NAVBAR */}
      <header
        className={`sticky top-0 z-40 border-b backdrop-blur-md ${
          darkMode
            ? 'bg-slate-900/85 border-slate-800'
            : 'bg-white/85 border-slate-200'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white font-black text-base sm:text-lg tracking-wide shrink-0">
              QA
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-base sm:text-lg tracking-tight truncate">
                  Playwright Quality Dashboard
                </span>
              </div>
              <p
                className={`hidden sm:block text-xs truncate ${
                  darkMode ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                Automated test health, recent runs, and visual evidence
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2.5 shrink-0">
            <nav
              aria-label="Primary navigation"
              className={`hidden md:flex p-1 rounded-xl border ${
                darkMode
                  ? 'bg-slate-900 border-slate-800'
                  : 'bg-slate-100 border-slate-200'
              }`}
            >
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      isActive
                        ? darkMode
                          ? 'bg-cyan-500 text-slate-950 shadow-md'
                          : 'bg-white text-slate-900 shadow-sm'
                        : darkMode
                          ? 'text-slate-400 hover:text-slate-200'
                          : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                    {item.badge !== undefined && (
                      <span
                        className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isActive
                            ? darkMode
                              ? 'bg-slate-950/80 text-cyan-300'
                              : 'bg-slate-900 text-white'
                            : darkMode
                              ? 'bg-cyan-500/15 text-cyan-400'
                              : 'bg-cyan-100 text-cyan-800'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            <button
              type="button"
              onClick={handleRefreshResults}
              disabled={isSyncing}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 ${
                isSyncing
                  ? 'bg-cyan-500/50 text-slate-950 cursor-wait'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-400 hover:to-blue-500 shadow-cyan-500/20'
              }`}
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`}
              />
              <span className="hidden sm:inline">
                {isSyncing ? 'Refreshing...' : 'Refresh Results'}
              </span>
              <span className="sm:hidden">
                {isSyncing ? '...' : 'Refresh'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setDarkMode(!darkMode)}
              aria-label={darkMode ? 'Switch to light theme' : 'Switch to dark theme'}
              title={darkMode ? 'Switch to light theme' : 'Switch to dark theme'}
              className={`p-2 rounded-xl border transition-colors ${
                darkMode
                  ? 'bg-slate-900 border-slate-800 text-amber-400 hover:bg-slate-800'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {darkMode ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* MOBILE NAV TABS */}
      <nav
        aria-label="Mobile navigation"
        className={`md:hidden flex border-b px-4 py-2 space-x-2 overflow-x-auto ${
          darkMode
            ? 'bg-slate-900 border-slate-800'
            : 'bg-white border-slate-200'
        }`}
      >
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveTab(item.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
              activeTab === item.id
                ? 'bg-cyan-500 text-slate-950'
                : darkMode
                  ? 'text-slate-400'
                  : 'text-slate-600'
            }`}
          >
            {item.label}
            {item.badge !== undefined ? ` (${item.badge})` : ''}
          </button>
        ))}
      </nav>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* SYNC STATUS FEEDBACK */}
        {syncFeedback && (
          <div
            role="status"
            aria-live="polite"
            className={`px-4 py-3 rounded-xl border flex items-center justify-between gap-3 text-xs animate-fadeIn ${
              syncFeedback.type === 'success'
                ? darkMode
                  ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : syncFeedback.type === 'error'
                  ? darkMode
                    ? 'bg-rose-950/40 border-rose-800/60 text-rose-300'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                  : darkMode
                    ? 'bg-cyan-950/40 border-cyan-800/60 text-cyan-300'
                    : 'bg-cyan-50 border-cyan-200 text-cyan-800'
            }`}
          >
            <div className="flex items-center space-x-2">
              {syncFeedback.type === 'success' && (
                <CheckCircle className="w-4 h-4 shrink-0" />
              )}
              {syncFeedback.type === 'error' && (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              {syncFeedback.type === 'info' && (
                <Clock className="w-4 h-4 shrink-0" />
              )}
              <span>{syncFeedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setSyncFeedback(null)}
              aria-label="Dismiss notification"
              className="opacity-70 hover:opacity-100"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* SAMPLE DATA NOTICE */}
        {runData.isSample && activeTab !== 'setup' && (
          <div
            className={`px-4 py-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
              darkMode
                ? 'bg-amber-950/30 border-amber-800/50 text-amber-200'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
          >
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Showing sample demo results because no live test report has been loaded yet.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('setup')}
              className="font-semibold underline text-left sm:text-right shrink-0"
            >
              View Setup Guide
            </button>
          </div>
        )}

        {/* RECENT RUNS HISTORY BAR (LAST 5 RUNS) */}
        {activeTab !== 'setup' && runHistory.length > 0 && (
          <section
            aria-label="Recent test runs"
            className={`p-4 rounded-2xl border space-y-3 ${
              darkMode
                ? 'bg-slate-900/80 border-slate-800'
                : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Recent Test Runs ({runHistory.length} of {MAX_HISTORY_RUNS})
                </h2>
              </div>
              {selectedRunIndex > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedRunIndex(0)}
                  className="text-xs font-semibold text-cyan-400 hover:underline"
                >
                  Back to Latest Run
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              {runHistory.map((run, idx) => {
                const isSelected = idx === selectedRunIndex;
                return (
                  <button
                    key={`${run.runId}-${idx}`}
                    type="button"
                    onClick={() => setSelectedRunIndex(idx)}
                    aria-pressed={isSelected}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? darkMode
                          ? 'bg-cyan-500/10 border-cyan-500/60 ring-1 ring-cyan-500/40'
                          : 'bg-cyan-50 border-cyan-400 ring-1 ring-cyan-300'
                        : darkMode
                          ? 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          idx === 0
                            ? 'bg-cyan-500/20 text-cyan-400'
                            : darkMode
                              ? 'bg-slate-800 text-slate-300'
                              : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {idx === 0 ? 'Latest' : `Run #${idx + 1}`}
                      </span>
                      <span
                        className={`text-xs font-bold font-mono ${
                          run.stats.failed > 0
                            ? 'text-rose-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {run.stats.successRate}%
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {formatFriendlyDate(run.timestamp)}
                    </div>
                    <div className="flex items-center justify-between mt-1.5 text-[10px] font-mono">
                      <span className="text-emerald-400">
                        {run.stats.passed}/{run.stats.total} passed
                      </span>
                      {run.stats.failed > 0 ? (
                        <span className="text-rose-400">
                          {run.stats.failed} failed
                        </span>
                      ) : (
                        <span className="text-slate-500">
                          {formatDuration(run.totalDurationMs)}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* --- TAB 1: OVERVIEW --- */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 sm:space-y-8 animate-fadeIn">
            {/* Run Summary Banner */}
            <div
              className={`p-6 rounded-2xl border shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                darkMode
                  ? 'bg-gradient-to-r from-slate-900 to-slate-900/60 border-slate-800'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      runData.stats.failed > 0
                        ? 'bg-rose-500'
                        : 'bg-emerald-500 animate-pulse'
                    }`}
                  />
                  <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
                    {selectedRunIndex === 0
                      ? 'Latest Test Run'
                      : `Viewing Earlier Run (#${selectedRunIndex + 1})`}
                  </span>
                </div>
                <h1 className="text-2xl font-bold tracking-tight">
                  Automated Test Summary
                </h1>
                <p
                  className={`text-xs ${
                    darkMode ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  Run on{' '}
                  <span className="font-semibold">
                    {formatEnvironmentLabel(runData.environment)}
                  </span>{' '}
                  • {formatFriendlyDate(runData.timestamp)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div
                  className={`px-4 py-2.5 rounded-xl border flex items-center space-x-3 ${
                    darkMode
                      ? 'bg-slate-950/50 border-slate-800'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <Clock className="w-4 h-4 text-cyan-400" />
                  <div>
                    <div className="text-[10px] uppercase text-slate-400 font-medium">
                      Total Duration
                    </div>
                    <div className="text-sm font-bold font-mono">
                      {formatDuration(runData.totalDurationMs)}
                    </div>
                  </div>
                </div>
                <div
                  className={`px-4 py-2.5 rounded-xl border flex items-center space-x-3 ${
                    darkMode
                      ? 'bg-slate-950/50 border-slate-800'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <Activity
                    className={`w-4 h-4 ${
                      runData.stats.failed > 0
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  />
                  <div>
                    <div className="text-[10px] uppercase text-slate-400 font-medium">
                      Pass Rate
                    </div>
                    <div
                      className={`text-sm font-bold font-mono ${
                        runData.stats.failed > 0
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {runData.stats.successRate}%
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* KEY METRIC COUNTERS */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <div
                className={`p-4 rounded-2xl border transition-all hover:scale-[1.02] ${
                  darkMode
                    ? 'bg-slate-900/80 border-slate-800'
                    : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-400">
                    Total Tests
                  </span>
                  <FileText className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="text-2xl font-bold font-mono">
                  {runData.stats.total}
                </div>
                <div className="text-[11px] text-cyan-400 mt-1">
                  Across {browserCount}{' '}
                  {browserCount === 1 ? 'browser' : 'browsers'}
                </div>
              </div>

              <div
                className={`p-4 rounded-2xl border transition-all hover:scale-[1.02] ${
                  darkMode
                    ? 'bg-slate-900/80 border-slate-800'
                    : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-400">
                    Passed
                  </span>
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-emerald-400">
                  {runData.stats.passed}
                </div>
                <div className="text-[11px] text-emerald-500/90 mt-1">
                  Working as expected
                </div>
              </div>

              <div
                className={`p-4 rounded-2xl border transition-all hover:scale-[1.02] ${
                  darkMode
                    ? 'bg-slate-900/80 border-slate-800'
                    : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-400">
                    Failed
                  </span>
                  <XCircle className="w-4 h-4 text-rose-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-rose-400">
                  {runData.stats.failed}
                </div>
                <div className="text-[11px] text-rose-400/90 mt-1">
                  Needs attention
                </div>
              </div>

              <div
                className={`p-4 rounded-2xl border transition-all hover:scale-[1.02] ${
                  darkMode
                    ? 'bg-slate-900/80 border-slate-800'
                    : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-400">
                    Unstable
                  </span>
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-amber-400">
                  {runData.stats.flaky}
                </div>
                <div className="text-[11px] text-amber-400/90 mt-1">
                  Passed after retry
                </div>
              </div>

              <div
                className={`p-4 rounded-2xl border transition-all hover:scale-[1.02] ${
                  darkMode
                    ? 'bg-slate-900/80 border-slate-800'
                    : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-400">
                    Skipped
                  </span>
                  <Clock className="w-4 h-4 text-slate-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-slate-400">
                  {runData.stats.skipped}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Not run this time
                </div>
              </div>

              <div
                className={`p-4 rounded-2xl border transition-all hover:scale-[1.02] ${
                  darkMode
                    ? 'bg-slate-900/80 border-slate-800'
                    : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-400">
                    Pass Rate
                  </span>
                  <Shield className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-cyan-400">
                  {runData.stats.successRate}%
                </div>
                <div className="text-[11px] text-cyan-400/90 mt-1">
                  Target: 80%+
                </div>
              </div>
            </div>

            {/* VISUAL RUN BREAKDOWN & BROWSERS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Progress Bar & Browser Coverage */}
              <div
                className={`p-6 rounded-2xl border lg:col-span-2 space-y-6 ${
                  darkMode
                    ? 'bg-slate-900/80 border-slate-800'
                    : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm tracking-wide">
                    Pass &amp; Fail Summary
                  </h3>
                  <span className="text-xs text-slate-400">
                    {runData.stats.total}{' '}
                    {runData.stats.total === 1 ? 'test' : 'tests'} total
                  </span>
                </div>

                {/* Multi-segmented progress bar */}
                <div className="space-y-2">
                  <div
                    className={`h-4 w-full rounded-full overflow-hidden flex ${
                      darkMode ? 'bg-slate-800' : 'bg-slate-200'
                    }`}
                  >
                    <div
                      style={{ width: pct(runData.stats.passed) }}
                      className="bg-emerald-500 transition-all duration-500"
                      title={`Passed: ${runData.stats.passed}`}
                    />
                    <div
                      style={{ width: pct(runData.stats.failed) }}
                      className="bg-rose-500 transition-all duration-500"
                      title={`Failed: ${runData.stats.failed}`}
                    />
                    <div
                      style={{ width: pct(runData.stats.flaky) }}
                      className="bg-amber-500 transition-all duration-500"
                      title={`Unstable: ${runData.stats.flaky}`}
                    />
                    <div
                      style={{ width: pct(runData.stats.skipped) }}
                      className="bg-slate-500 transition-all duration-500"
                      title={`Skipped: ${runData.stats.skipped}`}
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 pt-1">
                    <div className="flex items-center space-x-2">
                      <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                      <span>Passed ({runData.stats.passed})</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
                      <span>Failed ({runData.stats.failed})</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
                      <span>Unstable ({runData.stats.flaky})</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="w-3 h-3 rounded-full bg-slate-500 inline-block" />
                      <span>Skipped ({runData.stats.skipped})</span>
                    </div>
                  </div>
                </div>

                <div
                  className={`pt-4 border-t space-y-3 ${
                    darkMode ? 'border-slate-800/60' : 'border-slate-200'
                  }`}
                >
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Browser Coverage
                  </h4>
                  {runData.projects.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {runData.projects.map((proj, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setSelectedBrowser(proj.name);
                            setSelectedStatus('all');
                            setActiveTab('results');
                          }}
                          className={`p-3 rounded-xl border flex items-center justify-between text-left transition-colors ${
                            darkMode
                              ? 'bg-slate-950/40 border-slate-800 hover:border-cyan-500/50'
                              : 'bg-slate-50 border-slate-200 hover:border-cyan-400'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5">
                            {proj.name.toLowerCase().includes('mobile') ? (
                              <Smartphone className="w-4 h-4 text-cyan-400" />
                            ) : (
                              <Globe className="w-4 h-4 text-cyan-400" />
                            )}
                            <span className="text-xs font-semibold capitalize">
                              {proj.name}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-mono text-emerald-400">
                              {proj.passed}/{proj.tests} passed
                            </span>
                            {proj.failed > 0 && (
                              <span className="text-xs font-mono text-rose-400">
                                {proj.failed} failed
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">
                      No browser breakdown available for this run.
                    </p>
                  )}
                </div>
              </div>

              {/* Issues Requiring Attention */}
              <div
                className={`p-6 rounded-2xl border space-y-4 flex flex-col justify-between ${
                  darkMode
                    ? 'bg-slate-900/80 border-slate-800'
                    : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                <div className="space-y-4">
                  <h3 className="font-bold text-sm tracking-wide flex items-center justify-between">
                    <span>Issues Requiring Attention</span>
                    <span
                      className={`text-xs font-mono ${
                        runData.stats.failed > 0
                          ? 'text-rose-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {runData.stats.failed}{' '}
                      {runData.stats.failed === 1 ? 'issue' : 'issues'}
                    </span>
                  </h3>

                  <div className="space-y-3">
                    {runData.stats.failed > 0 &&
                      runData.suites
                        .flatMap((s) => s.tests)
                        .filter((t) => t.status === 'failed')
                        .map((failTest) => (
                          <button
                            key={failTest.id}
                            type="button"
                            onClick={() => setSelectedTest(failTest)}
                            className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer group ${
                              darkMode
                                ? 'bg-rose-950/15 border-rose-900/30 hover:bg-rose-950/30'
                                : 'bg-rose-50 border-rose-200 hover:bg-rose-100/60'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <span className="text-xs font-semibold text-rose-400 group-hover:underline line-clamp-1">
                                {failTest.title}
                              </span>
                              <XCircle className="w-4 h-4 text-rose-400 shrink-0 ml-2" />
                            </div>
                            <p
                              className={`text-[11px] mt-1 line-clamp-2 ${
                                darkMode ? 'text-slate-400' : 'text-slate-600'
                              }`}
                            >
                              {failTest.error?.message || 'Test failed'}
                            </p>
                            <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                              <span className="capitalize font-medium">
                                {failTest.browser}
                              </span>
                              <span className="text-cyan-400 group-hover:underline">
                                View details &rarr;
                              </span>
                            </div>
                          </button>
                        ))}

                    {runData.stats.failed === 0 && (
                      <div className="py-8 text-center space-y-2">
                        <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto" />
                        <div className="text-sm font-semibold text-emerald-400">
                          All tests passed!
                        </div>
                        <p className="text-xs text-slate-400">
                          No issues were detected in this test run.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('results')}
                  className={`w-full py-2.5 rounded-xl text-xs font-semibold border transition-colors flex items-center justify-center space-x-2 ${
                    darkMode
                      ? 'bg-slate-950 border-slate-800 hover:bg-slate-800 text-cyan-400'
                      : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-cyan-600'
                  }`}
                >
                  <span>View All Test Results</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 2: TEST RESULTS --- */}
        {activeTab === 'results' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Filter & Search Bar */}
            <div
              className={`p-4 rounded-2xl border flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                darkMode
                  ? 'bg-slate-900/80 border-slate-800'
                  : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <div className="relative w-full lg:w-96">
                <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  aria-label="Search tests or files"
                  placeholder="Search by test name or file..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-10 pr-8 py-2 rounded-xl text-xs border outline-none transition-colors ${
                    darkMode
                      ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-cyan-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-cyan-500'
                  }`}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                {/* Status Filter */}
                <div className="flex items-center space-x-1.5">
                  <label
                    htmlFor="status-filter"
                    className="text-xs text-slate-400 font-medium"
                  >
                    Status:
                  </label>
                  <select
                    id="status-filter"
                    value={selectedStatus}
                    onChange={(e) =>
                      setSelectedStatus(e.target.value as 'all' | TestStatus)
                    }
                    className={`px-3 py-1.5 rounded-xl text-xs border outline-none font-medium ${
                      darkMode
                        ? 'bg-slate-950 border-slate-800 text-slate-200'
                        : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <option value="all">All Statuses</option>
                    <option value="passed">Passed</option>
                    <option value="failed">Failed</option>
                    <option value="flaky">Unstable</option>
                    <option value="skipped">Skipped</option>
                  </select>
                </div>

                {/* Browser Filter */}
                <div className="flex items-center space-x-1.5">
                  <label
                    htmlFor="browser-filter"
                    className="text-xs text-slate-400 font-medium"
                  >
                    Browser:
                  </label>
                  <select
                    id="browser-filter"
                    value={selectedBrowser}
                    onChange={(e) => setSelectedBrowser(e.target.value)}
                    className={`px-3 py-1.5 rounded-xl text-xs border outline-none font-medium capitalize ${
                      darkMode
                        ? 'bg-slate-950 border-slate-800 text-slate-200'
                        : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <option value="all">All Browsers</option>
                    {browserOptions.map((browser) => (
                      <option key={browser} value={browser}>
                        {browser}
                      </option>
                    ))}
                  </select>
                </div>

                {filteredSuites.length > 0 && (
                  <div className="flex items-center space-x-1.5 ml-auto lg:ml-0">
                    <button
                      type="button"
                      onClick={() => setAllSuitesExpanded(true)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-colors ${
                        darkMode
                          ? 'border-slate-800 text-slate-300 hover:bg-slate-800'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Expand All
                    </button>
                    <button
                      type="button"
                      onClick={() => setAllSuitesExpanded(false)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-colors ${
                        darkMode
                          ? 'border-slate-800 text-slate-300 hover:bg-slate-800'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Collapse All
                    </button>
                  </div>
                )}

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-xs font-semibold text-cyan-400 hover:underline"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>

            {/* Test Suites Tree */}
            <div className="space-y-4">
              {filteredSuites.map((suite) => {
                const suiteKey = getSuiteKey(suite.file, suite.project);
                const expanded = isSuiteExpanded(suite.file, suite.project);
                const suiteScreenshots = suite.tests.flatMap((t) =>
                  (t.attachments || [])
                    .filter(isImageAttachment)
                    .map((att) => ({ testTitle: t.title, att }))
                );
                const suiteVideos = suite.tests.flatMap((t) =>
                  (t.attachments || [])
                    .filter(isVideoAttachment)
                    .map((att) => ({ testTitle: t.title, att }))
                );

                return (
                  <div
                    key={suiteKey}
                    className={`rounded-2xl border overflow-hidden ${
                      darkMode
                        ? 'bg-slate-900/80 border-slate-800'
                        : 'bg-white border-slate-200 shadow-sm'
                    }`}
                  >
                    {/* Suite Header */}
                    <div
                      onClick={() => toggleSuite(suite.file, suite.project)}
                      className={`px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 cursor-pointer transition-colors ${
                        darkMode
                          ? 'bg-slate-950/60 hover:bg-slate-800/50'
                          : 'bg-slate-100/70 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        {expanded ? (
                          <ChevronDown className="w-4 h-4 text-cyan-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-cyan-400" />
                        )}
                        <Folder className="w-4 h-4 text-cyan-400" />
                        <span className="font-mono text-xs font-semibold">
                          {suite.file}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-mono ${
                            darkMode
                              ? 'bg-slate-800 text-slate-300'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {suite.project}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                        {suiteScreenshots.length > 0 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSuiteMedia({
                                suiteFile: suite.file,
                                project: suite.project,
                                kind: 'screenshots',
                                items: suiteScreenshots,
                              });
                            }}
                            className={`inline-flex items-center space-x-1.5 text-[11px] px-2.5 py-1 rounded-lg font-semibold border transition-colors ${
                              darkMode
                                ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20'
                                : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                            }`}
                            title="View screenshots from this test file"
                          >
                            <ImageIcon className="w-3.5 h-3.5" />
                            <span>
                              Screenshot{suiteScreenshots.length > 1 ? 's' : ''}{' '}
                              ({suiteScreenshots.length})
                            </span>
                          </button>
                        )}
                        {suiteVideos.length > 0 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSuiteMedia({
                                suiteFile: suite.file,
                                project: suite.project,
                                kind: 'videos',
                                items: suiteVideos,
                              });
                            }}
                            className={`inline-flex items-center space-x-1.5 text-[11px] px-2.5 py-1 rounded-lg font-semibold border transition-colors ${
                              darkMode
                                ? 'bg-purple-500/10 border-purple-500/30 text-purple-300 hover:bg-purple-500/20'
                                : 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100'
                            }`}
                            title="Watch recorded videos from this test file"
                          >
                            <Video className="w-3.5 h-3.5" />
                            <span>
                              Video{suiteVideos.length > 1 ? 's' : ''} (
                              {suiteVideos.length})
                            </span>
                          </button>
                        )}
                        <span className="text-xs text-slate-400 font-mono">
                          {formatDuration(suite.duration)}
                        </span>
                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-full capitalize ${
                            suite.status === 'passed'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-rose-500/10 text-rose-400'
                          }`}
                        >
                          {suite.status}
                        </span>
                      </div>
                    </div>

                    {/* Suite Test Cases */}
                    {expanded && (
                      <div
                        className={`divide-y ${
                          darkMode ? 'divide-slate-800/40' : 'divide-slate-200/70'
                        }`}
                      >
                        {suite.tests.map((test) => {
                          const totalSteps = countSteps(test.steps);
                          const screenshotCount = (test.attachments || []).filter(
                            isImageAttachment
                          ).length;
                          const videoCount = (test.attachments || []).filter(
                            isVideoAttachment
                          ).length;
                          const isStepsOpen = !!expandedTests[test.id];

                          return (
                            <div key={test.id}>
                              <div
                                onClick={() => setSelectedTest(test)}
                                className={`px-6 py-3.5 flex items-center justify-between gap-4 transition-colors cursor-pointer group ${
                                  darkMode
                                    ? 'hover:bg-slate-800/30'
                                    : 'hover:bg-slate-50'
                                }`}
                              >
                                <div className="flex items-center space-x-3 min-w-0">
                                  {test.status === 'passed' && (
                                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                                  )}
                                  {test.status === 'failed' && (
                                    <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                                  )}
                                  {test.status === 'flaky' && (
                                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                                  )}
                                  {test.status === 'skipped' && (
                                    <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                                  )}

                                  <div className="min-w-0">
                                    <div className="text-xs font-medium group-hover:text-cyan-400 transition-colors truncate">
                                      {test.title}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                      <span className="text-[10px] text-slate-500 capitalize">
                                        {test.browser}
                                      </span>
                                      {totalSteps > 0 && (
                                        <button
                                          type="button"
                                          aria-expanded={isStepsOpen}
                                          onClick={(e) =>
                                            toggleTestSteps(test.id, e)
                                          }
                                          className={`inline-flex items-center space-x-1 text-[10px] px-1.5 py-0.5 rounded font-medium transition-colors ${
                                            darkMode
                                              ? 'bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20'
                                              : 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100'
                                          }`}
                                        >
                                          {isStepsOpen ? (
                                            <ChevronDown className="w-2.5 h-2.5" />
                                          ) : (
                                            <ChevronRight className="w-2.5 h-2.5" />
                                          )}
                                          <span>
                                            {totalSteps}{' '}
                                            {totalSteps === 1 ? 'step' : 'steps'}
                                          </span>
                                        </button>
                                      )}
                                      {screenshotCount > 0 && (
                                        <span
                                          className={`inline-flex items-center space-x-1 text-[10px] px-1.5 py-0.5 rounded font-mono ${
                                            darkMode
                                              ? 'bg-indigo-500/10 text-indigo-300'
                                              : 'bg-indigo-50 text-indigo-700'
                                          }`}
                                        >
                                          <ImageIcon className="w-2.5 h-2.5" />
                                          <span>{screenshotCount}</span>
                                        </span>
                                      )}
                                      {videoCount > 0 && (
                                        <span
                                          className={`inline-flex items-center space-x-1 text-[10px] px-1.5 py-0.5 rounded font-mono ${
                                            darkMode
                                              ? 'bg-purple-500/10 text-purple-300'
                                              : 'bg-purple-50 text-purple-700'
                                          }`}
                                        >
                                          <Video className="w-2.5 h-2.5" />
                                          <span>{videoCount}</span>
                                        </span>
                                      )}
                                      {test.retries > 0 && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">
                                          Retried {test.retries}x
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center space-x-4 shrink-0">
                                  <span className="text-xs font-mono text-slate-400">
                                    {formatDuration(test.durationMs)}
                                  </span>
                                  <span className="text-xs text-cyan-400 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center space-x-1">
                                    <span>Details</span>
                                    <ChevronRight className="w-3 h-3" />
                                  </span>
                                </div>
                              </div>

                              {isStepsOpen &&
                                test.steps &&
                                test.steps.length > 0 && (
                                  <div
                                    className={`px-6 pb-4 pt-2 ${
                                      darkMode
                                        ? 'bg-slate-950/30'
                                        : 'bg-slate-50/70'
                                    }`}
                                  >
                                    {renderInlineSteps(test.steps)}
                                  </div>
                                )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredSuites.length === 0 && (
                <div
                  className={`p-12 text-center rounded-2xl border space-y-3 ${
                    darkMode
                      ? 'bg-slate-900/80 border-slate-800'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <HelpCircle className="w-10 h-10 text-slate-500 mx-auto" />
                  <div className="text-sm font-semibold">
                    {runData.suites.length === 0
                      ? 'No test results in this run'
                      : 'No matching tests found'}
                  </div>
                  <p className="text-xs text-slate-400">
                    {runData.suites.length === 0
                      ? 'Run your Playwright test suite and click Refresh Results to see results here.'
                      : 'Try clearing or adjusting your search text, status, or browser filter.'}
                  </p>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="inline-flex items-center px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-bold hover:bg-cyan-400 transition-colors"
                    >
                      Clear All Filters
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- TAB 3: SETUP GUIDE --- */}
        {activeTab === 'setup' && (
          <div className="space-y-8 animate-fadeIn">
            <div
              className={`p-6 rounded-2xl border relative overflow-hidden space-y-3 ${
                darkMode
                  ? 'bg-gradient-to-r from-slate-900 to-indigo-950/40 border-slate-800'
                  : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <div className="flex items-center space-x-2 text-cyan-400 text-xs font-semibold uppercase tracking-wider">
                <Wrench className="w-4 h-4 text-amber-400" />
                <span>Playwright Setup Guide</span>
              </div>
              <h2 className="text-2xl font-bold">
                Connect your Playwright tests in 2 steps
              </h2>
              <p
                className={`text-xs max-w-2xl leading-relaxed ${
                  darkMode ? 'text-slate-300' : 'text-slate-600'
                }`}
              >
                Add the reporter below to your Playwright project so every test run automatically saves steps, screenshots, videos, and the last 5 runs directly into this dashboard.
              </p>
            </div>

            {copyError && (
              <div className="p-3 rounded-xl border border-amber-800/50 bg-amber-950/30 text-xs text-amber-200">
                {copyError}
              </div>
            )}

            {/* Code Snippets Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Step 1: playwright.config.ts */}
              <div
                className={`rounded-2xl border overflow-hidden flex flex-col ${
                  darkMode
                    ? 'bg-slate-900/90 border-slate-800'
                    : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                <div
                  className={`px-5 py-3.5 border-b flex items-center justify-between ${
                    darkMode
                      ? 'bg-slate-950 border-slate-800'
                      : 'bg-slate-100 border-slate-200'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-cyan-400" />
                    <span className="font-mono text-xs font-bold">
                      1. playwright.config.ts
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      copySnippet(SAMPLE_PLAYWRIGHT_CONFIG, 'config')
                    }
                    className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-colors"
                  >
                    {copiedSnippet === 'config' ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {copiedSnippet === 'config' ? 'Copied!' : 'Copy Config'}
                    </span>
                  </button>
                </div>
                <div className="p-4 font-mono text-xs overflow-x-auto text-cyan-300 bg-slate-950 flex-1">
                  <pre>{SAMPLE_PLAYWRIGHT_CONFIG}</pre>
                </div>
              </div>

              {/* Step 2: Custom Reporter */}
              <div
                className={`rounded-2xl border overflow-hidden flex flex-col ${
                  darkMode
                    ? 'bg-slate-900/90 border-slate-800'
                    : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                <div
                  className={`px-5 py-3.5 border-b flex items-center justify-between ${
                    darkMode
                      ? 'bg-slate-950 border-slate-800'
                      : 'bg-slate-100 border-slate-200'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <span className="font-mono text-xs font-bold">
                      2. reporters/mtricbase-reporter.ts
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      copySnippet(SAMPLE_CUSTOM_REPORTER_TS, 'reporter')
                    }
                    className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                  >
                    {copiedSnippet === 'reporter' ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {copiedSnippet === 'reporter'
                        ? 'Copied!'
                        : 'Copy Reporter'}
                    </span>
                  </button>
                </div>
                <div className="p-4 font-mono text-xs overflow-x-auto text-emerald-300 bg-slate-950 flex-1">
                  <pre>{SAMPLE_CUSTOM_REPORTER_TS}</pre>
                </div>
              </div>
            </div>

            {/* Refresh Action Card */}
            <div
              className={`p-6 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                darkMode
                  ? 'bg-slate-900/80 border-slate-800'
                  : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <div className="space-y-1">
                <h3 className="font-bold text-sm">
                  Load Latest Test Results
                </h3>
                <p
                  className={`text-xs ${
                    darkMode ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  After running <code className="font-mono">npx playwright test</code>, click here to pull the newest report into the dashboard.
                </p>
              </div>
              <button
                type="button"
                onClick={handleRefreshResults}
                disabled={isSyncing}
                className="px-5 py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs hover:bg-cyan-400 transition-colors shadow-lg shadow-cyan-500/20 flex items-center justify-center space-x-2 shrink-0"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`}
                />
                <span>{isSyncing ? 'Refreshing...' : 'Refresh Results'}</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <TestDetailsModal
        test={selectedTest}
        darkMode={darkMode}
        onClose={() => setSelectedTest(null)}
      />

      <SuiteMediaModal
        selection={selectedSuiteMedia}
        darkMode={darkMode}
        onClose={() => setSelectedSuiteMedia(null)}
      />

      {/* FOOTER */}
      <footer
        className={`border-t py-6 text-center text-xs ${
          darkMode
            ? 'bg-slate-900/50 border-slate-800 text-slate-500'
            : 'bg-white border-slate-200 text-slate-500'
        }`}
      >
        <p>Playwright Quality Dashboard • Automated Test Reporting</p>
      </footer>
    </div>
  );
}
