# Torre Tempo MCP Setup Guide

**Model Context Protocol (MCP) Servers for Enhanced Development**

This guide will help you install and configure all MCP servers to supercharge your Torre Tempo development workflow.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Individual MCP Installation](#individual-mcp-installation)
4. [Configuration](#configuration)
5. [Verification](#verification)
6. [Troubleshooting](#troubleshooting)
7. [Usage Examples](#usage-examples)

---

## Prerequisites

### Required Tools

```bash
# Node.js (already installed)
node --version  # Should be >= 20.0.0

# Python with uv (for Python-based MCPs)
pip install uv

# Verify uv installation
uv --version
```

### API Tokens (Optional but Recommended)

1. **GitHub Personal Access Token**
   - Go to: https://github.com/settings/tokens
   - Create token with `repo`, `read:org`, `read:user` scopes
   - Save for later: `ghp_xxxxxxxxxxxxx`

2. **Figma Access Token** (if using Figma)
   - Go to: https://www.figma.com/developers/api#access-tokens
   - Requires Dev or Full seat on Pro/Org/Enterprise plan
   - Save for later: `figd_xxxxxxxxxxxxx`

---

## Quick Start

### Option 1: Auto-Install All MCPs (Recommended)

```bash
# Navigate to project root
cd "C:\Users\j.mcbride.LSLT\Documents\Torre Tempo V1"

# Run installation script (creates this automatically)
npm run mcp:install
```

### Option 2: Manual Configuration

1. **Copy the MCP configuration file:**

```bash
# For Claude Desktop (Windows)
copy mcp-config.json "%APPDATA%\Claude\claude_desktop_config.json"

# For Claude Desktop (Mac/Linux)
cp mcp-config.json ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

2. **Edit configuration with your tokens:**

Open the copied file and replace placeholders:
- `<YOUR_GITHUB_TOKEN>` → Your GitHub PAT
- `<YOUR_FIGMA_TOKEN>` → Your Figma access token

3. **Restart Claude Desktop or OpenCode**

---

## Individual MCP Installation

### 🗄️ **1. Prisma MCP** (Essential)

**What it does:** Database operations, migrations, schema introspection

**Test installation:**
```bash
npx -y prisma mcp
```

**Usage:**
- "Check my migration status"
- "Show me all users in the database"
- "Create a migration for adding a new field"

---

### 🐙 **2. GitHub MCP** (Essential)

**What it does:** Repository management, issues, PRs, file operations

**Test installation:**
```bash
npx -y @github/github-mcp-server
```

**Setup:**
1. Create GitHub Personal Access Token: https://github.com/settings/tokens
2. Scopes needed: `repo`, `read:org`, `read:user`, `workflow`
3. Add to environment: `GITHUB_PERSONAL_ACCESS_TOKEN`

**Usage:**
- "List all open issues in this repository"
- "Create a new branch for the auth feature"
- "Show me recent commits"

---

### 📁 **3. Filesystem MCP** (Essential)

**What it does:** Enhanced file navigation and operations

**Test installation:**
```bash
npx -y @modelcontextprotocol/server-filesystem "C:\Users\j.mcbride.LSLT\Documents\Torre Tempo V1"
```

**Usage:**
- "Show me the directory tree of the apps folder"
- "Search for files containing 'tenantId'"
- "Read all TypeScript files in the auth module"

---

### ⏰ **4. Time MCP** (Critical for Torre Tempo)

**What it does:** Timezone conversions, time tracking operations

**Install Python dependencies:**
```bash
pip install uv
```

**Test installation:**
```bash
uvx mcp-server-time
```

**Configuration:**
- Default timezone: `Europe/Madrid` (Spanish labor law requirement)

**Usage:**
- "What time is it in Madrid right now?"
- "Convert 9:00 AM EST to Madrid time"
- "Get current timestamp for clock-in"

---

### 🧠 **5. Sequential Thinking MCP** (Architecture)

**What it does:** Structured problem-solving for complex decisions

**Test installation:**
```bash
npx -y @modelcontextprotocol/server-sequential-thinking
```

**Usage:**
- "Create a learning plan for implementing offline sync"
- "Debug why multi-tenant isolation is failing"
- "Plan the architecture for adding shift scheduling"

---

### 💾 **6. Memory MCP** (Context Persistence)

**What it does:** Remember project context across sessions

**Test installation:**
```bash
npx -y @modelcontextprotocol/server-memory
```

**Usage:**
- "Remember that we use RD-Ley 8/2019 for Spanish labor law compliance"
- "Store the fact that Torre Tempo uses multi-tenant isolation at app layer"
- "What do you remember about our PWA offline strategy?"

---

### 🌐 **7. Fetch MCP** (API Testing)

**What it does:** Test API endpoints, fetch documentation

**Test installation:**
```bash
uvx mcp-server-fetch
```

**Usage:**
- "Fetch the response from http://localhost:4000/api/health"
- "Test the /api/auth/login endpoint with sample data"
- "Get the PWA manifest from /manifest.json"

---

### 🔧 **8. Git MCP** (Version Control)

**What it does:** Advanced git operations and commit history

**Test installation:**
```bash
npx -y @modelcontextprotocol/server-git --repository "C:\Users\j.mcbride.LSLT\Documents\Torre Tempo V1"
```

**Usage:**
- "Show me the commit that introduced the clock-in feature"
- "Find all commits that modified the Prisma schema"
- "Show git blame for apps/api/src/auth/auth.service.ts"

---

### 🎨 **9. Figma MCP** (Design-to-Code)

**What it does:** Extract design specs, tokens, components from Figma

**Test installation:**
```bash
npx @figma/mcp-server
```

**Prerequisites:**
- Dev or Full seat on Figma Professional/Organization/Enterprise
- Figma Personal Access Token

**Usage:**
- "Get all color tokens from our Figma design system"
- "Generate React component from the Login frame"
- "Show me the spacing values defined in Figma"

---

### 🎭 **10. Playwright MCP** (E2E Testing)

**What it does:** Browser automation, E2E testing, accessibility testing

**Test installation:**
```bash
npx @playwright/mcp@latest
```

**Usage:**
- "Navigate to http://localhost:3000 and click the clock-in button"
- "Take screenshots of the dashboard at mobile, tablet, and desktop sizes"
- "Generate a Playwright test for the login flow"

---

### ♿ **11. Accessibility MCP** (WCAG Compliance)

**What it does:** WCAG compliance testing, color contrast analysis

**Test installation:**
```bash
npx -y @ronantakizawa/a11ymcp
```

**Usage:**
- "Test http://localhost:3000 for accessibility issues"
- "Check if our button colors have sufficient contrast"
- "Validate ARIA labels in the clock-in form"

---

### 🧩 **12. shadcn/ui MCP** (Component Library)

**What it does:** Browse and install shadcn/ui components

**Test installation:**
```bash
npx -y shadcn@latest mcp serve
```

**Usage:**
- "Show me all available shadcn form components"
- "Install the shadcn button component"
- "Add the data table component with sorting"

---

## Configuration

### Full MCP Configuration File

Location: `mcp-config.json` (project root)

```json
{
  "$schema": "https://modelcontextprotocol.io/schema/config.json",
  "mcpServers": {
    "prisma-local": {
      "command": "npx",
      "args": ["-y", "prisma", "mcp"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@github/github-mcp-server"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "<YOUR_TOKEN>"
      }
    },
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "C:\\Users\\j.mcbride.LSLT\\Documents\\Torre Tempo V1"
      ]
    },
    "time": {
      "command": "uvx",
      "args": ["mcp-server-time"],
      "env": {
        "TIMEZONE": "Europe/Madrid"
      }
    },
    "sequential-thinking": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]
    },
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"]
    },
    "fetch": {
      "command": "uvx",
      "args": ["mcp-server-fetch"]
    },
    "git": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-git",
        "--repository",
        "C:\\Users\\j.mcbride.LSLT\\Documents\\Torre Tempo V1"
      ]
    },
    "figma": {
      "command": "npx",
      "args": ["@figma/mcp-server"],
      "env": {
        "FIGMA_ACCESS_TOKEN": "<YOUR_FIGMA_TOKEN>"
      }
    },
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    },
    "a11y": {
      "command": "npx",
      "args": ["-y", "@ronantakizawa/a11ymcp"]
    },
    "shadcn": {
      "command": "npx",
      "args": ["-y", "shadcn@latest", "mcp", "serve"]
    }
  }
}
```

### Environment Variables Setup

Create `.env.mcp` in project root:

```bash
# GitHub Personal Access Token
GITHUB_PERSONAL_ACCESS_TOKEN=ghp_xxxxxxxxxxxxx

