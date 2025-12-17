#!/bin/bash
# Register Fork as Installed Plugin
#
# This script registers your fork in Claude Code's installed_plugins.json
# so it shows up as an installed plugin in the CLI.

PLUGINS_FILE="$HOME/.claude/plugins/installed_plugins.json"
PLUGIN_DIR="$HOME/.claude/plugins/marketplaces/thedotmack"
VERSION=$(grep '"version"' "$PLUGIN_DIR/package.json" | head -1 | cut -d'"' -f4)

if [ ! -f "$PLUGINS_FILE" ]; then
  echo "❌ Plugins file not found: $PLUGINS_FILE"
  echo "   Make sure Claude Code is installed"
  exit 1
fi

if [ ! -d "$PLUGIN_DIR" ]; then
  echo "❌ Plugin directory not found: $PLUGIN_DIR"
  echo "   Run the installation steps first"
  exit 1
fi

echo "Registering claude-mem fork..."
echo "  Version: $VERSION"
echo "  Path: $PLUGIN_DIR"

# Backup existing file
cp "$PLUGINS_FILE" "$PLUGINS_FILE.backup"

# Update the JSON to point to marketplaces directory
if command -v jq >/dev/null 2>&1; then
  # Use jq if available
  jq --arg path "$PLUGIN_DIR" --arg version "$VERSION" \
    '.plugins["claude-mem@thedotmack"] = [{
      "scope": "user",
      "installPath": $path,
      "version": $version,
      "installedAt": (now | todate),
      "lastUpdated": (now | todate),
      "isLocal": true
    }]' "$PLUGINS_FILE" > "$PLUGINS_FILE.tmp" && mv "$PLUGINS_FILE.tmp" "$PLUGINS_FILE"

  echo "✓ Registered using jq"
else
  # Fallback: Manual edit instructions
  echo ""
  echo "⚠️  jq not installed. Manual registration required:"
  echo ""
  echo "Edit: $PLUGINS_FILE"
  echo ""
  echo "Change the claude-mem@thedotmack entry to:"
  echo ""
  cat <<EOF
  "claude-mem@thedotmack": [
    {
      "scope": "user",
      "installPath": "$PLUGIN_DIR",
      "version": "$VERSION",
      "installedAt": "$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")",
      "lastUpdated": "$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")",
      "isLocal": true
    }
  ]
EOF
  echo ""
  exit 1
fi

echo ""
echo "✅ Fork registered!"
echo ""
echo "Verify with:"
echo "  claude plugin list"
echo ""
echo "Backup saved to: $PLUGINS_FILE.backup"
