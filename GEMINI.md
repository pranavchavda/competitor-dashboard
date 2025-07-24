# Project: CompetitorDash - Electron Conversion & Build Fix

## 1. High-Level Goal

The primary objective is to finalize the conversion of the **CompetitorDash** application from a Tauri-based architecture to an Electron-based one. The final deliverable is a successfully built and packaged application that is ready for distribution on Windows, macOS, and Linux.

## 2. Session History & Context

This document provides a complete summary of our debugging session to ensure a seamless transition to the correct project directory.

### 2.1. Initial Problem

The project was successfully converted from Tauri to Electron, but the packaged Linux application was failing to launch. The initial error reported was a `TypeError: Cannot read properties of undefined (reading 'length')` during the Next.js production build. However, this turned out to be a red herring.

### 2.2. Investigation & Actions Taken

My investigation proceeded as follows:

1.  **Initial Assessment:** I started by examining the `package.json` file to understand the project's scripts and dependencies. The initial file was missing the necessary Electron scripts and dependencies.

2.  **Simulating the Build:** I ran `npm run build`, which completed successfully, indicating the `TypeError` was not a general build issue but was likely specific to the packaging process.

3.  **Gathering Context:** Since the Electron configuration was missing, I used the `claude -p -c` command (as instructed) to retrieve the necessary context. This provided the `electron.js` main process file and the required `npm` scripts.

4.  **Setting up the Electron Environment:**
    *   I created the `electron.js` file in the project root.
    *   I updated the `package.json` to include the `electron`, `electron-builder`, and `concurrently` dependencies.
    *   I added the `electron:dev`, `electron:pack`, and `electron:dist` scripts to `package.json`.
    *   I ran `npm install` to install the new dependencies.

### 2.3. Errors Encountered & Resolutions

During the process of setting up and building the Electron application, I encountered and resolved several issues:

1.  **Error:** `Application entry file "index.js" ... does not exist.`
    *   **Cause:** `electron-builder` was looking for the default `index.js` entry point.
    *   **Resolution:** I added the `"main": "electron.js"` field to `package.json` to specify the correct entry point.

2.  **Error:** `ERR_CONNECTION_REFUSED` when launching the packaged application.
    *   **Cause:** The Electron window was trying to load the Next.js application before the server was fully ready. The original script used an unreliable fixed timeout.
    *   **Resolution:** I modified the `electron.js` script to:
        *   Listen to the `stdout` of the Next.js server process for a "server_started" message.
        *   Implement a retry mechanism in the `createWindow` function to attempt to load the URL multiple times.

3.  **Error:** `Could not find a production build in the '.next' directory.`
    *   **Cause:** The `.next` directory, which contains the production build of the Next.js application, was not being included in the final package by `electron-builder`.
    *   **Resolution:** I added a `build` configuration to `package.json` to explicitly include the `.next` directory and other necessary files in the packaged application.

### 2.4. The Directory Issue

We discovered that all of the above actions were performed in the directory `/home/pranav/idc/competitordash`, but the correct project directory is `/home/pranav/competitordash`. My environment is sandboxed and I cannot change directories.

## 3. Action Plan for New Session

To get back on track and complete the project in the correct directory, please start a new session with me in `/home/pranav/competitordash` and provide this `GEMINI.md` file as context. I will then execute the following plan:

1.  **File Creation & Modification:**
    *   I will create the `electron.js` file with the final, improved content.
    *   I will update the `package.json` file to include the necessary scripts, dependencies, and the `electron-builder` configuration.

2.  **Install Dependencies:** I will run `npm install` to ensure all project dependencies are correctly installed.

3.  **Build and Package:** I will run `npm run electron:pack` to build the Next.js application and package it with Electron.

4.  **Final Test:** I will provide you with the command to run the newly built application from the `dist/linux-unpacked` directory to verify that all issues have been resolved.

## 4. File Contents for Restoration

Here are the complete contents of the files that need to be created or updated in the correct project directory.

### 4.1. `electron.js`

```javascript
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
      
      nextServer = spawn('node', ['-e', `
        const next = require('next');
        const dev = false;
        const port = 3000;
        const app = next({ dev, dir: '${workingDir.replace(/\\/g, '\\\\')}' });
        
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
```

### 4.2. `package.json`

```json
{
  "name": "competitor-dash",
  "version": "0.1.0",
  "main": "electron.js",
  "private": true,
  "build": {
    "files": [
      "electron.js",
      "node_modules/**/*",
      ".next/**/*",
      "public/**/*",
      "package.json"
    ],
    "asarUnpack": [
      "**/*.node"
    ]
  },
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "tauri": "tauri",
    "tauri:dev": "tauri dev",
    "tauri:build": "tauri build",
    "electron:dev": "concurrently \"npm:dev\" \"npm:electron\"",
    "electron": "electron .",
    "electron:pack": "npm run build && electron-builder --dir",
    "electron:dist": "npm run build && electron-builder"
  },
  "dependencies": {
    "@headlessui/react": "^2.2.4",
    "@heroicons/react": "^2.1.3",
    "@prisma/client": "^6.12.0",
    "@types/js-cookie": "^3.0.6",
    "axios": "^1.7.0",
    "cheerio": "^1.0.0",
    "clsx": "^2.1.1",
    "framer-motion": "^11.2.6",
    "js-cookie": "^3.0.5",
    "next": "15.4.3",
    "openai": "^5.10.2",
    "prisma": "^6.12.0",
    "react": "^18",
    "react-dom": "^18"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.1.7",
    "@tauri-apps/cli": "^2.7.1",
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "concurrently": "^8.2.2",
    "electron": "^31.0.2",
    "electron-builder": "^25.0.0",
    "eslint": "^8",
    "eslint-config-next": "14.2.3",
    "postcss": "^8",
    "prettier": "^3.3.2",
    "prettier-plugin-organize-imports": "^4.0.0",
    "prettier-plugin-tailwindcss": "^0.6.11",
    "tailwindcss": "^4.1.7",
    "typescript": "^5"
  }
}
```
