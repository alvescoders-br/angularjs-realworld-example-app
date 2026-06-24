// Telemetry service — OTel Web SDK bootstrap (S2, Fase 6, issue #8)
// PP-6.2: endpoint = HTTP outbound calls; start/stop = bootstrap/beforeunload.
// The interceptor (otel.interceptor.ts) observes calls and increments counters here.
import { inject, Injectable, OnDestroy } from '@angular/core';
import {
  CompositePropagator,
  W3CBaggagePropagator,
  W3CTraceContextPropagator,
} from '@opentelemetry/core';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { SeverityNumber } from '@opentelemetry/api-logs';
import {
  BatchLogRecordProcessor,
  LoggerProvider,
} from '@opentelemetry/sdk-logs';
import {
  MeterProvider,
  PeriodicExportingMetricReader,
} from '@opentelemetry/sdk-metrics';
import {
  BatchSpanProcessor,
  WebTracerProvider,
} from '@opentelemetry/sdk-trace-web';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';
import { resourceFromAttributes } from '@opentelemetry/resources';

import { OTEL_COLLECTOR_URL } from './app-tokens';

@Injectable({ providedIn: 'root' })
export class TelemetryService implements OnDestroy {
  private readonly collectorUrl = inject(OTEL_COLLECTOR_URL);

  private tracerProvider?: WebTracerProvider;
  private meterProvider?: MeterProvider;
  private loggerProvider?: LoggerProvider;

  /** Counter map: endpoint path → call count. */
  private readonly endpointCounters = new Map<
    string,
    ReturnType<ReturnType<MeterProvider['getMeter']>['createCounter']>
  >();

  private meter?: ReturnType<MeterProvider['getMeter']>;
  private logger?: ReturnType<LoggerProvider['getLogger']>;

  /** Call once at app bootstrap (provideAppInitializer). */
  init(): void {
    const resource = resourceFromAttributes({
      [ATTR_SERVICE_NAME]: 'conduit-frontend',
      [ATTR_SERVICE_VERSION]: '0.1.0',
    });

    const traceExporter = new OTLPTraceExporter({
      url: `${this.collectorUrl}/v1/traces`,
    });
    this.tracerProvider = new WebTracerProvider({
      resource,
      spanProcessors: [new BatchSpanProcessor(traceExporter)],
    });
    this.tracerProvider.register({
      propagator: new CompositePropagator({
        propagators: [
          new W3CTraceContextPropagator(),
          new W3CBaggagePropagator(),
        ],
      }),
    });

    const metricExporter = new OTLPMetricExporter({
      url: `${this.collectorUrl}/v1/metrics`,
    });
    this.meterProvider = new MeterProvider({
      resource,
      readers: [
        new PeriodicExportingMetricReader({
          exporter: metricExporter,
          exportIntervalMillis: 30_000,
        }),
      ],
    });
    this.meter = this.meterProvider.getMeter('conduit-frontend');

    const logExporter = new OTLPLogExporter({
      url: `${this.collectorUrl}/v1/logs`,
    });
    this.loggerProvider = new LoggerProvider({
      resource,
      processors: [new BatchLogRecordProcessor(logExporter)],
    });
    this.logger = this.loggerProvider.getLogger('conduit-frontend');

    this.emitLog('app_bootstrap', SeverityNumber.INFO);

    globalThis.addEventListener?.('beforeunload', () => this.handleBeforeUnload());
  }

  /** Increment the per-endpoint call counter (read-only observation from interceptor). */
  recordEndpointCall(endpoint: string): void {
    if (!this.meter) return;
    if (!this.endpointCounters.has(endpoint)) {
      const counter = this.meter.createCounter(`http.outbound.calls`, {
        description: 'Number of outbound HTTP calls per endpoint',
      });
      this.endpointCounters.set(endpoint, counter);
    }
    this.endpointCounters.get(endpoint)?.add(1, { endpoint });
  }

  private handleBeforeUnload(): void {
    this.emitLog('app_beforeunload', SeverityNumber.INFO);
    void this.flush();
  }

  private emitLog(event: string, severity: SeverityNumber): void {
    this.logger?.emit({
      severityNumber: severity,
      body: event,
      attributes: { 'app.event': event },
    });
  }

  /** Flush all pending telemetry data (called on destroy / beforeunload). */
  async flush(): Promise<void> {
    await Promise.allSettled([
      this.meterProvider?.forceFlush(),
      this.loggerProvider?.forceFlush(),
    ]);
  }

  ngOnDestroy(): void {
    this.handleBeforeUnload();
  }
}
