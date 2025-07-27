# Competitor Price Monitoring Dashboard - Claude Code Instructions

This is a Next.js 15.4.3 desktop application built with Tauri that monitors competitor pricing for iDrinkCoffee.com across major coffee equipment retailers. The system scrapes competitor data, matches products using similarity algorithms, and provides real-time price comparison insights through a modern desktop interface.

## Project Overview

**Purpose**: Monitor and analyze competitor pricing for premium espresso machines and grinders to maintain competitive advantage for iDrinkCoffee.com.

**Technology Stack**:
- **Frontend**: Next.js 15.4.3 with TypeScript
- **UI**: Catalyst UI Kit (Tailwind CSS components)
- **Desktop**: Tauri (Rust-based framework)
- **Database**: SQLite with Prisma ORM
- **AI**: OpenAI embeddings for semantic product matching
- **Build**: GitHub Actions for multi-platform releases
- **Package Manager**: pnpm

## Project Memories

- This project uses pnpm

## Competitors Monitored

- **Home Coffee Solutions** (homecoffeesolutions.com) - ~398 products
- **The Kitchen Barista** (thekitchenbarista.com) - ~269 products
- **Cafe Liegeois** (cafeliegeois.ca) - ~72 products

**Target Brands**: ECM, Profitec, Eureka (premium coffee equipment brands)

## Windows Portable Distribution

### Overview
The Windows Portable Distribution is a complete, self-contained version of the Competitor Dashboard that requires no installation and includes its own Node.js runtime. This solves common deployment challenges and ensures maximum compatibility across Windows environments.

### Build Process

#### Automated Build Commands
```bash
# Single command build (recommended)
npm run build:windows-portable

# Manual step-by-step
node build-windows-portable.js      # Creates dist-windows-portable/
bash create-windows-zip.sh          # Creates optimized ZIP (87MB)
```

#### What Gets Included
- **Portable Node.js v22.12.0** (Windows x64)
- **Built React frontend** (Vite production build)
- **Bundled Express server** (esbuild CommonJS bundle)
- **Complete Prisma setup** (client + Windows query engine)
- **SQLite database** with sample data
- **All required dependencies** (minimal node_modules)
- **Launch scripts** (.bat files for easy execution)

### Technical Implementation

#### Server Bundling Strategy
```javascript
// esbuild configuration (build-windows-portable.js:98)
execSync('npx esbuild server/index.ts --bundle --platform=node --target=node18 --format=cjs --outfile=dist-server-bundled.cjs --external:sqlite3 --external:@prisma/engines')
```

**Key decisions:**
- ✅ Bundle `@prisma/client` directly (no external resolution)
- ✅ Keep `sqlite3` and `@prisma/engines` external (native modules)
- ✅ Use CommonJS format for maximum compatibility
- ✅ Target Node.js 18+ features

#### Prisma Query Engine Handling
The Windows query engine (`query_engine-windows.dll.node`) is copied to multiple locations to ensure Prisma can find it:

1. **Root directory**: `query_engine-windows.dll.node`
2. **Server directory**: `server/query_engine-windows.dll.node`
3. **Prisma directory**: `prisma/query_engine-windows.dll.node`
4. **Standard location**: `node_modules/.prisma/client/query_engine-windows.dll.node`

```bash
# Automatic copying in create-windows-zip.sh:56-65
WINDOWS_ENGINE="$PRISMA_CLIENT_DIR/node_modules/.prisma/client/query_engine-windows.dll.node"
cp "$WINDOWS_ENGINE" "$TEMP_DIR/"           # Root
cp "$WINDOWS_ENGINE" "$TEMP_DIR/server/"    # Server
cp "$WINDOWS_ENGINE" "$TEMP_DIR/prisma/"    # Prisma
```

#### Windows-Specific Fixes

1. **Browser Auto-Opening** (real-standalone.cjs:112-118):
```javascript
if (process.platform === 'win32') {
  spawn('cmd', ['/c', 'start', url], { detached: true, stdio: 'ignore' }).unref()
}
```

2. **Static File Path Resolution** (server/index.ts:46-58):
```javascript
const possibleDistPaths = [
  path.join(__dirname, '../dist'),
  path.join(process.cwd(), 'dist'),
  path.join(__dirname, '../../dist')
]
```

3. **Module Resolution** - Uses bundled approach instead of runtime resolution

### Deployment Strategy

#### File Structure
```
competitor-dashboard-windows-portable/
├── Competitor Dashboard.bat          # Main launcher
├── Start Silent.bat                  # Background launcher  
├── real-standalone.cjs               # Application starter
├── query_engine-windows.dll.node     # Prisma engine (root)
├── competitor_products.db            # SQLite database
├── node/                            # Portable Node.js runtime
│   ├── node.exe
│   └── [Node.js files]
├── server/
│   ├── index.cjs                    # Bundled Express server
│   └── query_engine-windows.dll.node
├── dist/                            # React production build
├── prisma/
│   ├── schema.prisma
│   └── query_engine-windows.dll.node
└── node_modules/                    # Minimal dependencies
    ├── @prisma/client/
    ├── sqlite3/
    └── .prisma/client/              # Generated Prisma client
```

#### Size Optimization
- **Full development**: ~665MB
- **Optimized portable**: ~87MB (87% reduction)
- **Techniques**: Exclude dev dependencies, include only essential packages, use bundled server

### Common Issues & Solutions

#### Issue: "Cannot find module '@prisma/client'"
**Root Cause**: External module resolution failing in bundled environment
**Solution**: Bundle Prisma client directly into server (implemented)

#### Issue: "Prisma Client could not locate Query Engine"
**Root Cause**: Windows query engine not in expected locations
**Solution**: Copy engine to all search paths (implemented)

#### Issue: Browser won't open automatically
**Root Cause**: Windows `start` command needs `cmd /c` prefix
**Solution**: Platform-specific spawn arguments (implemented)

#### Issue: Static files not found
**Root Cause**: `__dirname` points to wrong location in bundled server
**Solution**: Multiple fallback paths for static files (implemented)

### Build Script Maintenance

#### Key Files to Maintain
1. **`build-windows-portable.js`** - Main build orchestration
2. **`create-windows-zip.sh`** - Optimized ZIP creation with all fixes
3. **`fix-windows-query-engine.sh`** - Manual fix script for troubleshooting
4. **`real-standalone.cjs`** - Application launcher (gets modified during build)

#### Testing Strategy
1. **Build the distribution**: `npm run build:windows-portable`
2. **Create ZIP**: `bash create-windows-zip.sh`
3. **Test on Windows**: Extract ZIP and run `Competitor Dashboard.bat`
4. **Verify functionality**: Dashboard loads, APIs work, database queries succeed

### Future Enhancements
- **Code signing** for Windows SmartScreen compatibility
- **Auto-updater** integration
- **Installer creation** (MSI/NSIS) as alternative to portable
- **ARM64 Windows** support when Node.js portable becomes available

### Developer Notes
- Always test on **native Windows** (not WSL) - WSL can cause path resolution issues
- The build process is **completely automated** - no manual steps required
- All Windows-specific fixes are **permanent** and will persist across builds
- The portable distribution is **production-ready** and includes all dependencies