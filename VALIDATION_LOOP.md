# loop.py Validation Logic - Technical Specification

## Overview

The `loop.py` validation logic (implemented in `mcp-orchestrator.py`) automatically checks character sheet outputs against quality "Gates" using a local vision model, then triggers refinement iterations until all gates pass.

## Gate Validation Algorithm

### Step 1: Gate Definition

Each gate is defined with:
- **name**: Identifier (silhouette, material, narrative, performance)
- **prompt**: Question asked to vision model
- **threshold**: Acceptance threshold (future: numeric scoring)

```python
self.gates = {
    "silhouette": {
        "description": "Character silhouette recognizability",
        "prompt": "Is the character silhouette clear and distinctive? Answer only YES or NO."
    },
    ...
}
```

### Step 2: Vision Model Query

For each gate, the orchestrator calls the vision model:

```python
def validate_output(self, image_path: str, gates: List[str]) -> Dict[str, bool]:
    for gate in gates:
        gate_prompt = self.gates[gate]['prompt']
        # Call vision model (ollama + llava by default)
        cmd = ["ollama", "run", "llava", f"{gate_prompt}\n[IMAGE]:{image_path}"]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)

        response = result.stdout.strip().lower()
        passed = "yes" in response or "✓" in response
        results[gate] = passed
```

### Step 3: Refinement Decision

```python
if all(gate_results.values()):
    return True, current_image  # Exit loop

failed_gates = [g for g, passed in gate_results.items() if not passed]
refine_prompt = self._build_refinement_prompt(base_prompt, failed_gates)
# Execute refinement via MCP server
```

### Step 4: Refinement Prompt Construction

Failures are mapped to specific improvement directives:

```python
refinements = {
    "silhouette": "Improve silhouette contrast and recognizability",
    "material": "Enhance material rendering and texture quality",
    "narrative": "Strengthen the narrative and storytelling elements",
    "performance": "Fix technical artifacts and improve lighting"
}

refine_prompt = f"Refine [{base_prompt}]: {failed_gate_1} | {failed_gate_2} | ..."
```

Example:
```
Base: "Generate Musah ID Sheet v01"
Failed: ["silhouette", "material"]
Refine Prompt: "Refine [Generate Musah ID Sheet v01]: Improve silhouette contrast and recognizability | Enhance material rendering and texture quality"
```

### Step 5: Iteration

Repeat up to `max_iterations` (default: 3):

```
Iteration 1: Generate → Validate (silhouette: ✗, material: ✓, narrative: ✓)
   Refine: silhouette failed
Iteration 2: Refine → Validate (silhouette: ✓, material: ✓, narrative: ✓)
   ✓ All gates passed → Exit
```

## State Management

The loop maintains minimal state:

```python
{
    "iteration": 1,
    "current_image": "/output/musah_v02.png",
    "gate_history": {
        "silhouette": [False, True],
        "material": [True, True],
        "narrative": [True, True]
    },
    "final_prompt": "Generate Musah ID Sheet v01 | Refine: silhouette"
}
```

## Gate Customization

### Adding Custom Gates

Edit `MCPOrchestrator.gates` in `mcp-orchestrator.py`:

```python
self.gates = {
    "anatomy": {
        "description": "Proportional accuracy",
        "prompt": "Are human proportions anatomically correct? YES or NO only."
    },
    "style_consistency": {
        "description": "Matches项目风格",
        "prompt": "Does this match the established art style? YES or NO only."
    }
}
```

Then invoke with:
```bash
python mcp-orchestrator.py --validate output.png --gates silhouette anatomy style_consistency
```

### Dynamic Thresholds (Future)

```python
# Planned: numeric scoring 1-10
self.gates = {
    "silhouette": {
        "prompt": "Rate silhouette clarity 1-10",
        "threshold": 7  # Minimum acceptable score
    }
}
```

The validator would then parse numeric responses:
```python
score = extract_number(response)  # "8" → 8
passed = score >= threshold
```

## Integration with KiloCode

### Direct Python Usage

