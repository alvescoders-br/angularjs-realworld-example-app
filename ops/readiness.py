"""
ops/readiness.py — pure helper module for stack readiness (S3, Fase 6, issue #8).

This module contains the testable, side-effect-free logic extracted from the
orchestration script (validate.py).  No Docker/subprocess calls here.

Covered by ops/tests/test_readiness.py (target: 70% LCOV).
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Sequence


# ── Log parsing ──────────────────────────────────────────────────────────────

# Patterns that indicate each service has started successfully.
# Patterns verified against real container logs (Fase 6 human validation, 2026-06-24):
#   loki  -> caller=loki.go  msg="Loki started"
#   tempo -> caller=app.go   msg="Tempo started"
#   mimir -> caller=mimir.go msg="Application started"   (logs "Application", not "Mimir")
#   grafana -> logfmt: logger=http.server ... msg="HTTP Server Listen"  (not JSON)
#   otel-collector -> "Everything is ready. Begin running and processing data."
#   frontend (nginx) -> "start worker process"
_BOOTSTRAP_PATTERNS: dict[str, re.Pattern[str]] = {
    "loki": re.compile(r"Loki started", re.IGNORECASE),
    "tempo": re.compile(r"Tempo started", re.IGNORECASE),
    "mimir": re.compile(r"Application started", re.IGNORECASE),
    "grafana": re.compile(r'msg="HTTP Server Listen"', re.IGNORECASE),
    "otel-collector": re.compile(r"Everything is ready", re.IGNORECASE),
    "frontend": re.compile(r"start worker process", re.IGNORECASE),
}

# Pattern that confirms a graceful shutdown log.
_SHUTDOWN_PATTERN = re.compile(
    r"(exiting|shutting down|bye|sig(term|int)|stopping server)",
    re.IGNORECASE,
)


@dataclass
class ServiceStatus:
    """Readiness status for a single service."""

    name: str
    started: bool = False
    shutdown_log_seen: bool = False
    lines_seen: int = 0


@dataclass
class StackStatus:
    """Aggregated readiness status for the full stack."""

    services: dict[str, ServiceStatus] = field(default_factory=dict)

    @property
    def all_started(self) -> bool:
        return all(s.started for s in self.services.values())

    @property
    def started_names(self) -> list[str]:
        return [name for name, s in self.services.items() if s.started]

    @property
    def pending_names(self) -> list[str]:
        return [name for name, s in self.services.items() if not s.started]


# ── Public functions ─────────────────────────────────────────────────────────


def parse_service_logs(service_name: str, log_lines: Sequence[str]) -> ServiceStatus:
    """
    Parse *log_lines* for *service_name* and return a :class:`ServiceStatus`.

    Parameters
    ----------
    service_name:
        Name of the service (must match a key in ``_BOOTSTRAP_PATTERNS`` or an
        unknown-service status is returned with ``started=False``).
    log_lines:
        Sequence of raw log lines (strings) from the service.
    """
    status = ServiceStatus(name=service_name, lines_seen=len(log_lines))
    pattern = _BOOTSTRAP_PATTERNS.get(service_name)

    for line in log_lines:
        if pattern and pattern.search(line):
            status.started = True
        if _SHUTDOWN_PATTERN.search(line):
            status.shutdown_log_seen = True

    return status


def assess_stack(service_logs: dict[str, Sequence[str]]) -> StackStatus:
    """
    Assess the readiness of the full stack given per-service log lines.

    Parameters
    ----------
    service_logs:
        Mapping of ``{service_name: [log_line, ...]}`` for every expected service.

    Returns
    -------
    :class:`StackStatus` with one :class:`ServiceStatus` per service.
    """
    stack = StackStatus()
    for service_name, lines in service_logs.items():
        stack.services[service_name] = parse_service_logs(service_name, lines)
    return stack


def validate_bootstrap(service_logs: dict[str, Sequence[str]]) -> tuple[bool, str]:
    """
    Validate that every expected service emitted its bootstrap log.

    Returns
    -------
    ``(ok, message)`` where *ok* is ``True`` iff all services started.
    """
    stack = assess_stack(service_logs)
    if stack.all_started:
        return True, "All services started: " + ", ".join(sorted(stack.started_names))
    pending = sorted(stack.pending_names)
    return False, "Services not yet started: " + ", ".join(pending)


def validate_shutdown(service_logs: dict[str, Sequence[str]]) -> tuple[bool, str]:
    """
    Validate that at least one service emitted a graceful shutdown log.

    Returns
    -------
    ``(ok, message)`` where *ok* is ``True`` iff ≥1 service has a shutdown log.
    """
    stack = assess_stack(service_logs)
    with_shutdown = [
        name for name, s in stack.services.items() if s.shutdown_log_seen
    ]
    if with_shutdown:
        return True, "Shutdown logs seen for: " + ", ".join(sorted(with_shutdown))
    return False, "No shutdown logs seen yet"


def validate_observability_artifacts(artifact_texts: dict[str, str]) -> tuple[bool, str]:
    """
    Validate the static LGTM/OTel artifacts that make runtime telemetry possible.

    The Docker gate proves services can start; this check proves the repo-owned
    configs still wire the three required signal types: metrics, logs and traces.
    """
    collector = artifact_texts.get("otel-collector", "")
    dashboard = artifact_texts.get("grafana-dashboard", "")
    datasources = artifact_texts.get("grafana-datasources", "")

    checks = {
        "collector traces pipeline": "traces:" in collector and "otlp/tempo" in collector,
        "collector metrics pipeline": "metrics:" in collector and "prometheusremotewrite" in collector,
        "collector logs pipeline": "logs:" in collector and "loki" in collector,
        "grafana tempo datasource": "uid: tempo" in datasources and "type: tempo" in datasources,
        "grafana mimir datasource": "uid: mimir" in datasources and "type: prometheus" in datasources,
        "grafana loki datasource": "uid: loki" in datasources and "type: loki" in datasources,
        "endpoint counter panel": "http_outbound_calls_total" in dashboard,
        "bootstrap/shutdown log panel": "app_bootstrap" in dashboard and "app_beforeunload" in dashboard,
        "trace panel": '"type": "traces"' in dashboard and "conduit-frontend" in dashboard,
    }

    missing = [name for name, ok in checks.items() if not ok]
    if missing:
        return False, "Observability artifacts missing: " + ", ".join(missing)
    return True, "Observability artifacts cover metrics, logs and traces"
