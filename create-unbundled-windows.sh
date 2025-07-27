#!/bin/bash

set -e

echo "📦 Creating UNBUNDLED Windows Portable distribution (fallback)..."

DIST_DIR="dist-windows-portable-unbundled"
ZIP_NAME="competitor-dashboard-windows-unbundled.zip"

# Clean and create output directory
if [ -d "$DIST_DIR" ]; then
    rm -rf "$DIST_DIR"
fi
mkdir -p "$DIST_DIR"

# Copy essential files
echo "📋 Copying essential files..."
cp -r dist "$DIST_DIR/"
cp -r prisma "$DIST_DIR/"
cp -r dist-windows-portable/node "$DIST_DIR/"
cp competitor_products.db "$DIST_DIR/" 2>/dev/null || cp prisma/competitor_products.db "$DIST_DIR/" 2>/dev/null || true

# Copy server source instead of bundled version
echo "📋 Copying server source files..."
mkdir -p "$DIST_DIR/server"
cp server/index.ts "$DIST_DIR/server/"

# Copy package.json
cp package.json "$DIST_DIR/"

# Copy ALL node_modules (this is the safest approach)
echo "📦 Copying complete node_modules (this may take a while)..."
cp -r node_modules "$DIST_DIR/"

# Create modified launcher that uses tsx to run TypeScript directly
echo "📝 Creating TypeScript-compatible launcher..."

cat > "$DIST_DIR/real-standalone.cjs" << 'EOF'
#!/usr/bin/env node

const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')
const net = require('net')

const getAppDir = () => {
  if (process.pkg) {
    return path.dirname(process.execPath)
  }
  return __dirname
}

const APP_DIR = getAppDir()
let PORT = process.env.PORT || 3005

console.log('🚀 Starting Competitor Dashboard Server (Unbundled)...')
console.log(`📁 App directory: ${APP_DIR}`)

process.env.DATABASE_URL = `file:${path.join(APP_DIR, 'competitor_products.db')}`
process.env.NODE_ENV = 'production'

function checkPort(port) {
  return new Promise((resolve) => {
    const testServer = net.createServer()
    testServer.listen(port, '127.0.0.1', () => {
      testServer.close(() => resolve(true))
    })
    testServer.on('error', () => resolve(false))
  })
}

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

async function startServer() {
  try {
    PORT = await findAvailablePort(PORT)
    console.log(`✅ Found available port: ${PORT}`)
  } catch (error) {
    console.log(`❌ ${error.message}`)
    process.exit(1)
  }

  const serverPath = path.join(APP_DIR, 'server', 'index.ts')
  if (!fs.existsSync(serverPath)) {
    console.error('❌ Server files not found.')
    process.exit(1)
  }

  const distPath = path.join(APP_DIR, 'dist', 'index.html')
  if (!fs.existsSync(distPath)) {
    console.error('❌ Frontend files not found.')
    process.exit(1)
  }

  console.log('🔧 Starting TypeScript server with tsx...')
  
  const nodeExe = path.join(APP_DIR, 'node', 'node.exe')
  const tsxPath = path.join(APP_DIR, 'node_modules', '.bin', 'tsx.cmd')
  
  // Run tsx directly with the TypeScript file
  const serverProcess = spawn(nodeExe, [tsxPath, serverPath], {
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
    process.exit(1)
  })

  serverProcess.on('close', (code) => {
    console.log(`🛑 Server process exited with code ${code}`)
    process.exit(code || 0)
  })

  setTimeout(() => {
    console.log(`🌐 Competitor Dashboard running on http://localhost:${PORT}`)
    
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
  }, 5000)

  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down...')
    serverProcess.kill('SIGTERM')
    setTimeout(() => process.exit(0), 2000)
  })
}

startServer().catch((error) => {
  console.error('❌ Failed to start application:', error)
  process.exit(1)
})
EOF

# Create batch files
cat > "$DIST_DIR/Competitor Dashboard.bat" << 'EOF'
@echo off
title Competitor Dashboard (Unbundled)
echo 🚀 Starting Competitor Dashboard...
echo.
echo 📊 This will open your browser automatically
echo 💡 Close this window to stop the application
echo.
"%~dp0node\node.exe" "%~dp0real-standalone.cjs"
pause
EOF

cat > "$DIST_DIR/Start Silent.bat" << 'EOF'
@echo off
start /B "" "%~dp0node\node.exe" "%~dp0real-standalone.cjs"
EOF

# Create README
cat > "$DIST_DIR/README.txt" << 'EOF'
# Competitor Dashboard - Windows Portable (Unbundled Version)

This is the unbundled version that runs TypeScript source directly.
It includes the complete development environment and should work reliably.

## Quick Start
1. Double-click "Competitor Dashboard.bat" to start the application
2. Your browser will open automatically to the dashboard
3. Close the console window to stop the application

## What's Different
- Runs TypeScript source files directly (not bundled)
- Includes complete node_modules for maximum compatibility
- Uses tsx to compile TypeScript on-the-fly
- Larger file size but more reliable

## Troubleshooting
- If you get module errors, this version should resolve them
- All dependencies are included in their original form
- Uses the same Node.js runtime as the bundled version

EOF

# Create ZIP
if [ -f "$ZIP_NAME" ]; then
    rm "$ZIP_NAME"
fi

echo "🗜️  Creating ZIP archive..."
cd "$DIST_DIR"
zip -r "../$ZIP_NAME" . -x "*.log" "*.tmp" -q
cd ..

# Clean up
rm -rf "$DIST_DIR"

FINAL_SIZE=$(du -sh "$ZIP_NAME" | cut -f1)
echo "✅ Unbundled Windows ZIP created: $ZIP_NAME ($FINAL_SIZE)"
echo ""
echo "📋 Try this version if the bundled version still has module issues."
echo "💡 This includes the complete development environment for maximum compatibility."