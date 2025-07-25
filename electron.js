const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
let nextServer;

// Enhanced logging for debugging
function debugLog(message, data = '') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}${data ? ': ' + JSON.stringify(data) : ''}`;
  console.log(logMessage);
  
  // Also log to file for Windows debugging
  if (!isDev) {
    try {
      const logPath = path.join(app.getPath('userData'), 'debug.log');
      fs.appendFileSync(logPath, logMessage + '\n');
    } catch (e) {
      // Ignore logging errors
    }
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  debugLog('Uncaught Exception', error.stack);
  app.quit();
});

process.on('unhandledRejection', (reason, promise) => {
  debugLog('Unhandled Rejection', { reason, promise });
});

debugLog('Electron app starting', { isDev, platform: process.platform, version: app.getVersion() });

function createWindow() {
  debugLog('Creating main window');
  
  try {
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
    
    debugLog('Main window created successfully');
  } catch (error) {
    debugLog('Failed to create main window', error.message);
    app.quit();
    return;
  }

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
    debugLog('Starting Next.js server...');
    
    try {
      let workingDir = process.cwd();
      if (app.isPackaged) {
        workingDir = path.join(process.resourcesPath, 'app.asar.unpacked');
        debugLog('Packaged app detected, using directory', workingDir);
        
        // Check if directory exists
        if (!fs.existsSync(workingDir)) {
          debugLog('Working directory does not exist', workingDir);
          reject(new Error(`Working directory does not exist: ${workingDir}`));
          return;
        }
        
        // Set up NODE_PATH to include both the unpacked modules and the extra resources
        const extraModulesPath = path.join(process.resourcesPath, 'node_modules');
        const unpackedModulesPath = path.join(workingDir, 'node_modules');
        process.env.NODE_PATH = `${extraModulesPath}${path.delimiter}${unpackedModulesPath}${path.delimiter}${process.env.NODE_PATH || ''}`;
        debugLog('Set NODE_PATH for Prisma', process.env.NODE_PATH);
        
      }
      
      // Ensure DATABASE_URL is set for all modes
      if (!process.env.DATABASE_URL) {
        const dbPath = path.join(app.getPath('userData'), 'competitor_products.db');
        process.env.DATABASE_URL = `file:${dbPath}`;
        debugLog('Set DATABASE_URL', process.env.DATABASE_URL);
      }
      
      // Initialize database for packaged app
      if (app.isPackaged) {
        debugLog('Initializing database for packaged app');
        try {
          const dbPath = process.env.DATABASE_URL.replace('file:', '');
          debugLog('Database path', dbPath);
          
          // Ensure database directory exists
          const dbDir = path.dirname(dbPath);
          if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
            debugLog('Created database directory', dbDir);
          }
          
          // Drop and recreate database with complete schema
          const sqlite3 = require('sqlite3').verbose();
          const db = new sqlite3.Database(dbPath);
          
          const recreateSchemaSQL = `
            -- Drop all existing tables
            DROP TABLE IF EXISTS MapViolationHistory;
            DROP TABLE IF EXISTS PriceHistory;
            DROP TABLE IF EXISTS ProductMatch;
            DROP TABLE IF EXISTS ProductVariant;
            DROP TABLE IF EXISTS Alert;
            DROP TABLE IF EXISTS ScrapeJob;
            DROP TABLE IF EXISTS Brand;
            DROP TABLE IF EXISTS Product;
            
            -- Create tables with complete schema
            CREATE TABLE IF NOT EXISTS "Product" (
              "id" TEXT NOT NULL PRIMARY KEY,
              "externalId" TEXT NOT NULL,
              "source" TEXT NOT NULL,
              "title" TEXT NOT NULL,
              "vendor" TEXT,
              "productType" TEXT,
              "handle" TEXT,
              "sku" TEXT,
              "price" REAL,
              "compareAtPrice" REAL,
              "available" BOOLEAN NOT NULL DEFAULT true,
              "imageUrl" TEXT,
              "url" TEXT,
              "description" TEXT,
              "features" TEXT,
              "titleEmbedding" TEXT,
              "featuresEmbedding" TEXT,
              "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              "updatedAt" DATETIME NOT NULL,
              "lastScrapedAt" DATETIME
            );
            
            CREATE TABLE IF NOT EXISTS "ProductVariant" (
              "id" TEXT NOT NULL PRIMARY KEY,
              "productId" TEXT NOT NULL,
              "externalId" TEXT NOT NULL,
              "title" TEXT,
              "sku" TEXT,
              "price" REAL,
              "compareAtPrice" REAL,
              "available" BOOLEAN NOT NULL DEFAULT true,
              "inventoryQuantity" INTEGER,
              "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
            );
            
            CREATE TABLE IF NOT EXISTS "ScrapeJob" (
              "id" TEXT NOT NULL PRIMARY KEY,
              "source" TEXT NOT NULL,
              "status" TEXT NOT NULL DEFAULT 'pending',
              "productsFound" INTEGER,
              "productsUpdated" INTEGER,
              "productsCreated" INTEGER,
              "errors" TEXT,
              "startedAt" DATETIME,
              "completedAt" DATETIME,
              "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS "ProductMatch" (
              "id" TEXT NOT NULL PRIMARY KEY,
              "idcProductId" TEXT NOT NULL,
              "competitorProductId" TEXT NOT NULL,
              "source" TEXT NOT NULL,
              "overallScore" REAL NOT NULL,
              "titleSimilarity" REAL,
              "brandSimilarity" REAL,
              "typeSimilarity" REAL,
              "priceSimilarity" REAL,
              "embeddingSimilarity" REAL,
              "priceDifference" REAL,
              "priceDifferencePercent" REAL,
              "isMapViolation" BOOLEAN NOT NULL DEFAULT false,
              "violationSeverity" REAL,
              "violationAmount" REAL,
              "firstViolationDate" DATETIME,
              "lastChecked" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              "isManualMatch" BOOLEAN NOT NULL DEFAULT false,
              "isRejected" BOOLEAN NOT NULL DEFAULT false,
              "confidence" TEXT NOT NULL DEFAULT 'low',
              "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              CONSTRAINT "ProductMatch_competitorProductId_fkey" FOREIGN KEY ("competitorProductId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
            );
            
            CREATE TABLE IF NOT EXISTS "PriceHistory" (
              "id" TEXT NOT NULL PRIMARY KEY,
              "productId" TEXT NOT NULL,
              "price" REAL NOT NULL,
              "compareAtPrice" REAL,
              "available" BOOLEAN NOT NULL DEFAULT true,
              "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              CONSTRAINT "PriceHistory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
            );
            
            CREATE TABLE IF NOT EXISTS "Alert" (
              "id" TEXT NOT NULL PRIMARY KEY,
              "type" TEXT NOT NULL,
              "title" TEXT NOT NULL,
              "message" TEXT NOT NULL,
              "severity" TEXT NOT NULL DEFAULT 'medium',
              "productId" TEXT,
              "matchId" TEXT,
              "source" TEXT,
              "oldPrice" REAL,
              "newPrice" REAL,
              "priceChange" REAL,
              "status" TEXT NOT NULL DEFAULT 'unread',
              "isRead" BOOLEAN NOT NULL DEFAULT false,
              "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS "MapViolationHistory" (
              "id" TEXT NOT NULL PRIMARY KEY,
              "productMatchId" TEXT NOT NULL,
              "violationType" TEXT NOT NULL,
              "competitorPrice" REAL NOT NULL,
              "idcPrice" REAL NOT NULL,
              "violationAmount" REAL NOT NULL,
              "violationPercent" REAL NOT NULL,
              "previousPrice" REAL,
              "priceChange" REAL,
              "screenshotUrl" TEXT,
              "competitorUrl" TEXT,
              "notes" TEXT,
              "detectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              "source" TEXT NOT NULL,
              "reportedBy" TEXT,
              CONSTRAINT "MapViolationHistory_productMatchId_fkey" FOREIGN KEY ("productMatchId") REFERENCES "ProductMatch" ("id") ON DELETE CASCADE ON UPDATE CASCADE
            );
            
            CREATE TABLE IF NOT EXISTS "Brand" (
              "id" TEXT NOT NULL PRIMARY KEY,
              "name" TEXT NOT NULL UNIQUE,
              "displayName" TEXT NOT NULL,
              "isActive" BOOLEAN NOT NULL DEFAULT true,
              "enableMonitoring" BOOLEAN NOT NULL DEFAULT true,
              "alertThreshold" REAL,
              "priorityLevel" TEXT NOT NULL DEFAULT 'medium',
              "enforcementLevel" TEXT NOT NULL DEFAULT 'standard',
              "gracePerioHours" INTEGER,
              "contactEmail" TEXT,
              "escalationEmail" TEXT,
              "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE UNIQUE INDEX IF NOT EXISTS "Product_externalId_source_key" ON "Product"("externalId", "source");
            CREATE INDEX IF NOT EXISTS "Product_source_idx" ON "Product"("source");
            CREATE INDEX IF NOT EXISTS "Product_vendor_idx" ON "Product"("vendor");
            CREATE INDEX IF NOT EXISTS "Product_productType_idx" ON "Product"("productType");
            CREATE INDEX IF NOT EXISTS "Product_available_idx" ON "Product"("available");
            CREATE UNIQUE INDEX IF NOT EXISTS "ProductVariant_externalId_productId_key" ON "ProductVariant"("externalId", "productId");
            CREATE UNIQUE INDEX IF NOT EXISTS "ProductMatch_idcProductId_competitorProductId_key" ON "ProductMatch"("idcProductId", "competitorProductId");
            CREATE INDEX IF NOT EXISTS "ProductMatch_source_idx" ON "ProductMatch"("source");
            CREATE INDEX IF NOT EXISTS "ProductMatch_confidence_idx" ON "ProductMatch"("confidence");
            CREATE INDEX IF NOT EXISTS "ProductMatch_overallScore_idx" ON "ProductMatch"("overallScore");
            CREATE INDEX IF NOT EXISTS "ProductMatch_isMapViolation_idx" ON "ProductMatch"("isMapViolation");
            CREATE INDEX IF NOT EXISTS "ProductMatch_violationSeverity_idx" ON "ProductMatch"("violationSeverity");
            CREATE INDEX IF NOT EXISTS "PriceHistory_productId_timestamp_idx" ON "PriceHistory"("productId", "timestamp");
            CREATE INDEX IF NOT EXISTS "Alert_status_idx" ON "Alert"("status");
            CREATE INDEX IF NOT EXISTS "Alert_type_idx" ON "Alert"("type");
            CREATE INDEX IF NOT EXISTS "Alert_severity_idx" ON "Alert"("severity");
            CREATE INDEX IF NOT EXISTS "Alert_createdAt_idx" ON "Alert"("createdAt");
            CREATE INDEX IF NOT EXISTS "MapViolationHistory_productMatchId_idx" ON "MapViolationHistory"("productMatchId");
            CREATE INDEX IF NOT EXISTS "MapViolationHistory_violationType_idx" ON "MapViolationHistory"("violationType");
            CREATE INDEX IF NOT EXISTS "MapViolationHistory_detectedAt_idx" ON "MapViolationHistory"("detectedAt");
            CREATE INDEX IF NOT EXISTS "MapViolationHistory_source_idx" ON "MapViolationHistory"("source");
            CREATE INDEX IF NOT EXISTS "ScrapeJob_source_status_idx" ON "ScrapeJob"("source", "status");
            CREATE INDEX IF NOT EXISTS "ScrapeJob_createdAt_idx" ON "ScrapeJob"("createdAt");
            CREATE UNIQUE INDEX IF NOT EXISTS "Brand_name_key" ON "Brand"("name");
            CREATE INDEX IF NOT EXISTS "Brand_isActive_idx" ON "Brand"("isActive");
            CREATE INDEX IF NOT EXISTS "Brand_enableMonitoring_idx" ON "Brand"("enableMonitoring");
          `;
          
          db.exec(recreateSchemaSQL, (err) => {
            if (err) {
              debugLog('Database schema recreation error', err.message);
            } else {
              debugLog('Database schema recreated successfully - fresh start');
            }
            db.close();
          });
          
          debugLog('Database initialization completed');
        } catch (error) {
          debugLog('Database initialization error', error.message);
          // Continue anyway - app might still work
        }
      }
      
      debugLog('Starting Next.js server from', workingDir);
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
app.whenReady().then(() => {
  debugLog('Electron app ready');
  createWindow();
}).catch(error => {
  debugLog('App ready failed', error.message);
});

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