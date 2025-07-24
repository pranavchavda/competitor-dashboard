const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
let nextServer;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: false // Allow loading from localhost
    },
    icon: path.join(__dirname, '../public/icon.png'),
    show: false // Don't show until ready
  });

  // Load the Next.js app
  const serverUrl = 'http://localhost:3000';
  
  if (isDev) {
    // In development, expect Next.js dev server to be running
    mainWindow.loadURL(serverUrl);
    mainWindow.webContents.openDevTools();
  } else {
    // In production, start Next.js server
    startNextServer().then(() => {
      // Wait a bit for server to be ready, then load
      setTimeout(() => {
        mainWindow.loadURL(serverUrl);
      }, 3000);
    }).catch(err => {
      console.error('Failed to start Next.js server:', err);
      // Show error page or exit
      app.quit();
    });
  }

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function startNextServer() {
  return new Promise((resolve, reject) => {
    console.log('Starting Next.js server...');
    
    // Build first
    console.log('Building Next.js app...');
    const buildProcess = spawn('npm', ['run', 'build'], {
      stdio: 'inherit',
      shell: true
    });

    buildProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Build failed with code ${code}`));
        return;
      }

      console.log('Build completed, starting server...');
      
      // Start server
      nextServer = spawn('npm', ['run', 'start'], {
        stdio: 'inherit',
        shell: true,
        env: {
          ...process.env,
          PORT: '3000'
        }
      });

      nextServer.on('error', (err) => {
        reject(err);
      });

      // Give server time to start
      setTimeout(() => {
        resolve();
      }, 5000);
    });

    buildProcess.on('error', (err) => {
      reject(err);
    });
  });
}

// App event handlers
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (nextServer) {
    nextServer.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Handle protocol for production builds
if (!isDev) {
  app.setAsDefaultProtocolClient('competitor-dashboard');
}