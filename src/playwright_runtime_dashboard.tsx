import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle, XCircle, AlertTriangle, Clock, Search,
  RefreshCw, Terminal, ChevronRight, ChevronDown,
  Folder, FileText, Globe, Moon, Sun, Shield, Zap,
  Copy, Check, Activity, BarChart2, Layers, ExternalLink,
  HelpCircle, Smartphone, Image as ImageIcon, Video, Download
} from 'lucide-react';

type TestStatus = 'passed' | 'failed' | 'flaky' | 'skipped';

interface TestStep {
  title: string;
  durationMs: number;
  status: string;
  category?: string;
  error?: string;
  steps?: TestStep[];
}

interface TestError {
  message: string;
  snippet: string;
  location: string;
}

interface TestAttachment {
  type: string;
  name: string;
  url?: string;
  size?: string;
}

interface TestCase {
  id: string;
  title: string;
  status: TestStatus;
  durationMs: number;
  retries: number;
  browser: string;
  error?: TestError;
  steps: TestStep[];
  logs: string[];
  attachments: TestAttachment[];
}

interface TestSuite {
  file: string;
  project: string;
  duration: number;
  status: string;
  tests: TestCase[];
}

interface ProjectStats {
  name: string;
  tests: number;
  passed: number;
  failed: number;
  duration: number;
}

interface RunData {
  runId: string;
  timestamp: string;
  environment: string;
  totalDurationMs: number;
  stats: {
    total: number;
    passed: number;
    failed: number;
    flaky: number;
    skipped: number;
    successRate: number;
  };
  projects: ProjectStats[];
  suites: TestSuite[];
}

// --- MOCK INITIAL PLAYWRIGHT TEST RUN DATA ---
const INITIAL_RUN_DATA: RunData = {
  runId: "run-84920-prod",
  timestamp: new Date().toISOString(),
  environment: "CI / GitHub Actions (Ubuntu 22.04)",
  totalDurationMs: 42350,
  stats: {
    total: 28,
    passed: 22,
    failed: 3,
    flaky: 2,
    skipped: 1,
    successRate: 78.6
  },
  projects: [
    { name: "chromium", tests: 8, passed: 7, failed: 1, duration: 12400 },
    { name: "firefox", tests: 8, passed: 6, failed: 2, duration: 15200 },
    { name: "webkit", tests: 8, passed: 7, failed: 0, duration: 11900 },
    { name: "Mobile Chrome", tests: 4, passed: 2, failed: 0, duration: 2850 }
  ],
  suites: [
    {
      file: "tests/auth/login.spec.ts",
      project: "chromium",
      duration: 4100,
      status: "passed",
      tests: [
        {
          id: "t-1",
          title: "should successfully login with valid credentials",
          status: "passed",
          durationMs: 1420,
          retries: 0,
          browser: "Chromium",
          steps: [
            { title: "Before Hooks", durationMs: 220, status: "passed" },
            { title: "page.goto(https://example.com/login)", durationMs: 650, status: "passed" },
            { title: "locator('#username').fill('developer@mtricbase.io')", durationMs: 180, status: "passed" },
            { title: "locator('#password').fill('••••••••••••')", durationMs: 110, status: "passed" },
            { title: "locator('button[type=submit]').click()", durationMs: 160, status: "passed" },
            { title: "expect(url).toContain('/dashboard')", durationMs: 100, status: "passed" }
          ],
          logs: [
            "[INFO] Navigating to login page",
            "[DEBUG] Filled form fields securely",
            "[INFO] Clicked submit button, awaiting network idle"
          ],
          attachments: [
            { type: "screenshot", name: "login-success.png", url: "https://placehold.co/800x500/1e293b/38bdf8?text=Playwright+Screenshot:+Login+Success" },
            { type: "trace", name: "trace.zip", size: "1.4 MB" }
          ]
        },
        {
          id: "t-2",
          title: "should show validation error on empty submit",
          status: "passed",
          durationMs: 980,
          retries: 0,
          browser: "Chromium",
          steps: [
            { title: "Before Hooks", durationMs: 150, status: "passed" },
            { title: "page.goto(https://example.com/login)", durationMs: 520, status: "passed" },
            { title: "locator('button[type=submit]').click()", durationMs: 140, status: "passed" },
            { title: "expect(locator('.error-msg')).toBeVisible()", durationMs: 170, status: "passed" }
          ],
          logs: ["[INFO] Verified empty submit validation feedback."],
          attachments: []
        }
      ]
    },
    {
      file: "tests/dashboard/analytics.spec.ts",
      project: "firefox",
      duration: 8900,
      status: "failed",
      tests: [
        {
          id: "t-3",
          title: "should render real-time charts within SLA threshold (<500ms)",
          status: "failed",
          durationMs: 3450,
          retries: 2,
          browser: "Firefox",
          error: {
            message: "Timed out 5000ms waiting for expect(locator('#chart-svg')).toBeVisible()",
            snippet: `  locator('#chart-svg')\n\n  Expected: visible\n  Received: hidden\n  Call log:\n    - expect.toBeVisible with timeout 5000ms\n    - waiting for locator('#chart-svg')`,
            location: "tests/dashboard/analytics.spec.ts:42:15"
          },
          steps: [
            { title: "Before Hooks", durationMs: 310, status: "passed" },
            { title: "page.goto(https://example.com/analytics)", durationMs: 1200, status: "passed" },
            { title: "locator('#chart-svg').waitFor()", durationMs: 5000, status: "failed" }
          ],
          logs: [
            "[WARN] Analytics widget script bundle delayed by 1.2s",
            "[ERROR] DOM element #chart-svg failed mount lifecycle check"
          ],
          attachments: [
            { type: "screenshot", name: "failure-analytics.png", url: "https://placehold.co/800x500/7f1d1d/fca5a5?text=Playwright+Failure:+Chart+Timeout" }
          ]
        },
        {
          id: "t-4",
          title: "should export CSV report successfully",
          status: "flaky",
          durationMs: 4450,
          retries: 1,
          browser: "Firefox",
          error: {
            message: "Retry 1/2: Download stream interrupted. Retrying download handler.",
            snippet: "  Download event triggered with unstable stream header.",
            location: "tests/dashboard/analytics.spec.ts:78:10"
          },
          steps: [
            { title: "Before Hooks", durationMs: 290, status: "passed" },
            { title: "click export button", durationMs: 3100, status: "passed" },
            { title: "validate downloaded csv bytes", durationMs: 1060, status: "passed" }
          ],
          logs: ["[WARN] Stream buffer warning on first attempt. Recovered on retry."],
          attachments: []
        }
      ]
    },
    {
      file: "tests/settings/profile.spec.ts",
      project: "webkit",
      duration: 5200,
      status: "passed",
      tests: [
        {
          id: "t-5",
          title: "should update user profile avatar and bio",
          status: "passed",
          durationMs: 2100,
          retries: 0,
          browser: "WebKit",
          steps: [
            { title: "Before Hooks", durationMs: 200, status: "passed" },
            { title: "upload avatar image file", durationMs: 1200, status: "passed" },
            { title: "click save changes", durationMs: 700, status: "passed" }
          ],
          logs: ["[INFO] Avatar file uploaded successfully in WebKit sandbox."],
          attachments: []
        },
        {
          id: "t-6",
          title: "should enforce strong password policy on update",
          status: "skipped",
          durationMs: 0,
          retries: 0,
          browser: "WebKit",
          steps: [],
          logs: ["[INFO] Test skipped pending backend auth refactor ticket #912."],
          attachments: []
        }
      ]
    }
  ]
};

