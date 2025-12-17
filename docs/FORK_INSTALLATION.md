# Installing Claude-Mem Fork (Recommended Method)

This is the cleanest way to install your fork while keeping Claude Code's plugin system happy.

> **✅ This method uses Claude Code's native plugin system** - It properly registers the fork so it appears in the `/plugin` UI and works exactly like an official installation.

## The Problem

Claude Code's `/plugin` UI only recognizes plugins that are:
1. Registered in `~/.claude/plugins/installed_plugins.json`
2. Located in the cache directory structure
3. Properly associated with a marketplace

## The Solution

Use Claude Code's native marketplace system, then swap in your fork's files.

## Installation Steps

### Step 1: Install Official Plugin (Sets Up Structure)

```bash
# Install the official plugin first
claude plugin install thedotmack/claude-mem
```

This creates the proper directory structure and registers with Claude Code. Wait for installation to complete and verify it shows in `/plugin` UI.

### Step 2: Replace with Your Fork

```bash
# Go to the marketplace directory
cd ~/.claude/plugins/marketplaces/thedotmack

# Remove official files
rm -rf ./* ./.git

# Clone your fork in place
git clone https://github.com/ashleigh-hopkins/claude-mem.git .

# Checkout your feature branch
git checkout feature/recovered-historical-import
```

### Step 3: Build and Sync

```bash
# Install dependencies and build
npm install
npm run build

# Sync to cache directory (where Claude Code looks)
npm run sync-marketplace:force

# Restart worker with your fork's code
npm run worker:restart
```

### Step 4: Verify Installation

```bash
npm run verify-fork
```

**Should show:** ✅ All checks passing, worker running, fork registered.

**In Claude Code:** Run `/plugin` and you should see `claude-mem@thedotmack` in the Installed tab.

## Why This Works

1. **Claude Code sets up structure** - Proper directories, registration, marketplace association
2. **You swap the code** - Replace official files with fork files
3. **Sync updates cache** - Your fork's built files go to the cache directory
4. **Registration intact** - Claude Code still thinks it's the official plugin

## Benefits Over Manual Registration

✅ **Uses native plugin system** - No hacking installed_plugins.json
✅ **UI recognizes it** - Shows up in `/plugin` interface
✅ **Proper marketplace association** - Tied to thedotmack marketplace
✅ **Cleaner** - Works with Claude Code's expectations
✅ **No register-fork script needed** - Claude Code already knows about it

> **Note:** The `scripts/register-fork.sh` script is NOT needed with this method. Only use it if you manually cloned without installing the official version first (see [FORK_INSTALLATION_MANUAL.md](./FORK_INSTALLATION_MANUAL.md)).

## Verification

After installation, check:

```bash
# 1. Worker running
npm run worker:status

# 2. Correct fork
git remote -v
# Should show: https://github.com/ashleigh-hopkins/claude-mem.git

# 3. Correct branch
git branch --show-current
# Should show: feature/recovered-historical-import

# 4. UI shows it
# Run: /plugin in Claude Code
# Should see claude-mem@thedotmack in Installed tab
```

## Updating Your Fork

When you push new commits:

```bash
cd ~/.claude/plugins/marketplaces/thedotmack

# Pull latest
git pull

# Rebuild and sync
npm run build-and-sync
```

## Platform-Specific Paths

**macOS/Linux:**
- Marketplace: `~/.claude/plugins/marketplaces/thedotmack`
- Cache: `~/.claude/plugins/cache/thedotmack/claude-mem/{version}`

**Windows:**
- Marketplace: `%USERPROFILE%\.claude\plugins\marketplaces\thedotmack`
- Cache: `%USERPROFILE%\.claude\plugins\cache\thedotmack\claude-mem\{version}`

## Troubleshooting

### Marketplace Not Found

If `claude plugin marketplace add thedotmack/claude-mem` fails:

The marketplace might not be publicly listed. Alternative:

```bash
# Install official plugin first using any method
claude plugin install thedotmack/claude-mem

# Then follow Step 3 onwards
```

### Cache Directory Not Created

If sync-marketplace fails to create cache directory:

```bash
# Create manually
mkdir -p ~/.claude/plugins/cache/thedotmack/claude-mem/7.3.4

# Then run sync again
npm run sync-marketplace:force
```

### Worker Won't Start

```bash
# Check logs
npm run worker:logs

# Kill any existing processes
pkill -f "worker-service"

# Restart
npm run worker:start
```
