// Refs: #5 — S3b tests: ArticlesService RealWorld paths/envelopes.

import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiService } from './api.service';
import { Article, ArticleSave } from './articles.model';
import { ArticlesService } from './articles.service';

const article: Article = {
  slug: 'hello-angular',
  title: 'Hello Angular',
  description: 'Angular migration',
  body: 'Body',
  tagList: ['angular'],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  favorited: false,
  favoritesCount: 1,
  author: {
    username: 'reader',
    bio: null,
    image: null,
    following: false
  }
};

function setup(): {
  service: ArticlesService;
  apiService: {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    put: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
} {
  const apiService = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  };

  TestBed.configureTestingModule({
    providers: [
      ArticlesService,
      { provide: ApiService, useValue: apiService }
    ]
  });

  return {
    service: TestBed.inject(ArticlesService),
    apiService
  };
}

describe('ArticlesService', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('queries the global article list with RealWorld filters', async () => {
    const { service, apiService } = setup();
    apiService.get.mockReturnValue(of({ articles: [article], articlesCount: 1 }));

    const response = await firstValueFrom(
      service.query('all', { tag: 'angular', limit: 10, offset: 0 })
    );

    expect(apiService.get).toHaveBeenCalledWith('/articles', {
      tag: 'angular',
      limit: 10,
      offset: 0
    });
    expect(response.articles).toEqual([article]);
  });

  it('queries the personalized feed path', async () => {
    const { service, apiService } = setup();
    apiService.get.mockReturnValue(of({ articles: [], articlesCount: 0 }));

    await firstValueFrom(service.query('feed', { limit: 10, offset: 10 }));

    expect(apiService.get).toHaveBeenCalledWith('/articles/feed', {
      limit: 10,
      offset: 10
    });
  });

  it('unwraps a single article envelope', async () => {
    const { service, apiService } = setup();
    apiService.get.mockReturnValue(of({ article }));

    await expect(firstValueFrom(service.get(article.slug))).resolves.toEqual(article);
    expect(apiService.get).toHaveBeenCalledWith('/articles/hello-angular');
  });

  it('rejects empty slugs before calling the API', async () => {
    const { service, apiService } = setup();

    await expect(firstValueFrom(service.get(' '))).rejects.toThrow('Article slug is empty');
    expect(apiService.get).not.toHaveBeenCalled();
  });

  it('creates new articles without a slug', async () => {
    const { service, apiService } = setup();
    const saveRequest: ArticleSave = {
      title: 'New article',
      description: 'Description',
      body: 'Body',
      tagList: []
    };
    apiService.post.mockReturnValue(of({ article }));

    await expect(firstValueFrom(service.save(saveRequest))).resolves.toEqual(article);
    expect(apiService.post).toHaveBeenCalledWith('/articles', { article: saveRequest });
  });

  it('updates existing articles without mutating the caller payload', async () => {
    const { service, apiService } = setup();
    const saveRequest: ArticleSave = {
      slug: article.slug,
      title: 'Updated',
      description: 'Description',
      body: 'Body',
      tagList: ['angular']
    };
    apiService.put.mockReturnValue(of({ article }));

    await firstValueFrom(service.save(saveRequest));

    expect(saveRequest.slug).toBe(article.slug);
    expect(apiService.put).toHaveBeenCalledWith('/articles/hello-angular', {
      article: {
        title: 'Updated',
        description: 'Description',
        body: 'Body',
        tagList: ['angular']
      }
    });
  });

  it('uses immutable RealWorld paths for destroy/favorite/unfavorite', async () => {
    const { service, apiService } = setup();
    apiService.delete.mockReturnValue(of({ article }));
    apiService.post.mockReturnValue(of({ article }));

    await firstValueFrom(service.destroy(article.slug));
    await firstValueFrom(service.favorite(article.slug));
    await firstValueFrom(service.unfavorite(article.slug));

    expect(apiService.delete).toHaveBeenCalledWith('/articles/hello-angular');
    expect(apiService.post).toHaveBeenCalledWith('/articles/hello-angular/favorite', {});
    expect(apiService.delete).toHaveBeenCalledWith('/articles/hello-angular/favorite');
  });

  it('queries articles filtered by author only', async () => {
    const { service, apiService } = setup();
    apiService.get.mockReturnValue(of({ articles: [article], articlesCount: 1 }));

    await firstValueFrom(service.query('all', { author: 'writer' }));

    expect(apiService.get).toHaveBeenCalledWith('/articles', { author: 'writer' });
  });

  it('queries articles filtered by favorited only', async () => {
    const { service, apiService } = setup();
    apiService.get.mockReturnValue(of({ articles: [article], articlesCount: 1 }));

    await firstValueFrom(service.query('all', { favorited: 'reader' }));

    expect(apiService.get).toHaveBeenCalledWith('/articles', { favorited: 'reader' });
  });

  it('omits undefined filter keys from the query params', async () => {
    const { service, apiService } = setup();
    apiService.get.mockReturnValue(of({ articles: [], articlesCount: 0 }));

    await firstValueFrom(service.query('all', {}));

    expect(apiService.get).toHaveBeenCalledWith('/articles', {});
  });

  it('unwraps the article envelope for save (new article)', async () => {
    const { service, apiService } = setup();
    apiService.post.mockReturnValue(of({ article }));
    const saveRequest: ArticleSave = {
      title: 'New article',
      description: 'Desc',
      body: 'Body',
      tagList: []
    };

    const result = await firstValueFrom(service.save(saveRequest));

    expect(result).toEqual(article);
  });

  it('unwraps the article envelope for save (edit article)', async () => {
    const { service, apiService } = setup();
    apiService.put.mockReturnValue(of({ article }));
    const saveRequest: ArticleSave = {
      slug: article.slug,
      title: 'Updated',
      description: 'Desc',
      body: 'Body',
      tagList: []
    };

    const result = await firstValueFrom(service.save(saveRequest));

    expect(result).toEqual(article);
  });

  it('unwraps the article envelope from favorite()', async () => {
    const { service, apiService } = setup();
    apiService.post.mockReturnValue(of({ article }));

    const result = await firstValueFrom(service.favorite(article.slug));

    expect(result).toEqual(article);
  });

  it('unwraps the article envelope from unfavorite()', async () => {
    const { service, apiService } = setup();
    apiService.delete.mockReturnValue(of({ article }));

    const result = await firstValueFrom(service.unfavorite(article.slug));

    expect(result).toEqual(article);
  });

  it('does not include tag in queryParams when tag filter is absent', async () => {
    const { service, apiService } = setup();
    apiService.get.mockReturnValue(of({ articles: [], articlesCount: 0 }));

    await firstValueFrom(service.query('all', {}));

    const params = apiService.get.mock.calls[0][1] as Record<string, unknown>;
    expect(Object.prototype.hasOwnProperty.call(params, 'tag')).toBe(false);
  });

  it('does not include author in queryParams when author filter is absent', async () => {
    const { service, apiService } = setup();
    apiService.get.mockReturnValue(of({ articles: [], articlesCount: 0 }));

    await firstValueFrom(service.query('all', {}));

    const params = apiService.get.mock.calls[0][1] as Record<string, unknown>;
    expect(Object.prototype.hasOwnProperty.call(params, 'author')).toBe(false);
  });

  it('does not include limit/offset in queryParams when those filters are absent', async () => {
    const { service, apiService } = setup();
    apiService.get.mockReturnValue(of({ articles: [], articlesCount: 0 }));

    await firstValueFrom(service.query('all', { tag: 'x' }));

    const params = apiService.get.mock.calls[0][1] as Record<string, unknown>;
    expect(Object.prototype.hasOwnProperty.call(params, 'limit')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(params, 'offset')).toBe(false);
  });

  it('rejects empty slugs with an Error instance (kills ArrowFunction mutation)', async () => {
    const { service } = setup();

    let caughtError: unknown;
    try {
      await firstValueFrom(service.get(''));
    } catch (error) {
      caughtError = error;
    }

    expect(caughtError).toBeInstanceOf(Error);
    expect((caughtError as Error).message).toBe('Article slug is empty');
  });
});
