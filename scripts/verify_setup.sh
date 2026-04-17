#!/bin/bash
# Quick setup verification script
# Usage: ./scripts/verify_setup.sh

set -e

echo "=== MCP Orchestration Environment Verification ==="
echo ""

# Check Python
echo "1. Python environment..."
python3 --version || { echo "✗ Python3 required"; exit 1; }
echo "   ✓ Python3 available"

# Check dependencies
echo ""
echo "2. Python dependencies..."
python3 -c "import json, subprocess" 2>/dev/null && echo "   ✓ Standard library OK" || echo "   ✗ Missing modules"

# Check Node.js
echo ""
echo "3. Node.js environment..."
node --version && npm --version && echo "   ✓ Node.js available" || echo "   ✗ Node.js required"

# Check MCP SDK
echo ""
echo "4. MCP SDK..."
npm list -g @modelcontextprotocol/sdk 2>/dev/null | grep -q "@modelcontextprotocol/sdk" && \
  echo "   ✓ @modelcontextprotocol/sdk installed" || \
  echo "   ✗ Run: npm install -g @modelcontextprotocol/sdk"

# Check MCP inspector
echo ""
echo "5. MCP Inspector..."
if command -v mcp-inspector &>/dev/null; then
    echo "   ✓ mcp-inspector: $(which mcp-inspector)"
else
    echo "   ✗ Install: npm install -g @modelcontextprotocol/inspector"
fi

# Check config
echo ""
echo "6. Configuration..."
if [ -f "$HOME/.config/mcp/mcp-config.json" ]; then
    echo "   ✓ Config file exists"
    python3 -c "import json; json.load(open('$HOME/.config/mcp/mcp-config.json'))" 2>/dev/null && \
        echo "   ✓ JSON valid" || echo "   ✗ Invalid JSON"
else
    echo "   ✗ Config not found at ~/.config/mcp/mcp-config.json"
fi

# Check orchestrator
echo ""
echo "7. Orchestrator scripts..."
[ -f "mcp-orchestrator.py" ] && echo "   ✓ mcp-orchestrator.py" || echo "   ✗ Missing mcp-orchestrator.py"
[ -f "kilocli.py" ] && echo "   ✓ kilocli.py" || echo "   ✗ Missing kilocli.py"

# Check tmux
echo ""
echo "8. Process manager..."
if command -v tmux &>/dev/null; then
    echo "   ✓ tmux available (for persistent server sessions)"
else
    echo "   ⚠ tmux not found (optional but recommended)"
fi

# Check vision model (optional)
echo ""
echo "9. Vision model (for gate validation)..."
if command -v ollama &>/dev/null; then
    echo "   ✓ ollama installed"
    if ollama list 2>/dev/null | grep -q "llava"; then
        echo "   ✓ llava model available"
    else
        echo "   ⚠ Install: ollama pull llava"
    fi
else
    echo "   ⚠ ollama not found (install for gate validation): https://ollama.ai"
fi

echo ""
echo "=== Verification Complete ==="
echo ""
echo "Quick start:"
echo "  1. ./scripts/start_mcp_servers.sh  # Launch servers"
echo "  2. python mcp-orchestrator.py --tasks tasks.json  # Run pipeline"
echo "  3. tmux attach -t mcp-servers     # Monitor"