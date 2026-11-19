import { fireEvent, render, screen, within } from '@testing-library/react';
import App from './App';
import PlaywrightDashboard from './playwright_runtime_dashboard';

const MOCK_REPORT = {
  runId: 'run-latest-1',
  timestamp: '2026-11-19T06:55:00.000Z',
  environment: 'Local (C:/playwright/tests)',
  totalDurationMs: 6500,
  stats: {
    total: 3,
    passed: 2,
    failed: 1,
    flaky: 0,
    skipped: 0,
    successRate: 66.7,
  },
  projects: [
    { name: 'chromium', tests: 2, passed: 1, failed: 1, duration: 4500 },
    { name: 'Mobile Chrome', tests: 1, passed: 1, failed: 0, duration: 2000 },
  ],
  suites: [
    {
      file: 'tests/checkout.spec.ts',
      project: 'chromium',
      duration: 4500,
      status: 'failed',
      tests: [
        {
          id: 't-pass',
          title: 'adds item to cart',
          status: 'passed',
          durationMs: 1500,
          retries: 0,
          browser: 'chromium',
          steps: [
            { title: 'Open store', durationMs: 500, status: 'passed', category: 'pw:api' },
            { title: 'Click Add to Cart', durationMs: 300, status: 'passed', category: 'pw:api' },
          ],
          logs: [],
          attachments: [
            { type: 'image/png', name: 'cart.png', url: '/artifacts/run-1/cart.png', size: '42 KB' },
            { type: 'video/webm', name: 'cart.webm', url: '/artifacts/run-1/cart.webm', size: '120 KB' },
          ],
        },
        {
          id: 't-fail',
          title: 'completes payment flow',
          status: 'failed',
          durationMs: 3000,
          retries: 1,
          browser: 'chromium',
          error: {
            message: 'Payment confirmation banner did not appear.',
            snippet: 'Timed out waiting for confirmation message',
            location: 'tests/checkout.spec.ts:28:5',
          },
          steps: [
            { title: 'Submit payment', durationMs: 3000, status: 'failed', category: 'expect' },
          ],
          logs: ['Payment API returned 504'],
          attachments: [],
        },
      ],
    },
    {
      file: 'tests/home.spec.ts',
      project: 'Mobile Chrome',
      duration: 2000,
      status: 'passed',
      tests: [
        {
          id: 't-mobile',
          title: 'renders mobile menu',
          status: 'passed',
          durationMs: 2000,
          retries: 0,
          browser: 'Mobile Chrome',
          steps: [],
          logs: [],
          attachments: [],
        },
      ],
    },
  ],
  history: [
    {
      runId: 'run-latest-1',
      timestamp: '2026-11-19T06:55:00.000Z',
      environment: 'Local (C:/playwright/tests)',
      totalDurationMs: 6500,
      stats: { total: 3, passed: 2, failed: 1, flaky: 0, skipped: 0, successRate: 66.7 },
      projects: [
        { name: 'chromium', tests: 2, passed: 1, failed: 1, duration: 4500 },
        { name: 'Mobile Chrome', tests: 1, passed: 1, failed: 0, duration: 2000 },
      ],
      suites: [
        {
          file: 'tests/checkout.spec.ts',
          project: 'chromium',
          duration: 4500,
          status: 'failed',
          tests: [
            {
              id: 't-pass',
              title: 'adds item to cart',
              status: 'passed',
              durationMs: 1500,
              retries: 0,
              browser: 'chromium',
              steps: [
                { title: 'Open store', durationMs: 500, status: 'passed', category: 'pw:api' },
                { title: 'Click Add to Cart', durationMs: 300, status: 'passed', category: 'pw:api' },
              ],
              logs: [],
              attachments: [
                { type: 'image/png', name: 'cart.png', url: '/artifacts/run-1/cart.png', size: '42 KB' },
                { type: 'video/webm', name: 'cart.webm', url: '/artifacts/run-1/cart.webm', size: '120 KB' },
              ],
            },
            {
              id: 't-fail',
              title: 'completes payment flow',
              status: 'failed',
              durationMs: 3000,
              retries: 1,
              browser: 'chromium',
              error: {
                message: 'Payment confirmation banner did not appear.',
                snippet: 'Timed out waiting for confirmation message',
                location: 'tests/checkout.spec.ts:28:5',
              },
              steps: [{ title: 'Submit payment', durationMs: 3000, status: 'failed', category: 'expect' }],
              logs: ['Payment API returned 504'],
              attachments: [],
            },
          ],
        },
        {
          file: 'tests/home.spec.ts',
          project: 'Mobile Chrome',
          duration: 2000,
          status: 'passed',
          tests: [
            {
              id: 't-mobile',
              title: 'renders mobile menu',
              status: 'passed',
              durationMs: 2000,
              retries: 0,
              browser: 'Mobile Chrome',
              steps: [],
              logs: [],
              attachments: [],
            },
          ],
        },
      ],
    },
    {
      runId: 'run-older-2',
      timestamp: '2026-11-18T12:00:00.000Z',
      environment: 'Local (C:/playwright/tests)',
      totalDurationMs: 2100,
      stats: { total: 1, passed: 1, failed: 0, flaky: 0, skipped: 0, successRate: 100 },
      projects: [{ name: 'chromium', tests: 1, passed: 1, failed: 0, duration: 2100 }],
      suites: [
        {
          file: 'tests/older.spec.ts',
          project: 'chromium',
          duration: 2100,
          status: 'passed',
          tests: [
            {
              id: 't-old',
              title: 'older passing smoke test',
              status: 'passed',
              durationMs: 2100,
              retries: 0,
              browser: 'chromium',
              steps: [],
              logs: [],
              attachments: [],
            },
          ],
        },
      ],
    },
  ],
};

