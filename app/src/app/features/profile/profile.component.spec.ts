// Refs: #5 -- S3d profile page: profile info, follow, authored/favorited tabs.
// Refs: #7 -- fase-5-qualidade: mutation score -- kills survived/nocov mutants.

import { Component, input, model } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { computed, signal } from '@angular/core';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ArticleListConfig, Profile } from '../../core/articles.model';
import { ProfileService } from '../../core/profile.service';
import { User } from '../../core/user.model';
import { UserService } from '../../core/user.service';
import { AppState } from '../../shared/app-state';
import { ArticleListComponent } from '../../shared/article-list/article-list.component';
import { FollowButtonComponent } from '../../shared/follow-button/follow-button.component';
import { ProfilePageComponent } from './profile.component';

// ---------------------------------------------------------------------------
// Stubs
// ---------------------------------------------------------------------------

@Component({
  selector: 'app-article-list',
  template: '',
  standalone: true
})
class ArticleListStubComponent {
  readonly limit = input.required<number>();
  readonly listConfig = input.required<ArticleListConfig>();
}

@Component({
  selector: 'app-follow-button',
  template: '',
  standalone: true
})
class FollowButtonStubComponent {
  readonly profile = model.required<Profile>();
}

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const profile: Profile = {
  username: 'writer',
  bio: 'A test author',
  image: 'https://example.com/avatar.png',
  following: false
};

const currentUserWriter: User = {
  email: 'writer@example.com',
  token: 'test-token',
  username: 'writer',
  bio: null,
  image: null
};

const currentUserOther: User = {
  email: 'other@example.com',
  token: 'other-token',
  username: 'other',
  bio: null,
  image: null
};

// ---------------------------------------------------------------------------
// Setup helper
// ---------------------------------------------------------------------------

type SetupOptions = {
  authenticatedAsOwner?: boolean;
  authenticatedAsOther?: boolean;
  showFavorites?: boolean;
  loadFails?: boolean;
};

