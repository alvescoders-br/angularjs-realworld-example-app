// Refs: #5 — S3a shared component: article-meta.
// Displays article author info (image, username, date). Projected content (e.g. buttons) via ng-content.

import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { Article } from '../../core/articles.model';

@Component({
  selector: 'app-article-meta',
  imports: [DatePipe, RouterLink],
  template: `
    <div class="article-meta">
      <a [routerLink]="['/profile', article().author.username]">
        <img [src]="article().author.image ?? ''" [alt]="article().author.username" />
      </a>

      <div class="info">
        <a class="author" [routerLink]="['/profile', article().author.username]">
          {{ article().author.username }}
        </a>
        <span class="date">{{ article().createdAt | date: 'longDate' }}</span>
      </div>

      <ng-content />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArticleMetaComponent {
  readonly article = input.required<Article>();
}
