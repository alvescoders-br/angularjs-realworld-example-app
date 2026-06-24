// Refs: #5 — S3a CommentsService: RealWorld /articles/:slug/comments endpoints.

import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { ApiService } from './api.service';
import { Comment, CommentEnvelope, CommentsEnvelope } from './articles.model';

@Injectable({ providedIn: 'root' })
export class CommentsService {
  private readonly apiService = inject(ApiService);

  add(slug: string, body: string): Observable<Comment> {
    return this.apiService
      .post<CommentEnvelope, { comment: { body: string } }>(
        `/articles/${slug}/comments`,
        { comment: { body } }
      )
      .pipe(map((envelope) => envelope.comment));
  }

  getAll(slug: string): Observable<Comment[]> {
    return this.apiService
      .get<CommentsEnvelope>(`/articles/${slug}/comments`)
      .pipe(map((envelope) => envelope.comments));
  }

  destroy(commentId: number, articleSlug: string): Observable<unknown> {
    return this.apiService.delete<unknown>(
      `/articles/${articleSlug}/comments/${commentId}`
    );
  }
}
