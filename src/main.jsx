import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { LanguageProvider } from './contexts/LanguageContext';
import './index.css';

// Global safety guards to prevent ReferenceError: fileRef, photoRef, Network across browser environments
if (typeof globalThis !== 'undefined') {
  if (typeof globalThis.fileRef === 'undefined') {
    globalThis.fileRef = { current: null };
  }
  if (typeof globalThis.photoRef === 'undefined') {
    globalThis.photoRef = { current: null };
  }
  if (typeof globalThis.inputRef === 'undefined') {
    globalThis.inputRef = { current: null };
  }
  if (typeof globalThis.Network === 'undefined') {
    globalThis.Network = {
      getStatus: async () => ({
        connected: typeof navigator !== 'undefined' ? navigator.onLine : true,
        connectionType: 'wifi',
      }),
      addListener: () => ({ remove: () => {} }),
      removeAllListeners: () => {},
    };
  }
}

if (typeof window !== 'undefined') {
  if (typeof window.fileRef === 'undefined') {
    window.fileRef = { current: null };
  }
  if (typeof window.photoRef === 'undefined') {
    window.photoRef = { current: null };
  }
  if (typeof window.inputRef === 'undefined') {
    window.inputRef = { current: null };
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <LanguageProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </LanguageProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
