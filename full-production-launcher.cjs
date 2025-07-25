#!/usr/bin/env node

const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')
const net = require('net')

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

// Set environment variables
process.env.DATABASE_URL = `file:${path.join(APP_DIR, 'competitor_products.db')}`
process.env.NODE_ENV = 'production'

// Check if port is available
function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer()
    
    server.listen(port, () => {
      server.once('close', () => resolve(true))
      server.close()
    })
    
    server.on('error', () => resolve(false))
  })
}

async function startServer() {
  // Check if port is available
  const portAvailable = await checkPort(PORT)
  if (!portAvailable) {
    console.log(`⚠️  Port ${PORT} already in use. Please close other applications using this port.`)
    process.exit(1)
  }

  // Check if server files exist
  const serverPath = path.join(APP_DIR, 'server', 'index.ts')
  if (!fs.existsSync(serverPath)) {
    console.error('❌ Server files not found. Make sure server directory is in the app directory.')
    process.exit(1)
  }

  // Check if dist files exist
  const distPath = path.join(APP_DIR, 'dist', 'index.html')
  if (!fs.existsSync(distPath)) {
    console.error('❌ Frontend files not found. Make sure dist directory is in the app directory.')
    process.exit(1)
  }

  console.log('🔧 Starting Express server with full API functionality...')
  
  // Start the full Express server using tsx
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
    console.error('Make sure Node.js and npx are available on the system.')
    process.exit(1)
  })

  serverProcess.on('close', (code) => {
    console.log(`🛑 Server process exited with code ${code}`)
    process.exit(code || 0)
  })

  // Wait a bit then try to open browser
  setTimeout(() => {
    console.log(`🌐 Competitor Dashboard should be running on http://localhost:${PORT}`)
    console.log(`📊 Opening browser to: http://localhost:${PORT}`)
    
    // Try to open browser automatically
    const open = (url) => {
      const start = process.platform === 'darwin' ? 'open' : 
                    process.platform === 'win32' ? 'start' : 'xdg-open'
      try {
        spawn(start, [url], { detached: true, stdio: 'ignore' }).unref()
        console.log('🖥️  Browser should open automatically')
      } catch (error) {
        console.log('ℹ️  Could not auto-open browser. Please manually open the URL above.')
      }
    }
    
    open(`http://localhost:${PORT}`)
  }, 3000)

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down Competitor Dashboard...')
    serverProcess.kill('SIGTERM')
    setTimeout(() => {
      process.exit(0)
    }, 1000)
  })

  process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down Competitor Dashboard...')
    serverProcess.kill('SIGTERM')
    setTimeout(() => {
      process.exit(0)
    }, 1000)
  })
}

startServer().catch((error) => {
  console.error('❌ Failed to start application:', error)
  process.exit(1)
})