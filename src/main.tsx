import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import './i18n'
import { AppRoutes } from './app/AppRoutes'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('index.html is missing #root')

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  </StrictMode>,
)
