import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { AbbonamentoProvider } from './context/AbbonamentoContext.jsx'
import './index.css'

registerSW({ immediate: true })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <AbbonamentoProvider>
          <App />
        </AbbonamentoProvider>
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>
)
