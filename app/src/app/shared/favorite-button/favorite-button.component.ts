// Refs: #5 — S3a shared component: favorite-button.
// Toggles article favorite state. Redirects to /register when anonymous (S3a acceptance criteria).
// Uses Signals (PP-3.1). submit() is idempotent while isSubmitting.

import {
  ChangeDetectionStrategy,
  Component,
  inject,
  model,
  signal
} from '@angular/core';
import { Router } from '@angular/router';

import { ArticlesService } from '../../core/articles.service';
import { Article } from '../../core/articles.model';
import { UserService } from '../../core/user.service';

@Component({
  selector: 'app-favorite-button',
  template: `
    <button
      class="btn btn-sm"
      [class.disabled]="isSubmitting()"
      [class.btn-primary]="article().favorited"
      [class.btn-outline-primary]="!article().favorited"
      (click)="submit()">
      <i class="ion-heart"></i>
      <ng-content />
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FavoriteButtonComponent {
  private readonly articlesService = inject(ArticlesService);
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);

  readonly article = model.required<Article>();
  readonly isSubmitting = signal(false);

  submit(): void {
    if (this.isSubmitting()) return;

    if (!this.userService.isAuthenticated()) {
      void this.router.navigateByUrl('/register');
      return;
    }

    this.isSubmitting.set(true);

    const action$ = this.article().favorited
      ? this.articlesService.unfavorite(this.article().slug)
      : this.articlesService.favorite(this.article().slug);

    action$.subscribe({
      next: (updated) => {
        this.article.set(updated);
        this.isSubmitting.set(false);
      },
      error: () => {
        this.isSubmitting.set(false);
      }
    });
  }
}
