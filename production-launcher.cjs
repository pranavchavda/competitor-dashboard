#!/usr/bin/env node

const express = require('express')
const cors = require('cors')
const path = require('path')
const fs = require('fs')
const { spawn } = require('child_process')
const { createServer } = require('http')
const { WebSocketServer } = require('ws')

// Get the executable directory (works for pkg bundled apps)
const getAppDir = () => {
  if (process.pkg) {
    // When bundled with pkg, use the directory containing the executable
    return path.dirname(process.execPath)
  }
  // When running as script, use current directory
  return __dirname
}

const APP_DIR = getAppDir()
const PORT = process.env.PORT || 3005

console.log('🚀 Starting Competitor Dashboard...')
console.log(`📁 App directory: ${APP_DIR}`)

// Set environment variables for the app
process.env.DATABASE_URL = `file:${path.join(APP_DIR, 'competitor_products.db')}`

// Create Express app
const app = express()
const server = createServer(app)
const wss = new WebSocketServer({ server })

// CORS for desktop app
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3005', 'file://', 'https://tauri.localhost'],
  credentials: true,
  optionsSuccessStatus: 200
}))

app.use(express.json())
app.use(express.static(path.join(APP_DIR, 'dist')))

// WebSocket handling
const activeConnections = new Set()

wss.on('connection', (ws) => {
  console.log('📡 New WebSocket connection')
  activeConnections.add(ws)
  
  ws.on('close', () => {
    activeConnections.delete(ws)
  })
  
  ws.on('error', (error) => {
    console.error('📡 WebSocket error:', error)
    activeConnections.delete(ws)
  })
})

// Broadcast function
function broadcast(data) {
  const message = JSON.stringify(data)
  activeConnections.forEach((ws) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(message)
    }
  })
}

// Basic health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '0.1.0',
    database: process.env.DATABASE_URL
  })
})

// Dashboard stats endpoint (mock for now)
app.get('/api/dashboard/stats', (req, res) => {
  res.json({
    stats: {
      products_monitored: 0,
      active_alerts: 0,
      competitors_tracked: 3,
      map_violations: 0,
      revenue_at_risk: 0,
      worst_offender: null
    },
    competitor_status: [
      { name: 'Home Coffee Solutions', url: 'homecoffeesolutions.com', status: 'active', last_updated: new Date().toISOString() },
      { name: 'The Kitchen Barista', url: 'thekitchenbarista.com', status: 'active', last_updated: new Date().toISOString() },
      { name: 'Cafe Liegeois', url: 'cafeliegeois.ca', status: 'active', last_updated: new Date().toISOString() }
    ],
    recent_alerts: []
  })
})

// Settings endpoints
app.get('/api/settings', (req, res) => {
  const settingsPath = path.join(APP_DIR, 'settings.json')
  try {
    if (fs.existsSync(settingsPath)) {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'))
      res.json(settings)
    } else {
      res.json({ openai_api_key: '', confidence_threshold: 70 })
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to load settings' })
  }
})

app.post('/api/settings', (req, res) => {
  const settingsPath = path.join(APP_DIR, 'settings.json')
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(req.body, null, 2))
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Failed to save settings' })
  }
})

// Placeholder for other API endpoints - will start the full server process
app.all('/api/*', (req, res) => {
  // For now, return a message that the full server needs to be started
  res.status(503).json({ 
    error: 'Full API server not yet started',
    message: 'This endpoint requires the complete server with database connections'
  })
})

// Serve the React app for all non-API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    const indexPath = path.join(APP_DIR, 'dist', 'index.html')
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath)
    } else {
      res.status(404).send('Application files not found. Make sure dist folder is in the same directory as the executable.')
    }
  }
})

// Start server
server.listen(PORT, '127.0.0.1', () => {
  console.log(`🌐 Competitor Dashboard running on http://localhost:${PORT}`)
  console.log(`📊 Open your browser to: http://localhost:${PORT}`)
  console.log(`🗄️  Using database: ${process.env.DATABASE_URL}`)
  
  // Try to open browser automatically
  const open = (url) => {
    const start = process.platform === 'darwin' ? 'open' : 
                  process.platform === 'win32' ? 'start' : 'xdg-open'
    spawn(start, [url], { detached: true, stdio: 'ignore' }).unref()
  }
  
  setTimeout(() => {
    try {
      open(`http://localhost:${PORT}`)
      console.log('🖥️  Browser should open automatically')
    } catch (error) {
      console.log('ℹ️  Could not auto-open browser. Please manually open the URL above.')
    }
  }, 1000)
})

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down Competitor Dashboard...')
  server.close(() => {
    process.exit(0)
  })
})

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down Competitor Dashboard...')
  server.close(() => {
    process.exit(0)
  })
})