# Figma Access Token (optional)
FIGMA_ACCESS_TOKEN=figd_xxxxxxxxxxxxx

# Default timezone for Time MCP
TIMEZONE=Europe/Madrid
```

**Load environment variables:**

```bash
# Windows (PowerShell)
Get-Content .env.mcp | ForEach-Object {
  if ($_ -match '^([^=]+)=(.*)$') {
    [Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'User')
  }
}

# Mac/Linux
export $(cat .env.mcp | xargs)
```

---

## Verification

### Test All MCPs

Run this verification script to ensure all MCPs are working:

```bash
# Create verification script
npm run mcp:verify
```

**Manual verification:**

1. **Check MCP availability:**
   - In Claude Desktop/OpenCode, ask: "List all available MCP tools"
   - You should see tools from all 12 MCP servers

2. **Test individual MCPs:**

```bash
# Prisma
"Check my Prisma migration status"

# GitHub
"List all branches in this repository"

# Filesystem
"Show me the directory tree of the apps folder"

# Time
"What time is it in Madrid?"

# Sequential Thinking
"Help me plan the architecture for offline sync"

# Memory
"Remember that Torre Tempo targets Spanish hospitality industry"

# Fetch
"Fetch http://localhost:4000/api/health"

# Git
"Show me recent commits"

