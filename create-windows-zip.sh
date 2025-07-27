#\!/bin/bash

set -e

echo "📦 Creating Windows Portable ZIP distribution..."

DIST_DIR="dist-windows-portable"
ZIP_NAME="competitor-dashboard-windows-portable.zip"

# Check if distribution exists
if [ \! -d "$DIST_DIR" ]; then
    echo "❌ Distribution directory not found. Run build-windows-portable.js first."
    exit 1
fi

# Create a temporary directory for cleaned distribution
TEMP_DIR="temp-windows-dist"
echo "🧹 Creating clean distribution copy..."

if [ -d "$TEMP_DIR" ]; then
    rm -rf "$TEMP_DIR"
fi

mkdir -p "$TEMP_DIR"

# Copy essential files
echo "📋 Copying essential files..."
cp -r "$DIST_DIR/dist" "$TEMP_DIR/"
cp -r "$DIST_DIR/server" "$TEMP_DIR/"
cp -r "$DIST_DIR/src" "$TEMP_DIR/"
cp -r "$DIST_DIR/prisma" "$TEMP_DIR/"
cp -r "$DIST_DIR/node" "$TEMP_DIR/"
cp "$DIST_DIR"/*.bat "$TEMP_DIR/"
cp "$DIST_DIR"/*.txt "$TEMP_DIR/"
cp "$DIST_DIR"/*.cjs "$TEMP_DIR/"
cp "$DIST_DIR"/*.db "$TEMP_DIR/" 2>/dev/null || true
cp "$DIST_DIR/package.json" "$TEMP_DIR/"

# Copy minimal node_modules
echo "📦 Copying essential node_modules..."
mkdir -p "$TEMP_DIR/node_modules"
cp -r "$DIST_DIR/node_modules/@prisma" "$TEMP_DIR/node_modules/" 2>/dev/null || true
cp -r "$DIST_DIR/node_modules/prisma" "$TEMP_DIR/node_modules/" 2>/dev/null || true
cp -r "$DIST_DIR/node_modules/sqlite3" "$TEMP_DIR/node_modules/" 2>/dev/null || true

# Copy .prisma directory and ensure it's in the right place
if [ -d "$DIST_DIR/node_modules/.pnpm" ]; then
    echo "  ✓ Finding generated Prisma client..."
    PRISMA_CLIENT_DIR=$(find "$DIST_DIR/node_modules/.pnpm" -name "*@prisma+client*" -type d  < /dev/null |  head -1)
    if [ -n "$PRISMA_CLIENT_DIR" ] && [ -d "$PRISMA_CLIENT_DIR/node_modules/.prisma" ]; then
        echo "  ✓ Copying generated Prisma client"
        mkdir -p "$TEMP_DIR/node_modules/.prisma"
        cp -r "$PRISMA_CLIENT_DIR/node_modules/.prisma/client" "$TEMP_DIR/node_modules/.prisma/"
        
        # Copy Windows query engine to additional locations for maximum compatibility
        WINDOWS_ENGINE="$PRISMA_CLIENT_DIR/node_modules/.prisma/client/query_engine-windows.dll.node"
        if [ -f "$WINDOWS_ENGINE" ]; then
            echo "  ✓ Copying Windows query engine to multiple locations..."
            # Root directory (where Prisma often looks first)
            cp "$WINDOWS_ENGINE" "$TEMP_DIR/"
            # Next to server bundle
            cp "$WINDOWS_ENGINE" "$TEMP_DIR/server/"
            # In prisma directory
            cp "$WINDOWS_ENGINE" "$TEMP_DIR/prisma/"
        fi
    fi
fi

# Remove existing zip
if [ -f "$ZIP_NAME" ]; then
    rm "$ZIP_NAME"
fi

echo "🗜️  Creating ZIP archive..."
cd "$TEMP_DIR"
zip -r "../$ZIP_NAME" . -x "*.log" "*.tmp" -q
cd ..

# Clean up
rm -rf "$TEMP_DIR"

FINAL_SIZE=$(du -sh "$ZIP_NAME" | cut -f1)
echo "✅ Windows portable ZIP created: $ZIP_NAME ($FINAL_SIZE)"
