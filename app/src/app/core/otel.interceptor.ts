// OTel HTTP interceptor — read-only observation of outbound calls (S2, Fase 6, issue #8)
// PP-6.2: increments per-endpoint counter only; NEVER modifies request/response.
// The Token auth header and contract envelope (jwtToken/Token) are untouched.
import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize, tap } from 'rxjs/operators';

import { CONDUIT_API_URL } from './app-tokens';
import { TelemetryService } from './telemetry.service';

export const otelInterceptor: HttpInterceptorFn = (request, next) => {
  const apiUrl = inject(CONDUIT_API_URL);
  const telemetry = inject(TelemetryService);
  let span: ReturnType<TelemetryService['startEndpointSpan']>;

  // Only observe requests to the Conduit API (not external CDN calls etc.)
  if (request.url.startsWith(apiUrl)) {
    // Extract path after the base URL to use as the metric label.
    const endpoint = request.url.slice(apiUrl.length).split('?')[0] || '/';
    telemetry.recordEndpointCall(endpoint);
    span = telemetry.startEndpointSpan(endpoint, request.method);
  }

  // Pass the request through UNMODIFIED — strictly read-only.
  return next(request).pipe(
    tap({
      next: (event) => {
        if (span && event instanceof HttpResponse) {
          telemetry.markEndpointSpanStatus(span, event.status);
        }
      },
      error: (error: unknown) => {
        if (span) {
          telemetry.markEndpointSpanError(span, error);
        }
      }
    }),
    finalize(() => {
      if (span) {
        span.end();
      }
    })
  );
};
