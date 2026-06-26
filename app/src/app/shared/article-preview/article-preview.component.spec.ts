// Refs: #5 — S3b tests: ArticlePreviewComponent.

import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Article } from '../../core/articles.model';
import { ArticlesService } from '../../core/articles.service';
import { UserService } from '../../core/user.service';
import { ArticlePreviewComponent } from './article-preview.component';

const article: Article = {
  slug: 'hello-angular',
  title: 'Hello Angular',
  description: 'Angular migration',
  body: 'Body',
  tagList: ['angular', 'testing'],
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

function setup(): ComponentFixture<ArticlePreviewComponent> {
  const currentUser = signal(null);
  TestBed.configureTestingModule({
    imports: [ArticlePreviewComponent],
    providers: [
      provideRouter([]),
      {
        provide: ArticlesService,
        useValue: {
          favorite: vi.fn(() => of({ ...article, favorited: true })),
          unfavorite: vi.fn(() => of(article))
        }
      },
      {
        provide: UserService,
        useValue: {
          currentUser: currentUser.asReadonly(),
          isAuthenticated: computed(() => currentUser() !== null)
        }
      }
    ]
  });
  const fixture = TestBed.createComponent(ArticlePreviewComponent);
  fixture.componentRef.setInput('article', article);
  fixture.detectChanges();
  return fixture;
}

describe('ArticlePreviewComponent', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('renders article title, description, tag list, and article link', () => {
    const fixture = setup();
    const link: HTMLAnchorElement | null = fixture.nativeElement.querySelector('.preview-link');
    const tags: NodeListOf<HTMLLIElement> = fixture.nativeElement.querySelectorAll('.tag-list li');

    expect(fixture.nativeElement.textContent).toContain('Hello Angular');
    expect(fixture.nativeElement.textContent).toContain('Angular migration');
    expect(link?.getAttribute('href')).toBe('/article/hello-angular');
    expect(Array.from(tags).map((tag) => tag.textContent?.trim())).toEqual([
      'angular',
      'testing'
    ]);
  });

  it('renders the favorites count in the favorite button', () => {
    const fixture = setup();

    expect(fixture.nativeElement.textContent).toContain('1');
  });

  it('renders no tag list items when the article has an empty tagList', () => {
    const currentUser = signal(null);
    const emptyTagArticle: Article = { ...article, tagList: [] };

    TestBed.configureTestingModule({
      imports: [ArticlePreviewComponent],
      providers: [
        provideRouter([]),
        {
          provide: ArticlesService,
          useValue: {
            favorite: vi.fn(() => of({ ...emptyTagArticle, favorited: true })),
            unfavorite: vi.fn(() => of(emptyTagArticle))
          }
        },
        {
          provide: UserService,
          useValue: {
            currentUser: currentUser.asReadonly(),
            isAuthenticated: computed(() => currentUser() !== null)
          }
        }
      ]
    });

    const fixture = TestBed.createComponent(ArticlePreviewComponent);
    fixture.componentRef.setInput('article', emptyTagArticle);
    fixture.detectChanges();

    const tags: NodeListOf<HTMLLIElement> = fixture.nativeElement.querySelectorAll('.tag-list li');
    expect(tags.length).toBe(0);
  });
});
