#!/bin/bash
# Start all MCP servers in background tmux session
# Usage: ./scripts/start_mcp_servers.sh

SESSION_NAME="mcp-servers"
CONFIG="$HOME/.config/mcp/mcp-config.json"

echo "Starting MCP servers in tmux session: $SESSION_NAME"

# Kill existing session if any
tmux kill-session -t $SESSION_NAME 2>/dev/null

# Create new session
tmux new-session -d -s $SESSION_NAME

# Read servers from config
SERVERS=$(python3 -c "
import json
with open('$CONFIG') as f:
    for name in json.load(f)['mcpServers']:
        print(name)
")

# Start each server in its own window
WINDOW=0
for server in $SERVERS; do
    echo "  Starting $server..."
    tmux new-window -t $SESSION_NAME:$((WINDOW+1)) -n "$server"
    CMD=$(python3 -c "
import json
with open('$CONFIG') as f:
    data = json.load(f)
    server_config = data['mcpServers']['$server']
    import shlex
    cmd = shlex.quote(server_config['command'])
    args = ' '.join(shlex.quote(str(a)) for a in server_config.get('args', []))
    print(f'{cmd} {args}')
")
    tmux send-keys -t $SESSION_NAME:$((WINDOW+1)) "$CMD" Enter
    sleep 1
    WINDOW=$((WINDOW+1))
done

# Select first window
tmux select-window -t $SESSION_NAME:1

echo "✓ All MCP servers started in tmux session '$SESSION_NAME'"
echo "  Attach with: tmux attach -t $SESSION_NAME"
echo "  List windows: tmux list-windows -t $SESSION_NAME"
echo "  Kill all: tmux kill-session -t $SESSION_NAME"