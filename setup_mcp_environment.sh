#!/bin/bash
# Replit Autonomous MCP Setup Script

echo "Initializing Agentic Dev Environment..."

# 1. Ensure Node.js and Python are available
npm install -g npm@latest

# 2. Setup Configuration Directory
mkdir -p ~/.config/mcp

# 3. Create mcp-config.json for tool integration
cat <<EOF > ~/.config/mcp/mcp-config.json
{
  "mcpServers": {
    "nano-banana": { "command": "npx", "args": ["-y", "@conecho/nano-banana"] },
    "superdesign": { "command": "npx", "args": ["-y", "superdesign-mcp"] },
    "blender-mcp": { "command": "python", "args": ["./server/blender_mcp.py"] }
  }
}
EOF

# 4. Install supporting MCP clients/libraries
npm install @modelcontextprotocol/sdk

echo "Environment Configured. MCP Servers ready for orchestration."