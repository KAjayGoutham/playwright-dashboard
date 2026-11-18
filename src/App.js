import React from 'react';
import PlaywrightDashboard from './playwright_runtime_dashboard';
import resultsData from './data/playwright-results.json';

function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <PlaywrightDashboard data={resultsData} />
    </div>
  );
}

export default App;
