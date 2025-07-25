#!/usr/bin/env node

const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')

// Simple Electron runner that bypasses installation issues
console.log('🚀 Starting Electron app...')

// Check if we have a working electron binary
const electronPaths = [
  './node_modules/.bin/electron',
  './node_modules/electron/dist/electron',
  '/usr/bin/electron',
  '/usr/local/bin/electron'
]

let electronPath = null
for (const ePath of electronPaths) {
  if (fs.existsSync(ePath)) {
    electronPath = ePath
    break
  }
}

if (!electronPath) {
  console.error('❌ Electron binary not found. Install Electron first.')
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
  const electronProcess = spawn(electronPath, ['.'], {
    stdio: 'inherit',
    detached: false
  })
  
  electronProcess.on('close', () => {
    console.log('🛑 Electron closed, stopping server...')
    serverProcess.kill()
    process.exit()
  })
}, 3000)

// Handle cleanup
process.on('SIGINT', () => {
  console.log('🛑 Shutting down...')
  serverProcess.kill()
  process.exit()
})