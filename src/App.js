import React from 'react';
import PlaywrightDashboard from './playwright_runtime_dashboard';
import { ErrorBoundary } from './components/ErrorBoundary';
import resultsData from './data/playwright-results.json';

function App() {
  return (
    <ErrorBoundary>
      <PlaywrightDashboard data={resultsData} />
    </ErrorBoundary>
  );
}

export default App;
