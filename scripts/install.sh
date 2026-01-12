#!/bin/bash
# One-line installer for mcplite
# Usage: curl -fsSL https://raw.githubusercontent.com/ddtech/mcplite/main/scripts/install.sh | bash

set -e

REPO="ddtech/mcplite"
INSTALL_DIR="$HOME/.claude/plugins/mcplite"

echo ""
echo "Installing mcplite - Lighter context for Claude Code"
echo ""

# Check for git
if ! command -v git &> /dev/null; then
  echo "Error: git is required but not installed."
  exit 1
fi

# Check for node
if ! command -v node &> /dev/null; then
  echo "Error: Node.js is required but not installed."
  echo "Install from: https://nodejs.org/"
  exit 1
fi

# Create plugins directory
mkdir -p "$HOME/.claude/plugins"

# Clone or update repository
if [ -d "$INSTALL_DIR" ]; then
  echo "Updating existing installation..."
  cd "$INSTALL_DIR"
  git pull --quiet
else
  echo "Cloning repository..."
  git clone --quiet "https://github.com/$REPO.git" "$INSTALL_DIR"
  cd "$INSTALL_DIR"
fi

# Install dependencies and build
echo "Installing dependencies..."
npm install --silent

echo "Building..."
npm run build --silent

# Run post-install
bash scripts/post-install.sh

echo ""
echo "Installation complete!"
echo ""
echo "Commands available in Claude Code:"
echo "  /mcplite:mcp-status   - Show active MCPs"
echo "  /mcplite:mcp-profile  - Switch profiles"
echo "  /mcplite:mcp-clean    - Disable all MCPs"
echo "  /mcplite:mcp-add      - Enable specific MCP"
echo ""
