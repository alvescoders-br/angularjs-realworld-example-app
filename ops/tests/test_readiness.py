"""
Unit tests for ops/readiness.py (S3, Fase 6, issue #8).

Coverage target: 70% Python (Cobertura XML via pytest-cov, per harness-manifest.json).
Run: python -m pytest ops/tests -v --cov=readiness --cov-report=term-missing --cov-report=xml:ops/coverage.xml
"""

import sys
from pathlib import Path

import pytest

# Allow import of readiness module from the ops/ directory.
sys.path.insert(0, str(Path(__file__).parent.parent))

from readiness import (  # noqa: E402
    ServiceStatus,
    StackStatus,
    assess_stack,
    parse_service_logs,
    validate_bootstrap,
    validate_observability_artifacts,
    validate_shutdown,
)


# ── parse_service_logs ────────────────────────────────────────────────────────


class TestParseServiceLogs:
    def test_loki_started(self) -> None:
        status = parse_service_logs("loki", ['caller=loki.go:581 msg="Loki started" startup_time=390ms'])
        assert status.started is True
        assert status.name == "loki"

    def test_tempo_started(self) -> None:
        status = parse_service_logs("tempo", ['caller=app.go:208 msg="Tempo started"'])
        assert status.started is True

    def test_mimir_started(self) -> None:
        # Mimir logs "Application started" (mimir.go), not "Mimir started".
        status = parse_service_logs("mimir", ['caller=mimir.go:897 level=info msg="Application started"'])
        assert status.started is True

    def test_grafana_started(self) -> None:
        # Grafana logs in logfmt by default, not JSON.
        lines = ['logger=http.server t=... level=info msg="HTTP Server Listen" address=[::]:3000']
        status = parse_service_logs("grafana", lines)
        assert status.started is True

    def test_otel_collector_started(self) -> None:
        status = parse_service_logs("otel-collector", ["Everything is ready. Begin running and processing data."])
        assert status.started is True

    def test_frontend_started(self) -> None:
        status = parse_service_logs("frontend", ["start worker process 10"])
        assert status.started is True

    def test_unknown_service_not_started(self) -> None:
        status = parse_service_logs("unknown-svc", ["Starting up..."])
        assert status.started is False

    def test_empty_logs_not_started(self) -> None:
        status = parse_service_logs("loki", [])
        assert status.started is False
        assert status.lines_seen == 0

    def test_lines_seen_count(self) -> None:
        lines = ["line1", "line2", "line3"]
        status = parse_service_logs("loki", lines)
        assert status.lines_seen == 3

    def test_shutdown_log_detected(self) -> None:
        status = parse_service_logs("loki", ["shutting down server"])
        assert status.shutdown_log_seen is True

    def test_shutdown_sigterm(self) -> None:
        status = parse_service_logs("tempo", ["received SIGTERM, exiting"])
        assert status.shutdown_log_seen is True

    def test_no_shutdown_log(self) -> None:
        status = parse_service_logs("grafana", ["everything ok"])
        assert status.shutdown_log_seen is False

    def test_started_and_shutdown_same_log(self) -> None:
        """A service can appear as started AND show a shutdown log in the same batch."""
        status = parse_service_logs(
            "loki",
            ['msg="Loki started"', "shutting down"],
        )
        assert status.started is True
        assert status.shutdown_log_seen is True

    def test_case_insensitive_match(self) -> None:
        status = parse_service_logs("loki", ["LOKI STARTED"])
        assert status.started is True


# ── assess_stack ──────────────────────────────────────────────────────────────


class TestAssessStack:
    def test_all_services_started(self) -> None:
        service_logs = {
            "loki": ["Loki started"],
            "tempo": ["Tempo started"],
        }
        stack = assess_stack(service_logs)
        assert stack.all_started is True
        assert sorted(stack.started_names) == ["loki", "tempo"]
        assert stack.pending_names == []

    def test_some_pending(self) -> None:
        service_logs = {
            "loki": ["Loki started"],
            "tempo": ["still starting..."],
        }
        stack = assess_stack(service_logs)
        assert stack.all_started is False
        assert "tempo" in stack.pending_names

    def test_empty_stack(self) -> None:
        stack = assess_stack({})
        assert stack.all_started is True  # vacuously true
        assert stack.services == {}

    def test_services_dict_populated(self) -> None:
        service_logs = {"loki": ["Loki started"], "grafana": []}
        stack = assess_stack(service_logs)
        assert "loki" in stack.services
        assert "grafana" in stack.services
        assert isinstance(stack.services["loki"], ServiceStatus)


