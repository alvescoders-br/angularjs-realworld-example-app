// Refs: #5 — S3b tests: HomeComponent feed/tags behavior.
// Refs: #7 — fase-5-qualidade: mutation score — kills survived/nocov mutants.

import { Component, input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { computed, signal } from '@angular/core';
import { of, Subject, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ArticleListConfig } from '../core/articles.model';
import { TagsService } from '../core/tags.service';
import { User } from '../core/user.model';
import { UserService } from '../core/user.service';
import { ArticleListComponent } from '../shared/article-list/article-list.component';
import { HomeComponent } from './home.component';

type SetupOptions = {
  authenticated?: boolean;
  tags?: string[];
};

@Component({
  selector: 'app-article-list',
  template: '',
  standalone: true
})
class ArticleListStubComponent {
  readonly limit = input.required<number>();
  readonly listConfig = input.required<ArticleListConfig>();
}

const authenticatedUser: User = {
  email: 'reader@example.com',
  token: 'test-token',
  username: 'reader',
  bio: null,
  image: null
};

function setup(options: SetupOptions = {}): {
  fixture: ComponentFixture<HomeComponent>;
  articleList: ArticleListStubComponent;
} {
  const currentUser = signal<User | null>(
    options.authenticated === true ? authenticatedUser : null
  );
  const tagsService = {
    getAll: vi.fn(() => of(options.tags ?? ['angular', 'testing']))
  };
  const userService = {
    currentUser: currentUser.asReadonly(),
    isAuthenticated: computed(() => currentUser() !== null)
  };

  TestBed.configureTestingModule({
    imports: [HomeComponent],
    providers: [
      { provide: TagsService, useValue: tagsService },
      { provide: UserService, useValue: userService }
    ]
  });
  TestBed.overrideComponent(HomeComponent, {
    remove: { imports: [ArticleListComponent] },
    add: { imports: [ArticleListStubComponent] }
  });

  const fixture = TestBed.createComponent(HomeComponent);
  fixture.detectChanges();
  const articleList = fixture.debugElement.query(By.directive(ArticleListStubComponent))
    .componentInstance as ArticleListStubComponent;

  return { fixture, articleList };
}

function getActiveFeedText(fixture: ComponentFixture<HomeComponent>): string {
  const activeLink: HTMLAnchorElement | null =
    fixture.nativeElement.querySelector('.feed-toggle .nav-link.active');
  return activeLink?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
}

describe('HomeComponent', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('starts anonymous users on Global Feed and shows the banner', () => {
    const { fixture, articleList } = setup({ authenticated: false });

    expect(fixture.nativeElement.querySelector('.banner')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('A place to share your knowledge.');
    expect(getActiveFeedText(fixture)).toBe('Global Feed');
    expect(articleList.limit()).toBe(10);
    expect(articleList.listConfig()).toEqual({
      type: 'all',
      filters: {},
      currentPage: 1
    });
  });

  it('starts authenticated users on Your Feed and hides the banner', () => {
    const { fixture, articleList } = setup({ authenticated: true });

    expect(fixture.nativeElement.querySelector('.banner')).toBeNull();
    expect(getActiveFeedText(fixture)).toBe('Your Feed');
    expect(articleList.listConfig()).toEqual({
      type: 'feed',
      filters: {},
      currentPage: 1
    });
  });

  it('switches to a tag feed when a popular tag is selected', () => {
    const { fixture, articleList } = setup({ tags: ['angular', 'testing'] });
    const tagLinks: HTMLAnchorElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('.sidebar .tag-pill')
    );
    const angularTag = tagLinks.find((link) => link.textContent?.trim() === 'angular');

    angularTag?.click();
    fixture.detectChanges();

    expect(getActiveFeedText(fixture)).toBe('angular');
    expect(articleList.listConfig()).toEqual({
      type: 'all',
      filters: { tag: 'angular' },
      currentPage: 1
    });
  });

  it('shows the empty tags message after loading an empty tag list', () => {
    const { fixture } = setup({ tags: [] });

    expect(fixture.nativeElement.textContent).toContain('No tags are here... yet.');
  });

  it('shows the app name in the banner for anonymous users', () => {
    const { fixture } = setup({ authenticated: false });

    expect(fixture.nativeElement.querySelector('.banner h1')?.textContent?.trim()).toBe('conduit');
  });

  it('switches to global feed when showGlobalFeed is called', () => {
    const { fixture } = setup({ authenticated: true });

    // Start on Your Feed
    expect(getActiveFeedText(fixture)).toBe('Your Feed');

    const globalFeedLink: HTMLAnchorElement = fixture.nativeElement.querySelector(
      '.feed-toggle .nav-link:not(.active)'
    );
    globalFeedLink.click();
    fixture.detectChanges();

    expect(getActiveFeedText(fixture)).toBe('Global Feed');
    expect(fixture.componentInstance['listConfig']()).toEqual({
      type: 'all',
      filters: {},
      currentPage: 1
    });
  });

  it('isGlobalFeedActive is false when authenticated user is on Your Feed', () => {
    const { fixture } = setup({ authenticated: true });

    expect(fixture.componentInstance['isGlobalFeedActive']()).toBe(false);
  });

  it('isGlobalFeedActive is true when on Global Feed', () => {
    const { fixture } = setup({ authenticated: false });

    expect(fixture.componentInstance['isGlobalFeedActive']()).toBe(true);
  });

  // — Kills nocov mutants: loadTags error path —

  it('sets tags to empty array and tagsLoaded to true when the tags service fails', () => {
    const currentUser = signal<User | null>(null);
    const tagsService = { getAll: vi.fn(() => throwError(() => new Error('network error'))) };
    const userService = {
      currentUser: currentUser.asReadonly(),
      isAuthenticated: computed(() => currentUser() !== null)
    };

    TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        { provide: TagsService, useValue: tagsService },
        { provide: UserService, useValue: userService }
      ]
    });
    TestBed.overrideComponent(HomeComponent, {
      remove: { imports: [ArticleListComponent] },
      add: { imports: [ArticleListStubComponent] }
    });

    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance['tags']()).toEqual([]);
    expect(fixture.componentInstance['tagsLoaded']()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('No tags are here... yet.');
  });

  it('tagsLoaded is set to true after tags load successfully (kills BooleanLiteral mutation)', () => {
    const { fixture } = setup({ tags: ['angular'] });

    expect(fixture.componentInstance['tagsLoaded']()).toBe(true);
    expect(fixture.componentInstance['tags']()).toContain('angular');
  });

  it('showYourFeed switches to feed type list config', () => {
    const { fixture } = setup({ authenticated: false });

    const yourFeedEvent = new Event('click');
    fixture.componentInstance.showYourFeed(yourFeedEvent);
    fixture.detectChanges();

    expect(fixture.componentInstance['listConfig']()).toEqual({
      type: 'feed',
      filters: {},
      currentPage: 1
    });
  });

  it('preventNavigation calls event.preventDefault() without changing list config', () => {
    const { fixture } = setup({ authenticated: false });
    const initialConfig = fixture.componentInstance['listConfig']();
    const event = new Event('click', { cancelable: true });

    fixture.componentInstance.preventNavigation(event);

    expect(event.defaultPrevented).toBe(true);
    expect(fixture.componentInstance['listConfig']()).toEqual(initialConfig);
  });

  it('starts with unloaded empty tags until an asynchronous tag request resolves', () => {
    const currentUser = signal<User | null>(null);
    const tagsResult$ = new Subject<string[]>();
    const tagsService = { getAll: vi.fn(() => tagsResult$.asObservable()) };
    const userService = {
      currentUser: currentUser.asReadonly(),
      isAuthenticated: computed(() => currentUser() !== null)
    };

    TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        { provide: TagsService, useValue: tagsService },
        { provide: UserService, useValue: userService }
      ]
    });
    TestBed.overrideComponent(HomeComponent, {
      remove: { imports: [ArticleListComponent] },
      add: { imports: [ArticleListStubComponent] }
    });

    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance['tagsLoaded']()).toBe(false);
    expect(fixture.componentInstance['tags']()).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('Loading tags...');

    tagsResult$.next(['angular']);
    fixture.detectChanges();

    expect(fixture.componentInstance['tagsLoaded']()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('angular');
  });
});
