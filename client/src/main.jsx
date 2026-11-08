import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { MotionConfig } from 'framer-motion';
import { queryClient } from './lib/queryClient.js';
import App from './App.jsx';
import './index.css';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// GoogleOAuthProvider wraps the whole app (not just the login page) because
// @react-oauth/google needs to inject Google's script once, before any
// <GoogleLogin> button mounts — conditionally rendering the provider around
// a single page would remount and reload that script on every navigation
// to/from it. Missing clientId is handled in GoogleSignInButton.jsx (button
// hides itself), not here — an empty provider is harmless either way.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      {/* reducedMotion="user" makes every Framer Motion animation in the
          app respect prefers-reduced-motion automatically — one place,
          not a per-component opt-in that's easy to forget. */}
      <MotionConfig reducedMotion="user">
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID ?? ''}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </GoogleOAuthProvider>
      </MotionConfig>
    </QueryClientProvider>
  </React.StrictMode>
);
