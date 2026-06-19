import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import CaptainView from './CaptainView.jsx'

const path = window.location.pathname;
const isCapitaine = path.startsWith('/capitaine');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isCapitaine ? <CaptainView /> : <App />}
  </React.StrictMode>
)
