#!/usr/bin/env python3
"""
KiloCode/OpenCode Integration Wrapper
Provides Kilo-style atomic CLI commands for MCP orchestration
"""

import subprocess
import json
import sys
from pathlib import Path

class KiloCLI:
    """KiloCode-style CLI wrapper for MCP orchestration"""

    def __init__(self, orchestrator_path="mcp-orchestrator.py"):
        self.orchestrator = Path(orchestrator_path).absolute()

    def exec(self, server: str, prompt: str) -> str:
        """Execute a single command on an MCP server"""
        cmd = [sys.executable, str(self.orchestrator), "--server", server, "--prompt", prompt]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise RuntimeError(f"Execution failed: {result.stderr}")
        return result.stdout

    def run_tasks(self, tasks_file: str, dry_run: bool = False) -> None:
        """Execute task list"""
        cmd = [sys.executable, str(self.orchestrator), "--tasks", tasks_file]
        if dry_run:
            cmd.append("--dry-run")
        subprocess.run(cmd, check=True)

    def validate(self, image_path: str, gates: list = None) -> bool:
        """Validate output against quality gates"""
        gates = gates or ["silhouette", "material"]
        cmd = [sys.executable, str(self.orchestrator), "--validate", image_path, "--gates"] + gates
        result = subprocess.run(cmd, capture_output=True, text=True)
        return result.returncode == 0

    def refine(self, server: str, base_prompt: str, failed_gates: list) -> str:
        """Generate refinement command"""
        refinement_map = {
            "silhouette": "Improve silhouette contrast and recognizability",
            "material": "Enhance material rendering and texture quality",
            "narrative": "Strengthen the narrative and storytelling elements",
            "performance": "Fix technical artifacts and improve lighting"
        }
        refinements = [refinement_map[g] for g in failed_gates if g in refinement_map]
        refine_prompt = f"Refine [{base_prompt}]: {' | '.join(refinements)}"
        return self.exec(server, refine_prompt)

# Kilo-style command aliases for direct terminal use
def kilo_exec(server_prompt: str) -> str:
    """
    KiloCode-style execution: kilo-code exec "nano-banana --prompt 'Generate Musah ID Sheet'"
    Parses: server_name --prompt 'prompt_text'
    """
    parts = server_prompt.split("--prompt")
    if len(parts) != 2:
        raise ValueError("Format: server_name --prompt 'prompt text'")

    server = parts[0].strip()
    prompt = parts[1].strip().strip("'\"")
    cli = KiloCLI()
    return cli.exec(server, prompt)

def opencode_exec(command: str) -> str:
    """OpenCode-style execution with task schema"""
    cli = KiloCLI()
    if command.startswith("drawio-mcp --update"):
        # Special handling for drawio updates
        target = command.split("--update")[1].strip().strip("'\"")
        return cli.exec("drawio-mcp", f"update_bible: {target}")
    else:
        return cli.exec("generic-mcp", command)

if __name__ == "__main__":
    # Quick test
    cli = KiloCLI()
    print("KiloCode CLI Wrapper Ready")
    print("Usage examples:")
    print("  python kilocli.py exec \"nano-banana --prompt 'Generate character sheet'\"")
    print("  python kilocli.py run tasks.json")
    print("  python kilocli.py validate output.png silhouette material")