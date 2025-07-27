#!/usr/bin/env node

const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')
const net = require('net')

// Get the executable directory (works for pkg bundled apps)
const getAppDir = () => {
  if (process.pkg) {
    return path.dirname(process.execPath)
  }
  return __dirname
}

const APP_DIR = getAppDir()
let PORT = process.env.PORT || 3005

console.log('🚀 Starting Real Competitor Dashboard Server...')
console.log(`📁 App directory: ${APP_DIR}`)

// Set environment variables
process.env.DATABASE_URL = `file:${path.join(APP_DIR, 'competitor_products.db')}`
process.env.NODE_ENV = 'production'

// Check if port is available
function checkPort(port) {
  return new Promise((resolve) => {
    const testServer = net.createServer()
    
    testServer.listen(port, '127.0.0.1', () => {
      testServer.close(() => resolve(true))
    })
    
    testServer.on('error', () => resolve(false))
  })
}

// Find an available port starting from the preferred port
async function findAvailablePort(startPort = 3005, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i
    const isAvailable = await checkPort(port)
    if (isAvailable) {
      return port
    }
  }
  throw new Error(`Could not find an available port after ${maxAttempts} attempts starting from ${startPort}`)
}

async function startRealServer() {
  // Find an available port dynamically
  try {
    PORT = await findAvailablePort(PORT)
    console.log(`✅ Found available port: ${PORT}`)
  } catch (error) {
    console.log(`❌ ${error.message}`)
    console.log(`💡 Please close some applications and try again, or restart your computer.`)
    process.exit(1)
  }

  // Check if server files exist
  const serverPath = path.join(APP_DIR, 'server', 'index.ts')
  if (!fs.existsSync(serverPath)) {
    console.error('❌ Server files not found. Make sure server directory is in the app directory.')
    console.log(`   Looking for: ${serverPath}`)
    process.exit(1)
  }

  // Check if dist files exist
  const distPath = path.join(APP_DIR, 'dist', 'index.html')
  if (!fs.existsSync(distPath)) {
    console.error('❌ Frontend files not found. Make sure dist directory is in the app directory.')
    console.log(`   Looking for: ${distPath}`)
    process.exit(1)
  }

  console.log('🔧 Starting your real Express server with full database functionality...')
  console.log('📊 This includes: Real APIs, Database, WebSocket, Scraping, etc.')
  
  // Start the real Express server using tsx
  const serverProcess = spawn('npx', ['tsx', serverPath], {
    cwd: APP_DIR,
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: PORT.toString()
    }
  })

  serverProcess.on('error', (error) => {
    console.error('❌ Failed to start server:', error)
    console.error('💡 Make sure Node.js and npx are available on the system.')
    console.error('💡 This executable needs Node.js to run the TypeScript server.')
    process.exit(1)
  })

  serverProcess.on('close', (code) => {
    console.log(`🛑 Server process exited with code ${code}`)
    process.exit(code || 0)
  })

  // Wait for server to start, then open browser
  setTimeout(() => {
    console.log(`🌐 Real Competitor Dashboard running on http://localhost:${PORT}`)
    console.log(`📊 Opening browser to: http://localhost:${PORT}`)
    
    // Try to open browser automatically
    const open = (url) => {
      try {
        if (process.platform === 'win32') {
          spawn('cmd', ['/c', 'start', url], { detached: true, stdio: 'ignore' }).unref()
        } else if (process.platform === 'darwin') {
          spawn('open', [url], { detached: true, stdio: 'ignore' }).unref()
        } else {
          spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref()
        }
        console.log('🖥️  Browser should open automatically')
      } catch (error) {
        console.log('ℹ️  Could not auto-open browser. Please manually open the URL above.')
      }
    }
    
    open(`http://localhost:${PORT}`)
  }, 5000)

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down Real Competitor Dashboard...')
    serverProcess.kill('SIGTERM')
    setTimeout(() => {
      process.exit(0)
    }, 2000)
  })

  process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down Real Competitor Dashboard...')
    serverProcess.kill('SIGTERM')
    setTimeout(() => {
      process.exit(0)
    }, 2000)
  })
}

startRealServer().catch((error) => {
  console.error('❌ Failed to start application:', error)
  process.exit(1)
})