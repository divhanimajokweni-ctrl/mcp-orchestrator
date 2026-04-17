#!/usr/bin/env python3
"""
MCP Orchestrator - CLI-based autonomous MCP server orchestration
Provides Plan, Execute, Validate loop for KiloCode/OpenCode workflows
"""

import subprocess
import json
import sys
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import argparse

class MCPOrchestrator:
    """Master control for MCP server orchestration in CLI environments"""

    def __init__(self, config_path: str = None):
        # Try multiple config locations in order:
        # 1. Explicitly provided path
        # 2. ~/.config/mcp/mcp-config.json (standard location)
        # 3. <script_dir>/mcp-config.json (script-relative)
        # 4. <script_dir>/.config/mcp-config.json (script-relative config subdir)
        # 5. ./mcp-config.json (cwd-relative, legacy)
        # 6. ./config/mcp-config.json (cwd-relative subdir, legacy)

        if config_path:
            self.config_path = Path(config_path).expanduser()
        else:
            script_dir = Path(__file__).resolve().parent
            candidates = [
                Path("~/.config/mcp/mcp-config.json").expanduser(),
                script_dir / "mcp-config.json",
                script_dir / ".config" / "mcp-config.json",
                Path("./mcp-config.json"),
                Path("./config/mcp-config.json"),
            ]
            for candidate in candidates:
                if candidate.exists():
                    self.config_path = candidate
                    break
            else:
                # No config found - show helpful error
                print("ERROR: MCP config file not found.", file=sys.stderr)
                print("", file=sys.stderr)
                print("Searched in:", file=sys.stderr)
                for c in candidates:
                    print(f"  - {c}", file=sys.stderr)
                print("", file=sys.stderr)
                print("Create a config file at ~/.config/mcp/mcp-config.json:", file=sys.stderr)
                print('  {"mcpServers": {"your-server": {"command": "node", "args": ["path/to/server.js"]}}}', file=sys.stderr)
                sys.exit(1)

        with open(self.config_path) as f:
            self.servers = json.load(f)['mcpServers']
        self.vision_model = "llava"  # Local vision model for gate validation
        self.gates = {
            "silhouette": {
                "description": "Character silhouette recognizability",
                "prompt": "Is the character silhouette clear and distinctive? Answer only YES or NO."
            },
            "material": {
                "description": "Material quality and texture",
                "prompt": "Are materials properly rendered with correct properties? Answer only YES or NO."
            },
            "narrative": {
                "description": "Story/character narrative conveyed",
                "prompt": "Does the image convey a clear narrative or story? Answer only YES or NO."
            },
            "performance": {
                "description": "Technical execution quality",
                "prompt": "Is the technical execution high quality (no artifacts, proper lighting)? Answer only YES or NO."
            }
        }

    def run_task(self, server_name: str, prompt: str, args: List[str] = None) -> subprocess.CompletedProcess:
        """Execute an MCP server task via CLI"""
        if server_name not in self.servers:
            raise ValueError(f"Unknown server: {server_name}")

        server = self.servers[server_name]
        cmd = server['command']
        base_args = server.get('args', [])
        if args:
            base_args.extend(args)

        full_command = [cmd] + base_args + ["--prompt", prompt]

        try:
            result = subprocess.run(full_command, capture_output=True, text=True, timeout=60)
            if result.returncode != 0:
                print(f"Server '{server_name}' exited with error:", file=sys.stderr)
                print(f"  Command: {' '.join(full_command)}", file=sys.stderr)
                print(f"  stderr: {result.stderr[:500]}", file=sys.stderr)
                print(f"  stdout: {result.stdout[:500]}", file=sys.stderr)
                print("\nTIP: Ensure the MCP server is running. Start with:", file=sys.stderr)
                print(f"  tmux send-keys -t mcp-servers 'Enter'  # if in tmux session", file=sys.stderr)
                print(f"  Or: ./scripts/start_mcp_servers.sh", file=sys.stderr)
            return result
        except FileNotFoundError as e:
            print(f"ERROR: Command not found: {cmd}", file=sys.stderr)
            print(f"  Full command: {' '.join(full_command)}", file=sys.stderr)
            print(f"  Install {cmd} or check your PATH", file=sys.stderr)
            raise
        except subprocess.TimeoutExpired:
            print(f"ERROR: Server '{server_name}' timed out after 60s", file=sys.stderr)
            print("  The server may be hung or not responding.", file=sys.stderr)
            print("  Try: Restart the server in tmux session", file=sys.stderr)
            raise

    def validate_output(self, image_path: str, gates: List[str]) -> Dict[str, bool]:
        """
        Validate character sheet output against quality gates using vision model
        Returns dict of gate_name -> passed (bool)
        """
        results = {}
        for gate in gates:
            if gate not in self.gates:
                print(f"Warning: Unknown gate '{gate}'", file=sys.stderr)
                continue

            gate_prompt = self.gates[gate]['prompt']
            cmd = ["ollama", "run", self.vision_model, f"{gate_prompt}\n[IMAGE]:{image_path}"]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)

            response = result.stdout.strip().lower()
            passed = "yes" in response or "✓" in response
            results[gate] = passed

            print(f"  {gate}: {'✓ PASS' if passed else '✗ FAIL'} - {response}")

        return results

    def refinement_loop(self, server_name: str, base_prompt: str, image_path: str,
                       required_gates: List[str], max_iterations: int = 3) -> Tuple[bool, str]:
        """
        Execute refinement loop until all gates pass or max iterations reached
        Returns (success, final_image_path)
        """
        print(f"\n{'='*60}")
        print(f"Starting refinement loop for {server_name}")
        print(f"Required gates: {', '.join(required_gates)}")
        print(f"{'='*60}\n")

        iteration = 0
        current_image = image_path

        while iteration < max_iterations:
            iteration += 1
            print(f"\n--- Iteration {iteration}/{max_iterations} ---")

            # Validate current output
            print("Validating gates...")
            gate_results = self.validate_output(current_image, required_gates)

            passed = all(gate_results.values())
            if passed:
                print(f"\n✓ All gates passed after {iteration} iteration(s)")
                return True, current_image

            # Identify failed gates
            failed_gates = [g for g, passed in gate_results.items() if not passed]
            print(f"\n✗ Gates failed: {', '.join(failed_gates)}")

            # Generate refinement prompt
            refine_prompt = self._build_refinement_prompt(base_prompt, failed_gates)
            print(f"Refinement prompt: {refine_prompt}")

            # Execute refinement
            result = self.run_task(server_name, refine_prompt)
            if result.returncode != 0:
                print(f"Error: {result.stderr}", file=sys.stderr)
                break

            # Extract new image path from output (assumes output contains path)
            current_image = self._extract_output_path(result.stdout)
            print(f"New output: {current_image}")

            time.sleep(1)  # Brief pause between iterations

        print(f"\n⚠ Max iterations reached. Final gate status:")
        final_results = self.validate_output(current_image, required_gates)
        return all(final_results.values()), current_image

    def _build_refinement_prompt(self, base_prompt: str, failed_gates: List[str]) -> str:
        """Construct refinement prompt based on failed gates"""
        refinements = {
            "silhouette": "Improve silhouette contrast and recognizability",
            "material": "Enhance material rendering and texture quality",
            "narrative": "Strengthen the narrative and storytelling elements",
            "performance": "Fix technical artifacts and improve lighting"
        }

        refine_text = " | ".join([refinements[g] for g in failed_gates if g in refinements])
        return f"Refine [{base_prompt}]: {refine_text}"

    def _extract_output_path(self, output: str) -> str:
        """Extract file path from server output (default heuristic)"""
        # Look for common path patterns
        import re
        patterns = [
            r'saved to:?\s*(\S+\.(?:png|jpg|jpeg|webp))',
            r'output:?\s*(\S+\.(?:png|jpg|jpeg|webp))',
            r'file:?\s*(\S+\.(?:png|jpg|jpeg|webp))',
            r'(\S+\.(?:png|jpg|jpeg|webp))'
        ]
        for pattern in patterns:
            match = re.search(pattern, output, re.IGNORECASE)
            if match:
                return match.group(1)
        return output.strip().split('\n')[-1]  # Fallback: last line

    def execute_tasks(self, tasks_file: str, dry_run: bool = False) -> None:
        """
        Execute tasks from a JSON task file (Plan, Execute, Validate loop)
        """
        with open(tasks_file) as f:
            tasks = json.load(f)

        print(f"\n{'='*60}")
        print(f"Executing {len(tasks)} tasks from {tasks_file}")
        print(f"{'='*60}\n")

        for task in tasks:
            task_id = task.get('id', '?')
            tool = task['tool']
            cmd = task['cmd']
            target = task.get('target', '')
            gates = task.get('gates', [])

            print(f"\n[Task {task_id}] {tool}.{cmd} -> {target}")

            if dry_run:
                print(f"  [DRY RUN] Would execute: {tool} {cmd} {target}")
                continue

            # Execute task
            prompt = f"{cmd}: {target}"
            result = self.run_task(tool, prompt)

            if result.returncode != 0:
                print(f"  ✗ Task failed: {result.stderr}", file=sys.stderr)
                continue

            output = result.stdout
            print(f"  ✓ Task completed")

            # Extract output path if available
            output_path = self._extract_output_path(output)

            # Run validation if gates specified
            if gates:
                print(f"  Validating gates: {', '.join(gates)}")
                success, final_output = self.refinement_loop(
                    tool, prompt, output_path, gates, max_iterations=2
                )
                if success:
                    print(f"  ✓ Validation complete: {final_output}")
                else:
                    print(f"  ⚠ Validation incomplete: {final_output}")

