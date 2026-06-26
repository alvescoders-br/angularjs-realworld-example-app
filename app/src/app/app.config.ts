import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, inject, provideAppInitializer } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { otelInterceptor } from './core/otel.interceptor';
import { TelemetryService } from './core/telemetry.service';
import { tokenInterceptor } from './core/token.interceptor';
import { UserService } from './core/user.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(
      // tokenInterceptor first (auth), otelInterceptor second (read-only observation)
      withInterceptors([tokenInterceptor, otelInterceptor])
    ),
    provideRouter(routes),
    // Initialize OTel SDK before anything else touches the app.
    provideAppInitializer(() => inject(TelemetryService).init()),
    provideAppInitializer(() => inject(UserService).verifyAuth()),
  ]
};
