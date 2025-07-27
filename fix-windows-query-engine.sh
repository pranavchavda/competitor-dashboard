#!/bin/bash

echo "🔧 Fixing Windows Query Engine for Prisma..."

DIST_DIR="dist-windows-portable"

if [ ! -d "$DIST_DIR" ]; then
    echo "❌ Windows distribution not found. Run build script first."
    exit 1
fi

cd "$DIST_DIR"

# Find the Windows query engine
WINDOWS_ENGINE=$(find . -name "query_engine-windows.dll.node" | head -1)

if [ -z "$WINDOWS_ENGINE" ]; then
    echo "❌ Windows query engine not found in distribution"
    exit 1
fi

echo "✓ Found Windows query engine: $WINDOWS_ENGINE"

# Copy to all locations Prisma searches
echo "📋 Copying Windows query engine to all search locations..."

# Root directory
cp "$WINDOWS_ENGINE" ./ 2>/dev/null || true
echo "  ✓ Copied to root directory"

# Next to server bundle
mkdir -p server
cp "$WINDOWS_ENGINE" server/ 2>/dev/null || true
echo "  ✓ Copied to server directory"

# In prisma directory
mkdir -p prisma
cp "$WINDOWS_ENGINE" prisma/ 2>/dev/null || true
echo "  ✓ Copied to prisma directory"

# In .prisma/client
mkdir -p node_modules/.prisma/client
cp "$WINDOWS_ENGINE" node_modules/.prisma/client/ 2>/dev/null || true
echo "  ✓ Copied to node_modules/.prisma/client"

# Verify all copies exist
echo ""
echo "🔍 Verifying Windows query engine locations:"
[ -f "./query_engine-windows.dll.node" ] && echo "  ✅ Root directory" || echo "  ❌ Root directory"
[ -f "./server/query_engine-windows.dll.node" ] && echo "  ✅ Server directory" || echo "  ❌ Server directory"
[ -f "./prisma/query_engine-windows.dll.node" ] && echo "  ✅ Prisma directory" || echo "  ❌ Prisma directory"
[ -f "./node_modules/.prisma/client/query_engine-windows.dll.node" ] && echo "  ✅ .prisma/client directory" || echo "  ❌ .prisma/client directory"

echo ""
echo "🎉 Windows query engine fix applied!"
echo "💡 The Competitor Dashboard should now work without query engine errors."