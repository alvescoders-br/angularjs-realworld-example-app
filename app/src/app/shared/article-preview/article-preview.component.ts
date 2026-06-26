// Refs: #5 — S3a shared component: article-preview.
// Renders a single article card in a list. article is a model signal to allow
// FavoriteButton to propagate updates upward.

import { ChangeDetectionStrategy, Component, model } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Article } from '../../core/articles.model';
import { ArticleMetaComponent } from '../article-meta/article-meta.component';
import { FavoriteButtonComponent } from '../favorite-button/favorite-button.component';

@Component({
  selector: 'app-article-preview',
  imports: [RouterLink, ArticleMetaComponent, FavoriteButtonComponent],
  template: `
    <div class="article-preview">
      <app-article-meta [article]="article()">
        <app-favorite-button
          class="pull-xs-right"
          [(article)]="article">
          {{ article().favoritesCount }}
        </app-favorite-button>
      </app-article-meta>

      <a [routerLink]="['/article', article().slug]" class="preview-link">
        <h1>{{ article().title }}</h1>
        <p>{{ article().description }}</p>
        <span>Read more...</span>
        <ul class="tag-list">
          @for (tag of article().tagList; track tag) {
            <li class="tag-default tag-pill tag-outline">{{ tag }}</li>
          }
        </ul>
      </a>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArticlePreviewComponent {
  readonly article = model.required<Article>();
}