function mapSteps(rawSteps: any[] | undefined): TestStep[] {
  if (!Array.isArray(rawSteps)) return [];
  return rawSteps.map((s: any) => ({
    title: s.title || 'Step',
    durationMs: Math.round(Number(s.durationMs ?? s.duration ?? 0)),
    status: s.status || (s.error ? 'failed' : 'passed'),
    category: s.category,
    error: typeof s.error === 'string' ? s.error : s.error?.message,
    steps: mapSteps(s.steps),
  }));
}

function countSteps(steps: TestStep[] | undefined): number {
  if (!Array.isArray(steps)) return 0;
  return steps.reduce((acc, s) => acc + 1 + countSteps(s.steps), 0);
}

function isImageAttachment(att: TestAttachment): boolean {
  const t = (att.type || '').toLowerCase();
  const n = (att.name || '').toLowerCase();
  const u = (att.url || '').toLowerCase();
  return (
    t.includes('image') ||
    t.includes('screenshot') ||
    /\.(png|jpe?g|webp|gif)(\?|$)/.test(n) ||
    /\.(png|jpe?g|webp|gif)(\?|$)/.test(u)
  );
}

function isVideoAttachment(att: TestAttachment): boolean {
  const t = (att.type || '').toLowerCase();
  const n = (att.name || '').toLowerCase();
  const u = (att.url || '').toLowerCase();
  return (
    t.includes('video') ||
    /\.(webm|mp4|mov|ogg)(\?|$)/.test(n) ||
    /\.(webm|mp4|mov|ogg)(\?|$)/.test(u)
  );
}

function isWebUrl(url?: string): boolean {
  if (!url) return false;
  return url.startsWith('/') || url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:');
}

const MAX_HISTORY_RUNS = 5;
const HISTORY_STORAGE_KEY = 'mtricbase_playwright_run_history';

function parsePlaywrightJson(raw: any): RunData | null {
  if (!raw) return null;
  if (raw.runId && raw.stats && raw.suites && Array.isArray(raw.suites)) {
    const { history: _ignoredHistory, ...rest } = raw;
    return {
      ...rest,
      suites: raw.suites.map((suite: any) => ({
        ...suite,
        tests: (suite.tests || []).map((t: any) => ({
          ...t,
          steps: mapSteps(t.steps),
        })),
      })),
    } as RunData;
  }
  if (raw.suites && Array.isArray(raw.suites)) {
    try {
      const statsRaw = raw.stats || {};
      const durationMs = Math.round(Number(statsRaw.duration || 0));

      const projectMap: Record<string, { tests: number; passed: number; failed: number; duration: number }> = {};
      const suitesList: TestSuite[] = [];

      const processSuite = (suite: any, fileName = '') => {
        const file = suite.file || fileName || suite.title || 'test.spec.ts';
        const projectSuites: Record<string, TestCase[]> = {};

        if (suite.specs && Array.isArray(suite.specs)) {
          for (const spec of suite.specs) {
            const specTitle = spec.title;
            const tests = spec.tests || [];
            for (let tIdx = 0; tIdx < tests.length; tIdx++) {
              const test = tests[tIdx];
              const proj = test.projectName || test.projectId || 'default';
              if (!projectMap[proj]) {
                projectMap[proj] = { tests: 0, passed: 0, failed: 0, duration: 0 };
              }

              const results = test.results || [];
              const lastResult = results[results.length - 1] || {};
              const testDuration = Math.round(Number(lastResult.duration || 0));
              const testStatus: TestStatus =
                lastResult.status === 'passed' ? 'passed' :
                  lastResult.status === 'timedOut' || lastResult.status === 'failed' ? 'failed' :
                    lastResult.status === 'skipped' ? 'skipped' :
                      test.status === 'flaky' ? 'flaky' : 'passed';

              projectMap[proj].tests += 1;
              if (testStatus === 'passed') projectMap[proj].passed += 1;
              if (testStatus === 'failed') projectMap[proj].failed += 1;
              projectMap[proj].duration += testDuration;

              const errors = lastResult.errors || [];
              const firstErr = errors[0];
              const testCase: TestCase = {
                id: spec.id ? `${spec.id}-${proj}-${tIdx}` : `t-${Math.random()}`,
                title: specTitle,
                status: testStatus,
                durationMs: testDuration,
                retries: Number(lastResult.retry || 0),
                browser: proj,
                steps: mapSteps(lastResult.steps),
                logs: [
                  ...(lastResult.stdout || []).map((o: any) => typeof o === 'string' ? o : o.text || ''),
                  ...(lastResult.stderr || []).map((e: any) => typeof e === 'string' ? e : e.text || '')
                ].filter(Boolean),
                attachments: (lastResult.attachments || []).map((a: any) => ({
                  type: a.contentType || 'attachment',
                  name: a.name || 'file',
                  url: a.path,
                  size: ''
                }))
              };

              if (firstErr) {
                testCase.error = {
                  message: firstErr.message || 'Test failed',
                  snippet: firstErr.snippet || firstErr.stack || '',
                  location: firstErr.location ? `${firstErr.location.file}:${firstErr.location.line}` : `${file}:${spec.line || 1}`
                };
              }

              if (!projectSuites[proj]) {
                projectSuites[proj] = [];
              }
              projectSuites[proj].push(testCase);
            }
          }
        }

        for (const [proj, testCases] of Object.entries(projectSuites)) {
          const hasFail = testCases.some(t => t.status === 'failed');
          suitesList.push({
            file,
            project: proj,
            duration: testCases.reduce((acc, cur) => acc + cur.durationMs, 0),
            status: hasFail ? 'failed' : 'passed',
            tests: testCases
          });
        }

        if (suite.suites && Array.isArray(suite.suites)) {
          for (const subSuite of suite.suites) {
            processSuite(subSuite, file);
          }
        }
      };

      for (const suite of raw.suites) {
        processSuite(suite);
      }

      const projects: ProjectStats[] = Object.entries(projectMap).map(([name, data]) => ({
        name,
        tests: data.tests,
        passed: data.passed,
        failed: data.failed,
        duration: data.duration
      }));

      // Calculate strictly from parsed test cases for 100% precision
      const allTests = suitesList.flatMap(s => s.tests);
      const totalCount = allTests.length;
      const passedCount = allTests.filter(t => t.status === 'passed').length;
      const failedCount = allTests.filter(t => t.status === 'failed').length;
      const flakyCount = allTests.filter(t => t.status === 'flaky').length;
      const skippedCount = allTests.filter(t => t.status === 'skipped').length;
      const successRate = totalCount > 0 ? parseFloat(((passedCount / totalCount) * 100).toFixed(1)) : 100;

      return {
        runId: `run-${Date.now().toString(36)}`,
        timestamp: statsRaw.startTime || new Date().toISOString(),
        environment: raw.config?.rootDir ? `Local (${raw.config.rootDir})` : 'Playwright Suite',
        totalDurationMs: durationMs || allTests.reduce((acc, t) => acc + t.durationMs, 0),
        stats: {
          total: totalCount,
          passed: passedCount,
          failed: failedCount,
          flaky: flakyCount,
          skipped: skippedCount,
          successRate: successRate
        },
        projects: projects.length > 0 ? projects : (raw.config?.projects || []).map((p: any) => ({
          name: p.name || 'default',
          tests: 0,
          passed: 0,
          failed: 0,
          duration: 0
        })),
        suites: suitesList
      };
    } catch (e) {
      console.error('Error parsing Playwright JSON report:', e);
      return null;
    }
  }
  return null;
}

