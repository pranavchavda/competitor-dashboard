#!/usr/bin/env node

const { spawn } = require('child_process')

console.log('🖥️  Launching Electron window (server should already be running)...')
const electronProcess = spawn('electron', ['.', '--no-sandbox', '--disable-gpu'], {
  stdio: 'inherit',
  detached: false
})

electronProcess.on('close', (code) => {
  console.log(`🛑 Electron closed with code ${code}`)
  process.exit()
})

electronProcess.on('error', (error) => {
  console.error('❌ Electron failed to start:', error)
  process.exit(1)
})

// Handle cleanup
process.on('SIGINT', () => {
  console.log('🛑 Shutting down Electron...')
  electronProcess.kill()
  process.exit()
})