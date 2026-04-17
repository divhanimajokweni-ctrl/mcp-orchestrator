#!/bin/bash
# QUICKSTART: 5-Minute MCP Orchestration Setup
# Run this on your LOCAL machine (not Replit)

set -e

echo "========================================="
echo "  MCP Orchestration Quickstart"
echo "========================================="
echo ""

# Check prerequisites
echo "Checking prerequisites..."

check_cmd() {
    if command -v $1 &>/dev/null; then
        echo "  ✓ $1"
        return 0
    else
        echo "  ✗ $1 NOT FOUND"
        return 1
    fi
}

MISSING=0
check_cmd python3 || MISSING=1
check_cmd node || MISSING=1
check_cmd npm || MISSING=1
check_cmd tmux || echo "  ⚠ tmux optional but recommended"
check_cmd ollama || echo "  ⚠ ollama optional (for gate validation)"

if [ $MISSING -eq 1 ]; then
    echo ""
    echo "Install missing prerequisites first:"
    echo "  - Python3: https://www.python.org/downloads/"
    echo "  - Node.js: https://nodejs.org/"
    exit 1
fi

echo ""
echo "1. Installing MCP SDK..."
npm install -g @modelcontextprotocol/sdk @modelcontextprotocol/inspector

echo ""
echo "2. Setting up config..."
mkdir -p ~/.config/mcp
if [ -f "mcp-config.json" ]; then
    cp mcp-config.json ~/.config/mcp/
    echo "  ✓ Copied local mcp-config.json"
elif [ -f ".config/mcp/mcp-config.json" ]; then
    cp .config/mcp/mcp-config.json ~/.config/mcp/
    echo "  ✓ Copied from workspace"
else
    echo "  ⚠ No config found, create ~/.config/mcp/mcp-config.json manually"
fi

echo ""
echo "3. Installing server dependencies..."
if [ -d "mcp-servers/nano-banana" ]; then
    (cd mcp-servers/nano-banana && npm install)
    echo "  ✓ nano-banana"
fi
if [ -d "mcp-servers/superdesign" ]; then
    (cd mcp-servers/superdesign && npm install)
    echo "  ✓ superdesign"
fi
if [ -d "mcp-servers/blender-mcp" ]; then
    (cd mcp-servers/blender-mcp && npm install)
    echo "  ✓ blender-mcp"
fi

echo ""
echo "4. Setting up vision model (for gate validation)..."
if command -v ollama &>/dev/null; then
    if ollama list 2>/dev/null | grep -q "llava"; then
        echo "  ✓ llava already installed"
    else
        echo "  Installing llava model..."
        ollama pull llava
    fi
else
    echo "  ⚠ Skipped: Install ollama from https://ollama.ai for gate validation"
fi

echo ""
echo "========================================="
echo "  SETUP COMPLETE"
echo "========================================="
echo ""
echo "NEXT STEPS:"
echo ""
echo "1. Start MCP servers in background:"
echo "   ./scripts/start_mcp_servers.sh"
echo "   tmux attach -t mcp-servers  # to monitor"
echo ""
echo "2. In a new terminal, test a single command:"
echo "   python mcp-orchestrator.py --server nano-banana --prompt 'test'"
echo ""
echo "3. Run full pipeline:"
echo "   python mcp-orchestrator.py --tasks tasks.json"
echo ""
echo "4. Or use KiloCode aliases:"
echo "   alias kexec='python mcp-orchestrator.py --server'"
echo "   kexec nano-banana --prompt 'Generate character sheet'"
echo ""
echo "DOCUMENTATION:"
echo "  README.md          - Full reference"
echo "  SETUP.md           - Detailed setup guide"
echo "  VALIDATION_LOOP.md - Gate validation internals"
echo ""