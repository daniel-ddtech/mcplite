#!/bin/bash
# Post-install script for mcplite

set -e

PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-$(dirname "$(dirname "$0")")}"
CLAUDE_DIR="$HOME/.claude"
MCPLITE_DIR="$CLAUDE_DIR/mcplite"

echo "Setting up mcplite..."

# Create directories
mkdir -p "$MCPLITE_DIR"

# Copy default data files if they don't exist
if [ ! -f "$MCPLITE_DIR/registry.json" ]; then
  cp "$PLUGIN_ROOT/data/registry.json" "$MCPLITE_DIR/registry.json"
  echo "  Created default registry"
fi

if [ ! -f "$MCPLITE_DIR/profiles.json" ]; then
  cp "$PLUGIN_ROOT/data/profiles.json" "$MCPLITE_DIR/profiles.json"
  echo "  Created default profiles"
fi

# Build TypeScript if needed
if [ ! -d "$PLUGIN_ROOT/dist" ]; then
  echo "  Building TypeScript..."
  cd "$PLUGIN_ROOT"
  npm install --silent
  npm run build --silent
fi

echo ""
echo "mcplite installed successfully!"
echo ""
echo "Commands available:"
echo "  /mcplite:mcp-status   - Show active MCPs"
echo "  /mcplite:mcp-profile  - Switch profiles"
echo "  /mcplite:mcp-clean    - Disable all MCPs"
echo "  /mcplite:mcp-add      - Enable specific MCP"
echo ""
