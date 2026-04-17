# CLI MCP Orchestration - Complete Setup

## What Was Built

A complete KiloCode/OpenCode-ready MCP orchestration environment with:

```
/workspace/
├── mcp-orchestrator.py         # Core: Plan/Execute/Validate loop with gate validation
├── kilocli.py                  # KiloCode/OpenCode CLI wrapper
├── tasks.json                  # Example task schema
├── demo_loop.py                # Demonstration of validation cycle
├── quickstart.sh               # 5-min setup script
├── README.md                   # Full documentation
├── SETUP.md                    # Local setup instructions
├── VALIDATION_LOOP.md          # Gate validation technical spec
└── scripts/
    ├── start_mcp_servers.sh    # Launch all servers in tmux
    ├── stop_mcp_servers.sh     # Terminate all servers
    ├── status_mcp_servers.sh   # Check running status
    └── verify_setup.sh         # Verify environment
```

## The loop.py Validation Logic

**Core Concept**: `refinement_loop()` in `mcp-orchestrator.py:114-167`

```
┌─────────────────────────────────────────────────────────────┐
│  iteration = 0                                              │
│  current_image = output.png                                 │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ while iteration < max_iterations:                  │    │
│  │                                                     │    │
│  │   1. VALIDATE                                       │    │
│  │      gate_results = validate_output(current_image, │    │
│  │                          required_gates)            │    │
│  │                                                     │    │
│  │   2. CHECK                                          │    │
│  │      if all(gate_results): SUCCESS                  │    │
│  │                                                     │    │
│  │   3. REFINE                                         │    │
│  │      failed_gates = get_failures(gate_results)      │    │
│  │      refine_prompt = build_refinement_prompt(...)  │    │
│  │      current_image = run_mcp_server(refine_prompt) │    │
│  │      iteration += 1                                 │    │
│  │                                                     │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

**Gate Validation Function** (`validate_output`):

```python
def validate_output(self, image_path, gates):
    results = {}
    for gate in gates:
        # Query vision model: "Is silhouette clear? YES/NO"
        response = ollama_run("llava", f"{gate_prompt} {image_path}")
        results[gate] = "yes" in response.lower()
    return results
```

**Refinement Prompt Builder** (`_build_refinement_prompt`):

```python
refinements = {
    "silhouette": "Improve silhouette contrast and recognizability",
    "material": "Enhance material rendering",
    "narrative": "Strengthen storytelling",
    "performance": "Fix technical artifacts"
}

prompt = f"Refine [{base}]: " + " | ".join(refinements[g] for g in failed_gates)
```

## Key KiloCode Differences from Replit Agent

| Aspect | Replit Agent | KiloCode CLI |
|--------|-------------|--------------|
| **Control** | Chat-based, cloud-managed | Terminal, local-first |
| **Execution** | One-off runs | Persistent tmux sessions |
| **State** | Managed by Replit | User-managed (tmux) |
| **Validation** | Manual inspection | Automated vision model gates |
| **Feedback Loop** | Conversational | Iterative (max N retries) |
| **Invocation** | "Run this script" | `kilo-code exec "server --prompt X"` |

## Usage Examples

### Example 1: Single Character Sheet with Auto-Refinement

```bash
# Direct via orchestrator
python mcp-orchestrator.py \
  --server nano-banana \
  --prompt "Generate Musah v5 character sheet" \
  --validate output.png \
  --gates silhouette narrative material
```

**What happens:**
1. Sends prompt to nano-banana MCP server
2. Extracts `output.png` from server response
3. Queries llava: "Is silhouette clear? YES/NO"
4. If NO: Refines with "Improve silhouette contrast" and retries
5. Repeats until all gates pass or 3 iterations reached
6. Returns final approved image path

### Example 2: Full Production Pipeline

`tasks.json`:
```json
[
  {
    "id": "1",
    "tool": "nano-banana",
    "cmd": "generate_character_sheet",
    "target": "Musah",
    "gates": ["silhouette", "narrative"],
    "max_iterations": 3
  },
  {
    "id": "2",
    "tool": "superdesign",
    "cmd": "create_color_palette",
    "target": "Musah palette from sheet"
  }
]
```

Run:
```bash
python mcp-orchestrator.py --tasks tasks.json
```

**Flow:**
```
Task 1 [nano-banana]:
  → Generate Musah sheet
  → Validate silhouette+narrative
  → (refine ×2 until pass)
  → ✓ output/musah_final.png

