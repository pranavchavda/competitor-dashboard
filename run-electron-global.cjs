#!/usr/bin/env node

const { spawn } = require('child_process')
const net = require('net')

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

async function main() {
  console.log('🚀 Starting Electron app with global installation...')
  
  // Check if port 3005 is available
  const portAvailable = await checkPort(3005)
  if (!portAvailable) {
    console.log('⚠️  Port 3005 already in use, please stop other servers first')
    process.exit(1)
  }
  
  // Start the server first
  console.log('🔧 Starting Express server...')
  const serverProcess = spawn('pnpm', ['run', 'server:dev'], {
    stdio: 'inherit',
    detached: false
  })
  
  // Wait a bit for server to start, then launch Electron
  setTimeout(() => {
    console.log('🖥️  Launching Electron window...')
    const electronProcess = spawn('electron', ['.'], {
      stdio: 'inherit',
      detached: false
    })
    
    electronProcess.on('close', () => {
      console.log('🛑 Electron closed, stopping server...')
      serverProcess.kill()
      process.exit()
    })
    
    electronProcess.on('error', (error) => {
      console.error('❌ Electron failed to start:', error)
      serverProcess.kill()
      process.exit(1)
    })
  }, 3000)
  
  // Handle cleanup
  process.on('SIGINT', () => {
    console.log('🛑 Shutting down...')
    serverProcess.kill()
    process.exit()
  })
}

main().catch(console.error)