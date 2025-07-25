const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const isDev = process.env.NODE_ENV === 'development'

let mainWindow
let serverProcess

// Check if port is already in use
function checkPort(port) {
  return new Promise((resolve) => {
    const net = require('net')
    const server = net.createServer()
    
    server.listen(port, () => {
      server.once('close', () => resolve(true))
      server.close()
    })
    
    server.on('error', () => resolve(false))
  })
}

// Start Express server in main process
async function startExpressServer() {
  console.log('🚀 Starting Express server...')
  
  // Check if port 3005 is available
  const portAvailable = await checkPort(3005)
  if (!portAvailable) {
    console.log('⚠️  Port 3005 already in use, server might already be running')
    return
  }
  
  const serverPath = path.join(__dirname, 'server/index.ts')
  
  // Use tsx for TypeScript execution
  serverProcess = spawn('npx', ['tsx', serverPath], {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  })
  
  serverProcess.on('error', (error) => {
    console.error('Failed to start server:', error)
  })
  
  serverProcess.on('close', (code) => {
    console.log(`Server process exited with code ${code}`)
  })
}

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'electron-preload.cjs')
    },
    icon: path.join(__dirname, 'src-tauri/icons/128x128.png'),
    title: 'Competitor Dashboard'
  })

  // Load the app
  if (isDev) {
    // In development, load the built static files served by our Express server
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'))
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'))
  }
}

app.whenReady().then(async () => {
  // Start Express server
  await startExpressServer()
  
  // Wait a bit then create window
  setTimeout(() => {
    createWindow()
  }, 3000)

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', function () {
  // Kill server process
  if (serverProcess) {
    serverProcess.kill()
  }
  
  if (process.platform !== 'darwin') app.quit()
})

// IPC handlers for communication with renderer
ipcMain.handle('get-app-version', () => {
  return app.getVersion()
})