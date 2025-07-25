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

// Create Express app
const app = express()
const server = createServer(app)
const wss = new WebSocketServer({ server })

// CORS for desktop app
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3005', 'file://'],
  credentials: true,
  optionsSuccessStatus: 200
}))

app.use(express.json())
app.use(express.static(path.join(APP_DIR, 'dist')))

// Basic health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Serve the React app for all non-API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(APP_DIR, 'dist', 'index.html'))
  }
})

// WebSocket handling
const activeConnections = new Set()

wss.on('connection', (ws) => {
  console.log('📡 New WebSocket connection')
  activeConnections.add(ws)
  
  ws.on('close', () => {
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

// Start server
server.listen(PORT, () => {
  console.log(`🌐 Competitor Dashboard running on http://localhost:${PORT}`)
  console.log(`📊 Open your browser to: http://localhost:${PORT}`)
  console.log(`🗄️  Database will be created at: ${path.join(APP_DIR, 'competitor_products.db')}`)
  
  // Try to open browser automatically
  const open = (url) => {
    const start = process.platform === 'darwin' ? 'open' : 
                  process.platform === 'win32' ? 'start' : 'xdg-open'
    spawn(start, [url], { detached: true, stdio: 'ignore' }).unref()
  }
  
  setTimeout(() => {
    try {
      open(`http://localhost:${PORT}`)
    } catch (error) {
      console.log('ℹ️  Could not auto-open browser. Please manually open the URL above.')
    }
  }, 2000)
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