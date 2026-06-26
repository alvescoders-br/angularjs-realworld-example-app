// Refs: #7 — S3 mutation-kill tests: CommentsService RealWorld paths/envelopes.

import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiService } from './api.service';
import { Comment } from './articles.model';
import { CommentsService } from './comments.service';

const comment: Comment = {
  id: 42,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  body: 'Great article!',
  author: {
    username: 'reader',
    bio: null,
    image: null,
    following: false
  }
};

function setup(): {
  service: CommentsService;
  apiService: {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
} {
  const apiService = {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn()
  };

  TestBed.configureTestingModule({
    providers: [
      CommentsService,
      { provide: ApiService, useValue: apiService }
    ]
  });

  return {
    service: TestBed.inject(CommentsService),
    apiService
  };
}

describe('CommentsService', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('adds a comment via POST /articles/:slug/comments and unwraps the envelope', async () => {
    const { service, apiService } = setup();
    apiService.post.mockReturnValue(of({ comment }));

    const result = await firstValueFrom(service.add('hello-angular', 'Great article!'));

    expect(apiService.post).toHaveBeenCalledWith(
      '/articles/hello-angular/comments',
      { comment: { body: 'Great article!' } }
    );
    expect(result).toEqual(comment);
  });

  it('retrieves all comments via GET /articles/:slug/comments and unwraps the envelope', async () => {
    const { service, apiService } = setup();
    apiService.get.mockReturnValue(of({ comments: [comment] }));

    const result = await firstValueFrom(service.getAll('hello-angular'));

    expect(apiService.get).toHaveBeenCalledWith('/articles/hello-angular/comments');
    expect(result).toEqual([comment]);
  });

  it('returns an empty array when there are no comments', async () => {
    const { service, apiService } = setup();
    apiService.get.mockReturnValue(of({ comments: [] }));

    const result = await firstValueFrom(service.getAll('empty-article'));

    expect(apiService.get).toHaveBeenCalledWith('/articles/empty-article/comments');
    expect(result).toEqual([]);
  });

  it('deletes a comment via DELETE /articles/:slug/comments/:id', async () => {
    const { service, apiService } = setup();
    apiService.delete.mockReturnValue(of({}));

    await firstValueFrom(service.destroy(42, 'hello-angular'));

    expect(apiService.delete).toHaveBeenCalledWith('/articles/hello-angular/comments/42');
  });

  it('uses the correct slug and comment id in the DELETE path', async () => {
    const { service, apiService } = setup();
    apiService.delete.mockReturnValue(of({}));

    await firstValueFrom(service.destroy(99, 'another-slug'));

    expect(apiService.delete).toHaveBeenCalledWith('/articles/another-slug/comments/99');
    expect(apiService.delete).not.toHaveBeenCalledWith('/articles/hello-angular/comments/42');
  });

  it('embeds the comment body string inside the comment wrapper object on add', async () => {
    const { service, apiService } = setup();
    const differentBody = 'Specific body text';
    apiService.post.mockReturnValue(of({ comment: { ...comment, body: differentBody } }));

    const result = await firstValueFrom(service.add('test-slug', differentBody));

    expect(apiService.post).toHaveBeenCalledWith(
      '/articles/test-slug/comments',
      { comment: { body: differentBody } }
    );
    expect(result.body).toBe(differentBody);
  });
});
