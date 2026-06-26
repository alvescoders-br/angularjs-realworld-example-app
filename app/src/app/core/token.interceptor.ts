import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { BROWSER_WINDOW, CONDUIT_API_URL } from './app-tokens';
import { JwtService } from './jwt.service';

export const tokenInterceptor: HttpInterceptorFn = (request, next) => {
  const apiUrl = inject(CONDUIT_API_URL);
  const browserWindow = inject(BROWSER_WINDOW);
  const jwtService = inject(JwtService);
  const token = jwtService.get();
  const shouldAttachToken = request.url.startsWith(apiUrl) && token !== null;
  const authorizedRequest = shouldAttachToken
    ? request.clone({
        setHeaders: {
          Authorization: `Token ${token}`
        }
      })
    : request;

  return next(authorizedRequest).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        jwtService.destroy();
        browserWindow.location.reload();
      }

      return throwError(() => error);
    })
  );
};
