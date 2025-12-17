# Installing Claude-Mem from Fork

This guide covers installing claude-mem from your fork (ashleigh-hopkins/claude-mem) instead of the official marketplace version.

## Why Install from Fork?

- Testing unreleased features (like historical import with Chroma sync)
- Using custom modifications
- Contributing to development
- Running beta/development branches

## Installation Methods

### Method 1: Direct Git Clone (Recommended)

Install directly from your fork's repository:

```bash
# One-line install command:
mkdir -p ~/.claude/plugins/marketplaces/thedotmack && \
git clone https://github.com/ashleigh-hopkins/claude-mem.git \
  ~/.claude/plugins/marketplaces/thedotmack && \
cd ~/.claude/plugins/marketplaces/thedotmack && \
git checkout feature/recovered-historical-import && \
npm install && \
npm run build && \
npm run sync-marketplace:force && \
npm run register-fork && \
npm run worker:start
```

**Or step-by-step:**

```bash
# 1. Clone your fork
git clone https://github.com/ashleigh-hopkins/claude-mem.git \
  ~/.claude/plugins/marketplaces/thedotmack

# 2. Setup (checkout branch, build, register, start)
cd ~/.claude/plugins/marketplaces/thedotmack
git checkout feature/recovered-historical-import
npm install
npm run build
npm run sync-marketplace:force
npm run register-fork  # Registers with Claude Code
npm run worker:start
```

**Notes:**
- Uses the standard plugin location that Claude Code expects
- Step 6 updates `~/.claude/plugins/installed_plugins.json` so Claude recognizes the fork
- Keeps git history so you can pull updates
- Allows switching branches easily

### Method 2: Download and Extract

If you don't want git history:

```bash
# 1. Download the specific branch as ZIP
# Visit: https://github.com/ashleigh-hopkins/claude-mem/archive/refs/heads/feature/recovered-historical-import.zip

# 2. Extract to plugin directory
unzip claude-mem-feature-recovered-historical-import.zip
mv claude-mem-feature-recovered-historical-import \
  ~/.claude/plugins/marketplaces/thedotmack

# 3. Build and register
cd ~/.claude/plugins/marketplaces/thedotmack
npm install
npm run build
npm run sync-marketplace:force
bash scripts/register-fork.sh

# 4. Start worker
npm run worker:start
```

### Method 3: Symlink Development Repo

If you already have the repo cloned elsewhere:

```bash
# If you have the repo at ~/Projects/claude-mem
ln -s ~/Projects/claude-mem ~/.claude/plugins/marketplaces/thedotmack

# Then build, register, and start
cd ~/.claude/plugins/marketplaces/thedotmack
npm install
npm run build
npm run sync-marketplace:force
bash scripts/register-fork.sh
npm run worker:start
```

## Verification

Run the comprehensive verification script:

```bash
cd ~/.claude/plugins/marketplaces/thedotmack
npm run verify-fork
```

This checks:
- ✅ Installation path
- ✅ Git remote (should be your fork)
- ✅ Current branch
- ✅ Version
- ✅ Registration with Claude Code
- ✅ Worker status
- ✅ Hooks configuration
- ✅ Worker API responding

**Expected output:**
```
=== Claude-Mem Fork Verification ===

1. Installation path:
   ✓ ~/.claude/plugins/marketplaces/thedotmack

2. Git remote:
   origin → https://github.com/ashleigh-hopkins/claude-mem.git

3. Current branch:
   feature/recovered-historical-import

4. Version:
   7.3.4

5. Registered with Claude Code:
   ✓ Registered in installed_plugins.json

6. Worker status:
   Worker is running
     PID: 12345
     Port: 37777

7. Hooks installed:
   ✓ hooks.json exists
   5 lifecycle hooks configured

8. Worker API:
   ✓ Worker responding on port 37777
   Version: 7.3.4

=== Summary ===
✅ Fork is installed and working!
```

### Why Fork Doesn't Show in Marketplace List

**Important:** Running `claude plugin marketplace list` shows marketplace **sources** (repositories), not individual plugins.

Your fork is installed **directly**, not through a marketplace, so it won't appear in that list. This is normal and expected.

**To verify it's actually working:**
1. ✅ Run `npm run verify-fork` (shows all checks)
2. ✅ Visit http://localhost:37777 (web UI should load)
3. ✅ In Claude Code, the hooks will capture context automatically
4. ✅ Use the mem-search skill to test: "What did we work on recently?"

## Updating Your Fork

To pull latest changes from your fork:

```bash
cd ~/.claude/plugins/marketplaces/thedotmack

# Pull latest changes
git pull origin feature/recovered-historical-import

# Rebuild and restart
npm run build-and-sync
```

## Syncing with Upstream

To get latest changes from the official repo:

```bash
cd ~/.claude/plugins/marketplaces/thedotmack

# Add upstream remote (one time)
git remote add upstream https://github.com/thedotmack/claude-mem.git

# Fetch latest from upstream
git fetch upstream --tags

# Merge upstream changes
git merge v7.3.4  # or whatever version

# Rebuild and restart
npm run build-and-sync
```

## Switching Between Fork and Official

### Switch to Official Version

```bash
# 1. Uninstall current (from fork)
cd ~/.claude/plugins/marketplaces/thedotmack
npm run worker:stop
cd ~
rm -rf ~/.claude/plugins/marketplaces/thedotmack

# 2. Install official version
claude plugin install thedotmack/claude-mem
```

### Switch Back to Fork

Follow Method 1 above (Direct Git Clone).

## Platform-Specific Notes

### macOS/Linux

Plugin directory: `~/.claude/plugins/marketplaces/thedotmack`

### Windows

Plugin directory: `%USERPROFILE%\.claude\plugins\marketplaces\thedotmack`

Use PowerShell for commands:
```powershell
# Clone fork
git clone https://github.com/ashleigh-hopkins/claude-mem.git `
  $env:USERPROFILE\.claude\plugins\marketplaces\thedotmack

# Build and start
cd $env:USERPROFILE\.claude\plugins\marketplaces\thedotmack
npm install
npm run build
npm run sync-marketplace:force
npm run worker:start
```

## Troubleshooting Fork Installation

### "npm install" fails

Make sure you have Node.js 18+ installed:
```bash
node --version  # Should be v18.0.0 or higher
```

### "bun: command not found"

The build scripts will auto-install Bun. If it fails:
```bash
# Install Bun manually
curl -fsSL https://bun.sh/install | bash
```

### Worker won't start

```bash
# Check logs
npm run worker:logs

# Try manual start
bun plugin/scripts/worker-service.cjs
```

### Permission denied

```bash
# Make scripts executable
chmod +x scripts/*.sh
chmod +x plugin/scripts/*.js
```

## Development Workflow

If you're actively developing:

```bash
# 1. Make changes to src/
# 2. Rebuild
npm run build

# 3. Sync to marketplace
npm run sync-marketplace:force

# 4. Restart worker
npm run worker:restart

# Or do all in one command
npm run build-and-sync
```

## See Also

- [Historical Import Guide](/docs/public/usage/historical-import.mdx) - Using the replay tools
- [Development Guide](https://docs.claude-mem.ai/development) - Contributing to claude-mem
- [Configuration](https://docs.claude-mem.ai/configuration) - Settings and environment variables
