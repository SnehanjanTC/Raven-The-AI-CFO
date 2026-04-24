import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// NOTE: Demo data is NOT auto-loaded.
// The user must explicitly enable it from Settings → Demo data.
// Pages should source from live integrations (e.g. Zoho Books MCP) first
// and fall back to the FastAPI backend; only when the user has opted in
// to demo data will the local seed dataset render.

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