function parsePlaywrightHistory(raw: any): RunData[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((item) => parsePlaywrightJson(item))
      .filter((item): item is RunData => item !== null)
      .slice(0, MAX_HISTORY_RUNS);
  }
  if (raw.history && Array.isArray(raw.history)) {
    const parsedList = raw.history
      .map((item: any) => parsePlaywrightJson(item))
      .filter((item: RunData | null): item is RunData => item !== null);
    if (parsedList.length > 0) {
      return parsedList.slice(0, MAX_HISTORY_RUNS);
    }
  }
  const single = parsePlaywrightJson(raw);
  return single ? [single] : [];
}

function mergeRunHistory(incoming: RunData[], existing: RunData[]): RunData[] {
  const seen = new Set<string>();
  const merged: RunData[] = [];
  for (const run of [...incoming, ...existing]) {
    const key = `${run.timestamp}::${run.stats.total}::${run.totalDurationMs}`;
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(run);
    }
    if (merged.length >= MAX_HISTORY_RUNS) break;
  }
  return merged;
}

function loadStoredHistory(): RunData[] {
  try {
    const saved = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_HISTORY_RUNS) : [];
  } catch {
    return [];
  }
}

function saveStoredHistory(history: RunData[]) {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history.slice(0, MAX_HISTORY_RUNS)));
  } catch {
    // ignore storage quota errors
  }
}

