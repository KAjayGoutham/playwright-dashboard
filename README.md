# Playwright Quality Dashboard

A clean, modern React + TypeScript + Tailwind CSS dashboard for visualizing and inspecting **Playwright end-to-end test results** — designed to be intuitive for both engineering and product teams, with step-by-step activity, last-5-runs history, inline screenshots, and playable execution videos.

---

## Features

- **Overview & Metrics** — Total tests, passed, failed, flaky, skipped, duration, success rate, segmented status breakdown, and per-browser/project summaries (`chromium`, `firefox`, `webkit`, etc.).
- **Last 5 Runs History** — Switch between the 5 most recent test runs from both the **Overview** and **Test Results** tabs, with automatic history persistence and artifact cleanup.
- **Test Execution Steps** — Displays nested Playwright API steps, hooks, assertions, and `test.step(...)` blocks both **inline** in the Test Results tab and in the detailed inspection modal.
- **Screenshots & Videos** — Renders inline screenshot previews (`<img>` + Full Size / Download) and embedded HTML5 `<video controls>` players for `.webm` / `.mp4` recordings, plus media count badges on test rows.
- **Interactive Test Results** — Search by test name or spec file, filter by status (`passed`, `failed`, `flaky`, `skipped`) and Playwright project, and inspect failure stack traces and console logs.
- **Live Refresh** — Click **Refresh Results** to fetch the latest `playwright-results.json` without restarting the dev server.
- **Dark & Light Mode** — Instant theme toggle in the top navbar (saved automatically).

---

## Tech Stack

- **React 19** (`react-scripts`)
- **TypeScript**
- **Tailwind CSS v3**
- **Lucide React** icons

---

## Project Structure

```text
playwright-dashboard/
├── public/
│   ├── artifacts/                  # Copied screenshots & videos per run (gitignored)
│   └── data/
│       └── playwright-results.json # Live-fetched report used by "Refresh Results"
├── src/
│   ├── components/
│   │   ├── ErrorBoundary.tsx       # Graceful recovery UI for runtime errors
│   │   ├── MediaCard.tsx           # Shared screenshot & video viewer card
│   │   ├── SuiteMediaModal.tsx     # Suite-level screenshots & videos modal
│   │   └── TestDetailsModal.tsx    # Detailed test step, media & error modal
│   ├── constants/
│   │   └── reporterSnippets.ts     # Copyable Playwright config & reporter templates
│   ├── data/
│   │   ├── playwright-results.json # Bundled initial report
│   │   └── sampleRunData.ts        # Fallback demo run when no report is loaded
│   ├── types/
│   │   └── dashboard.ts            # Shared TypeScript interfaces
│   ├── utils/
│   │   └── playwrightParser.ts     # Report normalizer, history & media helpers
│   ├── App.js                      # Root entry with ErrorBoundary
│   ├── index.css                   # Tailwind CSS directives
│   └── playwright_runtime_dashboard.tsx
├── tailwind.config.js
├── postcss.config.js
└── tsconfig.json
```

---

## Getting Started

### 1. Clone & Install

```bash
git clone https://github.com/KAjayGoutham/playwright-dashboard.git
cd playwright-dashboard
npm install
```

### 2. Start the Development Server

```bash
npm start
```

Open **http://localhost:3000** in your browser.

### 3. Create a Production Build

```bash
npm run build
```

---

## Connecting Your Playwright Project

Playwright's built-in `json` reporter omits `result.steps` and writes local OS paths for screenshots/videos that browsers block. Use the custom reporter below to export **steps, last 5 runs history, screenshots, and videos** directly into this dashboard.

> **Folder layout assumption:** Place this dashboard repo alongside your Playwright test project (e.g. `C:\playwright` and `C:\playwright-dashboard`). Adjust the relative paths in `mtricbase-reporter.ts` if your directories differ.

### Step 1: Update `playwright.config.ts`

Enable screenshots/video capture and register the custom reporter (remove or comment out any built-in `['json', ...]` reporter writing to the same file):

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [
    ['html'],
    ['./reporters/mtricbase-reporter.ts'],
  ],
  use: {
    trace: 'on-first-retry',
    screenshot: 'on', // or 'only-on-failure'
    video: 'on',      // or 'retain-on-failure'
  },
});
```

### Step 2: Add `reporters/mtricbase-reporter.ts`

Create `reporters/mtricbase-reporter.ts` in your Playwright project (also available via the **Copy Reporter** button inside the dashboard's **Setup Guide** tab):

```ts
import fs from 'fs';
import path from 'path';
import type {
  Reporter,
  FullConfig,
  FullResult,
  TestCase,
  TestResult,
  TestStep,
} from '@playwright/test/reporter';

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
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

class MtricbaseReporter implements Reporter {
  private runId = `run-${Date.now().toString(36)}`;
  private startTime = new Date().toISOString();
  private rootDir = '';
  private suitesMap = new Map<string, any>();
  private artifactsRoot = path.resolve(
    __dirname,
    '../../playwright-dashboard/public/artifacts'
  );

