// Refs: #5 — S3b tests: ArticleListComponent query/pagination behavior.

import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Article, ArticlesEnvelope } from '../../core/articles.model';
import { ArticlesService } from '../../core/articles.service';
import { UserService } from '../../core/user.service';
import { ArticleListComponent } from './article-list.component';

const article: Article = {
  slug: 'hello-angular',
  title: 'Hello Angular',
  description: 'Angular migration',
  body: 'Body',
  tagList: ['angular'],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  favorited: false,
  favoritesCount: 1,
  author: {
    username: 'reader',
    bio: null,
    image: null,
    following: false
  }
};

const secondArticle: Article = {
  ...article,
  slug: 'second-article',
  title: 'Second Article'
};

function setup(response: ArticlesEnvelope = { articles: [article], articlesCount: 11 }): {
  fixture: ComponentFixture<ArticleListComponent>;
  articlesService: { query: ReturnType<typeof vi.fn> };
} {
  const currentUser = signal(null);
  const articlesService = {
    query: vi.fn(() => of(response))
  };

  TestBed.configureTestingModule({
    imports: [ArticleListComponent],
    providers: [
      provideRouter([]),
      { provide: ArticlesService, useValue: articlesService },
      {
        provide: UserService,
        useValue: {
          currentUser: currentUser.asReadonly(),
          isAuthenticated: computed(() => currentUser() !== null)
        }
      }
    ]
  });
  const fixture = TestBed.createComponent(ArticleListComponent);
  fixture.componentRef.setInput('limit', 10);
  fixture.componentRef.setInput('listConfig', {
    type: 'all',
    filters: { tag: 'angular' },
    currentPage: 1
  });
  fixture.detectChanges();
  return { fixture, articlesService };
}

describe('ArticleListComponent', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('queries articles with limit, offset, and filters from the list config', () => {
    const { fixture, articlesService } = setup();

    expect(fixture.nativeElement.textContent).toContain('Hello Angular');
    expect(articlesService.query).toHaveBeenCalledWith('all', {
      tag: 'angular',
      limit: 10,
      offset: 0
    });
  });

  it('loads the selected page with the equivalent RealWorld offset', () => {
    const { fixture, articlesService } = setup();
    const pageLinks: NodeListOf<HTMLAnchorElement> =
      fixture.nativeElement.querySelectorAll('a.page-link');

    pageLinks[1].click();
    fixture.detectChanges();

    expect(articlesService.query).toHaveBeenLastCalledWith('all', {
      tag: 'angular',
      limit: 10,
      offset: 10
    });
  });

  it('updates an article in place when a child emits articleChange', () => {
    const { fixture } = setup();

    fixture.componentInstance.replaceArticle(article.slug, {
      ...article,
      title: 'Updated title',
      favorited: true,
      favoritesCount: 2
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Updated title');
  });

  it('renders the empty state when no articles are returned', () => {
    const { fixture } = setup({ articles: [], articlesCount: 0 });

    expect(fixture.nativeElement.textContent).toContain('No articles are here... yet.');
  });

  it('calculates totalPages using Math.ceil (partial last page counts as a full page)', () => {
    const { fixture } = setup({ articles: [article], articlesCount: 11 });

    // 11 articles / limit 10 = 1.1 -> Math.ceil = 2 pages
    expect(fixture.componentInstance['totalPages']()).toBe(2);
  });

  it('sets currentPage from the listConfig input', () => {
    const currentUser = signal(null);
    const articlesService = {
      query: vi.fn(() => of({ articles: [article], articlesCount: 1 }))
    };

    TestBed.configureTestingModule({
      imports: [ArticleListComponent],
      providers: [
        provideRouter([]),
        { provide: ArticlesService, useValue: articlesService },
        {
          provide: UserService,
          useValue: {
            currentUser: currentUser.asReadonly(),
            isAuthenticated: computed(() => currentUser() !== null)
          }
        }
      ]
    });
    const fixture = TestBed.createComponent(ArticleListComponent);
    fixture.componentRef.setInput('limit', 10);
    fixture.componentRef.setInput('listConfig', {
      type: 'all',
      filters: {},
      currentPage: 3
    });
    fixture.detectChanges();

    expect(fixture.componentInstance['currentPage']()).toBe(3);
  });

  it('clears the loading state on query errors', () => {
    const currentUser = signal(null);
    const articlesService = {
      query: vi.fn(() => throwError(() => new Error('network')))
    };
    TestBed.configureTestingModule({
      imports: [ArticleListComponent],
      providers: [
        provideRouter([]),
        { provide: ArticlesService, useValue: articlesService },
        {
          provide: UserService,
          useValue: {
            currentUser: currentUser.asReadonly(),
            isAuthenticated: computed(() => currentUser() !== null)
          }
        }
      ]
    });
    const fixture = TestBed.createComponent(ArticleListComponent);
    fixture.componentRef.setInput('limit', 10);
    fixture.componentRef.setInput('listConfig', { type: 'feed', filters: {}, currentPage: 1 });

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No articles are here... yet.');
  });

  it('shows the loading state until an asynchronous query resolves', () => {
    const currentUser = signal(null);
    const queryResult$ = new Subject<ArticlesEnvelope>();
    const articlesService = {
      query: vi.fn(() => queryResult$.asObservable())
    };
    TestBed.configureTestingModule({
      imports: [ArticleListComponent],
      providers: [
        provideRouter([]),
        { provide: ArticlesService, useValue: articlesService },
        {
          provide: UserService,
          useValue: {
            currentUser: currentUser.asReadonly(),
            isAuthenticated: computed(() => currentUser() !== null)
          }
        }
      ]
    });
    const fixture = TestBed.createComponent(ArticleListComponent);
    fixture.componentRef.setInput('limit', 10);
    fixture.componentRef.setInput('listConfig', { type: 'all', filters: {}, currentPage: 1 });

    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Loading articles...');

    queryResult$.next({ articles: [article], articlesCount: 1 });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Hello Angular');
    expect(fixture.nativeElement.textContent).not.toContain('Loading articles...');
  });

  it('replaces only the article whose slug matches the emitted update', () => {
    const { fixture } = setup({ articles: [article, secondArticle], articlesCount: 2 });

    fixture.componentInstance.replaceArticle(secondArticle.slug, {
      ...secondArticle,
      title: 'Updated second article'
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Hello Angular');
    expect(fixture.nativeElement.textContent).toContain('Updated second article');
  });
});