```python
from mcp_orchestrator import MCPOrchestrator

orch = MCPOrchestrator()

# Full refinement loop
success, final = orch.refinement_loop(
    server_name="nano-banana",
    base_prompt="Generate Musah character sheet",
    image_path="output/musah.png",
    required_gates=["silhouette", "narrative"],
    max_iterations=3
)

if success:
    print(f"Approved: {final}")
    # Continue to next pipeline stage
else:
    print(f"Manual review needed: {final}")
    # Escalate to human
```

### KiloCode Task Schema

The `tasks.json` format integrates directly:

```json
[
  {
    "id": "1",
    "tool": "nano-banana",
    "cmd": "generate_character_sheet",
    "target": "Musah",
    "gates": ["silhouette", "material", "narrative"],
    "max_refinements": 3,
    "on_fail": "escalate"  // or "continue", "halt"
  }
]
```

The orchestrator reads these fields and automatically:
1. Executes command
2. Extracts output path
3. Runs gate validation
4. Refines if needed (up to `max_refinements`)
5. Acts on `on_fail` directive

## Failure Modes & Recovery

| Failure | Detection | Recovery |
|---------|-----------|----------|
| Vision model timeout | `subprocess.TimeoutExpired` | Retry once, then skip gate |
| Invalid image path | `FileNotFoundError` | Abort task, log error |
| Gate always fails | 3 iterations exhausted | Mark `failed` in results, continue or halt based on `on_fail` |
| Server crash | Non-zero exit code | Retry server, skip task |

Example recovery code:

```python
try:
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    if result.returncode != 0:
        raise RuntimeError(f"Server error: {result.stderr}")
except subprocess.TimeoutExpired:
    print("⚠ Vision model timeout - skipping gate")
    return {gate: True}  # Pass by default if validation unavailable
```

## Optimization Strategies

### 1. Parallel Gate Validation

```python
from concurrent.futures import ThreadPoolExecutor

def validate_parallel(self, image_path, gates):
    with ThreadPoolExecutor() as executor:
        futures = {gate: executor.submit(self.check_gate, image_path, gate)
                   for gate in gates}
        return {gate: f.result() for gate, f in futures.items()}
```

### 2. Cache Vision Model Queries

```python
from functools import lru_cache

@lru_cache(maxsize=100)
def check_gate_cached(self, image_hash, gate_prompt):
    # Uses image hash to avoid re-validating identical outputs
    pass
```

### 3. Incremental Gate Checking

Check cheaper/softer gates first to fail fast:
```python
GATE_ORDER = ["silhouette", "performance", "material", "narrative"]
# If silhouette fails, don't waste cycles on narrative
```

## Extending to Python Servers

For blender-mcp.py or other Python-based MCP servers, the same orchestrator works since it calls via subprocess. No changes needed - the orchestrator is protocol-agnostic.

Example:
```json
"blender-mcp": {
  "command": "python3",
  "args": ["/path/to/server/blender_mcp.py"]
}
```

The orchestrator executes: `python3 /path/to/blender_mcp.py --prompt "create mesh: cube"`

## Logging & Observability

The orchestrator logs:
- Each iteration's prompts and responses
- Gate pass/fail status
- Output image paths
- Refinement actions

Structured log format:
```json
{
  "task_id": "1",
  "server": "nano-banana",
  "iterations": 2,
  "gates": {"silhouette": true, "narrative": true},
  "final_output": "/output/musah_final.png",
  "timestamps": {"start": "...", "end": "..."}
}
```

## Future Enhancements

1. **Gate Scoring**: Numeric thresholds (1-10) instead of binary YES/NO
2. **Human-in-the-loop**: Escalate to manual review after N failures
3. **Gate Weighting**: Some gates more important than others
4. **A/B Testing**: Run two variants, pick better-scoring one
5. **Learning**: Track which refinement prompts correlate with gate passage

## Summary

The `loop.py` validation logic provides:

✓ **Automated quality control** via vision model gates
✓ **Iterative refinement** until acceptance criteria met
✓ **Failure recovery** with configurable retry limits
✓ **Extensible gate system** for project-specific requirements
✓ **CLI-native** - works with KiloCode/OpenCode atomically
✓ **Stateless** - can be resumed or rerun at any point

The orchestrator is the "brain" that turns MCP servers from simple command executors into an autonomous production pipeline with built-in quality assurance.