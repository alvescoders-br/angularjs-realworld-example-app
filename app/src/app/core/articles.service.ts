// Refs: #5 — S3a ArticlesService: RealWorld /articles endpoints.
// Paths and envelopes are immutable per §3.2. save() avoids mutating the caller's object.

import { inject, Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map } from 'rxjs/operators';

import { ApiService } from './api.service';
import {
  Article,
  ArticleEnvelope,
  ArticleFilters,
  ArticlesEnvelope,
  ArticleSave
} from './articles.model';

@Injectable({ providedIn: 'root' })
export class ArticlesService {
  private readonly apiService = inject(ApiService);

  query(
    type: 'all' | 'feed',
    filters: ArticleFilters = {}
  ): Observable<ArticlesEnvelope> {
    const path = type === 'feed' ? '/articles/feed' : '/articles';
    const queryParams: Record<string, string | number | boolean> = {};
    if (filters.tag !== undefined) queryParams['tag'] = filters.tag;
    if (filters.author !== undefined) queryParams['author'] = filters.author;
    if (filters.favorited !== undefined) queryParams['favorited'] = filters.favorited;
    if (filters.limit !== undefined) queryParams['limit'] = filters.limit;
    if (filters.offset !== undefined) queryParams['offset'] = filters.offset;
    return this.apiService.get<ArticlesEnvelope>(path, queryParams);
  }

  get(slug: string): Observable<Article> {
    if (!slug.trim()) {
      return throwError(() => new Error('Article slug is empty'));
    }
    return this.apiService
      .get<ArticleEnvelope>(`/articles/${slug}`)
      .pipe(map((envelope) => envelope.article));
  }

  destroy(slug: string): Observable<unknown> {
    return this.apiService.delete<unknown>(`/articles/${slug}`);
  }

  save(article: ArticleSave): Observable<Article> {
    const { slug, ...fields } = article;

    if (slug) {
      return this.apiService
        .put<ArticleEnvelope, { article: Omit<ArticleSave, 'slug'> }>(
          `/articles/${slug}`,
          { article: fields }
        )
        .pipe(map((envelope) => envelope.article));
    }

    return this.apiService
      .post<ArticleEnvelope, { article: Omit<ArticleSave, 'slug'> }>(
        '/articles',
        { article: fields }
      )
      .pipe(map((envelope) => envelope.article));
  }

  favorite(slug: string): Observable<Article> {
    return this.apiService
      .post<ArticleEnvelope, Record<never, never>>(`/articles/${slug}/favorite`, {})
      .pipe(map((envelope) => envelope.article));
  }

  unfavorite(slug: string): Observable<Article> {
    return this.apiService
      .delete<ArticleEnvelope>(`/articles/${slug}/favorite`)
      .pipe(map((envelope) => envelope.article));
  }
}
