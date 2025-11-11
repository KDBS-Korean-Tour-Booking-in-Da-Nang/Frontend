import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// Initialize i18n BEFORE loading the app to avoid components rendering raw keys
import './i18n/index.js'
import App from './App.jsx'

// One-time startup cleanup: if dev/build session changed, clear tour booking persisted data
(() => {
  try {
    const STORAGE_BOOT_KEY = 'app_boot_session_id';
    const currentSessionId = typeof __BUILD_SESSION_ID__ !== 'undefined' ? __BUILD_SESSION_ID__ : null;
    const lastSessionId = localStorage.getItem(STORAGE_BOOT_KEY);

    if (currentSessionId && lastSessionId !== currentSessionId) {
      // Only remove tour booking keys to avoid affecting unrelated features
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        if (key.startsWith('bookingData_') || key.startsWith('hasConfirmedLeave_')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
      localStorage.setItem(STORAGE_BOOT_KEY, currentSessionId);
    } else if (currentSessionId && lastSessionId === null) {
      // First boot: ensure we set the session idpm
      localStorage.setItem(STORAGE_BOOT_KEY, currentSessionId);
    }
  } catch (err) {
    // Best-effort cleanup only
    console.error('Startup cleanup error:', err);
  }
})();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
