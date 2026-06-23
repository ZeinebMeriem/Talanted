"""Interactive Diagram Chat — iterate on Mermaid diagrams with Qwen AI.

Launches a CLI chat where the AI has the full report as context and helps
the user design a Mermaid diagram through conversation, rendering the
final result as a PNG with a white background.

Usage:
    python -m pipeline.diagram_chat --file pipeline_outputs/reports/report.md
    python -m pipeline.diagram_chat --text "# My Report\n- Login\n- Dashboard"
"""
from __future__ import annotations

import argparse
import os
import re
import sys
import time
import base64
import subprocess
import shutil
from datetime import datetime
from typing import Optional, List, Dict

import requests

from pipeline.pipeline_config import PipelineConfig
from pipeline.diagram_generator import sanitize_mermaid, validate_mermaid


# ── Constants ─────────────────────────────────────────────────────────────────

SYSTEM_PROMPT_TEMPLATE = """\
You are a software architecture diagram assistant. You help the user design \
and refine Mermaid diagrams based on a requirements analysis report.

You have already analysed the following report:

---
{report_content}
---

RULES:
1. When showing a diagram, ALWAYS wrap the Mermaid code in a ```mermaid code block.
2. After the code block, give a SHORT explanation of what the diagram shows.
3. When the user asks for modifications, produce the COMPLETE updated diagram \
   (do not show partial diffs).
4. Use clear, descriptive node labels — no single-character labels.
5. Use flowchart TD (top-down) by default unless the user asks otherwise.
6. Keep diagrams readable: avoid more than 15-20 nodes, use subgraphs for grouping.

Start by proposing an initial architecture diagram based on the report above.\
"""

WELCOME_MSG = """
╔══════════════════════════════════════════════════════════════════════════╗
║  🎨  Interactive Diagram Chat                                          ║
║                                                                        ║
║  Chat with Qwen AI to design your diagram. The AI has your full        ║
║  report as context.                                                    ║
║                                                                        ║
║  Commands:                                                             ║
║    /render  — Render the latest diagram to PNG (white background)      ║
║    /show    — Display the current Mermaid code                         ║
║    /save    — Alias for /render                                        ║
║    /quit    — Exit the chat                                            ║
╚══════════════════════════════════════════════════════════════════════════╝
"""


# ── Diagram Chat ──────────────────────────────────────────────────────────────