Task 2 [superdesign]:
  → Generate palette from Musah sheet
  → (no gates, skip validation)
  → ✓ output/musah_palette.json
```

### Example 3: KiloCode-Style Atomic Commands

Add aliases to shell:
```bash
alias kexec='python3 /path/to/mcp-orchestrator.py --server'
alias ktasks='python3 /path/to/mcp-orchestrator.py --tasks'
alias kvalidate='python3 /path/to/mcp-orchestrator.py --validate'
```

Usage:
```bash
kexec nano-banana --prompt "Musah ID Sheet v01"
kvalidate output.png silhouette material
ktasks pipeline.json
```

### Example 4: Custom Python Script

```python
# production_pipeline.py
from mcp_orchestrator import MCPOrchestrator

orch = MCPOrchestrator()

# Step 1: Generate with gate validation
success, musah_img = orch.refinement_loop(
    "nano-banana",
    "Generate Musah character sheet production style",
    gates=["silhouette", "narrative"],
    max_iterations=3
)

if not success:
    print("ERROR: Character sheet failed validation")
    exit(1)

# Step 2: Generate palette (no gates needed)
palette = orch.run_task("superdesign", f"Create palette from {musah_img}")
print(f"Palette: {palette.stdout}")

# Step 3: Generate mesh with performance gate
mesh_ok, mesh_file = orch.refinement_loop(
    "blender-mcp",
    f"Create mesh for {musah_img}",
    gates=["performance"],
    max_iterations=2
)
```

Run:
```bash
python production_pipeline.py
```

## Vision Model Integration

The validation uses **ollama + llava** (local, free, offline):

```bash
# Install ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull vision model
ollama pull llava

# Test
ollama run llava "Describe this image: [path]"
```

**Why local vision model?**
- Privacy: Images never leave your machine
- Speed: No API latency, works offline
- Cost: Free (vs $0.01-0.10 per call with GPT-4V)
- Control: Customizable gate prompts

**Alternatives:**
- GPT-4V (via API) - replace `ollama_run()` with openai call
- Claude 3 Opus - higher quality, paid
- Local LLaVA variants - `llava:34b` for better accuracy

## tmux Session Management

MCP servers run in persistent tmux session `mcp-servers`:

```bash
# Start all servers
./scripts/start_mcp_servers.sh

# Monitor
tmux attach -t mcp-servers
#   Window 1: nano-banana  [listening on stdio]
#   Window 2: superdesign  [listening on stdio]
#   Window 3: blender-mcp  [listening on stdio]

# Detach: Ctrl+B, then D

# Check from another terminal
./scripts/status_mcp_servers.sh

# Stop all
./scripts/stop_mcp_servers.sh
```

**Why tmux?**
- MCP servers use stdio, not HTTP - must be running
- KiloCode/CLI connects to live servers
- No restart overhead between tasks
- Can monitor logs in real-time

## Customization Guide

### Add New Gate

Edit `mcp-orchestrator.py` lines 32-43:

```python
self.gates = {
    "silhouette": {...},
    "anatomy": {                              # NEW
        "description": "Human proportions",
        "prompt": "Are body proportions anatomically correct? YES/NO only"
    }
}
```

Use:
```bash
python mcp-orchestrator.py --validate output.png --gates anatomy
```

### Change Refinement Behavior

Edit `_build_refinement_prompt()` method:

```python
def _build_refinement_prompt(self, base_prompt, failed_gates):
    # Current: "Refine [X]: Improve Y"
    # Change to:
    return f"[GATE FAILURES: {', '.join(failed_gates)}] {base_prompt} - FIX THESE ISSUES"
```

### Adjust Iteration Limits

```bash
python mcp-orchestrator.py --tasks tasks.json  # uses default (3)

