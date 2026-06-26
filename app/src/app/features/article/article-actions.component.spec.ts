// Refs: #5 — S3c tests: ArticleActionsComponent lifecycle-safe permissions and R2 actions.

import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Article, Profile } from '../../core/articles.model';
import { ArticlesService } from '../../core/articles.service';
import { ProfileService } from '../../core/profile.service';
import { User } from '../../core/user.model';
import { UserService } from '../../core/user.service';
import { ArticleActionsComponent } from './article-actions.component';

const authorProfile: Profile = {
  username: 'author',
  bio: null,
  image: null,
  following: false
};

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
  author: authorProfile
};

const readerUser: User = {
  email: 'reader@example.com',
  token: 'test-token',
  username: 'reader',
  bio: null,
  image: null
};

const authorUser: User = {
  ...readerUser,
  username: 'author'
};

type SetupResult = {
  fixture: ComponentFixture<ArticleActionsComponent>;
  articlesService: {
    destroy: ReturnType<typeof vi.fn>;
    favorite: ReturnType<typeof vi.fn>;
    unfavorite: ReturnType<typeof vi.fn>;
  };
  profileService: {
    follow: ReturnType<typeof vi.fn>;
    unfollow: ReturnType<typeof vi.fn>;
  };
  router: Router;
};

function setup(currentUser: User | null): SetupResult {
  const currentUserSignal = signal<User | null>(currentUser);
  const articlesService = {
    destroy: vi.fn(() => of({})),
    favorite: vi.fn(() => of({ ...article, favorited: true, favoritesCount: 2 })),
    unfavorite: vi.fn(() => of({ ...article, favorited: false, favoritesCount: 1 }))
  };
  const profileService = {
    follow: vi.fn(() => of({ ...authorProfile, following: true })),
    unfollow: vi.fn(() => of({ ...authorProfile, following: false }))
  };
  const userService = {
    currentUser: currentUserSignal.asReadonly(),
    isAuthenticated: computed(() => currentUserSignal() !== null)
  };

  TestBed.configureTestingModule({
    imports: [ArticleActionsComponent],
    providers: [
      provideRouter([]),
      { provide: ArticlesService, useValue: articlesService },
      { provide: ProfileService, useValue: profileService },
      { provide: UserService, useValue: userService }
    ]
  });

  const router = TestBed.inject(Router);
  vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
  const fixture = TestBed.createComponent(ArticleActionsComponent);
  fixture.componentRef.setInput('article', article);
  fixture.detectChanges();

  return { fixture, articlesService, profileService, router };
}

describe('ArticleActionsComponent', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('derives author permissions after the article input is initialized', () => {
    const { fixture, articlesService, router } = setup(authorUser);

    expect(fixture.nativeElement.textContent).toContain('Edit Article');

    const deleteButton: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-outline-danger');
    deleteButton.click();

    expect(articlesService.destroy).toHaveBeenCalledWith(article.slug);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('updates follow and favorite state for non-authors', () => {
    const { fixture, articlesService, profileService } = setup(readerUser);
    const buttons: HTMLButtonElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('button')
    );

    buttons[0].click();
    fixture.detectChanges();

    expect(profileService.follow).toHaveBeenCalledWith('author');
    expect(fixture.componentInstance.article().author.following).toBe(true);

    buttons[1].click();
    fixture.detectChanges();

    expect(articlesService.favorite).toHaveBeenCalledWith(article.slug);
    expect(fixture.componentInstance.article().favorited).toBe(true);
  });

  it('ignores a second delete click while a delete is already in flight', () => {
    const { fixture, articlesService } = setup(authorUser);
    // Use a Subject that never emits to simulate an in-flight request
    articlesService.destroy.mockReturnValue(new Subject());

    const deleteButton: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-outline-danger');
    deleteButton.click();
    deleteButton.click();

    expect(articlesService.destroy).toHaveBeenCalledTimes(1);
  });

  it('redirects home even when delete fails', () => {
    const { fixture, articlesService, router } = setup(authorUser);
    articlesService.destroy.mockReturnValue(throwError(() => new Error('server error')));

    const deleteButton: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-outline-danger');
    deleteButton.click();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('shows follow/favorite buttons for unauthenticated visitors', () => {
    const { fixture } = setup(null);

    expect(fixture.nativeElement.querySelector('app-follow-button')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-favorite-button')).not.toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Edit Article');
  });

  it('updates article.author when replaceAuthor is called', () => {
    const { fixture } = setup(readerUser);
    const updatedProfile: Profile = { ...authorProfile, following: true };

    fixture.componentInstance.replaceAuthor(updatedProfile);
    fixture.detectChanges();

    expect(fixture.componentInstance.article().author.following).toBe(true);
  });
});
