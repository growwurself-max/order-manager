import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
// Registers the non-blocking backend warm-up ping (see services/api.js).
import './services/api.js'

// Remove the static boot spinner only once React has actually painted.
const removeBootSpinner = () => {
  const boot = document.getElementById('app-boot')
  if (boot) boot.remove()
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if (document.readyState === 'complete') {
  requestAnimationFrame(removeBootSpinner)
} else {
  window.addEventListener('load', () => requestAnimationFrame(removeBootSpinner))
}
// Safety net: never let the static spinner cover a working app.
setTimeout(removeBootSpinner, 6000)
