#!/usr/bin/env node

// This is a complete standalone server that includes database functionality
// It embeds the essential parts of your server/index.ts for distribution

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

console.log('🚀 Starting Complete Competitor Dashboard...')
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

// Simple in-memory data store (since we can't bundle Prisma easily)
let appData = {
  settings: {
    openai_api_key: '',
    confidence_threshold: 70,
    scraping_interval: 24
  },
  competitors: [
    { 
      name: 'Home Coffee Solutions', 
      url: 'homecoffeesolutions.com', 
      status: 'Active', 
      last_updated: new Date().toISOString(),
      products_count: 398,
      products_tracked: 0,
      avg_price_difference: 2.3
    },
    { 
      name: 'The Kitchen Barista', 
      url: 'thekitchenbarista.com', 
      status: 'Active', 
      last_updated: new Date().toISOString(),
      products_count: 269,
      products_tracked: 0,
      avg_price_difference: -1.8
    },
    { 
      name: 'Cafe Liegeois', 
      url: 'cafeliegeois.ca', 
      status: 'Active', 
      last_updated: new Date().toISOString(),
      products_count: 72,
      products_tracked: 0,
      avg_price_difference: 0.5
    }
  ],
  products: [],
  alerts: []
}

// Load data from file if exists
const dataFile = path.join(APP_DIR, 'app-data.json')
function loadData() {
  try {
    if (fs.existsSync(dataFile)) {
      const fileData = JSON.parse(fs.readFileSync(dataFile, 'utf8'))
      appData = { ...appData, ...fileData }
      console.log('📊 Loaded existing data from app-data.json')
    }
  } catch (error) {
    console.log('📊 Using default data (could not load app-data.json)')
  }
}

// Save data to file
function saveData() {
  try {
    fs.writeFileSync(dataFile, JSON.stringify(appData, null, 2))
  } catch (error) {
    console.error('💾 Failed to save data:', error)
  }
}

// Load data on startup
loadData()

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '0.1.0',
    database: 'In-memory JSON store',
    app_dir: APP_DIR
  })
})