  onBegin(config: FullConfig) {
    this.runId = `run-${Date.now().toString(36)}`;
    this.startTime = new Date().toISOString();
    this.rootDir = config.rootDir;
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const project = test.parent.project()?.name || 'default';
    const relFile = path
      .relative(this.rootDir || process.cwd(), test.location.file)
      .replace(/\\/g, '/');
    const key = `${relFile}::${project}`;

    if (!this.suitesMap.has(key)) {
      this.suitesMap.set(key, {
        file: relFile,
        project,
        duration: 0,
        status: 'passed',
        tests: [],
      });
    }

    const status =
      result.status === 'passed'
        ? 'passed'
        : result.status === 'skipped'
          ? 'skipped'
          : 'failed';

    const suite = this.suitesMap.get(key);
    suite.duration += Math.round(result.duration);
    if (status === 'failed') suite.status = 'failed';

    // Copy screenshots, videos & attachments into public/artifacts/<runId>/
    const runArtifactsDir = path.join(this.artifactsRoot, this.runId);
    const attachments = result.attachments.map((a, idx) => {
      const extFromPath = a.path ? path.extname(a.path) : '';
      const extFromType = a.contentType.includes('png')
        ? '.png'
        : a.contentType.includes('jpeg') || a.contentType.includes('jpg')
          ? '.jpg'
          : a.contentType.includes('webm')
            ? '.webm'
            : a.contentType.includes('mp4')
              ? '.mp4'
              : a.contentType.includes('zip')
                ? '.zip'
                : '';
      const ext = extFromPath || extFromType;
      const safeName =
        `${test.id}-${project}-${idx}-${a.name}`.replace(/[^a-zA-Z0-9._-]/g, '_') +
        (a.name.endsWith(ext) ? '' : ext);

      let publicUrl: string | undefined;
      let size: string | undefined;
      try {
        if (a.path && fs.existsSync(a.path)) {
          fs.mkdirSync(runArtifactsDir, { recursive: true });
          const dest = path.join(runArtifactsDir, safeName);
          fs.copyFileSync(a.path, dest);
          publicUrl = `/artifacts/${this.runId}/${safeName}`;
          size = formatBytes(fs.statSync(dest).size);
        } else if (a.body) {
          fs.mkdirSync(runArtifactsDir, { recursive: true });
          const dest = path.join(runArtifactsDir, safeName);
          fs.writeFileSync(dest, a.body);
          publicUrl = `/artifacts/${this.runId}/${safeName}`;
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
      id: `${test.id}-${project}`,
      title: test.title,
      status,
      durationMs: Math.round(result.duration),
      retries: result.retry,
      browser: project,
      error: result.error
        ? {
            message: result.error.message || 'Test failed',
            snippet: result.error.snippet || result.error.stack || '',
            location: `${relFile}:${test.location.line}:${test.location.column}`,
          }
        : undefined,
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
        projectMap[s.project] = {
          name: s.project,
          tests: 0,
          passed: 0,
          failed: 0,
          duration: 0,
        };
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
      environment: `Local (${this.rootDir})`,
      totalDurationMs: Math.round(result.duration),
      stats: {
        total,
        passed,
        failed,
        flaky,
        skipped,
        successRate:
          total > 0 ? parseFloat(((passed / total) * 100).toFixed(1)) : 100,
      },
      projects: Object.values(projectMap),
      suites,
    };

    const targets = [
      path.resolve(
        __dirname,
        '../../playwright-dashboard/src/data/playwright-results.json'
      ),
      path.resolve(
        __dirname,
        '../../playwright-dashboard/public/data/playwright-results.json'
      ),
    ];

    // Keep the 5 most recent runs
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

    // Remove artifact folders older than the last 5 runs
    try {
      const keptRunIds = new Set(updatedHistory.map((r) => r.runId));
      if (fs.existsSync(this.artifactsRoot)) {
        for (const entry of fs.readdirSync(this.artifactsRoot)) {
          if (!keptRunIds.has(entry)) {
            fs.rmSync(path.join(this.artifactsRoot, entry), {
              recursive: true,
              force: true,
            });
          }
        }
      }
    } catch {}
  }
}

export default MtricbaseReporter;
```

### Step 3: Run Tests & Sync Dashboard

1. Run your Playwright suite from your Playwright project directory:
   ```bash
   npx playwright test
   ```
2. Open the dashboard at **http://localhost:3000** and click **Refresh Results** in the top-right bar.
3. Use the **Recent Test Runs (N of 5)** strip to switch between historical runs, expand **steps** inline in **Test Results**, click **Screenshots** / **Videos** on any suite row, or click any test to inspect full details.

---

## Troubleshooting

| Issue | Cause & Fix |
| --- | --- |
| Steps say *"No step details were recorded"* | Playwright's built-in `json` reporter omits `result.steps`. Ensure `playwright.config.ts` uses `./reporters/mtricbase-reporter.ts` and does not overwrite `playwright-results.json` with the built-in `json` reporter. |
| Screenshots or videos don't load | Browsers block `file://` paths from `http://localhost:3000`. Make sure `mtricbase-reporter.ts` copies media to `public/artifacts/<runId>/` and check that `screenshot` / `video` are enabled in `playwright.config.ts`. |
| New test run doesn't appear | Click **Refresh Results** in the navbar to re-fetch `/data/playwright-results.json` with cache busting. |