class DiagramChat:
    """Interactive multi-turn chat with Qwen for diagram design."""

    def __init__(self):
        PipelineConfig.ensure_dirs()
        self.base_url = PipelineConfig.OLLAMA_BASE_URL
        self.model = PipelineConfig.QWEN_MODEL
        self.temperature = 0.4  # Slightly creative for design work
        self.max_tokens = PipelineConfig.QWEN_MAX_TOKENS
        self.timeout = PipelineConfig.QWEN_TIMEOUT
        self.messages: List[Dict[str, str]] = []
        self.latest_mermaid: Optional[str] = None
        self._mmdc = shutil.which("mmdc")

        # Warm up the model
        self._warm_up()

    def _warm_up(self):
        """Send a tiny request so Ollama loads the model into memory."""
        try:
            requests.post(
                f"{self.base_url}/api/chat",
                json={
                    "model": self.model,
                    "messages": [{"role": "user", "content": "hi"}],
                    "stream": False,
                    "options": {"num_predict": 1},
                },
                timeout=30,
            )
        except Exception:
            pass  # Best-effort warm-up

    # ── Chat engine ───────────────────────────────────────────────────

    def _chat(self, user_message: str) -> str:
        """Send a message and get the AI response, maintaining history."""
        self.messages.append({"role": "user", "content": user_message})

        payload = {
            "model": self.model,
            "messages": self.messages,
            "stream": False,
            "options": {
                "temperature": self.temperature,
                "num_predict": self.max_tokens,
            },
        }

        t0 = time.time()
        try:
            resp = requests.post(
                f"{self.base_url}/api/chat",
                json=payload,
                timeout=self.timeout,
            )
            resp.raise_for_status()
        except requests.exceptions.ConnectionError:
            self.messages.pop()  # Remove failed user message
            return "❌ Cannot connect to Ollama. Is it running? (ollama serve)"
        except requests.exceptions.Timeout:
            self.messages.pop()
            return "❌ Qwen timed out. Try a shorter request or increase QWEN_TIMEOUT."
        except Exception as e:
            self.messages.pop()
            return f"❌ Error: {e}"

        data = resp.json()
        content = data.get("message", {}).get("content", "")
        elapsed = time.time() - t0
        tokens = data.get("eval_count", 0)

        # Save assistant response to history
        self.messages.append({"role": "assistant", "content": content})

        # Extract any mermaid code from the response
        mermaid_match = re.search(
            r"```mermaid\s*\n(.*?)```", content, re.DOTALL
        )
        if mermaid_match:
            self.latest_mermaid = mermaid_match.group(1).strip()

        print(f"\n   ⚡ ({elapsed:.1f}s, {tokens} tokens)")
        return content

    # ── Mermaid extraction & rendering ────────────────────────────────

    def _render_diagram(self) -> Optional[str]:
        """Render the latest mermaid code to a PNG with white background."""
        if not self.latest_mermaid:
            print("⚠️  No Mermaid code found yet. Ask the AI for a diagram first.")
            return None

        # Sanitize & validate
        code = sanitize_mermaid(self.latest_mermaid)
        is_valid, issues = validate_mermaid(code)
        if not is_valid:
            print(f"⚠️  Diagram validation warnings: {'; '.join(issues)}")
        else:
            print("✅ Diagram passed validation")

        # Save .mmd file
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        name = f"diagram_chat_{ts}"
        mmd_file = os.path.join(PipelineConfig.DIAGRAMS_DIR, f"{name}.mmd")
        img_file = os.path.join(PipelineConfig.DIAGRAMS_DIR, f"{name}.png")

        with open(mmd_file, "w") as f:
            f.write(code)
        print(f"💾 Mermaid source saved: {mmd_file}")

        # Try mmdc first (with white background)
        if self._mmdc:
            try:
                result = subprocess.run(
                    [self._mmdc, "-i", mmd_file, "-o", img_file, "-b", "white"],
                    capture_output=True,
                    text=True,
                    timeout=30,
                )
                if result.returncode == 0 and os.path.exists(img_file):
                    print(f"🖼️  Diagram rendered (mmdc): {img_file}")
                    return img_file
                else:
                    print(f"⚠️  mmdc failed: {result.stderr[:200]}")
            except Exception as e:
                print(f"⚠️  mmdc error: {e}")

        # Fallback: mermaid.ink API
        try:
            encoded = base64.urlsafe_b64encode(code.encode()).decode()
            url = f"https://mermaid.ink/img/{encoded}?bgColor=white"
            resp = requests.get(url, timeout=15)
            if resp.status_code == 200:
                with open(img_file, "wb") as f:
                    f.write(resp.content)
                print(f"🖼️  Diagram rendered (mermaid.ink): {img_file}")
                return img_file
            else:
                print(f"⚠️  mermaid.ink returned {resp.status_code}")
        except Exception as e:
            print(f"⚠️  mermaid.ink error: {e}")

        print("📝 Only .mmd source saved (rendering unavailable)")
        return None

    # ── Main loop ─────────────────────────────────────────────────────

    def start(self, report_content: str):
        """Launch the interactive chat loop.

        Args:
            report_content: The markdown report text to use as context.
        """
        # Build system prompt with report context
        system_prompt = SYSTEM_PROMPT_TEMPLATE.format(
            report_content=report_content
        )
        self.messages = [{"role": "system", "content": system_prompt}]

        print(WELCOME_MSG)
        print("🤖 Generating initial diagram from your report...\n")

        # Get initial diagram suggestion
        initial = self._chat(
            "Based on the report above, propose an architecture diagram. "
            "Show the Mermaid code and explain it briefly."
        )
        print(f"\n🤖 AI:\n{initial}")

        # Interactive loop
        while True:
            try:
                user_input = input("\n📝 You: ").strip()
            except (EOFError, KeyboardInterrupt):
                print("\n👋 Exiting diagram chat.")
                break

            if not user_input:
                continue

            # Handle commands
            cmd = user_input.lower()

            if cmd in ("/quit", "/exit", "/q"):
                # Final render before quitting if there's a diagram
                if self.latest_mermaid:
                    print("\n📦 Rendering final diagram before exit...")
                    self._render_diagram()
                print("👋 Exiting diagram chat.")
                break

            elif cmd in ("/render", "/save"):
                self._render_diagram()
                continue

            elif cmd == "/show":
                if self.latest_mermaid:
                    print(f"\n📊 Current Mermaid code:\n```mermaid\n{self.latest_mermaid}\n```")
                else:
                    print("⚠️  No Mermaid code generated yet.")
                continue

            # Regular message → send to AI
            response = self._chat(user_input)
            print(f"\n🤖 AI:\n{response}")


# ── CLI entry point ───────────────────────────────────────────────────────────


def main():
    parser = argparse.ArgumentParser(
        description="Interactive diagram chat with Qwen AI",
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument(
        "--file", "-f",
        help="Path to a markdown report file",
    )
    group.add_argument(
        "--text", "-t",
        help="Inline markdown report text",
    )
    args = parser.parse_args()

    if args.file:
        if not os.path.exists(args.file):
            print(f"❌ File not found: {args.file}")
            sys.exit(1)
        with open(args.file, "r", encoding="utf-8") as f:
            report_content = f.read()
        print(f"📄 Loaded report: {args.file} ({len(report_content)} chars)")
    else:
        report_content = args.text

    chat = DiagramChat()
    chat.start(report_content)


if __name__ == "__main__":
    main()
