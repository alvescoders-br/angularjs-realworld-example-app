// Refs: #5 — S3a shared component: article-list.
// Fetches and renders a paginated list of articles. Reacts to listConfig / limit changes via Signals.

import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  signal,
  untracked
} from '@angular/core';

import { ArticlesService } from '../../core/articles.service';
import { Article, ArticleListConfig } from '../../core/articles.model';
import { ArticlePreviewComponent } from '../article-preview/article-preview.component';
import { ListPaginationComponent } from '../list-pagination/list-pagination.component';

const PAGE_SIZE = 10;

@Component({
  selector: 'app-article-list',
  imports: [ArticlePreviewComponent, ListPaginationComponent],
  template: `
    @if (loading()) {
      <div class="article-preview">Loading articles...</div>
    } @else if (articles().length === 0) {
      <div class="article-preview">No articles are here... yet.</div>
    } @else {
      @for (article of articles(); track article.slug) {
        <app-article-preview
          [article]="article"
          (articleChange)="replaceArticle(article.slug, $event)" />
      }
      <app-list-pagination
        [totalPages]="totalPages()"
        [currentPage]="currentPage()"
        (pageChange)="onPageChange($event)" />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArticleListComponent {
  private readonly articlesService = inject(ArticlesService);

  readonly listConfig = input.required<ArticleListConfig>();
  readonly limit = input(PAGE_SIZE);

  protected readonly loading = signal(true);
  protected readonly articles = signal<Article[]>([]);
  protected readonly totalPages = signal(0);
  protected readonly currentPage = signal(1);

  constructor() {
    effect(() => {
      const config = this.listConfig();
      this.currentPage.set(config.currentPage ?? 1);
      untracked(() => this.loadArticles());
    });
  }

  onPageChange(pageNumber: number): void {
    this.currentPage.set(pageNumber);
    this.loadArticles();
  }

  replaceArticle(originalSlug: string, updatedArticle: Article): void {
    this.articles.update((articles) =>
      articles.map((article) => article.slug === originalSlug ? updatedArticle : article)
    );
  }

  private loadArticles(): void {
    this.loading.set(true);
    const config = this.listConfig();
    const offset = this.limit() * (this.currentPage() - 1);

    this.articlesService
      .query(config.type, {
        ...config.filters,
        limit: this.limit(),
        offset
      })
      .subscribe({
        next: (result) => {
          this.articles.set(result.articles);
          this.totalPages.set(Math.ceil(result.articlesCount / this.limit()));
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        }
      });
  }
}
