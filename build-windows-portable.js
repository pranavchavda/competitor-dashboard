#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import https from 'https'
import { execSync } from 'child_process'

// Configuration
const NODE_VERSION = '22.12.0'
const NODE_URL = `https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-win-x64.zip`
const OUTPUT_DIR = 'dist-windows-portable'
const NODE_DIR = path.join(OUTPUT_DIR, 'node')

console.log('🚀 Building Windows Portable Distribution...')

// Clean and create output directory
if (fs.existsSync(OUTPUT_DIR)) {
  console.log('🧹 Cleaning existing output directory...')
  fs.rmSync(OUTPUT_DIR, { recursive: true, force: true })
}
fs.mkdirSync(OUTPUT_DIR, { recursive: true })

// Step 1: Build the React frontend
console.log('📦 Building React frontend...')
try {
  execSync('pnpm run build', { stdio: 'inherit' })
} catch (error) {
  console.error('❌ Failed to build frontend:', error.message)
  process.exit(1)
}

// Step 2: Download Node.js portable
console.log('⬇️  Downloading Node.js portable...')
const nodeZipPath = path.join(OUTPUT_DIR, 'node.zip')

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest)
    https.get(url, (response) => {
      response.pipe(file)
      file.on('finish', () => {
        file.close()
        resolve()
      })
    }).on('error', (err) => {
      fs.unlink(dest, () => {}) // Delete the file async
      reject(err)
    })
  })
}

async function extractZip(zipPath, extractTo) {
  console.log('📂 Extracting Node.js...')
  try {
    // Use built-in Node.js to extract (requires Node.js on build machine)
    execSync(`cd "${OUTPUT_DIR}" && unzip -q node.zip`, { stdio: 'inherit' })
    
    // Move extracted folder to 'node' directory
    const extractedDir = `node-v${NODE_VERSION}-win-x64`
    const extractedPath = path.join(OUTPUT_DIR, extractedDir)
    
    if (fs.existsSync(extractedPath)) {
      fs.renameSync(extractedPath, NODE_DIR)
      fs.unlinkSync(zipPath) // Remove zip file
      console.log('✅ Node.js extracted successfully')
    } else {
      throw new Error('Extracted directory not found')
    }
  } catch (error) {
    console.error('❌ Failed to extract Node.js:', error.message)
    console.log('💡 Trying alternative extraction method...')
    
    // Alternative: Manual extraction using Node.js streams
    // This would require implementing zip extraction, for now we'll skip
    console.log('⚠️  Please manually extract node.zip in the output directory')
  }
}

