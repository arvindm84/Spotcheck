import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AppProvider } from './AppProvider.tsx'

// HashRouter: the build is plain static files, so it works on any host without rewrite rules.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      {/* Phone-width column, centered on larger screens. */}
      <div className="relative mx-auto flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-paper shadow-2xl">
        <AppProvider>
          <App />
        </AppProvider>
      </div>
    </HashRouter>
  </StrictMode>,
)
