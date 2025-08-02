import './polyfills';
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react';
import { HelmetProvider } from 'react-helmet-async';
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
    <Analytics />
  </HelmetProvider>
);
