// Refs: #5 — S3c article page: article/comments/markdown/R2.

import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, distinctUntilChanged, map, switchMap } from 'rxjs/operators';

import { Article, Comment } from '../../core/articles.model';
import { ArticlesService } from '../../core/articles.service';
import { CommentsService } from '../../core/comments.service';
import { UserService } from '../../core/user.service';
import { AppState } from '../../shared/app-state';
import { ApiErrors, ListErrorsComponent } from '../../shared/list-errors/list-errors.component';
import { ArticleActionsComponent } from './article-actions.component';
import { MarkdownContentComponent } from './markdown-content.component';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

@Component({
  selector: 'app-article',
  imports: [
    ArticleActionsComponent,
    DatePipe,
    ListErrorsComponent,
    MarkdownContentComponent,
    RouterLink
  ],
  templateUrl: './article.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArticleComponent {
  private readonly appState = inject(AppState);
  private readonly articlesService = inject(ArticlesService);
  private readonly commentsService = inject(CommentsService);
  private readonly route = inject(ActivatedRoute);
  private readonly userService = inject(UserService);

  protected readonly article = signal<Article | null>(null);
  protected readonly comments = signal<Comment[]>([]);
  protected readonly commentBody = signal('');
  protected readonly commentErrors = signal<ApiErrors | null>(null);
  protected readonly isCommentSubmitting = signal(false);
  protected readonly loadError = signal<string | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly currentUser = this.userService.currentUser;
  protected readonly isAuthenticated = this.userService.isAuthenticated;

  constructor() {
    this.route.paramMap
      .pipe(
        map((params) => params.get('slug') ?? ''),
        distinctUntilChanged(),
        switchMap((slug) => this.loadArticle(slug)),
        takeUntilDestroyed()
      )
      .subscribe((result) => {
        if (result === null) return;

        this.article.set(result.article);
        this.comments.set(result.comments);
        this.commentBody.set('');
        this.commentErrors.set(null);
        this.isLoading.set(false);
        this.appState.title.set(result.article.title);
      });
  }

  protected updateCommentBody(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLTextAreaElement)) return;

    this.commentBody.set(target.value);
  }

  protected addComment(event: Event): void {
    event.preventDefault();
    const loadedArticle = this.article();
    const body = this.commentBody().trim();
    if (loadedArticle === null || body.length === 0 || this.isCommentSubmitting()) return;

    this.isCommentSubmitting.set(true);
    this.commentErrors.set(null);
    this.commentsService.add(loadedArticle.slug, body).subscribe({
      next: (comment) => {
        this.comments.update((comments) => [comment, ...comments]);
        this.commentBody.set('');
        this.isCommentSubmitting.set(false);
      },
      error: (error: unknown) => {
        this.commentErrors.set(this.extractApiErrors(error));
        this.isCommentSubmitting.set(false);
      }
    });
  }

  protected deleteComment(commentId: number): void {
    const loadedArticle = this.article();
    if (loadedArticle === null) return;

    this.commentsService.destroy(commentId, loadedArticle.slug).subscribe({
      next: () => {
        this.comments.update((comments) =>
          comments.filter((comment) => comment.id !== commentId)
        );
      }
    });
  }

  protected replaceArticle(article: Article): void {
    this.article.set(article);
  }

  protected canModifyComment(comment: Comment): boolean {
    return this.currentUser()?.username === comment.author.username;
  }

  private loadArticle(slug: string) {
    this.isLoading.set(true);
    this.loadError.set(null);
    this.article.set(null);
    this.comments.set([]);

    if (!slug.trim()) {
      this.isLoading.set(false);
      this.loadError.set('Article could not be loaded.');
      return of(null);
    }

    return forkJoin({
      article: this.articlesService.get(slug),
      comments: this.commentsService.getAll(slug)
    }).pipe(
      catchError(() => {
        this.isLoading.set(false);
        this.loadError.set('Article could not be loaded.');
        return of(null);
      })
    );
  }

  private extractApiErrors(error: unknown): ApiErrors {
    const fallback: ApiErrors = { body: ['could not be submitted'] };
    if (!isRecord(error)) return fallback;

    const responseBody = error['error'];
    if (!isRecord(responseBody)) return fallback;

    const errors = responseBody['errors'];
    if (!isRecord(errors)) return fallback;

    const apiErrors: ApiErrors = {};
    for (const [field, messages] of Object.entries(errors)) {
      if (!Array.isArray(messages)) continue;
      if (!messages.every((message): message is string => typeof message === 'string')) continue;

      apiErrors[field] = messages;
    }

    return Object.keys(apiErrors).length > 0 ? apiErrors : fallback;
  }
}
