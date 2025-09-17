import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// Initialize i18n BEFORE loading the app to avoid components rendering raw keys
import './i18n/index.js'
import App from './App.jsx'
import './i18n/index.js'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
