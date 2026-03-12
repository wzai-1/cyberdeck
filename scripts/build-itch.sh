#!/bin/bash
set -e

echo "=== CyberDeck Itch.io Build Script ==="
echo ""

# Step 1: Build
echo "[1/4] Building..."
npm run build
echo "      Build complete."

# Step 2: Clean previous itch output
echo "[2/4] Preparing output directory..."
rm -rf cyberdeck-itch
cp -r dist cyberdeck-itch
echo "      Copied dist/ -> cyberdeck-itch/"

# Step 3: Zip
echo "[3/4] Creating zip archive..."
zip -r cyberdeck-itch.zip cyberdeck-itch
echo "      Created cyberdeck-itch.zip"

# Step 4: Instructions
echo ""
echo "[4/4] Done! Upload instructions:"
echo "      1. Go to https://itch.io/game/edit"
echo "      2. Set 'Kind of project' to 'HTML'"
echo "      3. Upload cyberdeck-itch.zip"
echo "      4. Check 'This file will be played in the browser'"
echo "      5. Set viewport to 1280x720 (or larger)"
echo "      6. Save and publish!"
echo ""
echo "Archive size:"
du -sh cyberdeck-itch.zip
