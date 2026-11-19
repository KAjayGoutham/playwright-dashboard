export type TestStatus = 'passed' | 'failed' | 'flaky' | 'skipped';

export interface TestStep {
  title: string;
  durationMs: number;
  status: string;
  category?: string;
  error?: string;
  steps?: TestStep[];
}

export interface TestError {
  message: string;
  snippet: string;
  location: string;
}

export interface TestAttachment {
  type: string;
  name: string;
  url?: string;
  size?: string;
}

export interface TestCase {
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

export interface TestSuite {
  file: string;
  project: string;
  duration: number;
  status: string;
  tests: TestCase[];
}

export interface ProjectStats {
  name: string;
  tests: number;
  passed: number;
  failed: number;
  duration: number;
}

export interface RunStats {
  total: number;
  passed: number;
  failed: number;
  flaky: number;
  skipped: number;
  successRate: number;
}

export interface RunData {
  runId: string;
  timestamp: string;
  environment: string;
  totalDurationMs: number;
  isSample?: boolean;
  stats: RunStats;
  projects: ProjectStats[];
  suites: TestSuite[];
}

export interface SuiteMediaSelection {
  suiteFile: string;
  project: string;
  kind: 'screenshots' | 'videos';
  items: { testTitle: string; att: TestAttachment }[];
}

export interface SyncFeedback {
  type: 'success' | 'info' | 'error';
  message: string;
}