# Or in Python:
success, img = orch.refinement_loop(
    server="nano-banana",
    prompt="...",
    image="out.png",
    required_gates=["silhouette"],
    max_iterations=5  # more retries
)
```

### Switch Vision Model

Edit `mcp-orchestrator.py` line 20:

```python
self.vision_model = "llava:34b"  # larger, more accurate
# or
self.vision_model = "bakllava"   # faster
```

Available models:
```bash
ollama list  # see installed
ollama pull llava:34b
```

## Troubleshooting

### "Gate always fails even on good images"

**Fix:** Vision model prompt too strict. Make YES/NO question more lenient:

```python
"silhouette": {
    "prompt": "On a scale of 1-10, how clear is the silhouette? (7+ = good)"
    # Then parse number: passed = int(response) >= 7
}
```

### "Refinement doesn't improve output"

**Fix:** Refinement prompts too generic. Make them specific:

```python
"silhouette": "Darken silhouette edges, increase contrast by 30%, remove background noise"
```

### "Servers crash after 10 tasks"

**Fix:** Memory leak in MCP server - restart periodically:

```bash
# Add to scripts/start_mcp_servers.sh
# Restart each server every 50 tasks
```

### "Vision model too slow"

**Fix:** Use smaller model or batch gates:

```python
# Validate all gates in single query
combined_prompt = "Check: silhouette (clear?), material (good?), narrative (strong?)"
```

### "No tmux on system"

**Install or use screen:**
```bash
# screen alternative
screen -S mcp-servers
./start_servers.sh  # run inside screen
# Detach: Ctrl+A, D
# Reattach: screen -r mcp-servers
```

Or use systemd/nohup for persistent services.

## Production Checklist

Before running full pipeline:

- [ ] MCP servers start without errors: `./scripts/start_mcp_servers.sh`
- [ ] tmux session accessible: `tmux attach -t mcp-servers`
- [ ] MCP inspector test passes: `mcp-inspector --config ~/.config/mcp/mcp-config.json --server nano-banana`
- [ ] Vision model available: `ollama list | grep llava`
- [ ] Gate validation works: `python mcp-orchestrator.py --validate test.png silhouette`
- [ ] Task schema valid: `python -c "import json; json.load(open('tasks.json'))"`
- [ ] Output directories exist: `mkdir -p output/`
- [ ] Disk space adequate: `df -h .`

## Success Metrics

After running `tasks.json`:

```
✓ Task 1 (nano-banana): 2 refinements, silhouette passed in 3 iterations
✓ Task 2 (superdesign): 0 refinements, gates N/A
✓ Task 3 (blender-mcp): 1 refinement, performance passed
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total: 3/3 tasks approved, 3 refinements, 8min runtime
```

Failed tasks appear as:
```
✗ Task 1: Max iterations (3) reached, gates still failing
  Gates: silhouette ✗, narrative ✓
  Manual review required: output/musah_unfinished.png
```

## What's Different About This Approach

**Traditional (script-based):**
```
run_setup.sh → generate.sh → validate.py → refine.sh → done
```
- Manual chaining
- State in temp files
- Hard-coded flows

**KiloCode Orchestration (this repo):**
```
tasks.json → mcp-orchestrator.py → Vision Gates (llava) → Auto-Refine Loop
```
- Declarative tasks
- Built-in validation cycle
- Configurable gates
- Observable state
- Atomic CLI commands

This shifts you from "run scripts" to "declare tasks" to "validate gates" - true autonomous pipeline.

## Files Reference

| File | Purpose | Run |
|------|---------|-----|
| `mcp-orchestrator.py` | Main orchestration engine | `python mcp-orchestrator.py --tasks tasks.json` |
| `kilocli.py` | KiloCode wrapper | `python kilocli.py exec "nano-banana --prompt '...' "` |
| `demo_loop.py` | Validation demo | `python demo_loop.py` |
| `scripts/start_mcp_servers.sh` | Launch servers | `./scripts/start_mcp_servers.sh` |
| `scripts/stop_mcp_servers.sh` | Stop servers | `./scripts/stop_mcp_servers.sh` |
| `scripts/status_mcp_servers.sh` | Check status | `./scripts/status_mcp_servers.sh` |
| `scripts/verify_setup.sh` | Verify install | `./scripts/verify_setup.sh` |
| `tasks.json` | Task definitions | Edit for your pipeline |

## Next Steps

1. Copy files to local machine
2. Run `quickstart.sh` or follow `SETUP.md`
3. Start servers: `./scripts/start_mcp_servers.sh`
4. Test: `python mcp-orchestrator.py --server nano-banana --prompt "hello"`
5. Run full: `python mcp-orchestrator.py --tasks tasks.json`
6. Customize gates in `VALIDATION_LOOP.md`

Everything is now CLI-native, tmux-managed, vision-validated. Ready for autonomous character sheet production.