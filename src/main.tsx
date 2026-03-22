import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import MergeToolApp from './MergeToolApp.tsx'
import SettingsApp from './SettingsApp.tsx'
import './index.css'

const urlParams = new URLSearchParams(window.location.search)
const isMergeWindow = urlParams.get('merge') === 'true'
const isSettingsWindow = urlParams.get('settings') === 'true'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isMergeWindow ? <MergeToolApp /> : isSettingsWindow ? <SettingsApp /> : <App />}
  </React.StrictMode>,
)
