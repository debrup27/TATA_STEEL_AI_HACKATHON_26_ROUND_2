#!/usr/bin/env python3
"""
Standalone Ollama launcher + smoke test for Qwen3.5-9B.

Model: qwen3.5:9b (6.6 GB Q4_K_M — pulled automatically on first run)
API:   OpenAI-compatible at http://127.0.0.1:11434/v1

Examples:
  python ollama_qwen.py serve --wait        # start container + pull model
  python ollama_qwen.py test                # smoke test (model must be running)
  python ollama_qwen.py stop                # remove container
  python ollama_qwen.py logs                # tail logs
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request

CONTAINER_NAME = os.environ.get("OLLAMA_CONTAINER", "atal-ollama-standalone")
HOST_PORT = int(os.environ.get("OLLAMA_HOST_PORT", "11434"))
CONTAINER_PORT = 11434
MODEL = os.environ.get("OLLAMA_MODEL", "qwen3.5:9b")
OLLAMA_IMAGE = os.environ.get("OLLAMA_IMAGE", "ollama/ollama:latest")


# ---------------------------------------------------------------------------
# Docker helpers
# ---------------------------------------------------------------------------

def _docker(*args: str, check: bool = True) -> subprocess.CompletedProcess:
    return subprocess.run(["docker", *args], check=check, text=True, capture_output=not check)


def _container_running() -> bool:
    proc = _docker("inspect", "-f", "{{.State.Running}}", CONTAINER_NAME, check=False)
    return proc.stdout.strip() == "true"


# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------

def cmd_stop(_: argparse.Namespace) -> int:
    _docker("rm", "-f", CONTAINER_NAME, check=False)
    print(f"Stopped {CONTAINER_NAME}")
    return 0


def cmd_serve(args: argparse.Namespace) -> int:
    image = args.image or OLLAMA_IMAGE
    print(f"Pulling {image} ...")
    _docker("pull", image)

    _docker("rm", "-f", CONTAINER_NAME, check=False)
    print(f"Starting {CONTAINER_NAME} on port {HOST_PORT}...")

    run_argv = [
        "run",
        "-d",
        "--name", CONTAINER_NAME,
        "--gpus", "all",
        "-p", f"{HOST_PORT}:{CONTAINER_PORT}",
        "-v", "atal_ollama_data:/root/.ollama",
        image,
    ]

    proc = _docker(*run_argv, check=False)
    if proc.returncode != 0:
        print(proc.stderr or proc.stdout, file=sys.stderr)
        return proc.returncode
    print(proc.stdout.strip())

    # Wait for Ollama API to be ready, then pull the model
    print(f"Waiting for Ollama API on port {HOST_PORT}...")
    if _wait_api(60) != 0:
        return 1

    print(f"Pulling model {MODEL} (this may take a few minutes)...")
    pull_proc = subprocess.run(
        ["docker", "exec", CONTAINER_NAME, "ollama", "pull", MODEL],
        text=True,
    )
    if pull_proc.returncode != 0:
        print(f"Model pull failed (exit {pull_proc.returncode})", file=sys.stderr)
        return pull_proc.returncode
    print(f"Model {MODEL} ready.")

    if args.wait:
        # Verify model is listed
        return _verify_model(args.timeout)
    return 0


def _wait_api(timeout: int) -> int:
    url = f"http://127.0.0.1:{HOST_PORT}/api/tags"
    deadline = time.time() + timeout
    while time.time() < deadline:
        if not _container_running():
            print("Container exited unexpectedly.", file=sys.stderr)
            _docker("logs", "--tail", "30", CONTAINER_NAME, check=False)
            return 1
        try:
            with urllib.request.urlopen(url, timeout=5) as resp:
                if resp.status == 200:
                    return 0
        except (urllib.error.URLError, ConnectionResetError, TimeoutError):
            pass
        time.sleep(3)
    print(f"Timed out waiting for Ollama API ({timeout}s).", file=sys.stderr)
    return 1


def _verify_model(timeout: int) -> int:
    url = f"http://127.0.0.1:{HOST_PORT}/api/tags"
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=5) as resp:
                data = json.loads(resp.read().decode())
            names = [m["name"] for m in data.get("models", [])]
            if any(MODEL in n or n.startswith(MODEL.split(":")[0]) for n in names):
                print(f"Model verified: {names}")
                return 0
        except (urllib.error.URLError, KeyError):
            pass
        time.sleep(5)
    print(f"Timed out verifying model {MODEL}.", file=sys.stderr)
    return 1


def cmd_test(args: argparse.Namespace) -> int:
    base = f"http://127.0.0.1:{HOST_PORT}"

    # Use OpenAI-compatible endpoint so backend code works the same way
    payload = {
        "model": MODEL,
        "messages": [{"role": "user", "content": args.prompt}],
        "max_tokens": args.max_tokens,
        "temperature": 0.2,
        "stream": False,
        "think": False,  # disable extended thinking — content goes directly into message.content
    }
    req = urllib.request.Request(
        f"{base}/v1/chat/completions",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    print(f"POST {base}/v1/chat/completions  model={MODEL}")
    try:
        with urllib.request.urlopen(req, timeout=300) as resp:
            body = json.loads(resp.read().decode())
    except urllib.error.HTTPError as exc:
        print(exc.read().decode(), file=sys.stderr)
        return 1

    msg = body["choices"][0]["message"]
    content = msg.get("content") or msg.get("reasoning", "")
    print("OK — model response:")
    print(content)
    usage = body.get("usage", {})
    if usage:
        print(f"tokens: in={usage.get('prompt_tokens')} out={usage.get('completion_tokens')}")
    return 0


def cmd_logs(args: argparse.Namespace) -> int:
    subprocess.run(["docker", "logs", "--tail", str(args.tail), "-f", CONTAINER_NAME])
    return 0


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser(description="Ollama Qwen3.5-9B Docker launcher")
    sub = parser.add_subparsers(dest="command", required=True)

    p_serve = sub.add_parser("serve", help="Start Ollama container and pull model")
    p_serve.add_argument("--image", default=None, help=f"Docker image (default {OLLAMA_IMAGE})")
    p_serve.add_argument("--wait", action="store_true", help="Verify model listed after pull")
    p_serve.add_argument("--timeout", type=int, default=300)
    p_serve.set_defaults(func=cmd_serve)

    p_test = sub.add_parser("test", help="OpenAI-compatible smoke test")
    p_test.add_argument(
        "--prompt",
        default="What is ISO 4406 hydraulic oil cleanliness target code for servo systems? One sentence.",
    )
    p_test.add_argument("--max-tokens", type=int, default=128)
    p_test.set_defaults(func=cmd_test)

    p_stop = sub.add_parser("stop", help="Remove Ollama container")
    p_stop.set_defaults(func=cmd_stop)

    p_logs = sub.add_parser("logs", help="Tail container logs")
    p_logs.add_argument("--tail", type=int, default=50)
    p_logs.set_defaults(func=cmd_logs)

    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
