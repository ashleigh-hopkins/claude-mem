#!/bin/bash
echo "=== Claude-Mem Fork Verification ==="
echo ""

# 1. Check installation path
echo "1. Installation path:"
if [ -d "$HOME/.claude/plugins/marketplaces/thedotmack" ]; then
  echo "   ✓ $HOME/.claude/plugins/marketplaces/thedotmack"
else
  echo "   ✗ Plugin directory not found"
  exit 1
fi
echo ""

# 2. Check git remote
echo "2. Git remote:"
cd "$HOME/.claude/plugins/marketplaces/thedotmack"
git remote -v | grep fetch | awk '{print "   " $1 " → " $2}'
echo ""

# 3. Check branch
echo "3. Current branch:"
echo "   $(git branch --show-current)"
echo ""

# 4. Check version
echo "4. Version:"
version=$(grep '"version"' package.json | head -1 | cut -d'"' -f4)
echo "   $version"
echo ""

# 5. Check registered
echo "5. Registered with Claude Code:"
if grep -q "marketplaces/thedotmack" "$HOME/.claude/plugins/installed_plugins.json" 2>/dev/null; then
  echo "   ✓ Registered in installed_plugins.json"
else
  echo "   ✗ Not registered (run: npm run register-fork)"
fi
echo ""

# 6. Check worker
echo "6. Worker status:"
npm run worker:status 2>/dev/null
echo ""

# 7. Check hooks
echo "7. Hooks installed:"
if [ -f "$HOME/.claude/plugins/marketplaces/thedotmack/plugin/hooks/hooks.json" ]; then
  echo "   ✓ hooks.json exists"
  hook_count=$(jq '.hooks | to_entries | length' "$HOME/.claude/plugins/marketplaces/thedotmack/plugin/hooks/hooks.json")
  echo "   $hook_count lifecycle hooks configured"
else
  echo "   ✗ hooks.json not found"
fi
echo ""

# 8. Test worker API
echo "8. Worker API:"
if curl -s http://localhost:37777/api/health > /dev/null 2>&1; then
  worker_version=$(curl -s http://localhost:37777/api/version | jq -r '.version')
  echo "   ✓ Worker responding on port 37777"
  echo "   Version: $worker_version"
else
  echo "   ✗ Worker not responding"
fi
echo ""

echo "=== Summary ==="
if curl -s http://localhost:37777/api/health > /dev/null 2>&1; then
  echo "✅ Fork is installed and working!"
  echo ""
  echo "To use in Claude Code:"
  echo "  • Hooks automatically capture context"
  echo "  • Use mem-search skill to query history"
  echo "  • Visit http://localhost:37777 for web UI"
else
  echo "⚠️  Fork installed but worker not running"
  echo ""
  echo "Start worker:"
  echo "  cd ~/.claude/plugins/marketplaces/thedotmack"
  echo "  npm run worker:start"
fi
