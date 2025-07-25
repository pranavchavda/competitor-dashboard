#!/usr/bin/env node

const { spawn } = require('child_process')
const path = require('path')

// Simple Electron runner using npx to avoid installation issues
console.log('🚀 Starting Electron app with npx...')

// Start the server first
console.log('🔧 Starting Express server...')
const serverProcess = spawn('pnpm', ['run', 'server:dev'], {
  stdio: 'inherit',
  detached: false
})

// Wait a bit for server to start, then launch Electron
setTimeout(() => {
  console.log('🖥️  Launching Electron window with npx...')
  const electronProcess = spawn('npx', ['electron', '.'], {
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