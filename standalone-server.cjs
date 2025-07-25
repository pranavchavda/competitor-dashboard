#!/usr/bin/env node

const express = require('express')
const cors = require('cors')
const path = require('path')
const fs = require('fs')
const { createServer } = require('http')
const { WebSocketServer } = require('ws')

// Get the executable directory (works for pkg bundled apps)
const getAppDir = () => {
  if (process.pkg) {
    return path.dirname(process.execPath)
  }
  return __dirname
}

const APP_DIR = getAppDir()
const PORT = process.env.PORT || 3005

console.log('🚀 Starting Competitor Dashboard...')
console.log(`📁 App directory: ${APP_DIR}`)

// Set environment variables
process.env.DATABASE_URL = `file:${path.join(APP_DIR, 'competitor_products.db')}`

// Create Express app
const app = express()
const server = createServer(app)
const wss = new WebSocketServer({ server })

// CORS for all origins (since this is a desktop app)
app.use(cors({
  origin: true,
  credentials: true,
  optionsSuccessStatus: 200
}))

app.use(express.json())

// Serve static files from dist directory
const distPath = path.join(APP_DIR, 'dist')
app.use(express.static(distPath))

// WebSocket handling
const activeConnections = new Set()

wss.on('connection', (ws) => {
  console.log('📡 New WebSocket connection')
  activeConnections.add(ws)
  
  ws.on('close', () => {
    console.log('📡 WebSocket connection closed')
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

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '0.1.0',
    database: process.env.DATABASE_URL,
    app_dir: APP_DIR
  })
})

// Dashboard stats - Mock data for now
app.get('/api/dashboard/stats', (req, res) => {
  try {
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
        { 
          name: 'Home Coffee Solutions', 
          url: 'homecoffeesolutions.com', 
          status: 'Active', 
          last_updated: new Date().toISOString(),
          products_count: 0,
          products_tracked: 0,
          avg_price_difference: 0.0
        },
        { 
          name: 'The Kitchen Barista', 
          url: 'thekitchenbarista.com', 
          status: 'Active', 
          last_updated: new Date().toISOString(),
          products_count: 0,
          products_tracked: 0,
          avg_price_difference: 0.0
        },
        { 
          name: 'Cafe Liegeois', 
          url: 'cafeliegeois.ca', 
          status: 'Active', 
          last_updated: new Date().toISOString(),
          products_count: 0,
          products_tracked: 0,
          avg_price_difference: 0.0
        }
      ],
      recent_alerts: []
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    res.status(500).json({ error: 'Failed to fetch dashboard stats' })
  }
})

// Settings endpoints
app.get('/api/settings', (req, res) => {
  const settingsPath = path.join(APP_DIR, 'settings.json')
  try {
    if (fs.existsSync(settingsPath)) {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'))
      res.json(settings)
    } else {
      // Default settings
      const defaultSettings = { 
        openai_api_key: '', 
        confidence_threshold: 70,
        scraping_interval: 24 
      }
      res.json(defaultSettings)
    }
  } catch (error) {
    console.error('Error loading settings:', error)
    res.status(500).json({ error: 'Failed to load settings' })
  }
})

app.post('/api/settings', (req, res) => {
  const settingsPath = path.join(APP_DIR, 'settings.json')
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(req.body, null, 2))
    console.log('Settings saved:', req.body)
    res.json({ success: true, message: 'Settings saved successfully' })
  } catch (error) {
    console.error('Error saving settings:', error)
    res.status(500).json({ error: 'Failed to save settings' })
  }
})

// Placeholder endpoints for other API calls
app.get('/api/competitors/products', (req, res) => {
  res.json([])
})

app.post('/api/competitors/scrape', (req, res) => {
  // Mock scraping response
  res.json({ 
    success: true, 
    message: 'Scraping started (mock)',
    competitors: ['Home Coffee Solutions', 'Kitchen Barista', 'Cafe Liegeois']
  })
})

app.get('/api/products/idc', (req, res) => {
  res.json([])
})

app.post('/api/products/match', (req, res) => {
  res.json({ matches: [], message: 'No products to match yet' })
})

// Test OpenAI endpoint
app.post('/api/settings/test-openai', (req, res) => {
  const { openai_api_key } = req.body
  
  if (!openai_api_key || !openai_api_key.startsWith('sk-')) {
    return res.status(400).json({ 
      success: false, 
      error: 'Invalid OpenAI API key format' 
    })
  }
  
  // Mock successful test for now
  res.json({ 
    success: true, 
    message: 'OpenAI API key format is valid (full test requires OpenAI dependency)' 
  })
})

// Catch-all handler for React Router - serve index.html for all non-API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api') && !req.path.startsWith('/assets')) {
    const indexPath = path.join(distPath, 'index.html')
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath)
    } else {
      res.status(404).send(`
        <h1>Application files not found</h1>
        <p>Make sure the 'dist' folder is in the same directory as the executable.</p>
        <p>App directory: ${APP_DIR}</p>
        <p>Looking for: ${indexPath}</p>
      `)
    }
  } else {
    res.status(404).json({ error: 'API endpoint not found' })
  }
})

// Start server
server.listen(PORT, '127.0.0.1', () => {
  console.log(`🌐 Competitor Dashboard running on http://localhost:${PORT}`)
  console.log(`📊 React frontend served from: ${distPath}`)
  console.log(`🗄️  Database: ${process.env.DATABASE_URL}`)
  
  // Try to open browser automatically
  const open = (url) => {
    const { spawn } = require('child_process')
    const start = process.platform === 'darwin' ? 'open' : 
                  process.platform === 'win32' ? 'start' : 'xdg-open'
    try {
      spawn(start, [url], { detached: true, stdio: 'ignore' }).unref()
      console.log('🖥️  Browser opening automatically...')
    } catch (error) {
      console.log('ℹ️  Please manually open: http://localhost:3005')
    }
  }
  
  setTimeout(() => {
    open(`http://localhost:${PORT}`)
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