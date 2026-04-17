# Setup Instructions for Local Machine

## Prerequisites

Install these on your local workstation (not Replit):

```bash
# 1. Python 3.10+
# macOS: brew install python3
# Ubuntu: sudo apt install python3 python3-pip
# Windows: Download from python.org

# 2. Node.js 18+ (for MCP servers)
# https://nodejs.org/ or brew install node

# 3. tmux (for process management)
# macOS: brew install tmux
# Ubuntu: sudo apt install tmux

# 4. Ollama (for vision model gate validation)
# curl -fsSL https://ollama.ai/install.sh | sh
# ollama pull llava
```

## Installation

```bash
# Clone/copy orchestrator files to your local project
cd /your/project

# Install MCP SDK globally
npm install -g @modelcontextprotocol/sdk @modelcontextprotocol/inspector

# Install server dependencies (nano-banana, superdesign, blender-mcp)
cd mcp-servers/nano-banana && npm install
cd ../superdesign && npm install
cd ../blender-mcp && npm install

# Create MCP config
mkdir -p ~/.config/mcp
# Copy workspace/.config/mcp/mcp-config.json to ~/.config/mcp/

# Test servers
mcp-inspector --config ~/.config/mcp/mcp-config.json --server nano-banana
```

## Running

```bash
# Terminal 1: Start MCP servers in tmux (persistent background)
./scripts/start_mcp_servers.sh
tmux attach -t mcp-servers  # Monitor

# Terminal 2: Run KiloCode
kilo-code exec "nano-banana --prompt 'Generate Musah ID Sheet'"

# Terminal 2: Or run full task list
python mcp-orchestrator.py --tasks tasks.json

# Terminal 2: Validate specific output
python mcp-orchestrator.py --validate output/musah_v01.png --gates silhouette narrative
```

## KiloCode Integration

Add aliases to your `~/.bashrc` or `~/.zshrc`:

```bash
# KiloCode aliases
alias kexec="python3 /path/to/project/mcp-orchestrator.py --server"
alias ktasks="python3 /path/to/project/mcp-orchestrator.py --tasks"
alias kvalidate="python3 /path/to/project/mcp-orchestrator.py --validate"
alias kmcp-start="./scripts/start_mcp_servers.sh"
alias kmcp-stop="./scripts/stop_mcp_servers.sh"
alias kmcp-status="./scripts/status_mcp_servers.sh"
```

Usage:
```bash
kexec nano-banana --prompt "Generate Musah character sheet"
ktasks tasks.json
kvalidate output.png silhouette material
kmcp-start
```

## The Full Production Loop

```
┌─────────────────────────────────────────────────────────────┐
│  1. PLAN    → Edit tasks.json with your requirements       │
│  2. EXECUTE → Run: python mcp-orchestrator.py --tasks      │
│  3. VALIDATE → Gates checked via vision model (llava)      │
│  4. REFINE  → Auto-retry until gates pass (max 3 iters)    │
│  5. APPROVE → Move to next task in pipeline                │
└─────────────────────────────────────────────────────────────┘
```