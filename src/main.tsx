import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router'
import './index.css'
import App from './App.tsx'

// Hash routes let every page reload correctly on GitHub Pages.
const Router = import.meta.env.MODE === 'pages' ? HashRouter : BrowserRouter;

createRoot(document.getElementById('root')!).render(
  <Router>
    <App />
  </Router>,
)
