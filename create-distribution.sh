#!/bin/bash

echo "🏗️  Building Competitor Dashboard Distribution..."

# Clean previous builds
rm -rf dist-pkg
mkdir -p dist-pkg

# Build frontend
echo "📦 Building frontend..."
pnpm run build

# Build executables for all platforms
echo "🚀 Building cross-platform executables..."
pkg launcher.cjs --targets node18-win-x64,node18-macos-x64,node18-linux-x64 --out-path dist-pkg

# Copy required assets to distribution
echo "📂 Copying assets..."
cp -r dist dist-pkg/
cp -r prisma dist-pkg/
cp .env dist-pkg/
cp -r server dist-pkg/
cp package.json dist-pkg/

# Create README for distribution
cat > dist-pkg/README.md << 'EOF'
# Competitor Dashboard - Standalone Distribution

## Quick Start

### Windows
1. Double-click `launcher-win.exe`
2. Your browser will automatically open to the dashboard

### macOS  
1. Double-click `launcher-macos`
2. Your browser will automatically open to the dashboard

### Linux
1. Run `./launcher-linux` in terminal
2. Your browser will automatically open to the dashboard

## Manual Access
If the browser doesn't open automatically, navigate to: http://localhost:3005

## Features
- Monitor competitor pricing across major coffee equipment retailers
- AI-powered product matching using OpenAI embeddings
- Real-time WebSocket updates for scraping progress
- MAP violation detection and alerts
- Export capabilities for analysis

## Database
The app creates a local SQLite database (`competitor_products.db`) in the same directory as the executable.

## Configuration
Edit the `.env` file to configure:
- OpenAI API key for semantic product matching
- Shopify credentials for iDrinkCoffee integration
- Other API keys as needed

## Support
For issues or questions, contact your IT administrator.
EOF

# Make executables executable (for Unix systems)
chmod +x dist-pkg/launcher-linux
chmod +x dist-pkg/launcher-macos

echo "✅ Distribution created in dist-pkg/"
echo "📋 Files created:"
ls -la dist-pkg/

echo ""
echo "🚀 Ready for distribution!"
echo "   Windows: launcher-win.exe"  
echo "   macOS:   launcher-macos"
echo "   Linux:   launcher-linux"