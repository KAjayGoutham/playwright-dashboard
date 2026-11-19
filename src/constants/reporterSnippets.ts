export const SAMPLE_PLAYWRIGHT_CONFIG = `// playwright.config.ts
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

export const SAMPLE_CUSTOM_REPORTER_TS = `// reporters/mtricbase-reporter.ts
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
