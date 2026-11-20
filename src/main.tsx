import { createRoot } from 'react-dom/client'
import { setupAndroid } from './app/android.js'
import { showToast } from './components/base/toastState.js'
import { restoreApiKey } from './services/settings.js'
import { App } from './app/App.js'
import { setupTheme } from './app/theme.js'
import { ensureKatex } from './services/markdown/katex.js'
import './app/theme.css'
import './app/global.css'

ensureKatex()
setupTheme()

setupAndroid()
void restoreApiKey()
  .catch(() => showToast({ key: 'apiKeyReadFailed' }))
  .finally(() => createRoot(document.getElementById('root') as HTMLElement).render(<App />))
