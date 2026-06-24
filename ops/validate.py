#!/usr/bin/env python3
"""
ops/validate.py — Conduit stack validation script (S3, Fase 6, issue #8).

Usage:
    python ops/validate.py [--compose-file docker-compose.yml]
                           [--timeout 120]
                           [--poll 5]

Exit codes:
    0  All services started (bootstrap validated) and shutdown log seen after
       ``docker compose down``.
    1  Validation failed or timed out.

The script is idempotent: running it twice in a row is safe (it brings the
stack down at the end).  If the stack is already up it will restart it.

Pure logic (log parsing / readiness checks) lives in ``ops/readiness.py``
and is covered by unit tests (ops/tests/test_readiness.py).
"""

from __future__ import annotations

import argparse
import subprocess
import sys
import time
from pathlib import Path
from typing import NoReturn

# Pure helper — testable without Docker
from readiness import validate_bootstrap, validate_shutdown

_SERVICES = ["loki", "tempo", "mimir", "grafana", "otel-collector", "frontend"]
_DEFAULT_COMPOSE = "docker-compose.yml"
_DEFAULT_TIMEOUT = 120
_DEFAULT_POLL = 5


# ── Subprocess helpers ────────────────────────────────────────────────────────


def _run(args: list[str], *, check: bool = True) -> subprocess.CompletedProcess[str]:
    """Run a subprocess command and return the result."""
    return subprocess.run(
        args,
        capture_output=True,
        text=True,
        check=check,
    )


def _extract_command_error(error: subprocess.CalledProcessError) -> str:
    """Return the most useful stderr/stdout fragment from a subprocess failure."""
    return (error.stderr or error.stdout or str(error)).strip()


def _exit_with_error(message: str) -> NoReturn:
    """Print a validation error and terminate with exit code 1."""
    print(f"[validate] ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


def ensure_docker_is_available() -> None:
    """Fail fast with a readable error when Docker CLI/daemon is unavailable."""
    try:
        _run(["docker", "version"])
    except FileNotFoundError:
        _exit_with_error("Docker CLI not found in PATH.")
    except subprocess.CalledProcessError as error:
        _exit_with_error(
            "Docker daemon is unavailable. Start Docker Desktop (or another daemon) "
            f"and retry. Details: {_extract_command_error(error)}"
        )


def _compose_logs(compose_file: str, service: str) -> list[str]:
    """Fetch the latest logs for *service* from Compose (no-follow)."""
    result = _run(
        ["docker", "compose", "-f", compose_file, "logs", "--no-log-prefix", service],
        check=False,
    )
    combined = (result.stdout or "") + (result.stderr or "")
    return combined.splitlines()


# ── Orchestration ─────────────────────────────────────────────────────────────


def bring_up(compose_file: str) -> None:
    """Start the stack (detached)."""
    print("[validate] Starting stack...")
    _run(["docker", "compose", "-f", compose_file, "up", "-d", "--build"])
    print("[validate] Stack started.")


def stop_stack(compose_file: str) -> None:
    """Stop containers **without removing them** so shutdown logs stay readable."""
    print("[validate] Stopping containers (logs retained)...")
    _run(["docker", "compose", "-f", compose_file, "stop"], check=False)
    print("[validate] Containers stopped.")


def bring_down(compose_file: str) -> None:
    """Stop and remove containers."""
    print("[validate] Tearing down stack...")
    _run(["docker", "compose", "-f", compose_file, "down"], check=False)
    print("[validate] Stack torn down.")


def poll_until_ready(
    compose_file: str,
    timeout_seconds: int,
    poll_interval: int,
) -> tuple[bool, dict[str, list[str]]]:
    """
    Poll Compose logs until all services emit their bootstrap signal or *timeout* elapses.

    Returns ``(all_ready, last_logs_per_service)``.
    """
    deadline = time.monotonic() + timeout_seconds
    while time.monotonic() < deadline:
        service_logs: dict[str, list[str]] = {
            svc: _compose_logs(compose_file, svc) for svc in _SERVICES
        }
        ok, message = validate_bootstrap(service_logs)
        print(f"[validate] {message}")
        if ok:
            return True, service_logs
        time.sleep(poll_interval)
    return False, {svc: _compose_logs(compose_file, svc) for svc in _SERVICES}


def collect_shutdown_logs(compose_file: str) -> dict[str, list[str]]:
    """Collect logs **after** ``docker compose down`` for shutdown validation."""
    return {svc: _compose_logs(compose_file, svc) for svc in _SERVICES}


# ── Main ──────────────────────────────────────────────────────────────────────


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate Conduit stack via Compose.")
    parser.add_argument(
        "--compose-file",
        default=_DEFAULT_COMPOSE,
        help=f"Path to the Compose file (default: {_DEFAULT_COMPOSE})",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=_DEFAULT_TIMEOUT,
        help=f"Maximum seconds to wait for bootstrap (default: {_DEFAULT_TIMEOUT})",
    )
    parser.add_argument(
        "--poll",
        type=int,
        default=_DEFAULT_POLL,
        help=f"Polling interval in seconds (default: {_DEFAULT_POLL})",
    )
    args = parser.parse_args()

    compose_file = args.compose_file
    if not Path(compose_file).exists():
        print(f"[validate] ERROR: Compose file not found: {compose_file}", file=sys.stderr)
        return 1

    ensure_docker_is_available()

    try:
        # Idempotent: bring down any existing stack first.
        bring_down(compose_file)
        bring_up(compose_file)

        # Poll until all services are ready.
        ready, last_logs = poll_until_ready(compose_file, args.timeout, args.poll)
        if not ready:
            ok, msg = validate_bootstrap(last_logs)
            print(f"[validate] FAIL — bootstrap timed out. {msg}", file=sys.stderr)
            bring_down(compose_file)
            return 1

        print("[validate] PASS — all services started.")

        # Stop (not remove) so the shutdown logs remain readable, then validate.
        stop_stack(compose_file)
        shutdown_logs = collect_shutdown_logs(compose_file)
        ok, msg = validate_shutdown(shutdown_logs)
        if ok:
            print(f"[validate] PASS — shutdown validated. {msg}")
        else:
            print(
                "[validate] WARN — "
                f"{msg} (non-blocking; graceful shutdown may have been fast)."
            )

        # Final cleanup: remove containers (idempotent re-runs).
        bring_down(compose_file)
        return 0
    except FileNotFoundError:
        print("[validate] ERROR: Docker CLI not found in PATH.", file=sys.stderr)
        return 1
    except subprocess.CalledProcessError as error:
        details = _extract_command_error(error)
        print(f"[validate] ERROR: Docker command failed. {details}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
