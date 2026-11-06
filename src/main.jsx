import React from 'react'
import ReactDOM from 'react-dom/client'
import { ConvexProvider, ConvexReactClient } from 'convex/react'
import App from '@/App.jsx'
import '@/index.css'
import { captureAttribution } from '@/lib/attribution'

captureAttribution()

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL)

ReactDOM.createRoot(document.getElementById('root')).render(
  <ConvexProvider client={convex}>
    <App />
  </ConvexProvider>
)
