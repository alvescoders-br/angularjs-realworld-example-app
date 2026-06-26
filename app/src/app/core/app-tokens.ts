import { InjectionToken } from '@angular/core';

export const CONDUIT_API_URL = new InjectionToken<string>('CONDUIT_API_URL', {
  factory: () => 'https://conduit.productionready.io/api'
});

export const JWT_STORAGE_KEY = 'jwtToken';

export const JWT_STORAGE = new InjectionToken<Storage>('JWT_STORAGE', {
  factory: () => globalThis.localStorage
});

export const BROWSER_WINDOW = new InjectionToken<Window>('BROWSER_WINDOW', {
  factory: () => globalThis.window
});

/** localStorage key for the user's theme preference. Namespaced to avoid collisions. */
export const THEME_STORAGE_KEY = 'conduit.theme';

/** localStorage key for a new-article draft. */
export const DRAFT_STORAGE_KEY_NEW = 'conduit.draft.new';

/** localStorage key prefix for an edit-article draft. Full key = prefix + slug. */
export const DRAFT_STORAGE_KEY_PREFIX = 'conduit.draft.';

/**
 * OTel Collector OTLP/HTTP base URL.
 * Default: http://localhost:4318 (docker-compose expose, S2 Fase 6, issue #8).
 * Override in tests or server-specific providers as needed.
 */
export const OTEL_COLLECTOR_URL = new InjectionToken<string>('OTEL_COLLECTOR_URL', {
  factory: () => 'http://localhost:4318'
});
