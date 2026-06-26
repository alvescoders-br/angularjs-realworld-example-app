// Refs: #11 -- OTel interceptor keeps API observation read-only while emitting metrics and spans.

import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CONDUIT_API_URL } from './app-tokens';
import { otelInterceptor } from './otel.interceptor';
import { TelemetryService } from './telemetry.service';

describe('otelInterceptor', () => {
  const apiUrl = 'https://api.example.test';
  const span = { end: vi.fn() };

  function setup() {
    const telemetry = {
      recordEndpointCall: vi.fn(),
      startEndpointSpan: vi.fn(() => span),
      markEndpointSpanStatus: vi.fn(),
      markEndpointSpanError: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([otelInterceptor])),
        provideHttpClientTesting(),
        { provide: CONDUIT_API_URL, useValue: apiUrl },
        { provide: TelemetryService, useValue: telemetry },
      ],
    });

    return {
      http: TestBed.inject(HttpClient),
      httpTestingController: TestBed.inject(HttpTestingController),
      telemetry,
    };
  }

  beforeEach(() => {
    TestBed.resetTestingModule();
    span.end.mockClear();
  });

  it('increments the endpoint counter and creates a span for API calls', () => {
    const { http, httpTestingController, telemetry } = setup();

    http.get(`${apiUrl}/articles?limit=10`).subscribe();

    const request = httpTestingController.expectOne(`${apiUrl}/articles?limit=10`);
    request.flush({ articles: [] });
    httpTestingController.verify();

    expect(telemetry.recordEndpointCall).toHaveBeenCalledWith('/articles');
    expect(telemetry.startEndpointSpan).toHaveBeenCalledWith('/articles', 'GET');
    expect(telemetry.markEndpointSpanStatus).toHaveBeenCalledWith(span, 200);
    expect(span.end).toHaveBeenCalledTimes(1);
    expect(request.request.url).toBe(`${apiUrl}/articles?limit=10`);
  });

  it('does not emit telemetry for non-API calls', () => {
    const { http, httpTestingController, telemetry } = setup();

    http.get('https://cdn.example.test/main.css').subscribe();

    httpTestingController.expectOne('https://cdn.example.test/main.css').flush('');
    httpTestingController.verify();

    expect(telemetry.recordEndpointCall).not.toHaveBeenCalled();
    expect(telemetry.startEndpointSpan).not.toHaveBeenCalled();
    expect(telemetry.markEndpointSpanStatus).not.toHaveBeenCalled();
    expect(telemetry.markEndpointSpanError).not.toHaveBeenCalled();
    expect(span.end).not.toHaveBeenCalled();
  });

  it('does not mark non-API errors as telemetry errors', () => {
    const { http, httpTestingController, telemetry } = setup();
    const errorSpy = vi.fn();

    http.get('https://cdn.example.test/main.css').subscribe({ error: errorSpy });

    httpTestingController
      .expectOne('https://cdn.example.test/main.css')
      .flush('missing', { status: 404, statusText: 'Not Found' });
    httpTestingController.verify();

    expect(errorSpy).toHaveBeenCalled();
    expect(telemetry.recordEndpointCall).not.toHaveBeenCalled();
    expect(telemetry.markEndpointSpanError).not.toHaveBeenCalled();
    expect(span.end).not.toHaveBeenCalled();
  });

  it('uses slash as the endpoint label for the API root', () => {
    const { http, httpTestingController, telemetry } = setup();

    http.get(apiUrl).subscribe();

    httpTestingController.expectOne(apiUrl).flush({});
    httpTestingController.verify();

    expect(telemetry.recordEndpointCall).toHaveBeenCalledWith('/');
    expect(telemetry.startEndpointSpan).toHaveBeenCalledWith('/', 'GET');
  });

  it('marks API spans as errored without changing the response flow', () => {
    const { http, httpTestingController, telemetry } = setup();
    const errorSpy = vi.fn();

    http.get(`${apiUrl}/articles`).subscribe({ error: errorSpy });

    httpTestingController
      .expectOne(`${apiUrl}/articles`)
      .flush({ errors: { body: ['failed'] } }, { status: 500, statusText: 'Server Error' });
    httpTestingController.verify();

    expect(errorSpy).toHaveBeenCalled();
    expect(telemetry.markEndpointSpanError).toHaveBeenCalledTimes(1);
    expect(span.end).toHaveBeenCalledTimes(1);
  });
});
