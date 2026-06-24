// Refs: #5 — S3b home/feed/tags parity.
// Mirrors the legacy home page list switching while keeping API filters immutable.

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { ArticleListConfig } from '../core/articles.model';
import { TagsService } from '../core/tags.service';
import { UserService } from '../core/user.service';
import { ArticleListComponent } from '../shared/article-list/article-list.component';

const APP_NAME = 'conduit';

@Component({
  selector: 'app-home',
  imports: [ArticleListComponent],
  templateUrl: './home.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent {
  private readonly tagsService = inject(TagsService);
  private readonly userService = inject(UserService);

  protected readonly appName = APP_NAME;
  protected readonly isAuthenticated = this.userService.isAuthenticated;
  protected readonly tagsLoaded = signal(false);
  protected readonly tags = signal<string[]>([]);
  protected readonly listConfig = signal<ArticleListConfig>(this.getInitialListConfig());
  protected readonly activeTag = computed(() => this.listConfig().filters.tag ?? null);
  protected readonly isGlobalFeedActive = computed(
    () => this.listConfig().type === 'all' && this.activeTag() === null
  );

  constructor() {
    this.loadTags();
  }

  showYourFeed(event: Event): void {
    event.preventDefault();
    this.listConfig.set({ type: 'feed', filters: {}, currentPage: 1 });
  }

  showGlobalFeed(event: Event): void {
    event.preventDefault();
    this.listConfig.set({ type: 'all', filters: {}, currentPage: 1 });
  }

  showTagFeed(event: Event, tagName: string): void {
    event.preventDefault();
    this.listConfig.set({
      type: 'all',
      filters: { tag: tagName },
      currentPage: 1
    });
  }

  preventNavigation(event: Event): void {
    event.preventDefault();
  }

  private getInitialListConfig(): ArticleListConfig {
    return {
      type: this.isAuthenticated() ? 'feed' : 'all',
      filters: {},
      currentPage: 1
    };
  }

  private loadTags(): void {
    this.tagsService.getAll().subscribe({
      next: (tags) => {
        this.tags.set(tags);
        this.tagsLoaded.set(true);
      },
      error: () => {
        this.tags.set([]);
        this.tagsLoaded.set(true);
      }
    });
  }
}