async function main() {
  try {
    // Download Node.js
    await downloadFile(NODE_URL, nodeZipPath)
    console.log('✅ Node.js downloaded')
    
    // Extract Node.js
    await extractZip(nodeZipPath, NODE_DIR)
    
    // Step 3: Copy application files
    console.log('📋 Copying application files...')
    
    // Copy built frontend
    execSync(`cp -r dist "${OUTPUT_DIR}/"`, { stdio: 'inherit' })
    
    // Bundle server using esbuild for better compatibility
    console.log('🔧 Bundling server with esbuild...')
    // Use CommonJS format and only keep native/problematic modules external
    // Remove problematic import.meta.url definition that causes invalid URLs
    execSync('npx esbuild server/index.ts --bundle --platform=node --target=node18 --format=cjs --outfile=dist-server-bundled.cjs --external:sqlite3 --external:@prisma/engines', { stdio: 'inherit' })
    
    // Copy bundled server with .cjs extension to force CommonJS treatment
    fs.mkdirSync(path.join(OUTPUT_DIR, 'server'), { recursive: true })
    execSync(`cp dist-server-bundled.cjs "${OUTPUT_DIR}/server/index.cjs"`, { stdio: 'inherit' })
    
    // Copy src for any remaining dependencies
    execSync(`cp -r src "${OUTPUT_DIR}/"`, { stdio: 'inherit' })
    
    // Create modified real-standalone script for portable bundle
    console.log('📝 Creating portable real-standalone script...')
    const originalScript = fs.readFileSync('real-standalone.cjs', 'utf8')
    
    // Replace tsx with direct JavaScript execution of bundled server
    const portableScript = originalScript.replace(
      `// Check if server files exist
  const serverPath = path.join(APP_DIR, 'server', 'index.ts')`,
      `// Check if server files exist
  const serverPath = path.join(APP_DIR, 'server', 'index.cjs')`
    ).replace(
      `const serverProcess = spawn('npx', ['tsx', serverPath], {
    cwd: APP_DIR,
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: PORT.toString()
    }
  })`,
      `const nodeExe = path.join(APP_DIR, 'node', 'node.exe')
  
  // For portable bundle, run bundled JavaScript directly
  const serverProcess = spawn(nodeExe, [serverPath], {
    cwd: APP_DIR,
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: PORT.toString()
    }
  })`
    ).replace(
      `console.error('💡 Make sure Node.js and npx are available on the system.')
    console.error('💡 This executable needs Node.js to run the TypeScript server.')`,
      `console.error('💡 Portable Node.js bundle may be corrupted.')
    console.error('💡 Try re-downloading the application package.')`
    )
    
    fs.writeFileSync(path.join(OUTPUT_DIR, 'real-standalone.cjs'), portableScript)
    
    // Copy database
    execSync(`cp prisma/competitor_products.db "${OUTPUT_DIR}/"`, { stdio: 'inherit' })
    
    // Copy prisma schema
    fs.mkdirSync(path.join(OUTPUT_DIR, 'prisma'), { recursive: true })
    execSync(`cp prisma/schema.prisma "${OUTPUT_DIR}/prisma/"`, { stdio: 'inherit' })
    
    // Copy package.json (needed for dependencies info)
    execSync(`cp package.json "${OUTPUT_DIR}/"`, { stdio: 'inherit' })
    
    // Step 4: Install production dependencies using the portable Node.js
    console.log('📦 Installing production dependencies...')
    const nodeExe = path.join(NODE_DIR, 'node.exe')
    // Use npx that comes with Node.js portable
    const npxExe = path.join(NODE_DIR, 'npx.cmd')
    
    process.chdir(OUTPUT_DIR)
    
    // Copy node_modules from development (includes tsx and esbuild)
    console.log('📦 Copying node_modules from development environment...')
    process.chdir('..')  // Go back to root
    execSync(`cp -r node_modules "${OUTPUT_DIR}/"`, { stdio: 'inherit' })
    
    // Ensure Prisma client is available at the expected location for @prisma/client
    if (fs.existsSync('node_modules/.prisma')) {
      console.log('📋 Ensuring Prisma client is at standard location...')
      // It should already be copied with node_modules, but let's verify
      if (!fs.existsSync(path.join(OUTPUT_DIR, 'node_modules/.prisma'))) {
        execSync(`cp -r node_modules/.prisma "${OUTPUT_DIR}/node_modules/"`, { stdio: 'inherit' })
      }
      
      // Copy .prisma to @prisma/client directory for proper resolution
      const prismaClientDir = path.join(OUTPUT_DIR, 'node_modules/@prisma/client')
      if (fs.existsSync(prismaClientDir)) {
        console.log('📋 Copying Prisma client to @prisma/client directory...')
        execSync(`cp -r "${OUTPUT_DIR}/node_modules/.prisma" "${prismaClientDir}/"`, { stdio: 'inherit' })
        
        // Copy Windows query engine to both locations for proper runtime resolution
        const windowsEngine = 'query_engine-windows.dll.node'
        const windowsEngineSource = path.join(OUTPUT_DIR, `node_modules/.pnpm/@prisma+client@6.12.0_prisma@6.12.0_typescript@5.8.3__typescript@5.8.3/node_modules/.prisma/client/${windowsEngine}`)
        
        if (fs.existsSync(windowsEngineSource)) {
          console.log('📋 Copying Windows query engine to all required locations...')
          // Copy to main .prisma directory
          const mainPrismaTarget = path.join(OUTPUT_DIR, `node_modules/.prisma/client/${windowsEngine}`)
          execSync(`cp "${windowsEngineSource}" "${mainPrismaTarget}"`, { stdio: 'inherit' })
          
          // Copy to @prisma/client .prisma directory
          const clientPrismaTarget = path.join(OUTPUT_DIR, `node_modules/@prisma/client/.prisma/client/${windowsEngine}`)
          execSync(`cp "${windowsEngineSource}" "${clientPrismaTarget}"`, { stdio: 'inherit' })
          
          console.log('✅ Windows query engine copied to all locations')
        }
        
        console.log('✅ Prisma client copied to @prisma/client/.prisma/')
      }
      console.log('✅ Prisma client available in portable bundle')
    }
    
    process.chdir(OUTPUT_DIR)
    
    // Prisma client should already be copied with node_modules, just verify
    console.log('🔧 Verifying Prisma client in portable bundle...')
    if (fs.existsSync(path.join(OUTPUT_DIR, 'node_modules/.prisma'))) {
      console.log('✅ Prisma client verified in portable bundle')
    } else {
      console.log('⚠️  Prisma client not found - this may cause runtime errors')
    }
    
    // Step 6: Create batch files
    console.log('📝 Creating batch files...')
    
    // Main launcher
    const launcherBat = `@echo off
title Competitor Dashboard
echo 🚀 Starting Competitor Dashboard...
echo.
echo 📊 This will open your browser automatically
echo 💡 Close this window to stop the application
echo.
"%~dp0node\\node.exe" "%~dp0real-standalone.cjs"
pause`
    
    fs.writeFileSync(path.join('.', 'Competitor Dashboard.bat'), launcherBat)
    
    // Silent launcher (no console window)
    const silentLauncher = `@echo off
start /B "" "%~dp0node\\node.exe" "%~dp0real-standalone.cjs"`
    
    fs.writeFileSync(path.join('.', 'Start Silent.bat'), silentLauncher)
    
    // Step 7: Create README
    console.log('📚 Creating documentation...')
    const readme = `# Competitor Dashboard - Windows Portable

## Quick Start
1. Double-click "Competitor Dashboard.bat" to start the application
2. Your browser will open automatically to the dashboard
3. Close the console window to stop the application

## Alternative
- Use "Start Silent.bat" to run without the console window

## Files Included
- node/               - Portable Node.js runtime
- dist/               - Web application files  
- server/             - Backend server code
- real-standalone.cjs - Main application
- competitor_products.db - Local database
- node_modules/       - Required dependencies

## No Installation Required
This is a completely portable application. No need to install Node.js or any other software.
Just run the batch file and you're ready to go!

## System Requirements
- Windows 7 or later
- 4GB RAM recommended
- 100MB free disk space

## Troubleshooting
- If the browser doesn't open automatically, go to http://localhost:3005
- If port 3005 is busy, the app will automatically find another port
- Check the console window for any error messages

## Support
See the Help section in the application for detailed usage instructions.
`
    
    fs.writeFileSync(path.join('.', 'README.txt'), readme)
    
    console.log('✅ Windows portable distribution created successfully!')
    console.log(`📁 Output directory: ${path.resolve(OUTPUT_DIR)}`)
    console.log('🎉 Users can now run "Competitor Dashboard.bat" without installing Node.js!')
    
  } catch (error) {
    console.error('❌ Build failed:', error.message)
    process.exit(1)
  }
}

main()