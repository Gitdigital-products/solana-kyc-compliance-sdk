#!/usr/bin/env python3
"""
GitDigital Solana KYC Compliance Demo — Terminal Backend
Serves the static demo + a safe API for Makefile commands.
Uses only the Python standard library.
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import threading
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import parse_qs, urlparse

HOST = "0.0.0.0"
PORT = 8765
ROOT = Path(__file__).resolve().parent
MAKEFILE = ROOT / "Makefile"

# Only these make targets are allowed (whitelist)
ALLOWED_TARGETS = {
    "help",
    "status",
    "build",
    "anchor-build",
    "sdk-build",
    "test",
    "lint",
    "check",
    "registry",
    "verify",
    "deploy",
    "clean",
}

# Simple rate limit: one running command at a time
_lock = threading.Lock()
_running = False


def run_make(target: str) -> dict:
    """Run a whitelisted make target and return stdout/stderr."""
    global _running

    target = target.strip().lower()
    if target not in ALLOWED_TARGETS:
        return {
            "ok": False,
            "exit_code": 1,
            "stdout": "",
            "stderr": f"error: target '{target}' is not allowed.\nAllowed: {', '.join(sorted(ALLOWED_TARGETS))}\n",
        }

    if not MAKEFILE.exists():
        return {
            "ok": False,
            "exit_code": 1,
            "stdout": "",
            "stderr": "error: Makefile not found\n",
        }

    with _lock:
        if _running:
            return {
                "ok": False,
                "exit_code": 1,
                "stdout": "",
                "stderr": "error: another command is already running\n",
            }
        _running = True

    try:
        proc = subprocess.run(
            ["make", "-f", str(MAKEFILE), target],
            cwd=str(ROOT),
            capture_output=True,
            text=True,
            timeout=30,
            env={**os.environ, "TERM": "dumb"},
        )
        return {
            "ok": proc.returncode == 0,
            "exit_code": proc.returncode,
            "stdout": proc.stdout,
            "stderr": proc.stderr,
        }
    except subprocess.TimeoutExpired:
        return {
            "ok": False,
            "exit_code": 124,
            "stdout": "",
            "stderr": "error: command timed out (30s)\n",
        }
    except FileNotFoundError:
        return {
            "ok": False,
            "exit_code": 127,
            "stdout": "",
            "stderr": "error: 'make' not found on this system\n",
        }
    except Exception as exc:
        return {
            "ok": False,
            "exit_code": 1,
            "stdout": "",
            "stderr": f"error: {exc}\n",
        }
    finally:
        with _lock:
            _running = False


def machine_info() -> dict:
    """Return basic machine / environment info for the terminal."""
    import platform
    import socket

    return {
        "hostname": socket.gethostname(),
        "platform": platform.system(),
        "release": platform.release(),
        "python": platform.python_version(),
        "cwd": str(ROOT),
        "makefile": MAKEFILE.exists(),
        "allowed_targets": sorted(ALLOWED_TARGETS),
    }


class DemoHandler(SimpleHTTPRequestHandler):
    """Serve static files + /api/* JSON endpoints."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, fmt: str, *args) -> None:
        # Quieter logs
        print(f"[demo] {self.address_string()} — {fmt % args}")

    def _json(self, code: int, payload: dict) -> None:
        body = json.dumps(payload, indent=2).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/") or "/"

        if path == "/api/health":
            self._json(200, {"ok": True, "service": "gitdigital-kyc-demo"})
            return

        if path == "/api/info":
            self._json(200, machine_info())
            return

        if path == "/api/targets":
            self._json(200, {"targets": sorted(ALLOWED_TARGETS)})
            return

        # Static files
        super().do_GET()

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/") or "/"

        length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(length) if length else b"{}"
        try:
            data = json.loads(raw.decode("utf-8") or "{}")
        except json.JSONDecodeError:
            self._json(400, {"ok": False, "error": "invalid JSON"})
            return

        if path == "/api/run":
            # Accept: { "command": "make status" } or { "target": "status" }
            cmd = (data.get("command") or "").strip()
            target = (data.get("target") or "").strip()

            if cmd:
                # Parse "make <target>" or just "<target>"
                m = re.match(r"^(?:make\s+)?([a-z0-9_-]+)\s*$", cmd, re.I)
                if not m:
                    self._json(
                        400,
                        {
                            "ok": False,
                            "stderr": "usage: make <target>   or just <target>\n",
                            "stdout": "",
                            "exit_code": 1,
                        },
                    )
                    return
                target = m.group(1).lower()

            if not target:
                self._json(
                    400,
                    {
                        "ok": False,
                        "stderr": "error: no target specified\n",
                        "stdout": "",
                        "exit_code": 1,
                    },
                )
                return

            result = run_make(target)
            self._json(200 if result["ok"] else 200, result)
            return

        if path == "/api/echo":
            # Free-form "talk to the machine" — safe echo + info
            msg = (data.get("message") or data.get("text") or "").strip()
            info = machine_info()
            reply = (
                f"Machine received: {msg!r}\n"
                f"Host: {info['hostname']} · {info['platform']} {info['release']}\n"
                f"Python {info['python']} · cwd {info['cwd']}\n"
                f"Type 'make help' or a target name to run Makefile commands.\n"
            )
            self._json(200, {"ok": True, "stdout": reply, "stderr": "", "exit_code": 0})
            return

        self._json(404, {"ok": False, "error": "not found"})


def main() -> None:
    os.chdir(ROOT)
    server = HTTPServer((HOST, PORT), DemoHandler)
    print(f"GitDigital KYC Demo server")
    print(f"  → http://127.0.0.1:{PORT}/")
    print(f"  → API: /api/run  /api/info  /api/targets  /api/health")
    print(f"  → Makefile: {MAKEFILE}")
    print("  Ctrl+C to stop")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
        server.server_close()


if __name__ == "__main__":
    main()