def main():
    parser = argparse.ArgumentParser(description="MCP Orchestrator for CLI-based agentic workflows")
    parser.add_argument("--config", default=None,
                       help="Path to MCP config file")
    parser.add_argument("--tasks", help="Path to tasks.json file")
    parser.add_argument("--server", help="Single server to execute")
    parser.add_argument("--prompt", help="Prompt to send to server")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be executed")
    parser.add_argument("--validate", help="Validate output against gates (provide image path)")
    parser.add_argument("--gates", nargs="+", default=["silhouette", "material"],
                       help="Gates to validate against")

    args = parser.parse_args()

    orchestrator = MCPOrchestrator(args.config)

    if args.validate:
        # Direct validation mode
        results = orchestrator.validate_output(args.validate, args.gates)
        print(json.dumps(results, indent=2))
        sys.exit(0 if all(results.values()) else 1)

    elif args.server and args.prompt:
        # Single task execution
        result = orchestrator.run_task(args.server, args.prompt)
        print(result.stdout)
        if result.stderr:
            print(result.stderr, file=sys.stderr)
        sys.exit(result.returncode)

    elif args.tasks:
        # Full task execution
        orchestrator.execute_tasks(args.tasks, dry_run=args.dry_run)

    else:
        parser.print_help()

if __name__ == "__main__":
    main()