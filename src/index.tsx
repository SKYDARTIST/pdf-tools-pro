import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { DarkModeProvider } from '@/contexts/DarkModeContext';
import { pdfjs } from 'react-pdf';

// Fix: Centralize PDF.js worker initialization early (v5.4.296)
pdfjs.GlobalWorkerOptions.workerSrc = window.location.origin + '/pdf.worker.v5.4.296.min.mjs';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <DarkModeProvider>
      <HashRouter>
        <App />
      </HashRouter>
    </DarkModeProvider>
  </React.StrictMode>
);
