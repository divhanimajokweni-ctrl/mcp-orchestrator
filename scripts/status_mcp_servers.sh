#!/bin/bash
# Check status of all MCP servers
# Usage: ./scripts/status_mcp_servers.sh

SESSION_NAME="mcp-servers"
CONFIG="$HOME/.config/mcp/mcp-config.json"

echo "=== MCP Server Status ==="
echo ""

# Check tmux session
if tmux has-session -t $SESSION_NAME 2>/dev/null; then
    echo "✓ Tmux session '$SESSION_NAME' is ACTIVE"
    echo ""
    echo "Windows in session:"
    tmux list-windows -t $SESSION_NAME | sed 's/^/  /'
    echo ""
    echo "To attach: tmux attach -t $SESSION_NAME"
else
    echo "✗ Tmux session '$SESSION_NAME' is NOT running"
fi

echo ""
echo "=== Configured Servers ==="
python3 -c "
import json
with open('$CONFIG') as f:
    servers = json.load(f)['mcpServers']
    for name, cfg in servers.items():
        print(f'  {name}: {cfg[\"command\"]} {\" \".join(cfg.get(\"args\", []))}')
"

echo ""
echo "=== Inspector ==="
if command -v mcp-inspector &>/dev/null; then
    echo "✓ mcp-inspector: $(which mcp-inspector)"
else
    echo "✗ mcp-inspector not found"
fi