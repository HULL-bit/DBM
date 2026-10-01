import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { AuthProvider } from './context/AuthContext'
import theme from './styles/theme'
import App from './App'
import './styles/global.css'
import ErrorBoundary from './components/ui/ErrorBoundary'
import { installerSurveillanceGlobale } from './services/signalement'

installerSurveillanceGlobale()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ErrorBoundary>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ErrorBoundary>
      </ThemeProvider>
    </HashRouter>
  </React.StrictMode>,
)
