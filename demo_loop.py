#!/usr/bin/env python3
"""
Production Loop Demonstration
Shows Plan → Execute → Validate cycle with mock output
"""

from mcp_orchestrator import MCPOrchestrator
import tempfile
import os

def demo_production_loop():
    """Demonstrates the complete validation loop"""
    print("="*60)
    print("MCP PRODUCTION LOOP DEMO")
    print("="*60)

    # Initialize orchestrator
    orch = MCPOrchestrator()
    print("✓ Orchestrator initialized\n")

    # Simulated character sheet generation (first attempt)
    print("--- ITERATION 1: Initial Generation ---")
    prompt = "Generate Musah character sheet - production dossier style"
    print(f"Prompt: {prompt}")

    # Simulate server output (in real use, this would call the actual server)
    with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as f:
        output_path = f.name

    # Create a mock image file for demo (empty file - just for path demo)
    with open(output_path, 'w') as f:
        f.write("mock")

    print(f"Output: {output_path}")

    # Validate against gates (vision model required)
    print("\n--- VALIDATION ---")
    print("Checking gates: silhouette, narrative, material")

    try:
        results = orch.validate_output(output_path, ["silhouette", "narrative", "material"])
        print(f"\nGate Results: {json.dumps(results, indent=2)}")

        if not all(results.values()):
            print("\n✗ Some gates failed → Entering refinement loop")
            failed = [g for g, passed in results.items() if not passed]
            print(f"Failed gates: {', '.join(failed)}")
            print("\n--- REFINEMENT ---")
            # In production, this calls the MCP server with refined prompt
            print(f"Would send refinement prompt to nano-banana:")
            print(f"  {orch._build_refinement_prompt(prompt, failed)}")
        else:
            print("\n✓ All gates passed → Move to next task")

    except FileNotFoundError as e:
        print(f"\n⚠ Vision model not available: {e}")
        print("Install ollama + llava to enable gate validation:")
        print("  ollama pull llava")
        print("\nIn production, this would be:")
        print("  1. Run mcp-orchestrator.py --validate output.png --gates silhouette narrative")
        print("  2. Auto-refine until gates pass")

    finally:
        os.unlink(output_path)

    print("\n" + "="*60)
    print("NEXT STEPS IN PRODUCTION:")
    print("="*60)
    print("1. Start MCP servers in tmux:")
    print("   ./scripts/start_mcp_servers.sh")
    print()
    print("2. Run full task list:")
    print("   python mcp-orchestrator.py --tasks tasks.json")
    print()
    print("3. Monitor with:")
    print("   tmux attach -t mcp-servers")
    print()
    print("4. Refine specific gates:")
    print("   python kilocli.py refine nano-banana 'Musah v01' silhouette material")

if __name__ == "__main__":
    import json
    demo_production_loop()