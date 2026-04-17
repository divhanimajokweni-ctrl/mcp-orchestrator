#!/bin/bash
# Stop all MCP server tmux sessions
# Usage: ./scripts/stop_mcp_servers.sh

SESSION_NAME="mcp-servers"

echo "Stopping MCP servers..."

if tmux has-session -t $SESSION_NAME 2>/dev/null; then
    tmux kill-session -t $SESSION_NAME
    echo "✓ Session '$SESSION_NAME' terminated"
else
    echo "No active session '$SESSION_NAME' found"
fi

# Also kill any stray MCP inspector processes
pkill -f "mcp-inspector" 2>/dev/null || true
echo "✓ Cleanup complete"