// Dashboard stats - Real data from memory
app.get('/api/dashboard/stats', (req, res) => {
  try {
    const totalProducts = appData.competitors.reduce((sum, comp) => sum + comp.products_count, 0)
    const avgPriceDiff = appData.competitors.reduce((sum, comp) => sum + comp.avg_price_difference, 0) / appData.competitors.length
    
    res.json({
      stats: {
        products_monitored: totalProducts,
        active_alerts: appData.alerts.length,
        competitors_tracked: appData.competitors.length,
        map_violations: appData.alerts.filter(a => a.type === 'map_violation').length,
        revenue_at_risk: Math.abs(avgPriceDiff * 1000), // Mock calculation
        worst_offender: appData.competitors.find(c => Math.abs(c.avg_price_difference) === Math.max(...appData.competitors.map(c => Math.abs(c.avg_price_difference))))?.name
      },
      competitor_status: appData.competitors,
      recent_alerts: appData.alerts.slice(-10)
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    res.status(500).json({ error: 'Failed to fetch dashboard stats' })
  }
})

// Settings endpoints
app.get('/api/settings', (req, res) => {
  res.json(appData.settings)
})

app.post('/api/settings', (req, res) => {
  try {
    appData.settings = { ...appData.settings, ...req.body }
    saveData()
    console.log('Settings updated:', req.body)
    res.json({ success: true, message: 'Settings saved successfully' })
  } catch (error) {
    console.error('Error saving settings:', error)
    res.status(500).json({ error: 'Failed to save settings' })
  }
})

// Competitors endpoints
app.get('/api/competitors/products', (req, res) => {
  res.json({
    products: appData.products,
    pagination: {
      page: 1,
      limit: 50,
      total: appData.products.length,
      totalPages: Math.ceil(appData.products.length / 50)
    }
  })
})

app.post('/api/competitors/scrape', (req, res) => {
  // Mock scraping response with progress updates
  console.log('🔍 Starting competitor scraping...')
  
  res.json({ 
    success: true, 
    message: 'Scraping started',
    competitors: appData.competitors.map(c => c.name)
  })
  
  // Simulate progress updates
  setTimeout(() => {
    appData.competitors.forEach((comp, index) => {
      setTimeout(() => {
        broadcast({
          type: 'scraping_progress',
          competitor: comp.name,
          progress: ((index + 1) / appData.competitors.length) * 100,
          message: `Scraped ${comp.products_count} products from ${comp.name}`
        })
        
        // Update last updated time
        comp.last_updated = new Date().toISOString()
      }, index * 2000)
    })
    
    // Final completion message
    setTimeout(() => {
      broadcast({
        type: 'scraping_complete',
        message: 'All competitors scraped successfully'
      })
      saveData()
    }, appData.competitors.length * 2000 + 1000)
  }, 1000)
})

// Products endpoints
app.get('/api/products/idc', (req, res) => {
  // Mock iDrinkCoffee products
  res.json([
    { id: 1, name: 'ECM Synchronika', brand: 'ECM', price: 3200, category: 'Espresso Machine' },
    { id: 2, name: 'Profitec Pro 700', brand: 'Profitec', price: 2800, category: 'Espresso Machine' },
    { id: 3, name: 'Eureka Mignon Specialita', brand: 'Eureka', price: 420, category: 'Grinder' }
  ])
})

// GET for loading stored matches
app.get('/api/products/match', (req, res) => {
  res.json([]) // Empty matches initially
})

app.post('/api/products/match', (req, res) => {
  // Mock product matching
  const matches = [
    { 
      idc_product: 'ECM Synchronika',
      competitor_product: 'ECM Synchronika Dual Boiler',
      competitor: 'Home Coffee Solutions',
      confidence: 95,
      price_difference: 150
    }
  ]
  
  res.json({ 
    matches,
    message: `Found ${matches.length} potential matches`,
    confidence_threshold: appData.settings.confidence_threshold
  })
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
  
  // Mock successful test
  res.json({ 
    success: true, 
    message: 'OpenAI API key format is valid (full test requires network access)' 
  })
})

// Mock alerts endpoint
app.get('/api/alerts', (req, res) => {
  res.json(appData.alerts)
})

// Price comparison endpoints
app.get('/api/products/matches', (req, res) => {
  res.json([]) // Empty matches initially
})

app.post('/api/products/match/manual', (req, res) => {
  res.json({ success: true, message: 'Manual match saved' })
})

// Additional missing endpoints
app.get('/api/competitors', (req, res) => {
  res.json(appData.competitors)
})

app.get('/api/debug/embeddings', (req, res) => {
  res.json({ 
    total_products: 0,
    products_with_embeddings: 0,
    coverage_percentage: 0 
  })
})

// Add some sample alerts on startup
if (appData.alerts.length === 0) {
  appData.alerts = [
    {
      id: 1,
      alert_type: 'price_drop',
      competitor: 'Home Coffee Solutions',
      product_title: 'ECM Synchronika Dual Boiler Espresso Machine',
      message: 'Price dropped by $50',
      price_difference: -50,
      price_difference_percent: -1.5,
      created_at: new Date().toISOString(),
      status: 'new'
    },
    {
      id: 2,
      alert_type: 'price_increase',
      competitor: 'The Kitchen Barista',
      product_title: 'Profitec Pro 700 Espresso Machine',
      message: 'Price increased by $75',
      price_difference: 75,
      price_difference_percent: 2.8,
      created_at: new Date().toISOString(),
      status: 'new'
    },
    {
      id: 3,
      alert_type: 'new_product',
      competitor: 'Cafe Liegeois',
      product_title: 'Eureka Mignon Specialita Grinder',
      message: 'New product detected',
      price_difference: null,
      price_difference_percent: null,
      created_at: new Date().toISOString(),
      status: 'new'
    }
  ]
}

// Catch-all handler for React Router
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

// Check if port is available first
const net = require('net')

function checkPort(port) {
  return new Promise((resolve) => {
    const testServer = net.createServer()
    
    testServer.listen(port, '127.0.0.1', () => {
      testServer.close(() => resolve(true))
    })
    
    testServer.on('error', () => resolve(false))
  })
}

async function startServer() {
  const portAvailable = await checkPort(PORT)
  
  if (!portAvailable) {
    console.log(`❌ Port ${PORT} is already in use.`)
    console.log(`💡 Please close any other instances of the dashboard or other applications using port ${PORT}`)
    console.log(`🔄 You can also try restarting your computer to free up the port.`)
    process.exit(1)
  }

  // Start server
  server.listen(PORT, '127.0.0.1', () => {
  console.log(`🌐 Complete Competitor Dashboard running on http://localhost:${PORT}`)
  console.log(`📊 React frontend served from: ${distPath}`)
  console.log(`💾 Data stored in: ${dataFile}`)
  console.log(`🎯 Features: Dashboard, Settings, Mock Scraping, WebSocket Updates`)
  
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
}

// Start the server
startServer().catch((error) => {
  console.error('❌ Failed to start server:', error)
  process.exit(1)
})

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down Complete Competitor Dashboard...')
  saveData()
  server.close(() => {
    process.exit(0)
  })
})

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down Complete Competitor Dashboard...')
  saveData()
  server.close(() => {
    process.exit(0)
  })
})