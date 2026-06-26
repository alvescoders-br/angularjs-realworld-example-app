// Refs: #5 — S3b tests: FavoriteButtonComponent.

import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Article } from '../../core/articles.model';
import { ArticlesService } from '../../core/articles.service';
import { User } from '../../core/user.model';
import { UserService } from '../../core/user.service';
import { FavoriteButtonComponent } from './favorite-button.component';

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

const authenticatedUser: User = {
  email: 'reader@example.com',
  token: 'test-token',
  username: 'reader',
  bio: null,
  image: null
};

function setup(authenticated: boolean, initialArticle: Article = article): {
  fixture: ComponentFixture<FavoriteButtonComponent>;
  articlesService: {
    favorite: ReturnType<typeof vi.fn>;
    unfavorite: ReturnType<typeof vi.fn>;
  };
  router: { navigateByUrl: ReturnType<typeof vi.fn> };
} {
  const currentUser = signal<User | null>(authenticated ? authenticatedUser : null);
  const articlesService = {
    favorite: vi.fn(() => of({ ...initialArticle, favorited: true, favoritesCount: 2 })),
    unfavorite: vi.fn(() => of({ ...initialArticle, favorited: false, favoritesCount: 1 }))
  };
  const router = { navigateByUrl: vi.fn() };
  const userService = {
    currentUser: currentUser.asReadonly(),
    isAuthenticated: computed(() => currentUser() !== null)
  };

  TestBed.configureTestingModule({
    imports: [FavoriteButtonComponent],
    providers: [
      { provide: ArticlesService, useValue: articlesService },
      { provide: UserService, useValue: userService },
      { provide: Router, useValue: router }
    ]
  });
  const fixture = TestBed.createComponent(FavoriteButtonComponent);
  fixture.componentRef.setInput('article', initialArticle);
  fixture.detectChanges();
  return { fixture, articlesService, router };
}

describe('FavoriteButtonComponent', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('redirects anonymous users to registration instead of calling the API', () => {
    const { fixture, articlesService, router } = setup(false);

    fixture.nativeElement.querySelector('button').click();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/register');
    expect(articlesService.favorite).not.toHaveBeenCalled();
  });

  it('favorites an article and updates the model signal for authenticated users', () => {
    const { fixture, articlesService } = setup(true);

    fixture.nativeElement.querySelector('button').click();
    fixture.detectChanges();

    expect(articlesService.favorite).toHaveBeenCalledWith(article.slug);
    expect(fixture.componentInstance.article().favorited).toBe(true);
    expect(fixture.componentInstance.isSubmitting()).toBe(false);
  });

  it('unfavorites an article and clears submitting state on API errors', () => {
    const favoritedArticle = { ...article, favorited: true, favoritesCount: 2 };
    const { fixture, articlesService } = setup(true, favoritedArticle);
    articlesService.unfavorite.mockReturnValue(throwError(() => new Error('network')));

    fixture.nativeElement.querySelector('button').click();

    expect(articlesService.unfavorite).toHaveBeenCalledWith(article.slug);
    expect(fixture.componentInstance.article()).toEqual(favoritedArticle);
    expect(fixture.componentInstance.isSubmitting()).toBe(false);
  });

  it('prevents a second click while a request is already in flight', () => {
    const currentUser = signal<User | null>(authenticatedUser);
    const articlesService = {
      favorite: vi.fn(() => new Subject<Article>()),
      unfavorite: vi.fn(() => new Subject<Article>())
    };
    const router = { navigateByUrl: vi.fn() };
    const userService = {
      currentUser: currentUser.asReadonly(),
      isAuthenticated: computed(() => currentUser() !== null)
    };

    TestBed.configureTestingModule({
      imports: [FavoriteButtonComponent],
      providers: [
        { provide: ArticlesService, useValue: articlesService },
        { provide: UserService, useValue: userService },
        { provide: Router, useValue: router }
      ]
    });

    const fixture = TestBed.createComponent(FavoriteButtonComponent);
    fixture.componentRef.setInput('article', article);
    fixture.detectChanges();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    button.click();
    button.click();

    expect(articlesService.favorite).toHaveBeenCalledTimes(1);
  });

  it('applies btn-outline-primary class when the article is not favorited', () => {
    const { fixture } = setup(true);
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');

    expect(button.classList).toContain('btn-outline-primary');
    expect(button.classList).not.toContain('btn-primary');
  });

  it('applies btn-primary class when the article is favorited', () => {
    const favoritedArticle = { ...article, favorited: true };
    const { fixture } = setup(true, favoritedArticle);
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');

    expect(button.classList).toContain('btn-primary');
    expect(button.classList).not.toContain('btn-outline-primary');
  });

  it('shows the disabled class while a request is in flight', () => {
    const currentUser = signal<User | null>(authenticatedUser);
    const articlesService = {
      favorite: vi.fn(() => new Subject<Article>()),
      unfavorite: vi.fn(() => new Subject<Article>())
    };
    const router = { navigateByUrl: vi.fn() };
    const userService = {
      currentUser: currentUser.asReadonly(),
      isAuthenticated: computed(() => currentUser() !== null)
    };

    TestBed.configureTestingModule({
      imports: [FavoriteButtonComponent],
      providers: [
        { provide: ArticlesService, useValue: articlesService },
        { provide: UserService, useValue: userService },
        { provide: Router, useValue: router }
      ]
    });

    const fixture = TestBed.createComponent(FavoriteButtonComponent);
    fixture.componentRef.setInput('article', article);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('button').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('button').classList).toContain('disabled');
  });
});
