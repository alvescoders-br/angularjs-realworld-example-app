import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { ApiService } from './api.service';
import { CONDUIT_API_URL } from './app-tokens';

describe('ApiService', () => {
  function setup(): { apiService: ApiService; httpTestingController: HttpTestingController } {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: CONDUIT_API_URL,
          useValue: 'https://example.test/api'
        }
      ]
    });

    return {
      apiService: TestBed.inject(ApiService),
      httpTestingController: TestBed.inject(HttpTestingController)
    };
  }

  it('prefixes relative paths with the immutable RealWorld API base URL', () => {
    const { apiService, httpTestingController } = setup();

    apiService.get<{ tags: string[] }>('tags').subscribe((response) => {
      expect(response.tags).toEqual(['angular']);
    });

    const request = httpTestingController.expectOne('https://example.test/api/tags');
    expect(request.request.method).toBe('GET');
    request.flush({ tags: ['angular'] });
    httpTestingController.verify();
  });

  it('preserves leading slashes when building API URLs', () => {
    const { apiService, httpTestingController } = setup();

    apiService.post<{ ok: boolean }, { user: { email: string } }>('/users/login', {
      user: { email: 'test@example.com' }
    }).subscribe((response) => {
      expect(response.ok).toBe(true);
    });

    const request = httpTestingController.expectOne('https://example.test/api/users/login');
    expect(request.request.method).toBe('POST');
    request.flush({ ok: true });
    httpTestingController.verify();
  });

  it('appends query params when provided to GET requests', () => {
    const { apiService, httpTestingController } = setup();

    apiService.get<{ articles: unknown[] }>('articles', { tag: 'angular', limit: 10, offset: 0 })
      .subscribe();

    const request = httpTestingController.expectOne(
      (req) => req.url === 'https://example.test/api/articles'
    );
    expect(request.request.params.get('tag')).toBe('angular');
    expect(request.request.params.get('limit')).toBe('10');
    expect(request.request.params.get('offset')).toBe('0');
    request.flush({ articles: [] });
    httpTestingController.verify();
  });

  it('sends a PUT request with the correct body and URL', () => {
    const { apiService, httpTestingController } = setup();

    apiService.put<{ article: unknown }, { article: { title: string } }>(
      '/articles/hello-angular',
      { article: { title: 'Updated' } }
    ).subscribe();

    const request = httpTestingController.expectOne('https://example.test/api/articles/hello-angular');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ article: { title: 'Updated' } });
    request.flush({ article: {} });
    httpTestingController.verify();
  });

  it('sends a DELETE request to the correct URL', () => {
    const { apiService, httpTestingController } = setup();

    apiService.delete<unknown>('/articles/hello-angular').subscribe();

    const request = httpTestingController.expectOne('https://example.test/api/articles/hello-angular');
    expect(request.request.method).toBe('DELETE');
    request.flush({});
    httpTestingController.verify();
  });

  it('does not append query params when queryParams argument is omitted', () => {
    const { apiService, httpTestingController } = setup();

    apiService.get<unknown>('tags').subscribe();

    const request = httpTestingController.expectOne('https://example.test/api/tags');
    expect(request.request.params.keys()).toEqual([]);
    request.flush({ tags: [] });
    httpTestingController.verify();
  });

  it('skips null/undefined values when building query params', () => {
    const { apiService, httpTestingController } = setup();

    // value !== undefined AND value !== null both guard the set()
    apiService.get<unknown>('/articles', {
      tag: 'angular',
      limit: 10,
      offset: 0
    }).subscribe();

    const request = httpTestingController.expectOne(
      (req) => req.url === 'https://example.test/api/articles'
    );
    expect(request.request.params.has('tag')).toBe(true);
    expect(request.request.params.has('limit')).toBe(true);
    request.flush({ articles: [] });
    httpTestingController.verify();
  });

  it('builds the correct URL by combining base URL and path', () => {
    const { apiService, httpTestingController } = setup();

    apiService.get<unknown>('/articles/my-slug').subscribe();

    httpTestingController.expectOne('https://example.test/api/articles/my-slug');
    httpTestingController.verify();
  });
});