function setup(options: SetupOptions = {}): {
  fixture: ComponentFixture<ProfilePageComponent>;
  appState: AppState;
  profileService: { get: ReturnType<typeof vi.fn> };
  router: { navigateByUrl: ReturnType<typeof vi.fn> };
  articleList: ArticleListStubComponent | null;
} {
  let currentUserValue: User | null = null;
  if (options.authenticatedAsOwner) currentUserValue = currentUserWriter;
  else if (options.authenticatedAsOther) currentUserValue = currentUserOther;

  const currentUserSignal = signal<User | null>(currentUserValue);

  const urlSegment = options.showFavorites
    ? [{ path: 'favorites' }]
    : [];

  const profileService = {
    get: vi.fn(() =>
      options.loadFails
        ? throwError(() => new Error('network error'))
        : of(profile)
    )
  };
  const router = { navigateByUrl: vi.fn() };
  const userService = {
    currentUser: currentUserSignal.asReadonly(),
    isAuthenticated: computed(() => currentUserSignal() !== null)
  };
  const appState = new AppState();

  TestBed.configureTestingModule({
    imports: [ProfilePageComponent],
    providers: [
      {
        provide: ActivatedRoute,
        useValue: {
          paramMap: of(convertToParamMap({ username: 'writer' })),
          url: of(urlSegment)
        }
      },
      { provide: AppState, useValue: appState },
      { provide: ProfileService, useValue: profileService },
      { provide: Router, useValue: router },
      { provide: UserService, useValue: userService }
    ]
  });
  TestBed.overrideComponent(ProfilePageComponent, {
    remove: { imports: [ArticleListComponent, FollowButtonComponent] },
    add: { imports: [ArticleListStubComponent, FollowButtonStubComponent] }
  });

  const fixture = TestBed.createComponent(ProfilePageComponent);
  fixture.detectChanges();

  const articleListDe = fixture.debugElement.query(By.directive(ArticleListStubComponent));
  const articleList = articleListDe
    ? (articleListDe.componentInstance as ArticleListStubComponent)
    : null;

  return { fixture, appState, profileService, router, articleList };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ProfilePageComponent', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  // -- Rendering: profile card --

  it('renders the profile username and bio after loading', () => {
    const { fixture } = setup();

    expect(fixture.nativeElement.textContent).toContain('writer');
    expect(fixture.nativeElement.textContent).toContain('A test author');
  });

  it('does not show the loading paragraph after the profile loads', () => {
    const { fixture } = setup();

    expect(fixture.nativeElement.textContent).not.toContain('Loading profile...');
  });

  it('shows the edit settings link when the authenticated user views their own profile', () => {
    const { fixture } = setup({ authenticatedAsOwner: true });

    const editLink: HTMLAnchorElement | null =
      fixture.nativeElement.querySelector('a[routerLink="/settings"]');
    expect(editLink).not.toBeNull();
  });

  it('shows the follow button instead of the edit link for non-owners', () => {
    const { fixture } = setup({ authenticatedAsOther: true });

    const editLink: HTMLAnchorElement | null =
      fixture.nativeElement.querySelector('a[routerLink="/settings"]');
    const followBtn = fixture.debugElement.query(By.directive(FollowButtonStubComponent));
    expect(editLink).toBeNull();
    expect(followBtn).not.toBeNull();
  });

  it('shows the follow button for anonymous users', () => {
    const { fixture } = setup();

    const followBtn = fixture.debugElement.query(By.directive(FollowButtonStubComponent));
    expect(followBtn).not.toBeNull();
  });

  // -- Tabs and list config --

  it('passes author filter when showing My Articles tab', () => {
    const { articleList } = setup({ showFavorites: false });

    expect(articleList).not.toBeNull();
    if (articleList === null) return;
    expect(articleList.listConfig()).toEqual({
      type: 'all',
      filters: { author: 'writer' },
      currentPage: 1
    });
  });

  it('passes favorited filter when showing Favorited Articles tab', () => {
    const { articleList } = setup({ showFavorites: true });

    expect(articleList).not.toBeNull();
    if (articleList === null) return;
    expect(articleList.listConfig()).toEqual({
      type: 'all',
      filters: { favorited: 'writer' },
      currentPage: 1
    });
  });

  it('article list limit is the profile page size (5)', () => {
    const { articleList } = setup();

    expect(articleList).not.toBeNull();
    if (articleList === null) return;
    expect(articleList.limit()).toBe(5);
  });

  it('My Articles tab is active when showFavorites is false', () => {
    const { fixture } = setup({ showFavorites: false });

    const myArticlesLink: HTMLAnchorElement | null =
      fixture.nativeElement.querySelector('.articles-toggle .nav-link.active');
    expect(myArticlesLink?.textContent?.trim()).toContain('My Articles');
  });

  it('Favorited Articles tab is active when showFavorites is true', () => {
    const { fixture } = setup({ showFavorites: true });

    const activeLink: HTMLAnchorElement | null =
      fixture.nativeElement.querySelector('.articles-toggle .nav-link.active');
    expect(activeLink?.textContent?.trim()).toContain('Favorited Articles');
  });

  // -- AppState title --

  it('sets page title to @username for My Articles tab', () => {
    const { appState } = setup({ showFavorites: false });

    expect(appState.title()).toBe('@writer');
  });

  it('title shows favorited message for favorites tab', () => {
    const { appState } = setup({ showFavorites: true });

    expect(appState.title()).toBe('Articles favorited by writer');
  });

  // -- replaceProfile --

  it('replaceProfile updates the profile signal', () => {
    const { fixture } = setup();

    const updatedProfile: Profile = { ...profile, following: true };
    fixture.componentInstance['replaceProfile'](updatedProfile);
    fixture.detectChanges();

    expect(fixture.componentInstance['profile']()).toEqual(updatedProfile);
  });

  // -------------------------------------------------------------------------
  // Mutation-killing: survived / nocov cases
  // -------------------------------------------------------------------------

  it('isLoading starts as true before the profile resolves (kills L102 BooleanLiteral mutation)', () => {
    const currentUserSignal = signal<User | null>(null);
    // Subject that never emits keeps the component in loading state
    const slowProfile$ = new Subject<Profile>();
    const slowProfileService = { get: vi.fn(() => slowProfile$.asObservable()) };
    const router = { navigateByUrl: vi.fn() };
    const userService = {
      currentUser: currentUserSignal.asReadonly(),
      isAuthenticated: computed(() => currentUserSignal() !== null)
    };
    const appState = new AppState();

    TestBed.configureTestingModule({
      imports: [ProfilePageComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ username: 'writer' })),
            url: of([])
          }
        },
        { provide: AppState, useValue: appState },
        { provide: ProfileService, useValue: slowProfileService },
        { provide: Router, useValue: router },
        { provide: UserService, useValue: userService }
      ]
    });
    TestBed.overrideComponent(ProfilePageComponent, {
      remove: { imports: [ArticleListComponent, FollowButtonComponent] },
      add: { imports: [ArticleListStubComponent, FollowButtonStubComponent] }
    });

    const fixture = TestBed.createComponent(ProfilePageComponent);
    fixture.detectChanges();

    // Data has not arrived -- initial state must remain intact.
    expect(fixture.componentInstance['profile']()).toBeNull();
    expect(fixture.componentInstance['listConfig']()).toBeNull();
    expect(fixture.componentInstance['showFavorites']()).toBe(false);
    expect(fixture.componentInstance['isLoading']()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Loading profile...');
  });

  it('isUser is false when profile is null even if currentUser is not null (kills L107 ConditionalExpression)', () => {
    const { fixture } = setup({ authenticatedAsOwner: true });

    // Manually set profile to null to simulate intermediate null state
    fixture.componentInstance['profile'].set(null);

    expect(fixture.componentInstance['isUser']()).toBe(false);
  });

  it('isUser is false when currentUser is null (kills L107 ConditionalExpression)', () => {
    const { fixture } = setup(); // unauthenticated

    expect(fixture.componentInstance['isUser']()).toBe(false);
  });

  it('isUser is false when username does not match (kills L108 EqualityOperator mutation)', () => {
    const { fixture } = setup({ authenticatedAsOther: true });

    expect(fixture.componentInstance['isUser']()).toBe(false);
  });

  it('isUser is true only when username matches exactly (kills L108 EqualityOperator mutation)', () => {
    const { fixture } = setup({ authenticatedAsOwner: true });

    expect(fixture.componentInstance['isUser']()).toBe(true);
  });

  it('isLoading is set to false after a blank username redirect (kills L150 BooleanLiteral mutation)', () => {
    const currentUserSignal = signal<User | null>(null);
    const profileService = { get: vi.fn(() => of(profile)) };
    const router = { navigateByUrl: vi.fn() };
    const userService = {
      currentUser: currentUserSignal.asReadonly(),
      isAuthenticated: computed(() => currentUserSignal() !== null)
    };
    const appState = new AppState();

    TestBed.configureTestingModule({
      imports: [ProfilePageComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ username: '   ' })),
            url: of([])
          }
        },
        { provide: AppState, useValue: appState },
        { provide: ProfileService, useValue: profileService },
        { provide: Router, useValue: router },
        { provide: UserService, useValue: userService }
      ]
    });
    TestBed.overrideComponent(ProfilePageComponent, {
      remove: { imports: [ArticleListComponent, FollowButtonComponent] },
      add: { imports: [ArticleListStubComponent, FollowButtonStubComponent] }
    });

    const fixture = TestBed.createComponent(ProfilePageComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance['isLoading']()).toBe(false);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('isLoading is set to false and redirects on load error (kills L158 BooleanLiteral mutation)', () => {
    const { fixture, router } = setup({ loadFails: true });

    expect(fixture.componentInstance['isLoading']()).toBe(false);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('buildListConfig uses author filter (not favorited) when showFavorites is false (kills L168 ConditionalExpression mutation)', () => {
    const { articleList } = setup({ showFavorites: false });

    expect(articleList).not.toBeNull();
    if (articleList === null) return;
    const filters = articleList.listConfig().filters;
    expect(filters).toHaveProperty('author', 'writer');
    expect(filters).not.toHaveProperty('favorited');
  });

  it('buildListConfig uses favorited filter (not author) when showFavorites is true (kills L168 false-branch mutation)', () => {
    const { articleList } = setup({ showFavorites: true });

    expect(articleList).not.toBeNull();
    if (articleList === null) return;
    const filters = articleList.listConfig().filters;
    expect(filters).toHaveProperty('favorited', 'writer');
    expect(filters).not.toHaveProperty('author');
  });

  it('hasFavoritesSegment returns false for a non-favorites path segment (kills L174 ConditionalExpression mutation)', () => {
    const currentUserSignal = signal<User | null>(null);
    const profileService = { get: vi.fn(() => of(profile)) };
    const router = { navigateByUrl: vi.fn() };
    const userService = {
      currentUser: currentUserSignal.asReadonly(),
      isAuthenticated: computed(() => currentUserSignal() !== null)
    };
    const appState = new AppState();

    TestBed.configureTestingModule({
      imports: [ProfilePageComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ username: 'writer' })),
            url: of([{ path: 'articles' }])
          }
        },
        { provide: AppState, useValue: appState },
        { provide: ProfileService, useValue: profileService },
        { provide: Router, useValue: router },
        { provide: UserService, useValue: userService }
      ]
    });
    TestBed.overrideComponent(ProfilePageComponent, {
      remove: { imports: [ArticleListComponent, FollowButtonComponent] },
      add: { imports: [ArticleListStubComponent, FollowButtonStubComponent] }
    });

    const fixture = TestBed.createComponent(ProfilePageComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance['showFavorites']()).toBe(false);
  });

  it('hasFavoritesSegment returns true only for the exact "favorites" segment path (kills L174 StringLiteral mutation)', () => {
    const { fixture } = setup({ showFavorites: true });

    expect(fixture.componentInstance['showFavorites']()).toBe(true);
  });

  it('profile and listConfig are null during load (kills L146-L147 assignment mutations)', () => {
    const currentUserSignal = signal<User | null>(null);
    const slowProfile$ = new Subject<Profile>();
    const slowProfileService = { get: vi.fn(() => slowProfile$.asObservable()) };
    const router = { navigateByUrl: vi.fn() };
    const userService = {
      currentUser: currentUserSignal.asReadonly(),
      isAuthenticated: computed(() => currentUserSignal() !== null)
    };
    const appState = new AppState();

    TestBed.configureTestingModule({
      imports: [ProfilePageComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ username: 'writer' })),
            url: of([])
          }
        },
        { provide: AppState, useValue: appState },
        { provide: ProfileService, useValue: slowProfileService },
        { provide: Router, useValue: router },
        { provide: UserService, useValue: userService }
      ]
    });
    TestBed.overrideComponent(ProfilePageComponent, {
      remove: { imports: [ArticleListComponent, FollowButtonComponent] },
      add: { imports: [ArticleListStubComponent, FollowButtonStubComponent] }
    });

    const fixture = TestBed.createComponent(ProfilePageComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance['profile']()).toBeNull();
    expect(fixture.componentInstance['listConfig']()).toBeNull();
  });

  it('profileService.get is called with the username from the route (kills L155 StringLiteral mutation)', () => {
    const { profileService } = setup();

    expect(profileService.get).toHaveBeenCalledWith('writer');
  });
});
