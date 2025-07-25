#!/bin/bash

# Simple script to cleanup port 3005 if it's in use

echo "🔍 Checking for processes using port 3005..."

# Check what's using the port
if command -v lsof > /dev/null; then
    PROCESS=$(lsof -ti:3005)
    if [ ! -z "$PROCESS" ]; then
        echo "📍 Found process using port 3005: $PROCESS"
        echo "🛑 Killing process..."
        kill -9 $PROCESS
        echo "✅ Process killed. You can now run the dashboard."
    else
        echo "✅ Port 3005 is free."
    fi
elif command -v fuser > /dev/null; then
    echo "🛑 Attempting to free port 3005..."
    fuser -k 3005/tcp 2>/dev/null
    echo "✅ Port cleanup attempted. Try running the dashboard now."
else
    echo "⚠️  Cannot automatically cleanup port. Please:"
    echo "   1. Close any other instances of the dashboard"
    echo "   2. Restart your computer if needed"
    echo "   3. Then try running the dashboard again"
fi

echo ""
echo "🚀 Now try running your platform's executable:"
echo "   Windows: ./complete-standalone-win.exe"
echo "   macOS:   ./complete-standalone-macos" 
echo "   Linux:   ./complete-standalone-linux"