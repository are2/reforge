import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import MergeToolApp from './MergeToolApp.tsx'
import './index.css'

const urlParams = new URLSearchParams(window.location.search)
const isMergeWindow = urlParams.get('merge') === 'true'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isMergeWindow ? <MergeToolApp /> : <App />}
  </React.StrictMode>,
)
