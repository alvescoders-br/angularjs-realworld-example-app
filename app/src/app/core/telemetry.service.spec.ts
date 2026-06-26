// Refs: #11 -- direct coverage for OTel span helpers used by the HTTP interceptor.

import { TestBed } from '@angular/core/testing';
import { SpanStatusCode, type Span } from '@opentelemetry/api';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OTEL_COLLECTOR_URL } from './app-tokens';
import { TelemetryService } from './telemetry.service';

describe('TelemetryService', () => {
  function setup(): TelemetryService {
    TestBed.configureTestingModule({
      providers: [
        TelemetryService,
        { provide: OTEL_COLLECTOR_URL, useValue: 'http://localhost:4318' },
      ],
    });
    return TestBed.inject(TelemetryService);
  }

  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('does not create endpoint spans before init', () => {
    const service = setup();

    expect(service.startEndpointSpan('/articles', 'GET')).toBeUndefined();
  });

  it('creates endpoint spans after init', () => {
    const service = setup();

    service.init();
    const span = service.startEndpointSpan('/articles', 'GET');
    span?.end();

    expect(span).toBeDefined();
  });

  it('marks HTTP error status codes on spans', () => {
    const span = {
      setAttribute: vi.fn(),
      setStatus: vi.fn(),
    } as unknown as Span;
    const service = setup();

    service.markEndpointSpanStatus(span, 500);

    expect(span.setAttribute).toHaveBeenCalledWith('http.response.status_code', 500);
    expect(span.setStatus).toHaveBeenCalledWith({
      code: SpanStatusCode.ERROR,
      message: 'HTTP 500',
    });
  });

  it('does not mark successful HTTP status codes as errors', () => {
    const span = {
      setAttribute: vi.fn(),
      setStatus: vi.fn(),
    } as unknown as Span;
    const service = setup();

    service.markEndpointSpanStatus(span, 200);

    expect(span.setAttribute).toHaveBeenCalledWith('http.response.status_code', 200);
    expect(span.setStatus).not.toHaveBeenCalled();
  });

  it('marks thrown errors on spans', () => {
    const span = {
      setStatus: vi.fn(),
    } as unknown as Span;
    const service = setup();

    service.markEndpointSpanError(span, new Error('network down'));

    expect(span.setStatus).toHaveBeenCalledWith({
      code: SpanStatusCode.ERROR,
      message: 'network down',
    });
  });
});