# Playwright
"Navigate to http://localhost:3000 and take a screenshot"

# A11y
"Test http://localhost:3000 for accessibility issues"

# shadcn
"Show me available shadcn components"
```

---

## Troubleshooting

### Common Issues

#### 1. **Python MCPs not working (Time, Fetch)**

**Error:** `uvx: command not found`

**Solution:**
```bash
# Install uv
pip install uv

# Verify installation
uv --version

# If still failing, use full path
where uv  # Windows
which uv  # Mac/Linux
```

#### 2. **GitHub MCP authentication failure**

**Error:** `Authentication failed`

**Solution:**
- Verify token has correct scopes: `repo`, `read:org`, `read:user`
- Check token hasn't expired
- Ensure token is properly set in environment:
  ```bash
  echo $env:GITHUB_PERSONAL_ACCESS_TOKEN  # PowerShell
  echo $GITHUB_PERSONAL_ACCESS_TOKEN      # Bash
  ```

#### 3. **Filesystem MCP path issues**

**Error:** `Path not allowed` or `Directory not found`

**Solution:**
- Use absolute paths, not relative
- Escape backslashes on Windows: `C:\\Users\\...`
- Verify directory exists:
  ```bash
  Test-Path "C:\Users\j.mcbride.LSLT\Documents\Torre Tempo V1"  # PowerShell
  ```

#### 4. **NPX MCPs failing to install**

**Error:** `npx: ENOENT` or `Command not found`

**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Update npm
npm install -g npm@latest

# Try with explicit registry
npx --registry https://registry.npmjs.org -y <package>
```

#### 5. **Figma MCP not connecting**

**Error:** `Unauthorized` or `Invalid token`

**Solution:**
- Verify you have a Dev or Full seat on Figma Pro/Org/Enterprise
- Generate new Personal Access Token from Figma
- Ensure Figma Desktop app is running (for local server)

---

## Usage Examples

### Daily Development Workflows

#### **Morning Standup**
```
"Show me git commits since yesterday"
"List all open issues assigned to me"
"What's the current migration status?"
```

#### **Feature Development**
```
"Create a new branch for user-preferences feature"
"Show me the Prisma schema for the User model"
"Generate a React component from the Figma UserSettings frame"
"Install shadcn form components"
```

#### **Testing & QA**
```
"Navigate to http://localhost:3000 and test the clock-in flow"
"Check accessibility compliance for the dashboard"
"Take screenshots at mobile, tablet, and desktop sizes"
"Test the /api/auth/login endpoint"
```

#### **Debugging**
```
"Use sequential thinking to debug why clock-out isn't saving"
"Show git blame for the file with the bug"
"Fetch the API error logs"
"What time zone is the server using? Convert to Madrid time"
```

#### **Code Review**
```
"Show me the diff for the latest commit"
"Find all files that use tenantId filtering"
"Check if touch targets are at least 44px (accessibility)"
```

---

## Torre Tempo Specific Workflows

### Spanish Labor Law Compliance

```bash
# Time zone conversions (RD-Ley 8/2019 requires Europe/Madrid)
"Convert all timestamps in this time entry to Madrid time"
"What's the current time in Madrid for this clock-in?"

# Overtime calculations
"Calculate hours worked this week for user with ID xyz"
"Check if any employees exceeded 40 hours this week"

# Audit trail
"Show git history for all changes to the audit log module"
"Remember that we must retain time entries for 5 years"
```

### Multi-tenant Development

```bash
# Database queries
"Show me all tenants in the database"
"Find all locations for tenant slug 'hotel-plaza'"

# Code consistency
"Search all files for database queries without tenantId filter"
"Show me the directory tree of tenant-related code"
```

### PWA & Offline Support

```bash
# Testing
"Navigate to the app and toggle offline mode"
"Test the service worker registration"
"Take screenshots of offline fallback UI"

# Architecture planning
"Use sequential thinking to plan offline sync architecture"
"Remember our offline sync strategy uses IndexedDB + BullMQ"
```

---

## Additional Resources

### Official Documentation

- **MCP Registry**: https://registry.modelcontextprotocol.io/
- **MCP Documentation**: https://modelcontextprotocol.io/
- **Prisma MCP**: https://www.prisma.io/docs/postgres/integrations/mcp-server
- **GitHub MCP**: https://docs.github.com/en/copilot/how-tos/provide-context/use-mcp
- **Playwright MCP**: https://github.com/microsoft/playwright-mcp
- **Figma MCP**: https://github.com/figma/mcp-server-guide

### Torre Tempo Documentation

- [Main README](../README.md)
- [Deployment Guide](../DEPLOYMENT.md)
- [AGENTS.md](../AGENTS.md) - Project knowledge base

---

## Support

### Getting Help

1. **Check the MCP Registry**: https://registry.modelcontextprotocol.io/
2. **GitHub Issues**: File issues in specific MCP repositories
3. **Torre Tempo Support**: info@lsltgroup.es

---

**✅ Once all MCPs are installed and verified, you'll have a beast of a development environment!**

🚀 Happy coding!
