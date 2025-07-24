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
    startNextServer()
      .then(() => {
        const retry = (retries, maxRetries) => {
          mainWindow.loadURL(serverUrl).catch(err => {
            if (retries < maxRetries) {
              console.log(`Retrying to connect... (${retries + 1}/${maxRetries})`);
              setTimeout(() => retry(retries + 1, maxRetries), 1000);
            } else {
              console.error('Failed to connect after multiple retries:', err);
              app.quit();
            }
          });
        };
        retry(0, 30);
      })
      .catch(err => {
        console.error('Failed to start Next.js server:', err);
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
  return new Promise(async (resolve, reject) => {
    console.log('Starting Next.js server...');
    
    try {
      let workingDir = process.cwd();
      if (app.isPackaged) {
        workingDir = path.join(process.resourcesPath, 'app.asar.unpacked');
        console.log('Packaged app detected, using directory:', workingDir);
      }
      
      console.log('Starting pre-built Next.js server from:', workingDir);
      process.chdir(workingDir);
      
      const escapedWorkingDir = workingDir.replace(/\\/g, '\\\\');

      nextServer = spawn('node', ['-e', `
        const next = require('next');
        const dev = false;
        const port = 3000;
        const app = next({ dev, dir: '${escapedWorkingDir}' });
        
        app.prepare().then(() => {
          const server = require('http').createServer(app.getRequestHandler());
          server.listen(port, '0.0.0.0', () => {
            console.log('Next.js server ready on port', port);
            process.stdout.write('server_started');
          });
        }).catch(err => {
          console.error('Next.js preparation failed:', err);
          process.exit(1);
        });
      `], {
        shell: false,
        cwd: workingDir,
        env: {
          ...process.env,
          PORT: '3000',
          NODE_ENV: 'production'
        }
      });

      nextServer.stdout.on('data', (data) => {
        const output = data.toString();
        console.log(output);
        if (output.includes('server_started')) {
          console.log('✅ Next.js server is ready');
          resolve();
        }
      });

      nextServer.stderr.on('data', (data) => {
        console.error(`Next.js server error: ${data}`);
      });

      nextServer.on('error', (err) => {
        console.error('Failed to start Next.js server:', err);
        reject(err);
      });
      
    } catch (error) {
      console.error('Error starting Next.js server:', error);
      reject(error);
    }
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