export default function PlaywrightDashboard({ data, initialData }: { data?: any; initialData?: any } = {}) {
  const [runHistory, setRunHistory] = useState<RunData[]>(() => {
    const fromProps = parsePlaywrightHistory(data || initialData);
    const stored = loadStoredHistory();
    const initial =
      fromProps.length > 0
        ? mergeRunHistory(fromProps, stored)
        : stored.length > 0
          ? stored
          : [INITIAL_RUN_DATA];
    if (fromProps.length > 0) saveStoredHistory(initial);
    return initial;
  });
  const [selectedRunIndex, setSelectedRunIndex] = useState<number>(0);

  const runData = runHistory[selectedRunIndex] || runHistory[0] || INITIAL_RUN_DATA;

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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'explorer' | 'integration'>('dashboard');
  const [selectedStatus, setSelectedStatus] = useState<'all' | TestStatus>('all');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [selectedTest, setSelectedTest] = useState<TestCase | null>(null); // test object for modal
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [copiedSnippet, setCopiedSnippet] = useState<'config' | 'reporter' | null>(null);
  const [expandedSuites, setExpandedSuites] = useState<Record<number, boolean>>({ 0: true, 1: true, 2: true });
  const [expandedTests, setExpandedTests] = useState<Record<string, boolean>>({});

  // Toggle suite expansion
  const toggleSuite = (idx: number) => {
    setExpandedSuites(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  // Toggle inline test steps expansion
  const toggleTestSteps = (testId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedTests(prev => ({ ...prev, [testId]: !prev[testId] }));
  };

  // Recursive step timeline renderer (supports nested test.step & Playwright API steps)
  const renderSteps = (steps: TestStep[], depth = 0): React.ReactNode => {
    return (
      <div className={depth === 0 ? 'space-y-2' : 'space-y-1.5 mt-1.5 pl-4 border-l border-slate-700/60'}>
        {steps.map((step, idx) => (
          <div key={`${depth}-${idx}`}>
            <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs font-mono ${darkMode ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center space-x-2.5 min-w-0">
                {step.status === 'passed' ? (
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                )}
                {step.category && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase shrink-0 ${darkMode ? 'bg-slate-800 text-cyan-400' : 'bg-slate-200 text-cyan-700'}`}>
                    {step.category}
                  </span>
                )}
                <span className="font-semibold truncate">{step.title}</span>
              </div>
              <span className="text-slate-400 shrink-0">{step.durationMs}ms</span>
            </div>
            {step.error && (
              <div className="mt-1 ml-4 px-2.5 py-1.5 rounded-lg bg-rose-950/30 border border-rose-900/40 text-[11px] font-mono text-rose-300">
                {step.error}
              </div>
            )}
            {step.steps && step.steps.length > 0 && renderSteps(step.steps, depth + 1)}
          </div>
        ))}
      </div>
    );
  };

  // Sync real live test run telemetry (preserving last 5 runs)
  const handleTriggerRun = async () => {
    setIsSimulating(true);

    const applyFreshJson = (json: any): boolean => {
      const incoming = parsePlaywrightHistory(json);
      if (incoming.length > 0) {
        setRunHistory((prev) => {
          const next = mergeRunHistory(incoming, prev);
          saveStoredHistory(next);
          return next;
        });
        setSelectedRunIndex(0);
        return true;
      }
      return false;
    };

    try {
      // 1. Try to fetch newly generated results from public data folder
      const res = await fetch(`/data/playwright-results.json?t=${Date.now()}`);
      if (res.ok) {
        const json = await res.json();
        if (applyFreshJson(json)) {
          setIsSimulating(false);
          return;
        }
      }
    } catch {
      // fallback
    }

    try {
      // 2. Try results.json
      const res = await fetch(`/data/results.json?t=${Date.now()}`);
      if (res.ok) {
        const json = await res.json();
        if (applyFreshJson(json)) {
          setIsSimulating(false);
          return;
        }
      }
    } catch {
      // fallback
    }

    // 3. Fallback to passed prop data
    applyFreshJson(data || initialData);

    setTimeout(() => {
      setIsSimulating(false);
    }, 400);
  };

  // Filtered test suites & test cases
  const filteredSuites = useMemo(() => {
    return runData.suites.map(suite => {
      const filteredTests = suite.tests.filter(t => {
        const matchesStatus = selectedStatus === 'all' || t.status === selectedStatus;
        const matchesProj = selectedProject === 'all' || suite.project.toLowerCase() === selectedProject.toLowerCase();
        const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          suite.file.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesProj && matchesSearch;
      });
      return { ...suite, tests: filteredTests };
    }).filter(suite => suite.tests.length > 0);
  }, [runData, selectedStatus, selectedProject, searchQuery]);

  const copySnippet = async (code: string, target: 'config' | 'reporter') => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = code;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedSnippet(target);
      setTimeout(() => setCopiedSnippet(null), 2000);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  const sampleReporterCode = `// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  // Use custom reporter so steps, screenshots & videos are copied for the dashboard
  reporter: [
    ['html'],
    ['./reporters/mtricbase-reporter.ts']
  ],
  use: {
    trace: 'on-first-retry',
    screenshot: 'on', // or 'only-on-failure'
    video: 'on',      // or 'retain-on-failure'
  },
});`;

  const sampleCustomReporterTS = `// reporters/mtricbase-reporter.ts
import fs from 'fs';
import path from 'path';
import type { Reporter, FullConfig, FullResult, TestCase, TestResult, TestStep } from '@playwright/test/reporter';

function serializeSteps(steps: TestStep[]): any[] {
  return steps.map((step) => ({
    title: step.title,
    category: step.category,
    durationMs: Math.round(step.duration),
    status: step.error ? 'failed' : 'passed',
    error: step.error?.message,
    steps: serializeSteps(step.steps || []),
  }));
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return \`\${bytes} B\`;
  if (bytes < 1024 * 1024) return \`\${(bytes / 1024).toFixed(1)} KB\`;
  return \`\${(bytes / (1024 * 1024)).toFixed(2)} MB\`;
}

class MtricbaseReporter implements Reporter {
  private runId = \`run-\${Date.now().toString(36)}\`;
  private startTime = new Date().toISOString();
  private rootDir = '';
  private suitesMap = new Map<string, any>();
  private artifactsRoot = path.resolve(__dirname, '../../playwright-dashboard/public/artifacts');

  onBegin(config: FullConfig) {
    this.runId = \`run-\${Date.now().toString(36)}\`;
    this.startTime = new Date().toISOString();
    this.rootDir = config.rootDir;
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const project = test.parent.project()?.name || 'default';
    const relFile = path.relative(this.rootDir || process.cwd(), test.location.file).replace(/\\\\/g, '/');
    const key = \`\${relFile}::\${project}\`;

    if (!this.suitesMap.has(key)) {
      this.suitesMap.set(key, { file: relFile, project, duration: 0, status: 'passed', tests: [] });
    }

    const status =
      result.status === 'passed' ? 'passed' :
      result.status === 'skipped' ? 'skipped' : 'failed';

    const suite = this.suitesMap.get(key);
    suite.duration += Math.round(result.duration);
    if (status === 'failed') suite.status = 'failed';

    // Copy screenshots, videos & attachments into dashboard public/artifacts/<runId>/
    const runArtifactsDir = path.join(this.artifactsRoot, this.runId);
    const attachments = result.attachments.map((a, idx) => {
      const extFromPath = a.path ? path.extname(a.path) : '';
      const extFromType =
        a.contentType.includes('png') ? '.png' :
        a.contentType.includes('jpeg') || a.contentType.includes('jpg') ? '.jpg' :
        a.contentType.includes('webm') ? '.webm' :
        a.contentType.includes('mp4') ? '.mp4' :
        a.contentType.includes('zip') ? '.zip' : '';
      const ext = extFromPath || extFromType;
      const safeName = \`\${test.id}-\${project}-\${idx}-\${a.name}\`.replace(/[^a-zA-Z0-9._-]/g, '_') + (a.name.endsWith(ext) ? '' : ext);

      let publicUrl: string | undefined;
      let size: string | undefined;
      try {
        if (a.path && fs.existsSync(a.path)) {
          fs.mkdirSync(runArtifactsDir, { recursive: true });
          const dest = path.join(runArtifactsDir, safeName);
          fs.copyFileSync(a.path, dest);
          publicUrl = \`/artifacts/\${this.runId}/\${safeName}\`;
          size = formatBytes(fs.statSync(dest).size);
        } else if (a.body) {
          fs.mkdirSync(runArtifactsDir, { recursive: true });
          const dest = path.join(runArtifactsDir, safeName);
          fs.writeFileSync(dest, a.body);
          publicUrl = \`/artifacts/\${this.runId}/\${safeName}\`;
          size = formatBytes(a.body.length);
        }
      } catch {}

      return {
        type: a.contentType,
        name: a.name + (ext && !a.name.endsWith(ext) ? ext : ''),
        url: publicUrl,
        size,
      };
    });

    suite.tests.push({
      id: \`\${test.id}-\${project}\`,
      title: test.title,
      status,
      durationMs: Math.round(result.duration),
      retries: result.retry,
      browser: project,
      error: result.error ? {
        message: result.error.message || 'Test failed',
        snippet: result.error.snippet || result.error.stack || '',
        location: \`\${relFile}:\${test.location.line}:\${test.location.column}\`,
      } : undefined,
      steps: serializeSteps(result.steps),
      logs: [
        ...result.stdout.map((c) => c.toString()),
        ...result.stderr.map((c) => c.toString()),
      ].filter(Boolean),
      attachments,
    });
  }

  onEnd(result: FullResult) {
    const suites = Array.from(this.suitesMap.values());
    const allTests = suites.flatMap((s) => s.tests);
    const total = allTests.length;
    const passed = allTests.filter((t) => t.status === 'passed').length;
    const failed = allTests.filter((t) => t.status === 'failed').length;
    const flaky = allTests.filter((t) => t.status === 'flaky').length;
    const skipped = allTests.filter((t) => t.status === 'skipped').length;

    const projectMap: Record<string, any> = {};
    for (const s of suites) {
      if (!projectMap[s.project]) {
        projectMap[s.project] = { name: s.project, tests: 0, passed: 0, failed: 0, duration: 0 };
      }
      for (const t of s.tests) {
        projectMap[s.project].tests += 1;
        if (t.status === 'passed') projectMap[s.project].passed += 1;
        if (t.status === 'failed') projectMap[s.project].failed += 1;
        projectMap[s.project].duration += t.durationMs;
      }
    }

    const payload = {
      runId: this.runId,
      timestamp: this.startTime,
      environment: \`Local (\${this.rootDir})\`,
      totalDurationMs: Math.round(result.duration),
      stats: {
        total,
        passed,
        failed,
        flaky,
        skipped,
        successRate: total > 0 ? parseFloat(((passed / total) * 100).toFixed(1)) : 100,
      },
      projects: Object.values(projectMap),
      suites,
    };

    const targets = [
      path.resolve(__dirname, '../../playwright-dashboard/src/data/playwright-results.json'),
      path.resolve(__dirname, '../../playwright-dashboard/public/data/playwright-results.json'),
    ];

    // Load previous runs (up to last 5) from existing JSON file
    let existingHistory: any[] = [];
    try {
      if (fs.existsSync(targets[0])) {
        const prev = JSON.parse(fs.readFileSync(targets[0], 'utf-8'));
        if (Array.isArray(prev.history)) {
          existingHistory = prev.history;
        } else if (prev.runId) {
          const { history: _h, ...singleRun } = prev;
          existingHistory = [singleRun];
        }
      }
    } catch {}

    const updatedHistory = [payload, ...existingHistory].slice(0, 5);
    const output = { ...payload, history: updatedHistory };

    for (const filePath of targets) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, JSON.stringify(output, null, 2));
    }

    // Clean up artifact folders for runs older than the last 5
    try {
      const keptRunIds = new Set(updatedHistory.map((r) => r.runId));
      if (fs.existsSync(this.artifactsRoot)) {
        for (const entry of fs.readdirSync(this.artifactsRoot)) {
          if (!keptRunIds.has(entry)) {
            fs.rmSync(path.join(this.artifactsRoot, entry), { recursive: true, force: true });
          }
        }
      }
    } catch {}
  }
}

export default MtricbaseReporter;`;

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>

      {/* TOP NAVBAR */}
      <header className={`sticky top-0 z-40 border-b backdrop-blur-md ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white font-black text-xl tracking-wider">
              mτ
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight">mtricbase</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${darkMode ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-cyan-50 text-cyan-700 border border-cyan-200'}`}>
                  Playwright Runtime v2.6
                </span>
              </div>
              <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Advanced Test Execution Intelligence & Telemetry Dashboard
              </p>
            </div>
          </div>

          {/* Nav Tabs & Actions */}
          <div className="flex items-center space-x-3">
            <nav className={`hidden md:flex p-1 rounded-xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center space-x-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'dashboard' ? (darkMode ? 'bg-cyan-500 text-slate-950 shadow-md' : 'bg-white text-slate-900 shadow-sm') : (darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900')}`}
              >
                <BarChart2 className="w-3.5 h-3.5" />
                <span>Overview</span>
              </button>
              <button
                onClick={() => setActiveTab('explorer')}
                className={`flex items-center space-x-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'explorer' ? (darkMode ? 'bg-cyan-500 text-slate-950 shadow-md' : 'bg-white text-slate-900 shadow-sm') : (darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900')}`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Test Explorer</span>
                <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'explorer' ? 'bg-slate-900 text-cyan-400' : 'bg-cyan-500/20 text-cyan-400'}`}>
                  {runData.stats.total}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('integration')}
                className={`flex items-center space-x-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'integration' ? (darkMode ? 'bg-cyan-500 text-slate-950 shadow-md' : 'bg-white text-slate-900 shadow-sm') : (darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900')}`}
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Integration & Live Run</span>
              </button>
            </nav>

            <button
              onClick={handleTriggerRun}
              disabled={isSimulating}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 ${isSimulating ? 'bg-cyan-500/50 text-slate-950 cursor-wait' : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-400 hover:to-blue-500 shadow-cyan-500/20'}`}
              title="Sync latest Playwright test execution"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
              <span>{isSimulating ? 'Syncing...' : 'Sync Test Results'}</span>
            </button>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-xl border transition-colors ${darkMode ? 'bg-slate-900 border-slate-800 text-amber-400 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'}`}
              title="Toggle Theme"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* MOBILE NAV TABS */}
      <div className={`md:hidden flex border-b px-4 py-2 space-x-2 overflow-x-auto ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <button onClick={() => setActiveTab('dashboard')} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400'}`}>Overview</button>
        <button onClick={() => setActiveTab('explorer')} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${activeTab === 'explorer' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400'}`}>Test Explorer</button>
        <button onClick={() => setActiveTab('integration')} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${activeTab === 'integration' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400'}`}>Integration & Simulation</button>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* RECENT RUNS HISTORY BAR (LAST 5 RUNS) */}
        {activeTab !== 'integration' && runHistory.length > 0 && (
          <div className={`p-4 rounded-2xl border space-y-3 ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Recent Test Runs ({runHistory.length} / {MAX_HISTORY_RUNS})
                </h2>
              </div>
              {selectedRunIndex > 0 && (
                <button
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
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? (darkMode ? 'bg-cyan-500/10 border-cyan-500/60 ring-1 ring-cyan-500/40' : 'bg-cyan-50 border-cyan-400 ring-1 ring-cyan-300')
                        : (darkMode ? 'bg-slate-950/50 border-slate-800 hover:border-slate-700' : 'bg-slate-50 border-slate-200 hover:border-slate-300')
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        idx === 0
                          ? 'bg-cyan-500/20 text-cyan-400'
                          : (darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700')
                      }`}>
                        {idx === 0 ? 'Latest' : `Run #${idx + 1}`}
                      </span>
                      <span className={`text-xs font-bold font-mono ${run.stats.failed > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {run.stats.successRate}%
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 truncate">
                      {new Date(run.timestamp).toLocaleTimeString()} · {new Date(run.timestamp).toLocaleDateString()}
                    </div>
                    <div className="flex items-center justify-between mt-1.5 text-[10px] font-mono">
                      <span className="text-emerald-400">{run.stats.passed}/{run.stats.total} pass</span>
                      {run.stats.failed > 0 ? (
                        <span className="text-rose-400">{run.stats.failed} fail</span>
                      ) : (
                        <span className="text-slate-500">{(run.totalDurationMs / 1000).toFixed(1)}s</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* --- TAB 1: OVERVIEW & ANALYTICS --- */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-fadeIn">

            {/* Run Header Info Banner */}
            <div className={`p-6 rounded-2xl border shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 ${darkMode ? 'bg-gradient-to-r from-slate-900 to-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest">Active Runtime Session: {runData.runId}</span>
                </div>
                <h1 className="text-2xl font-bold tracking-tight">Playwright E2E Test Suite Execution</h1>
                <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Executed on <span className="font-semibold">{runData.environment}</span> at {new Date(runData.timestamp).toLocaleTimeString()} ({new Date(runData.timestamp).toLocaleDateString()})
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <div className={`px-4 py-2.5 rounded-xl border flex items-center space-x-3 ${darkMode ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <Clock className="w-4 h-4 text-cyan-400" />
                  <div>
                    <div className="text-[10px] uppercase text-slate-400 font-medium">Total Duration</div>
                    <div className="text-sm font-bold font-mono">{(runData.totalDurationMs / 1000).toFixed(2)}s</div>
                  </div>
                </div>
                <div className={`px-4 py-2.5 rounded-xl border flex items-center space-x-3 ${darkMode ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <div>
                    <div className="text-[10px] uppercase text-slate-400 font-medium">Success Rate</div>
                    <div className="text-sm font-bold font-mono text-emerald-400">{runData.stats.successRate}%</div>
                  </div>
                </div>
              </div>
            </div>

            {/* KEY METRIC COUNTERS */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className={`p-4 rounded-2xl border transition-all hover:scale-[1.02] ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-400">Total Tests</span>
                  <FileText className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="text-2xl font-bold font-mono">{runData.stats.total}</div>
                <div className="text-[10px] text-cyan-400 mt-1">Across 4 Browsers</div>
              </div>

              <div className={`p-4 rounded-2xl border transition-all hover:scale-[1.02] ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-400">Passed</span>
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-emerald-400">{runData.stats.passed}</div>
                <div className="text-[10px] text-emerald-500/80 mt-1">Ready for deploy</div>
              </div>

              <div className={`p-4 rounded-2xl border transition-all hover:scale-[1.02] ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-400">Failed</span>
                  <XCircle className="w-4 h-4 text-rose-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-rose-400">{runData.stats.failed}</div>
                <div className="text-[10px] text-rose-400/80 mt-1">Requires inspection</div>
              </div>

              <div className={`p-4 rounded-2xl border transition-all hover:scale-[1.02] ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-400">Flaky</span>
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-amber-400">{runData.stats.flaky}</div>
                <div className="text-[10px] text-amber-400/80 mt-1">Passed on retry</div>
              </div>

              <div className={`p-4 rounded-2xl border transition-all hover:scale-[1.02] ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-400">Skipped</span>
                  <Clock className="w-4 h-4 text-slate-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-slate-400">{runData.stats.skipped}</div>
                <div className="text-[10px] text-slate-500 mt-1">Pending refactor</div>
              </div>

              <div className={`p-4 rounded-2xl border transition-all hover:scale-[1.02] ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-400">Success Rate</span>
                  <Shield className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-cyan-400">{runData.stats.successRate}%</div>
                <div className="text-[10px] text-cyan-400/80 mt-1">Threshold &gt; 80%</div>
              </div>
            </div>

            {/* VISUAL RUN BREAKDOWN & PROJECTS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Progress Bar & Status Distribution */}
              <div className={`p-6 rounded-2xl border lg:col-span-2 space-y-6 ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm tracking-wide">Test Execution Status Breakdown</h3>
                  <span className="text-xs text-slate-400">Total {runData.stats.total} specs</span>
                </div>

                {/* Multi-segmented progress bar */}
                <div className="space-y-2">
                  <div className="h-4 w-full rounded-full overflow-hidden flex bg-slate-800">
                    <div style={{ width: `${(runData.stats.passed / runData.stats.total) * 100}%` }} className="bg-emerald-500 transition-all duration-500" title="Passed" />
                    <div style={{ width: `${(runData.stats.failed / runData.stats.total) * 100}%` }} className="bg-rose-500 transition-all duration-500" title="Failed" />
                    <div style={{ width: `${(runData.stats.flaky / runData.stats.total) * 100}%` }} className="bg-amber-500 transition-all duration-500" title="Flaky" />
                    <div style={{ width: `${(runData.stats.skipped / runData.stats.total) * 100}%` }} className="bg-slate-500 transition-all duration-500" title="Skipped" />
                  </div>

                  <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 pt-1">
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
                      <span>Flaky ({runData.stats.flaky})</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="w-3 h-3 rounded-full bg-slate-500 inline-block" />
                      <span>Skipped ({runData.stats.skipped})</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800/60 space-y-3">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Playwright Projects / Browsers</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {runData.projects.map((proj, idx) => (
                      <div key={idx} className={`p-3 rounded-xl border flex items-center justify-between ${darkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="flex items-center space-x-2.5">
                          {proj.name.includes('Mobile') ? <Smartphone className="w-4 h-4 text-cyan-400" /> : <Globe className="w-4 h-4 text-cyan-400" />}
                          <span className="text-xs font-semibold capitalize">{proj.name}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-mono text-emerald-400">{proj.passed}/{proj.tests} pass</span>
                          {proj.failed > 0 && <span className="text-xs font-mono text-rose-400">{proj.failed} fail</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Quick Actions & Recent Failures Summary */}
              <div className={`p-6 rounded-2xl border space-y-4 ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                <h3 className="font-bold text-sm tracking-wide flex items-center justify-between">
                  <span>Actionable Failures</span>
                  <span className="text-xs text-rose-400 font-mono">({runData.stats.failed} tests)</span>
                </h3>

                <div className="space-y-3">
                  {runData.stats.failed > 0 && runData.suites.flatMap(s => s.tests).filter(t => t.status === 'failed').map(failTest => (
                    <div
                      key={failTest.id}
                      onClick={() => setSelectedTest(failTest)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer group ${darkMode ? 'bg-rose-950/10 border-rose-900/30 hover:bg-rose-950/20' : 'bg-rose-50 border-rose-200 hover:bg-rose-100/50'}`}
                    >
                      <div className="flex items-start justify-between">
                        <span className="text-xs font-semibold text-rose-400 group-hover:underline line-clamp-1">{failTest.title}</span>
                        <XCircle className="w-4 h-4 text-rose-400 shrink-0 ml-2" />
                      </div>
                      <p className={`text-[11px] font-mono mt-1 line-clamp-2 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        {failTest.error?.message}
                      </p>
                      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                        <span className="font-mono">{failTest.browser}</span>
                        <span className="text-cyan-400 group-hover:underline flex items-center space-x-1">Inspect stack &rarr;</span>
                      </div>
                    </div>
                  ))}

                  {runData.stats.failed === 0 && (
                    <div className="py-8 text-center space-y-2">
                      <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto" />
                      <div className="text-sm font-semibold text-emerald-400">All tests passed successfully!</div>
                      <p className="text-xs text-slate-400">No failures detected in current runtime session.</p>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setActiveTab('explorer')}
                  className={`w-full py-2.5 rounded-xl text-xs font-semibold border transition-colors flex items-center justify-center space-x-2 ${darkMode ? 'bg-slate-950 border-slate-800 hover:bg-slate-800 text-cyan-400' : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-cyan-600'}`}
                >
                  <span>Open Full Test Suite Explorer</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>

          </div>
        )}

        {/* --- TAB 2: TEST SUITE & CASE EXPLORER --- */}
        {activeTab === 'explorer' && (
          <div className="space-y-6 animate-fadeIn">

            {/* Filter & Search Bar */}
            <div className={`p-4 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-4 ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search test name or file path..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 rounded-xl text-xs border outline-none transition-colors ${darkMode ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-cyan-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-cyan-500'}`}
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                {/* Status Filter */}
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs text-slate-400 font-medium">Status:</span>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value as 'all' | TestStatus)}
                    className={`px-3 py-1.5 rounded-xl text-xs border outline-none font-medium capitalize ${darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                  >
                    <option value="all">All Status</option>
                    <option value="passed">Passed</option>
                    <option value="failed">Failed</option>
                    <option value="flaky">Flaky</option>
                    <option value="skipped">Skipped</option>
                  </select>
                </div>

                {/* Project Filter */}
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs text-slate-400 font-medium">Project:</span>
                  <select
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                    className={`px-3 py-1.5 rounded-xl text-xs border outline-none font-medium capitalize ${darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                  >
                    <option value="all">All Projects</option>
                    <option value="chromium">Chromium</option>
                    <option value="firefox">Firefox</option>
                    <option value="webkit">WebKit</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Test Suites Hierarchical Tree */}
            <div className="space-y-4">
              {filteredSuites.map((suite, suiteIdx) => (
                <div key={suiteIdx} className={`rounded-2xl border overflow-hidden ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>

                  {/* Suite Header */}
                  <div
                    onClick={() => toggleSuite(suiteIdx)}
                    className={`px-5 py-3.5 flex items-center justify-between cursor-pointer transition-colors ${darkMode ? 'bg-slate-950/60 hover:bg-slate-800/50' : 'bg-slate-100/70 hover:bg-slate-100'}`}
                  >
                    <div className="flex items-center space-x-3">
                      {expandedSuites[suiteIdx] ? <ChevronDown className="w-4 h-4 text-cyan-400" /> : <ChevronRight className="w-4 h-4 text-cyan-400" />}
                      <Folder className="w-4 h-4 text-cyan-400" />
                      <span className="font-mono text-xs font-semibold">{suite.file}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-mono ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'}`}>
                        {suite.project}
                      </span>
                    </div>

                    <div className="flex items-center space-x-4">
                      <span className="text-xs text-slate-400 font-mono">{(suite.duration / 1000).toFixed(2)}s</span>
                      <span className={`text-xs font-bold font-mono px-2.5 py-0.5 rounded-full ${suite.status === 'passed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                        {suite.status}
                      </span>
                    </div>
                  </div>

                  {/* Suite Test Cases */}
                  {expandedSuites[suiteIdx] && (
                    <div className="divide-y divide-slate-800/40">
                      {suite.tests.map((test) => {
                        const totalSteps = countSteps(test.steps);
                        const screenshotCount = (test.attachments || []).filter(isImageAttachment).length;
                        const videoCount = (test.attachments || []).filter(isVideoAttachment).length;
                        const isStepsOpen = !!expandedTests[test.id];
                        return (
                          <div key={test.id}>
                            <div
                              onClick={() => setSelectedTest(test)}
                              className={`px-6 py-3.5 flex items-center justify-between transition-colors cursor-pointer group ${darkMode ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}`}
                            >
                              <div className="flex items-center space-x-3">
                                {test.status === 'passed' && <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />}
                                {test.status === 'failed' && <XCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                                {test.status === 'flaky' && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}
                                {test.status === 'skipped' && <Clock className="w-4 h-4 text-slate-400 shrink-0" />}

                                <div>
                                  <div className="text-xs font-medium group-hover:text-cyan-400 transition-colors">{test.title}</div>
                                  <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                    <span className="text-[10px] text-slate-500 font-mono">{test.browser}</span>
                                    {totalSteps > 0 && (
                                      <button
                                        type="button"
                                        onClick={(e) => toggleTestSteps(test.id, e)}
                                        className={`inline-flex items-center space-x-1 text-[10px] px-1.5 py-0.5 rounded font-mono transition-colors ${darkMode ? 'bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20' : 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100'}`}
                                      >
                                        {isStepsOpen ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronRight className="w-2.5 h-2.5" />}
                                        <span>{totalSteps} {totalSteps === 1 ? 'step' : 'steps'}</span>
                                      </button>
                                    )}
                                    {screenshotCount > 0 && (
                                      <span className={`inline-flex items-center space-x-1 text-[10px] px-1.5 py-0.5 rounded font-mono ${darkMode ? 'bg-indigo-500/10 text-indigo-300' : 'bg-indigo-50 text-indigo-700'}`}>
                                        <ImageIcon className="w-2.5 h-2.5" />
                                        <span>{screenshotCount}</span>
                                      </span>
                                    )}
                                    {videoCount > 0 && (
                                      <span className={`inline-flex items-center space-x-1 text-[10px] px-1.5 py-0.5 rounded font-mono ${darkMode ? 'bg-purple-500/10 text-purple-300' : 'bg-purple-50 text-purple-700'}`}>
                                        <Video className="w-2.5 h-2.5" />
                                        <span>{videoCount}</span>
                                      </span>
                                    )}
                                    {test.retries > 0 && <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 font-mono">Retries: {test.retries}</span>}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center space-x-4">
                                <span className="text-xs font-mono text-slate-400">{(test.durationMs / 1000).toFixed(2)}s</span>
                                <span className="text-xs text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
                                  <span>Inspect</span>
                                  <ChevronRight className="w-3 h-3" />
                                </span>
                              </div>
                            </div>

                            {isStepsOpen && test.steps && test.steps.length > 0 && (
                              <div className={`px-6 pb-4 pt-1 ${darkMode ? 'bg-slate-950/30' : 'bg-slate-50/70'}`}>
                                {renderSteps(test.steps)}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                </div>
              ))}

              {filteredSuites.length === 0 && (
                <div className={`p-12 text-center rounded-2xl border space-y-3 ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <HelpCircle className="w-10 h-10 text-slate-500 mx-auto" />
                  <div className="text-sm font-semibold">No tests match your filter criteria</div>
                  <p className="text-xs text-slate-400">Try adjusting your status filter, project selection, or search query.</p>
                </div>
              )}
            </div>

          </div>
        )}

        {/* --- TAB 3: INTEGRATION GUIDE & LIVE SIMULATION --- */}
        {activeTab === 'integration' && (
          <div className="space-y-8 animate-fadeIn">

            {/* Intro banner */}
            <div className={`p-6 rounded-2xl border relative overflow-hidden space-y-3 ${darkMode ? 'bg-gradient-to-r from-slate-900 to-indigo-950/40 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className="flex items-center space-x-2 text-cyan-400 text-xs font-mono uppercase tracking-widest">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Zero-Friction Playwright Integration</span>
              </div>
              <h2 className="text-2xl font-bold">Connect your Playwright project in minutes</h2>
              <p className={`text-xs max-w-2xl ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                mtricbase integrates directly into your existing Playwright configuration with zero structural changes. Configure a custom reporter in your <code className="text-cyan-400 font-mono">playwright.config.ts</code> to stream runtime telemetry instantly.
              </p>
            </div>

            {/* Code Snippets Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Step 1: playwright.config.ts */}
              <div className={`rounded-2xl border overflow-hidden flex flex-col ${darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className={`px-5 py-3.5 border-b flex items-center justify-between ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-cyan-400" />
                    <span className="font-mono text-xs font-bold">playwright.config.ts</span>
                  </div>
                  <button
                    onClick={() => copySnippet(sampleReporterCode, 'config')}
                    className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-colors"
                  >
                    {copiedSnippet === 'config' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSnippet === 'config' ? 'Copied!' : 'Copy Config'}</span>
                  </button>
                </div>
                <div className="p-4 font-mono text-xs overflow-x-auto text-cyan-300 bg-slate-950 flex-1">
                  <pre>{sampleReporterCode}</pre>
                </div>
              </div>

              {/* Step 2: Custom Reporter */}
              <div className={`rounded-2xl border overflow-hidden flex flex-col ${darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className={`px-5 py-3.5 border-b flex items-center justify-between ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
                  <div className="flex items-center space-x-2">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <span className="font-mono text-xs font-bold">reporters/mtricbase-reporter.ts</span>
                  </div>
                  <button
                    onClick={() => copySnippet(sampleCustomReporterTS, 'reporter')}
                    className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                  >
                    {copiedSnippet === 'reporter' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSnippet === 'reporter' ? 'Copied!' : 'Copy Reporter'}</span>
                  </button>
                </div>
                <div className="p-4 font-mono text-xs overflow-x-auto text-emerald-300 bg-slate-950 flex-1">
                  <pre>{sampleCustomReporterTS}</pre>
                </div>
              </div>

            </div>

            {/* Live simulation control */}
            <div className={`p-6 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className="space-y-1">
                <h3 className="font-bold text-sm">Playwright Test Run Synchronizer</h3>
                <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Syncs and loads the latest test execution telemetry directly from your Playwright JSON report.
                </p>
              </div>
              <button
                onClick={handleTriggerRun}
                disabled={isSimulating}
                className="px-5 py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs hover:bg-cyan-400 transition-colors shadow-lg shadow-cyan-500/20 flex items-center justify-center space-x-2"
              >
                <RefreshCw className={`w-4 h-4 ${isSimulating ? 'animate-spin' : ''}`} />
                <span>{isSimulating ? 'Syncing Run...' : 'Sync Latest Test Run'}</span>
              </button>
            </div>

          </div>
        )}

      </main>

      {/* --- DETAILED TEST INSPECTION MODAL / DRAWER --- */}
      {selectedTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn">
          <div className={`w-full max-w-3xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'}`}>

            {/* Modal Header */}
            <div className={`px-6 py-4 border-b flex items-center justify-between ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
              <div className="flex items-center space-x-3">
                {selectedTest.status === 'passed' && <CheckCircle className="w-5 h-5 text-emerald-400" />}
                {selectedTest.status === 'failed' && <XCircle className="w-5 h-5 text-rose-400" />}
                {selectedTest.status === 'flaky' && <AlertTriangle className="w-5 h-5 text-amber-400" />}
                {selectedTest.status === 'skipped' && <Clock className="w-5 h-5 text-slate-400" />}
                <div>
                  <h3 className="font-bold text-sm">{selectedTest.title}</h3>
                  <div className="flex items-center space-x-2 mt-0.5 text-xs text-slate-400">
                    <span className="font-mono">{selectedTest.browser}</span>
                    <span>•</span>
                    <span className="font-mono">{(selectedTest.durationMs / 1000).toFixed(2)}s</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedTest(null)}
                className={`p-2 rounded-xl text-xs font-bold border transition-colors ${darkMode ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300' : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'}`}
              >
                ✕ Close
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">

              {/* Error Stack Trace if Failed */}
              {selectedTest.error && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center space-x-1.5">
                    <XCircle className="w-4 h-4" />
                    <span>Failure Stack Trace & Error</span>
                  </div>
                  <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-900/50 font-mono text-xs text-rose-300 space-y-2 overflow-x-auto">
                    <div className="font-bold">{selectedTest.error.message}</div>
                    <pre className="text-[11px] text-rose-200/80">{selectedTest.error.snippet}</pre>
                    <div className="text-[10px] text-slate-400 pt-1 border-t border-rose-900/50">Location: {selectedTest.error.location}</div>
                  </div>
                </div>
              )}

              {/* Steps Timeline */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Playwright Execution Steps Timeline</div>
                  {selectedTest.steps && selectedTest.steps.length > 0 && (
                    <span className="text-[10px] font-mono text-cyan-400">{countSteps(selectedTest.steps)} steps recorded</span>
                  )}
                </div>
                {selectedTest.steps && selectedTest.steps.length > 0 ? (
                  renderSteps(selectedTest.steps)
                ) : (
                  <div className={`p-4 rounded-xl border text-xs text-slate-400 italic ${darkMode ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    No step timeline recorded. Playwright's built-in JSON reporter omits steps — use the custom reporter in the Integration tab to capture full execution steps.
                  </div>
                )}
              </div>

              {/* Console Logs */}
              {selectedTest.logs && selectedTest.logs.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Console Output (stdout / stderr)</div>
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 space-y-1 overflow-x-auto">
                    {selectedTest.logs.map((log, idx) => (
                      <div key={idx}>{log}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* Attachments (Screenshots, Videos & Traces) */}
              {selectedTest.attachments && selectedTest.attachments.length > 0 && (() => {
                const screenshots = selectedTest.attachments.filter(isImageAttachment);
                const videos = selectedTest.attachments.filter(isVideoAttachment);
                const otherFiles = selectedTest.attachments.filter((a) => !isImageAttachment(a) && !isVideoAttachment(a));

                return (
                  <div className="space-y-5">
                    {/* Inline Screenshots */}
                    {screenshots.length > 0 && (
                      <div className="space-y-3">
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                          <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Screenshots ({screenshots.length})</span>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                          {screenshots.map((att, idx) => (
                            <div key={idx} className={`rounded-xl border overflow-hidden ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                              <div className={`px-3.5 py-2 border-b flex items-center justify-between text-xs ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                                <div className="flex items-center space-x-2 min-w-0">
                                  <ImageIcon className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                                  <span className="font-mono font-medium truncate">{att.name}</span>
                                  {att.size && <span className="text-[10px] text-slate-500 font-mono">({att.size})</span>}
                                </div>
                                {isWebUrl(att.url) && (
                                  <div className="flex items-center space-x-3 shrink-0">
                                    <a href={att.url} download={att.name} className="text-slate-400 hover:text-cyan-400 flex items-center space-x-1">
                                      <Download className="w-3 h-3" />
                                      <span>Download</span>
                                    </a>
                                    <a href={att.url} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline flex items-center space-x-1">
                                      <span>Full Size</span>
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  </div>
                                )}
                              </div>
                              {isWebUrl(att.url) ? (
                                <a href={att.url} target="_blank" rel="noreferrer" className="block p-3">
                                  <img
                                    src={att.url}
                                    alt={att.name}
                                    className="w-full max-h-96 object-contain rounded-lg bg-slate-900/60"
                                  />
                                </a>
                              ) : (
                                <div className="p-3 text-xs text-amber-400 font-mono">
                                  Local path cannot be loaded by browser ({att.url || 'no path'}). Copy artifacts to public/artifacts/ using mtricbase-reporter.ts (see Integration tab).
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Inline Video Players */}
                    {videos.length > 0 && (
                      <div className="space-y-3">
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                          <Video className="w-3.5 h-3.5 text-purple-400" />
                          <span>Execution Videos ({videos.length})</span>
                        </div>
                        <div className="space-y-4">
                          {videos.map((att, idx) => (
                            <div key={idx} className={`rounded-xl border overflow-hidden ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                              <div className={`px-3.5 py-2 border-b flex items-center justify-between text-xs ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                                <div className="flex items-center space-x-2 min-w-0">
                                  <Video className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                                  <span className="font-mono font-medium truncate">{att.name}</span>
                                  {att.size && <span className="text-[10px] text-slate-500 font-mono">({att.size})</span>}
                                </div>
                                {isWebUrl(att.url) && (
                                  <div className="flex items-center space-x-3 shrink-0">
                                    <a href={att.url} download={att.name} className="text-slate-400 hover:text-cyan-400 flex items-center space-x-1">
                                      <Download className="w-3 h-3" />
                                      <span>Download</span>
                                    </a>
                                    <a href={att.url} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline flex items-center space-x-1">
                                      <span>Open</span>
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  </div>
                                )}
                              </div>
                              {isWebUrl(att.url) ? (
                                <div className="p-3">
                                  <video
                                    controls
                                    preload="metadata"
                                    src={att.url}
                                    className="w-full max-h-96 rounded-lg bg-black"
                                  >
                                    Your browser does not support embedded video playback.
                                  </video>
                                </div>
                              ) : (
                                <div className="p-3 text-xs text-amber-400 font-mono">
                                  Local video path cannot be played by browser ({att.url || 'no path'}). Copy videos to public/artifacts/ using mtricbase-reporter.ts (see Integration tab).
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Other Artifacts (Traces, Logs, etc.) */}
                    {otherFiles.length > 0 && (
                      <div className="space-y-3">
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Other Test Artifacts</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {otherFiles.map((att, idx) => (
                            <div key={idx} className={`p-3 rounded-xl border flex items-center justify-between ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                              <div className="flex items-center space-x-2 min-w-0">
                                <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                                <span className="text-xs font-mono font-medium truncate">{att.name}</span>
                              </div>
                              {isWebUrl(att.url) ? (
                                <a
                                  href={att.url}
                                  download={att.name}
                                  className="text-xs text-cyan-400 hover:underline flex items-center space-x-1 shrink-0"
                                >
                                  <Download className="w-3 h-3" />
                                  <span>{att.size || 'Download'}</span>
                                </a>
                              ) : (
                                <span className="text-xs font-mono text-slate-400 shrink-0">{att.size}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

            </div>

          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className={`border-t py-6 text-center text-xs ${darkMode ? 'bg-slate-900/50 border-slate-800 text-slate-500' : 'bg-white border-slate-200 text-slate-500'}`}>
        <p>mtricbase Playwright Runtime Dashboard • Built with React, Tailwind CSS, and TypeScript architecture.</p>
      </footer>

    </div>
  );
}