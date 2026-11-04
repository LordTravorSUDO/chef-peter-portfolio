import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';

const rootElement = document.getElementById('root')!;
const application = (
  <StrictMode>
    {/*
      BrowserRouter enables client-side routing for /articles, /admin, etc.
      vercel.json rewrites all requests to index.html so deep links work.
    */}
    {/* v7_startTransition: in-app navigation keeps the current page on screen
        while the next page's code loads, instead of flashing a spinner. */}
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
    </BrowserRouter>
  </StrictMode>
);

if (rootElement.hasChildNodes()) {
  hydrateRoot(rootElement, application);
} else {
  createRoot(rootElement).render(application);
}