# ── validate_bootstrap ────────────────────────────────────────────────────────


class TestValidateBootstrap:
    def test_all_started_returns_true(self) -> None:
        service_logs = {
            "loki": ["Loki started"],
            "tempo": ["Tempo started"],
        }
        ok, msg = validate_bootstrap(service_logs)
        assert ok is True
        assert "All services started" in msg

    def test_pending_returns_false(self) -> None:
        service_logs = {
            "loki": ["not ready yet"],
        }
        ok, msg = validate_bootstrap(service_logs)
        assert ok is False
        assert "loki" in msg

    def test_message_lists_started_names(self) -> None:
        service_logs = {
            "loki": ["Loki started"],
            "grafana": ['logger=http.server msg="HTTP Server Listen" address=[::]:3000'],
        }
        ok, msg = validate_bootstrap(service_logs)
        assert ok is True
        assert "loki" in msg
        assert "grafana" in msg


# ── validate_shutdown ─────────────────────────────────────────────────────────


class TestValidateShutdown:
    def test_shutdown_seen_returns_true(self) -> None:
        service_logs = {
            "loki": ["shutting down"],
            "tempo": ["still running"],
        }
        ok, msg = validate_shutdown(service_logs)
        assert ok is True
        assert "loki" in msg

    def test_no_shutdown_returns_false(self) -> None:
        service_logs = {
            "loki": ["Loki started"],
            "tempo": ["all good"],
        }
        ok, msg = validate_shutdown(service_logs)
        assert ok is False
        assert "No shutdown logs" in msg

    def test_multiple_shutdown_services(self) -> None:
        service_logs = {
            "loki": ["exiting"],
            "tempo": ["sigterm received"],
        }
        ok, msg = validate_shutdown(service_logs)
        assert ok is True
        assert "loki" in msg
        assert "tempo" in msg


# ── validate_observability_artifacts ──────────────────────────────────────────


class TestValidateObservabilityArtifacts:
    def valid_artifacts(self) -> dict[str, str]:
        return {
            "otel-collector": """
exporters:
  otlp/tempo:
  prometheusremotewrite:
  loki:
service:
  pipelines:
    traces:
      exporters: [otlp/tempo]
    metrics:
      exporters: [prometheusremotewrite]
    logs:
      exporters: [loki]
""",
            "grafana-datasources": """
datasources:
  - uid: loki
    type: loki
  - uid: tempo
    type: tempo
  - uid: mimir
    type: prometheus
""",
            "grafana-dashboard": """
{
  "panels": [
    { "type": "timeseries", "targets": [{ "expr": "http_outbound_calls_total" }] },
    { "type": "logs", "targets": [{ "expr": "app_bootstrap app_beforeunload" }] },
    { "type": "traces", "targets": [{ "serviceName": "conduit-frontend" }] }
  ]
}
""",
        }

    def test_valid_artifacts_pass(self) -> None:
        ok, msg = validate_observability_artifacts(self.valid_artifacts())

        assert ok is True
        assert "metrics, logs and traces" in msg

    def test_missing_counter_fails(self) -> None:
        artifacts = self.valid_artifacts()
        artifacts["grafana-dashboard"] = artifacts["grafana-dashboard"].replace(
            "http_outbound_calls_total",
            "missing_counter",
        )

        ok, msg = validate_observability_artifacts(artifacts)

        assert ok is False
        assert "endpoint counter panel" in msg

    def test_missing_collector_pipeline_fails(self) -> None:
        artifacts = self.valid_artifacts()
        artifacts["otel-collector"] = artifacts["otel-collector"].replace("logs:", "logz:")

        ok, msg = validate_observability_artifacts(artifacts)

        assert ok is False
        assert "collector logs pipeline" in msg


# ── StackStatus dataclass ─────────────────────────────────────────────────────


class TestStackStatus:
    def test_all_started_empty(self) -> None:
        stack = StackStatus()
        assert stack.all_started is True

    def test_pending_names_non_empty(self) -> None:
        stack = StackStatus(
            services={
                "loki": ServiceStatus(name="loki", started=False),
                "tempo": ServiceStatus(name="tempo", started=True),
            }
        )
        assert stack.pending_names == ["loki"]
        assert stack.started_names == ["tempo"]