function goToTestResultsTab() {
  const primaryNav = screen.getByRole('navigation', { name: /Primary navigation/i });
  fireEvent.click(within(primaryNav).getByRole('button', { name: /Test Results/i }));
}

beforeEach(() => {
  localStorage.clear();
});

test('renders App with Playwright Quality Dashboard branding', () => {
  render(<App />);
  expect(screen.getAllByText(/Playwright Quality Dashboard/i).length).toBeGreaterThan(0);
  expect(screen.getByText(/Automated test health, recent runs, and visual evidence/i)).toBeInTheDocument();
  expect(screen.getByText(/Automated Test Summary/i)).toBeInTheDocument();
});

test('displays dynamic metrics, browser coverage, and navigates to Test Results', () => {
  render(<PlaywrightDashboard data={MOCK_REPORT} />);

  expect(screen.getByText('Across 2 browsers')).toBeInTheDocument();
  expect(screen.getByText('Issues Requiring Attention')).toBeInTheDocument();
  expect(screen.getByText('completes payment flow')).toBeInTheDocument();

  goToTestResultsTab();

  expect(screen.getByText('tests/checkout.spec.ts')).toBeInTheDocument();
  expect(screen.getByText('tests/home.spec.ts')).toBeInTheDocument();

  const browserSelect = screen.getByLabelText(/Browser:/i);
  expect(within(browserSelect).getByText('Mobile Chrome')).toBeInTheDocument();
});

test('supports inline steps toggle, suite media modal, search empty state, and Escape close', () => {
  render(<PlaywrightDashboard data={MOCK_REPORT} />);

  goToTestResultsTab();

  // Expand inline steps
  fireEvent.click(screen.getByRole('button', { name: /2 steps/i }));
  expect(screen.getByText('Open store')).toBeInTheDocument();
  expect(screen.getAllByText('Action').length).toBeGreaterThan(0);

  // Open suite screenshots modal
  fireEvent.click(screen.getByRole('button', { name: /Screenshot \(1\)/i }));
  const dialog = screen.getByRole('dialog');
  expect(within(dialog).getByText(/adds item to cart — cart\.png/i)).toBeInTheDocument();

  // Close modal with Escape
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

  // Filter to empty state and clear filters
  const searchInput = screen.getByLabelText(/Search tests or files/i);
  fireEvent.change(searchInput, { target: { value: 'non-existent-test-xyz' } });
  expect(screen.getByText('No matching tests found')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /Clear All Filters/i }));
  expect(screen.getByText('adds item to cart')).toBeInTheDocument();
});

test('switches between recent runs and opens Setup Guide', () => {
  render(<PlaywrightDashboard data={MOCK_REPORT} />);

  expect(screen.getByText(/Recent Test Runs \(2 of 5\)/i)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Run #2/i }));
  expect(screen.getByText('All tests passed!')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Back to Latest Run/i })).toBeInTheDocument();

  const primaryNav = screen.getByRole('navigation', { name: /Primary navigation/i });
  fireEvent.click(within(primaryNav).getByRole('button', { name: /Setup Guide/i }));
  expect(screen.getByText(/Connect your Playwright tests in 2 steps/i)).toBeInTheDocument();
});
