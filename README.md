# CLI-Based MCP Orchestration Environment

This environment provides autonomous MCP server orchestration for KiloCode/OpenCode style CLI workflows.

## Architecture Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   KiloCode CLI  │────▶│ mcp-orchestrator │────▶│   MCP Servers    │
│   (or OpenCode) │     │      (Python)    │     │  (Node.js/Python)│
└─────────────────┘     └──────────────────┘     └──────────────────┘
                               │
                               ▼
                    ┌──────────────────┐
                    │  Vision Model    │
                    │  (GateValidation)│
                    └──────────────────┘
```

## Components

### 1. Master Orchestrator (`mcp-orchestrator.py`)

Central control script that:
- Loads MCP server config from `~/.config/mcp/mcp-config.json`
- Executes server commands via subprocess
- Runs validation loops using local vision model (ollama/llava)
- Supports `Plan → Execute → Validate` workflow

**Key Methods:**
- `run_task(server_name, prompt)` - Execute single command
- `validate_output(image_path, gates)` - Check against quality gates
- `refinement_loop(...)` - Iterate until gates pass
- `execute_tasks(tasks_file)` - Run full task list

### 2. Quality Gates

Four validation gates used in character sheet production:

| Gate | Purpose | Vision Model Prompt |
|------|---------|---------------------|
| **Silhouette** | Character recognizability | "Is the character silhouette clear and distinctive?" |
| **Material** | Texture/material quality | "Are materials properly rendered with correct properties?" |
| **Narrative** | Storytelling elements | "Does the image convey a clear narrative?" |
| **Performance** | Technical quality | "Is technical execution high quality (no artifacts)?" |

### 3. Task Schema (`tasks.json`)

Declarative task definition format:
```json
[
  {
    "id": "1",
    "tool": "nano-banana",
    "cmd": "generate_character_sheet",
    "target": "Musah - Production Dossier Style",
    "gates": ["silhouette", "narrative"],
    "output": "output/musah_v01.png"
  }
]
```

### 4. CLI Wrappers

- **`kilocli.py`** - KiloCode-style wrapper with `exec()` and `run_tasks()` methods
- **`kilo-code exec`** - Direct alias for single command execution
- **`opencode exec`** - OpenCode-style task execution

## Server Management

### Background Execution (tmux)

```bash
# Start all servers in detached tmux session
./scripts/start_mcp_servers.sh

# Attach to session to monitor
tmux attach -t mcp-servers

# Detach from tmux: Ctrl+B, then D

# Stop all servers
./scripts/stop_mcp_servers.sh

# Check status
./scripts/status_mcp_servers.sh
```

### Server Configuration

MCP servers are defined in `~/.config/mcp/mcp-config.json`:

```json
{
  "mcpServers": {
    "nano-banana": {
      "command": "node",
      "args": ["/path/to/mcp-servers/nano-banana/index.js"]
    },
    "superdesign": {
      "command": "node",
      "args": ["/path/to/mcp-servers/superdesign/index.js"]
    },
    "blender-mcp": {
      "command": "node",
      "args": ["/path/to/mcp-servers/blender-mcp/index.js"]
    }
  }
}
```

## Workflow Examples

### 1. Single Character Sheet Generation (with auto-refinement)

```bash
# Direct execution
python mcp-orchestrator.py --server nano-banana --prompt "Generate Musah ID Sheet v01"

# With validation loop (requires output path)
python mcp-orchestrator.py --server nano-banana --prompt "Generate Musah ID Sheet" \
  --validate output.png --gates silhouette narrative material

# Or use refinement loop
python mcp-orchestrator.py --validate output.png --gates silhouette narrative
```

### 2. Full Production Pipeline

```bash
# Execute all tasks from tasks.json with validation
python mcp-orchestrator.py --tasks tasks.json
```

This will:
1. Run nano-banana to generate character sheet
2. Validate against silhouette+narrative gates
3. If gates fail, auto-refine up to 3 iterations
4. Continue to superdesign for palette generation
5. Generate Blender mesh with performance validation

### 3. KiloCode-Style Atomic Commands

```bash
# Using the KiloCLI wrapper
python kilocli.py exec "nano-banana --prompt 'Musah identity sheet, production dossier style'"

