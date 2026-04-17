#!/bin/bash
# MCP Server Connectivity Test Suite

echo "=== MCP Server Connectivity Verification ==="
echo ""

# Test function
test_server() {
  local name=$1
  local command=$2
  local args="$3"
  
  echo "Testing $name..."
  echo "  Command: $command $args"
  
  # Quick startup test
  timeout 5 $command $args > /tmp/mcp_test.log 2>&1 &
  local pid=$!
  sleep 2
  
  if kill -0 $pid 2>/dev/null; then
    echo "  ✓ Server started successfully"
    kill $pid 2>/dev/null
    return 0
  else
    echo "  ✗ Server failed to start"
    cat /tmp/mcp_test.log | head -10
    return 1
  fi
}

# Test each server
echo "1. nano-banana MCP Server"
test_server "nano-banana" "node" "/home/runner/workspace/mcp-servers/nano-banana/index.js"
echo ""

echo "2. superdesign MCP Server"
test_server "superdesign" "node" "/home/runner/workspace/mcp-servers/superdesign/index.js"
echo ""

echo "3. blender-mcp MCP Server"
test_server "blender-mcp" "node" "/home/runner/workspace/mcp-servers/blender-mcp/index.js"
echo ""

# Verify config
echo "=== Configuration ==="
echo "Config location: ~/.config/mcp/mcp-config.json"
cat ~/.config/mcp/mcp-config.json
echo ""

# Verify installations
echo "=== Installation Summary ==="
echo "MCP SDK (npm): $(npm list -g @modelcontextprotocol/sdk 2>/dev/null | tail -1)"
echo "MCP Inspector: $(which mcp-inspector)"
echo ""

echo "=== All Tests Complete ==="