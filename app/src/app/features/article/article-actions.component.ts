// Refs: #5 — S3c article actions: edit/delete for author, follow/favorite for readers.
// R2: permissions are derived from the initialized article signal, not constructor-time bindings.

import { ChangeDetectionStrategy, Component, computed, inject, model, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { Article, Profile } from '../../core/articles.model';
import { ArticlesService } from '../../core/articles.service';
import { UserService } from '../../core/user.service';
import { ArticleMetaComponent } from '../../shared/article-meta/article-meta.component';
import { FavoriteButtonComponent } from '../../shared/favorite-button/favorite-button.component';
import { FollowButtonComponent } from '../../shared/follow-button/follow-button.component';

@Component({
  selector: 'app-article-actions',
  imports: [ArticleMetaComponent, FavoriteButtonComponent, FollowButtonComponent, RouterLink],
  template: `
    <app-article-meta [article]="article()">
      @if (canModify()) {
        <span>
          <a
            class="btn btn-sm btn-outline-secondary"
            [routerLink]="['/editor', article().slug]">
            <i class="ion-edit"></i> Edit Article
          </a>
          &nbsp;
          <button
            class="btn btn-sm btn-outline-danger"
            [class.disabled]="isDeleting()"
            (click)="deleteArticle()">
            <i class="ion-trash-a"></i> Delete Article
          </button>
        </span>
      } @else {
        <span>
          <app-follow-button
            [profile]="article().author"
            (profileChange)="replaceAuthor($event)" />
          &nbsp;
          <app-favorite-button [(article)]="article">
            {{ article().favorited ? 'Unfavorite' : 'Favorite' }} Article
            <span class="counter">({{ article().favoritesCount }})</span>
          </app-favorite-button>
        </span>
      }
    </app-article-meta>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArticleActionsComponent {
  private readonly articlesService = inject(ArticlesService);
  private readonly router = inject(Router);
  private readonly userService = inject(UserService);

  readonly article = model.required<Article>();
  readonly isDeleting = signal(false);
  readonly canModify = computed(() => {
    const currentUser = this.userService.currentUser();
    return currentUser?.username === this.article().author.username;
  });

  replaceAuthor(profile: Profile): void {
    this.article.update((article) => ({
      ...article,
      author: profile
    }));
  }

  deleteArticle(): void {
    if (this.isDeleting()) return;

    this.isDeleting.set(true);
    this.articlesService.destroy(this.article().slug).subscribe({
      next: () => {
        void this.router.navigateByUrl('/');
      },
      error: () => {
        void this.router.navigateByUrl('/');
      }
    });
  }
}