# With automatic gate checking
python kilocli.py validate output.png silhouette material
```

### 4. OpenCode Task Orchestration

```bash
# Direct schema execution
opencode exec "drawio-server --update 'Vertical Slice Structure'"

# Via orchestrator
python mcp-orchestrator.py --server drawio-server --prompt "update_bible: Vertical_Slice_Flow"
```

## Integration with Vision Model

Gate validation uses a local vision model (default: `llava` via ollama):

```bash
# Ensure ollama is running with vision model
ollama pull llava

# Test vision model
python mcp-orchestrator.py --validate test.png --gates silhouette
```

**Customization:** Edit `MCPOrchestrator.gates` in `mcp-orchestrator.py` to modify gate prompts or add new gates.

## Production Loop: Plan → Execute → Validate

```python
# Custom Python script example
from mcp_orchestrator import MCPOrchestrator

orch = MCPOrchestrator()

# PLAN - Define character sheet requirements
requirements = {
    "character": "Musah",
    "gates": ["silhouette", "narrative", "performance"],
    "iterations": 3
}

# EXECUTE - Run generation
result = orch.run_task("nano-banana", f"Generate {requirements['character']} ID Sheet")

# VALIDATE - Check output (auto-refine if needed)
success, final_output = orch.refinement_loop(
    server_name="nano-banana",
    base_prompt=f"Generate {requirements['character']} ID Sheet",
    image_path="output/musah_v01.png",
    required_gates=requirements["gates"],
    max_iterations=requirements["iterations"]
)

if success:
    print(f"Character sheet approved: {final_output}")
else:
    print(f"Manual review required: {final_output}")
```

## State Management

### Persistent Server State (tmux)

MCP servers run in a persistent tmux session named `mcp-servers`:

```bash
# View running servers
tmux list-windows -t mcp-servers

# Attach to monitor logs
tmux attach -t mcp-servers

# Detach without stopping: Ctrl+B, then D
```

This allows KiloCode/OpenCode to communicate with servers continuously without restart overhead.

### Configuration Locations

- **MCP config**: `~/.config/mcp/mcp-config.json`
- **Task definitions**: `./tasks.json` (project-local)
- **Orchestrator**: `./mcp-orchestrator.py`
- **CLI wrapper**: `./kilocli.py`

## Troubleshooting

### "Server does not support tools" error
**Fix:** Ensure `capabilities: { tools: {} }` is set in server initialization.

### Vision model not responding
**Fix:** Start ollama with vision support:
```bash
ollama serve &
ollama pull llava
```

### Server crashed in tmux
**Check:** Attach to session: `tmux attach -t mcp-servers` and view error in window.

### Gates always failing
**Adjust vision model prompts** in `MCPOrchestrator.gates` or use a more capable model (e.g., `llava:34b`).

## Quick Reference

| KiloCode Command | Equivalent |
|------------------|------------|
| `kilo-code exec "nano-banana --prompt '...'"` | `python mcp-orchestrator.py --server nano-banana --prompt "..."` |
| `kilo-code run tasks.json` | `python mcp-orchestrator.py --tasks tasks.json` |
| `kilo-code validate output.png silhouette` | `python mcp-orchestrator.py --validate output.png --gates silhouette` |

## Files Overview

```
/home/runner/workspace/
├── mcp-orchestrator.py       # Main orchestrator with validation loop
├── kilocli.py                # KiloCode/OpenCode CLI wrapper
├── tasks.json                # Task schema definition
└── scripts/
    ├── start_mcp_servers.sh  # Launch all servers in tmux
    ├── stop_mcp_servers.sh   # Terminate all servers
    └── status_mcp_servers.sh # Check running status
```

## Next Steps

1. **Start servers**: `./scripts/start_mcp_servers.sh`
2. **Verify**: `./scripts/status_mcp_servers.sh`
3. **Run task**: `python mcp-orchestrator.py --tasks tasks.json`
4. **Monitor**: `tmux attach -t mcp-servers`
5. **Iterate**: Refine gates in `MCPOrchestrator.gates` as needed