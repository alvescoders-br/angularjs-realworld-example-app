import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';

import { ApiService } from './api.service';
import { BROWSER_WINDOW, CONDUIT_API_URL, JWT_STORAGE } from './app-tokens';
import { JwtService } from './jwt.service';
import { MemoryStorage } from './testing-storage';
import { tokenInterceptor } from './token.interceptor';

type TestSetup = {
  apiService: ApiService;
  httpTestingController: HttpTestingController;
  jwtService: JwtService;
  reload: ReturnType<typeof vi.fn>;
};

describe('tokenInterceptor', () => {
  function setup(): TestSetup {
    const storage = new MemoryStorage();
    const reload = vi.fn();
    const browserWindow = {
      location: {
        reload
      }
    } as unknown as Window;

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([tokenInterceptor])),
        provideHttpClientTesting(),
        {
          provide: CONDUIT_API_URL,
          useValue: 'https://example.test/api'
        },
        {
          provide: JWT_STORAGE,
          useValue: storage
        },
        {
          provide: BROWSER_WINDOW,
          useValue: browserWindow
        }
      ]
    });

    return {
      apiService: TestBed.inject(ApiService),
      httpTestingController: TestBed.inject(HttpTestingController),
      jwtService: TestBed.inject(JwtService),
      reload
    };
  }

  it('attaches the legacy Token authorization scheme to API requests when JWT exists', () => {
    const { apiService, httpTestingController, jwtService } = setup();
    jwtService.save('signed-token');

    apiService.get<{ ok: boolean }>('/articles').subscribe();

    const request = httpTestingController.expectOne('https://example.test/api/articles');
    expect(request.request.headers.get('Authorization')).toBe('Token signed-token');
    request.flush({ ok: true });
    httpTestingController.verify();
  });

  it('does not attach Authorization when no JWT exists', () => {
    const { apiService, httpTestingController } = setup();

    apiService.get<{ ok: boolean }>('/articles').subscribe();

    const request = httpTestingController.expectOne('https://example.test/api/articles');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({ ok: true });
    httpTestingController.verify();
  });

  it('clears jwtToken and reloads the page on 401 responses', () => {
    const { apiService, httpTestingController, jwtService, reload } = setup();
    jwtService.save('signed-token');

    apiService.get<{ ok: boolean }>('/user').subscribe({
      error: () => undefined
    });

    const request = httpTestingController.expectOne('https://example.test/api/user');
    request.flush({ errors: { body: ['unauthorized'] } }, { status: 401, statusText: 'Unauthorized' });

    expect(jwtService.get()).toBeNull();
    expect(reload).toHaveBeenCalledOnce();
    httpTestingController.verify();
  });

  it('does not attach Authorization for requests to a non-API URL even when JWT exists', () => {
    const { httpTestingController, jwtService } = setup();
    jwtService.save('signed-token');

    // Inject HttpClient directly so we can fire a request to an off-domain URL
    const httpClient = TestBed.inject(HttpClient);
    httpClient.get<{ ok: boolean }>('https://other.example.com/path').subscribe({ error: () => undefined });

    const request = httpTestingController.expectOne('https://other.example.com/path');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({ ok: true });
    httpTestingController.verify();
  });

  it('re-throws the error without reloading for non-401 HTTP errors', () => {
    const { apiService, httpTestingController, reload } = setup();
    let caughtStatus: number | undefined;

    apiService.get<{ ok: boolean }>('/articles').subscribe({
      error: (err: unknown) => {
        if (err instanceof HttpErrorResponse) caughtStatus = err.status;
      }
    });

    const request = httpTestingController.expectOne('https://example.test/api/articles');
    request.flush({ message: 'gone' }, { status: 410, statusText: 'Gone' });

    expect(reload).not.toHaveBeenCalled();
    expect(caughtStatus).toBe(410);
    httpTestingController.verify();
  });
});
