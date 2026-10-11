import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('index.html is missing #root')

createRoot(rootElement).render(
  <StrictMode>
    <main className="p-4">Shan-e-Lahore</main>
  </StrictMode>,
)
