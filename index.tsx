
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

// Import migration runner for testing
import './utils/migrationRunner';

// Import new Supabase test
import './utils/testSupabaseNew';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);