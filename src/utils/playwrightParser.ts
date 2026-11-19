import {
  ProjectStats,
  RunData,
  TestAttachment,
  TestCase,
  TestStatus,
  TestStep,
  TestSuite,
} from '../types/dashboard';

export const MAX_HISTORY_RUNS = 5;
const HISTORY_STORAGE_KEY = 'qa_playwright_run_history_v1';
const THEME_STORAGE_KEY = 'qa_playwright_theme_dark';

export function mapSteps(rawSteps: any[] | undefined): TestStep[] {
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

export function countSteps(steps: TestStep[] | undefined): number {
  if (!Array.isArray(steps)) return 0;
  return steps.reduce((acc, s) => acc + 1 + countSteps(s.steps), 0);
}

/**
 * Translates internal Playwright step categories into plain-language labels
 * understandable by non-technical product team members.
 */
export function formatStepCategory(category?: string): string | null {
  if (!category) return null;
  const normalized = category.toLowerCase();
  if (normalized === 'pw:api') return 'Action';
  if (normalized === 'expect') return 'Check';
  if (normalized === 'hook') return 'Setup';
  if (normalized === 'test.step') return 'Step';
  if (normalized === 'fixture') return 'Setup';
  return category;
}

export function isImageAttachment(att: TestAttachment): boolean {
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

export function isVideoAttachment(att: TestAttachment): boolean {
  const t = (att.type || '').toLowerCase();
  const n = (att.name || '').toLowerCase();
  const u = (att.url || '').toLowerCase();
  return (
    t.includes('video') ||
    /\.(webm|mp4|mov|ogg)(\?|$)/.test(n) ||
    /\.(webm|mp4|mov|ogg)(\?|$)/.test(u)
  );
}

export function isWebUrl(url?: string): boolean {
  if (!url) return false;
  return (
    url.startsWith('/') ||
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('data:')
  );
}

export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '0.00s';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function formatFriendlyDate(isoString: string): string {
  const parsed = new Date(isoString);
  if (Number.isNaN(parsed.getTime())) return 'Unknown date';
  return parsed.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatEnvironmentLabel(rawEnv: string): string {
  if (!rawEnv) return 'Automated Test Suite';
  if (rawEnv.startsWith('Local (')) return 'Local Workstation';
  return rawEnv;
}

function stableRunId(timestamp: string): string {
  const ms = new Date(timestamp).getTime();
  return Number.isNaN(ms) ? 'run-latest' : `run-${ms.toString(36)}`;
}

/**
 * Normalizes either our custom reporter JSON or Playwright's native JSON report
 * into the dashboard's RunData model.
 */
export function parsePlaywrightJson(raw: any): RunData | null {
  if (!raw || typeof raw !== 'object') return null;

  // Already in dashboard RunData format
  if (raw.runId && raw.stats && Array.isArray(raw.suites)) {
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

  // Standard Playwright JSON reporter output
  if (Array.isArray(raw.suites)) {
    try {
      const statsRaw = raw.stats || {};
      const durationMs = Math.round(Number(statsRaw.duration || 0));

      const projectMap: Record<string, { tests: number; passed: number; failed: number; duration: number }> = {};
      const suitesList: TestSuite[] = [];

      const processSuite = (suite: any, fileName = '') => {
        const file = suite.file || fileName || suite.title || 'test.spec.ts';
        const projectSuites: Record<string, TestCase[]> = {};

        if (Array.isArray(suite.specs)) {
          for (const spec of suite.specs) {
            const specTitle = spec.title || 'Untitled test';
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
                lastResult.status === 'passed'
                  ? 'passed'
                  : lastResult.status === 'timedOut' || lastResult.status === 'failed'
                    ? 'failed'
                    : lastResult.status === 'skipped'
                      ? 'skipped'
                      : test.status === 'flaky'
                        ? 'flaky'
                        : 'passed';

              projectMap[proj].tests += 1;
              if (testStatus === 'passed') projectMap[proj].passed += 1;
              if (testStatus === 'failed') projectMap[proj].failed += 1;
              projectMap[proj].duration += testDuration;

              const errors = lastResult.errors || [];
              const firstErr = errors[0];
              const testCase: TestCase = {
                id: spec.id ? `${spec.id}-${proj}-${tIdx}` : `${file}-${specTitle}-${proj}-${tIdx}`,
                title: specTitle,
                status: testStatus,
                durationMs: testDuration,
                retries: Number(lastResult.retry || 0),
                browser: proj,
                steps: mapSteps(lastResult.steps),
                logs: [
                  ...(lastResult.stdout || []).map((o: any) => (typeof o === 'string' ? o : o.text || '')),
                  ...(lastResult.stderr || []).map((e: any) => (typeof e === 'string' ? e : e.text || '')),
                ].filter(Boolean),
                attachments: (lastResult.attachments || []).map((a: any) => ({
                  type: a.contentType || 'attachment',
                  name: a.name || 'file',
                  url: a.path,
                  size: '',
                })),
              };

              if (firstErr) {
                testCase.error = {
                  message: firstErr.message || 'Test failed',
                  snippet: firstErr.snippet || firstErr.stack || '',
                  location: firstErr.location
                    ? `${firstErr.location.file}:${firstErr.location.line}`
                    : `${file}:${spec.line || 1}`,
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
          const hasFail = testCases.some((t) => t.status === 'failed');
          suitesList.push({
            file,
            project: proj,
            duration: testCases.reduce((acc, cur) => acc + cur.durationMs, 0),
            status: hasFail ? 'failed' : 'passed',
            tests: testCases,
          });
        }

        if (Array.isArray(suite.suites)) {
          for (const subSuite of suite.suites) {
            processSuite(subSuite, file);
          }
        }
      };

      for (const suite of raw.suites) {
        processSuite(suite);
      }

      const projects: ProjectStats[] = Object.entries(projectMap).map(([name, info]) => ({
        name,
        tests: info.tests,
        passed: info.passed,
        failed: info.failed,
        duration: info.duration,
      }));

      const allTests = suitesList.flatMap((s) => s.tests);
      const totalCount = allTests.length;
      const passedCount = allTests.filter((t) => t.status === 'passed').length;
      const failedCount = allTests.filter((t) => t.status === 'failed').length;
      const flakyCount = allTests.filter((t) => t.status === 'flaky').length;
      const skippedCount = allTests.filter((t) => t.status === 'skipped').length;
      const successRate = totalCount > 0 ? parseFloat(((passedCount / totalCount) * 100).toFixed(1)) : 100;
      const timestamp = statsRaw.startTime || new Date().toISOString();

      return {
        runId: stableRunId(timestamp),
        timestamp,
        environment: raw.config?.rootDir ? `Local (${raw.config.rootDir})` : 'Playwright Suite',
        totalDurationMs: durationMs || allTests.reduce((acc, t) => acc + t.durationMs, 0),
        stats: {
          total: totalCount,
          passed: passedCount,
          failed: failedCount,
          flaky: flakyCount,
          skipped: skippedCount,
          successRate,
        },
        projects:
          projects.length > 0
            ? projects
            : (raw.config?.projects || []).map((p: any) => ({
                name: p.name || 'default',
                tests: 0,
                passed: 0,
                failed: 0,
                duration: 0,
              })),
        suites: suitesList,
      };
    } catch (e) {
      console.error('Error parsing Playwright JSON report:', e);
      return null;
    }
  }

  return null;
}

export function parsePlaywrightHistory(raw: any): RunData[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((item) => parsePlaywrightJson(item))
      .filter((item): item is RunData => item !== null)
      .slice(0, MAX_HISTORY_RUNS);
  }
  if (Array.isArray(raw.history)) {
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

export function mergeRunHistory(incoming: RunData[], existing: RunData[]): RunData[] {
  const seen = new Set<string>();
  const merged: RunData[] = [];
  const realIncoming = incoming.filter((r) => !r.isSample);
  const candidates = realIncoming.length > 0
    ? [...realIncoming, ...existing.filter((r) => !r.isSample)]
    : [...incoming, ...existing];

  for (const run of candidates) {
    const key = `${run.timestamp}::${run.stats.total}::${run.totalDurationMs}`;
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(run);
    }
    if (merged.length >= MAX_HISTORY_RUNS) break;
  }
  return merged;
}

export function loadStoredHistory(): RunData[] {
  try {
    const saved = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed.filter((r) => !r?.isSample).slice(0, MAX_HISTORY_RUNS) : [];
  } catch {
    return [];
  }
}

export function saveStoredHistory(history: RunData[]): void {
  try {
    const realRuns = history.filter((r) => !r.isSample).slice(0, MAX_HISTORY_RUNS);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(realRuns));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadThemePreference(): boolean {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === null ? true : stored === 'true';
  } catch {
    return true;
  }
}

export function saveThemePreference(isDark: boolean): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, String(isDark));
  } catch {
    // Ignore storage errors
  }
}
