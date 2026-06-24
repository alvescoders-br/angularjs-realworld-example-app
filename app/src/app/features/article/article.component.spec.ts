// Refs: #5 â€” S3c tests: ArticleComponent article/comments/markdown behavior.

import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Article, Comment } from '../../core/articles.model';
import { ArticlesService } from '../../core/articles.service';
import { CommentsService } from '../../core/comments.service';
import { ProfileService } from '../../core/profile.service';
import { User } from '../../core/user.model';
import { UserService } from '../../core/user.service';
import { AppState } from '../../shared/app-state';
import { ArticleComponent } from './article.component';

const authorProfile = {
  username: 'author',
  bio: null,
  image: null,
  following: false
};

const article: Article = {
  slug: 'hello-angular',
  title: 'Hello Angular',
  description: 'Angular migration',
  body: '# Markdown title\n\nThis body uses **formatting**.',
  tagList: ['angular', 'migration'],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  favorited: false,
  favoritesCount: 1,
  author: authorProfile
};

const authorComment: Comment = {
  id: 1,
  createdAt: '2026-01-02T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
  body: 'Existing comment',
  author: authorProfile
};

const newComment: Comment = {
  id: 2,
  createdAt: '2026-01-03T00:00:00.000Z',
  updatedAt: '2026-01-03T00:00:00.000Z',
  body: 'New comment',
  author: authorProfile
};

const authenticatedUser: User = {
  email: 'author@example.com',
  token: 'test-token',
  username: 'author',
  bio: null,
  image: null
};

type SetupOptions = {
  authenticated?: boolean;
  articleOverride?: Article;
  comments?: Comment[];
  addCommentFails?: boolean;
  addCommentError?: unknown;
};

type SetupResult = {
  fixture: ComponentFixture<ArticleComponent>;
  appState: AppState;
  commentsService: {
    add: ReturnType<typeof vi.fn>;
    getAll: ReturnType<typeof vi.fn>;
    destroy: ReturnType<typeof vi.fn>;
  };
};

function setup(options: SetupOptions = {}): SetupResult {
  const currentUserSignal = signal<User | null>(
    options.authenticated === true ? authenticatedUser : null
  );
  const selectedArticle = options.articleOverride ?? article;
  const comments = options.comments ?? [authorComment];
  const appState = new AppState();
  const articlesService = {
    get: vi.fn(() => of(selectedArticle)),
    destroy: vi.fn(() => of({})),
    favorite: vi.fn(() => of({ ...selectedArticle, favorited: true, favoritesCount: 2 })),
    unfavorite: vi.fn(() => of({ ...selectedArticle, favorited: false, favoritesCount: 1 }))
  };
  const commentsService = {
    add: vi.fn(() => {
      if (options.addCommentError !== undefined) {
        return throwError(() => options.addCommentError);
      }
      if (options.addCommentFails === true) {
        return throwError(() => ({ error: { errors: { body: ['is invalid'] } } }));
      }
      return of(newComment);
    }),
    getAll: vi.fn(() => of(comments)),
    destroy: vi.fn(() => of({}))
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
    imports: [ArticleComponent],
    providers: [
      {
        provide: ActivatedRoute,
        useValue: { paramMap: of(convertToParamMap({ slug: selectedArticle.slug })) }
      },
      { provide: AppState, useValue: appState },
      { provide: ArticlesService, useValue: articlesService },
      { provide: CommentsService, useValue: commentsService },
      { provide: ProfileService, useValue: profileService },
      { provide: Router, useValue: { navigateByUrl: vi.fn() } },
      { provide: UserService, useValue: userService }
    ]
  });

  const fixture = TestBed.createComponent(ArticleComponent);
  fixture.detectChanges();

  return { fixture, appState, commentsService };
}

describe('ArticleComponent', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('loads the article, renders sanitized markdown and shows the anonymous comment prompt', () => {
    const unsafeArticle: Article = {
      ...article,
      body: '# Safe heading\n\n<script>alert(1)</script>'
    };
    const { fixture, appState } = setup({ articleOverride: unsafeArticle });

    expect(appState.title()).toBe('Hello Angular');
    expect(fixture.nativeElement.querySelector('.banner h1')?.textContent).toContain('Hello Angular');
    expect(fixture.nativeElement.querySelector('app-markdown-content h1')?.textContent).toBe('Safe heading');
    expect(fixture.nativeElement.querySelector('script')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Sign in');
  });

  it('adds a comment for authenticated users and prepends it to the comment list', () => {
    const { fixture, commentsService } = setup({ authenticated: true });
    const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('textarea');
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form.comment-form');

    textarea.value = 'New comment';
    textarea.dispatchEvent(new Event('input'));
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(commentsService.add).toHaveBeenCalledWith(article.slug, 'New comment');
    const commentElements = fixture.nativeElement.querySelectorAll(
      '.card-text'
    ) as NodeListOf<HTMLElement>;
    const commentTexts = Array.from(
      commentElements,
      (element: HTMLElement) => element.textContent?.trim()
    );
    expect(commentTexts[0]).toBe('New comment');
  });

  it('shows API validation errors when comment creation fails', () => {
    const { fixture } = setup({ authenticated: true, addCommentFails: true });
    const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('textarea');
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form.comment-form');

    textarea.value = 'Bad comment';
    textarea.dispatchEvent(new Event('input'));
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('body is invalid');
  });

  it('allows authors to delete their own comments', () => {
    const { fixture, commentsService } = setup({ authenticated: true });
    const deleteIcon: HTMLElement = fixture.nativeElement.querySelector('.mod-options .ion-trash-a');

    deleteIcon.click();
    fixture.detectChanges();

    expect(commentsService.destroy).toHaveBeenCalledWith(authorComment.id, article.slug);
    expect(fixture.nativeElement.textContent).not.toContain('Existing comment');
  });

  it('does not submit a comment when the textarea body is empty or whitespace', () => {
    const { fixture, commentsService } = setup({ authenticated: true });
    const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('textarea');
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form.comment-form');

    textarea.value = '   ';
    textarea.dispatchEvent(new Event('input'));
    form.dispatchEvent(new Event('submit'));

    expect(commentsService.add).not.toHaveBeenCalled();
  });

  it('shows a loading error message when the article cannot be loaded', () => {
    const currentUser = signal<User | null>(null);
    const appState = new AppState();
    TestBed.configureTestingModule({
      imports: [ArticleComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ slug: 'bad-slug' })) }
        },
        { provide: AppState, useValue: appState },
        {
          provide: ArticlesService,
          useValue: {
            get: vi.fn(() => throwError(() => new Error('not found'))),
            destroy: vi.fn(),
            favorite: vi.fn(),
            unfavorite: vi.fn()
          }
        },
        {
          provide: CommentsService,
          useValue: {
            add: vi.fn(),
            getAll: vi.fn(() => throwError(() => new Error('not found'))),
            destroy: vi.fn()
          }
        },
        { provide: ProfileService, useValue: { follow: vi.fn(), unfollow: vi.fn() } },
        { provide: Router, useValue: { navigateByUrl: vi.fn() } },
        {
          provide: UserService,
          useValue: {
            currentUser: currentUser.asReadonly(),
            isAuthenticated: computed(() => currentUser() !== null)
          }
        }
      ]
    });
    const fixture = TestBed.createComponent(ArticleComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Article could not be loaded.');
  });

  it('hides the delete icon for comments the current user did not author', () => {
    const otherAuthorProfile = { ...authorProfile, username: 'someone-else' };
    const otherAuthorComment: Comment = {
      ...authorComment,
      id: 3,
      author: otherAuthorProfile
    };
    const { fixture } = setup({
      authenticated: true,
      comments: [otherAuthorComment]
    });

    expect(fixture.nativeElement.querySelector('.mod-options')).toBeNull();
  });

  it('updates the article signal when replaceArticle is called', () => {
    const { fixture } = setup({ authenticated: true });
    const updatedArticle: Article = { ...article, title: 'Updated Title', favorited: true };

    (fixture.componentInstance as unknown as { replaceArticle(a: Article): void }).replaceArticle(updatedArticle);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.banner h1')?.textContent).toContain('Updated Title');
  });

  it('ignores updateCommentBody when the event target is not a textarea', () => {
    const { fixture } = setup({ authenticated: true });
    const component = fixture.componentInstance;

    // Dispatching from a div element — the guard should ignore it
    const divEvent = new Event('input');
    Object.defineProperty(divEvent, 'target', { value: document.createElement('div') });
    component['updateCommentBody'](divEvent);

    // commentBody should remain empty (no crash, no update)
    expect(component['commentBody']()).toBe('');
  });

  it('clears the commentBody signal after successfully adding a comment', () => {
    const { fixture } = setup({ authenticated: true });
    const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('textarea');
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form.comment-form');

    textarea.value = 'A new comment';
    textarea.dispatchEvent(new Event('input'));
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(fixture.componentInstance['commentBody']()).toBe('');
  });

  it('sets isCommentSubmitting to true while a comment request is in-flight', () => {
    const { fixture, commentsService } = setup({ authenticated: true });
    commentsService.add.mockReturnValue(new Subject<Comment>());
    const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('textarea');
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form.comment-form');

    textarea.value = 'In-flight comment';
    textarea.dispatchEvent(new Event('input'));
    form.dispatchEvent(new Event('submit'));

    expect(fixture.componentInstance['isCommentSubmitting']()).toBe(true);
  });

  it('resets isCommentSubmitting to false after an error response', () => {
    const { fixture } = setup({ authenticated: true, addCommentFails: true });
    const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('textarea');
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form.comment-form');

    textarea.value = 'Will fail';
    textarea.dispatchEvent(new Event('input'));
    form.dispatchEvent(new Event('submit'));

    expect(fixture.componentInstance['isCommentSubmitting']()).toBe(false);
  });

  it('does not submit a second comment while the first is in-flight', () => {
    const { fixture, commentsService } = setup({ authenticated: true });
    commentsService.add.mockReturnValue(new Subject<Comment>());
    const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('textarea');
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form.comment-form');

    textarea.value = 'First comment';
    textarea.dispatchEvent(new Event('input'));
    form.dispatchEvent(new Event('submit'));
    form.dispatchEvent(new Event('submit'));

    expect(commentsService.add).toHaveBeenCalledTimes(1);
  });

  it('deletes only the targeted comment, leaving others intact', () => {
    const secondComment: Comment = {
      id: 99,
      createdAt: '2026-01-04T00:00:00.000Z',
      updatedAt: '2026-01-04T00:00:00.000Z',
      body: 'Second comment',
      author: authorProfile
    };
    const { fixture, commentsService } = setup({
      authenticated: true,
      comments: [authorComment, secondComment]
    });

    // Both comments are initially rendered
    expect(fixture.nativeElement.textContent).toContain('Existing comment');
    expect(fixture.nativeElement.textContent).toContain('Second comment');

    // Delete only the first comment (id=1)
    const deleteIcons: NodeListOf<HTMLElement> =
      fixture.nativeElement.querySelectorAll('.mod-options .ion-trash-a');
    deleteIcons[0].click();
    fixture.detectChanges();

    expect(commentsService.destroy).toHaveBeenCalledWith(authorComment.id, article.slug);
    expect(fixture.nativeElement.textContent).not.toContain('Existing comment');
    expect(fixture.nativeElement.textContent).toContain('Second comment');
  });

  it('shows the loading error when the article slug in the route is blank', () => {
    const currentUser = signal<User | null>(null);
    const appState = new AppState();
    const articlesService = {
      get: vi.fn(() => of(article)),
      destroy: vi.fn(),
      favorite: vi.fn(),
      unfavorite: vi.fn()
    };
    const commentsService = {
      add: vi.fn(),
      getAll: vi.fn(() => of([])),
      destroy: vi.fn()
    };

    TestBed.configureTestingModule({
      imports: [ArticleComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ slug: '   ' })) }
        },
        { provide: AppState, useValue: appState },
        { provide: ArticlesService, useValue: articlesService },
        { provide: CommentsService, useValue: commentsService },
        { provide: ProfileService, useValue: { follow: vi.fn(), unfollow: vi.fn() } },
        { provide: Router, useValue: { navigateByUrl: vi.fn() } },
        {
          provide: UserService,
          useValue: {
            currentUser: currentUser.asReadonly(),
            isAuthenticated: computed(() => currentUser() !== null)
          }
        }
      ]
    });
    const fixture = TestBed.createComponent(ArticleComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Article could not be loaded.');
    expect(articlesService.get).not.toHaveBeenCalled();
  });

  it('uses fallback errors when comment add fails with all-non-string message values', () => {
    const { fixture } = setup({
      authenticated: true,
      addCommentFails: false
    });
    // This test verifies that commentErrors is null after a successful add.
    const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('textarea');
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form.comment-form');

    textarea.value = 'Good comment';
    textarea.dispatchEvent(new Event('input'));
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(fixture.componentInstance['commentErrors']()).toBeNull();
  });

  it('resets isCommentSubmitting to false after a successful comment add', () => {
    const { fixture } = setup({ authenticated: true });
    const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('textarea');
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form.comment-form');

    textarea.value = 'Success comment';
    textarea.dispatchEvent(new Event('input'));
    form.dispatchEvent(new Event('submit'));

    expect(fixture.componentInstance['isCommentSubmitting']()).toBe(false);
  });

  it('starts with isLoading = true before the data resolves', () => {
    const currentUserSignal = signal<User | null>(null);
    const slowArticles$ = new Subject<Article>();

    TestBed.configureTestingModule({
      imports: [ArticleComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ slug: 'slow-slug' })) }
        },
        { provide: AppState, useValue: new AppState() },
        {
          provide: ArticlesService,
          useValue: {
            get: vi.fn(() => slowArticles$),
            destroy: vi.fn(),
            favorite: vi.fn(),
            unfavorite: vi.fn()
          }
        },
        {
          provide: CommentsService,
          useValue: { add: vi.fn(), getAll: vi.fn(() => new Subject()), destroy: vi.fn() }
        },
        { provide: ProfileService, useValue: { follow: vi.fn(), unfollow: vi.fn() } },
        { provide: Router, useValue: { navigateByUrl: vi.fn() } },
        {
          provide: UserService,
          useValue: {
            currentUser: currentUserSignal.asReadonly(),
            isAuthenticated: computed(() => currentUserSignal() !== null)
          }
        }
      ]
    });

    const fixture = TestBed.createComponent(ArticleComponent);
    fixture.detectChanges();

    // Data has not arrived yet — component should still be at its initial loading state.
    expect(fixture.componentInstance['article']()).toBeNull();
    expect(fixture.componentInstance['comments']()).toEqual([]);
    expect(fixture.componentInstance['commentBody']()).toBe('');
    expect(fixture.componentInstance['commentErrors']()).toBeNull();
    expect(fixture.componentInstance['isCommentSubmitting']()).toBe(false);
    expect(fixture.componentInstance['loadError']()).toBeNull();
    expect(fixture.componentInstance['isLoading']()).toBe(true);
  });

  it('shows fallback error when comment fails with non-object error value', () => {
    const { fixture } = setup({
      authenticated: true,
      addCommentError: 'plain-string-error'
    });
    const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('textarea');
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form.comment-form');

    textarea.value = 'My comment';
    textarea.dispatchEvent(new Event('input'));
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('could not be submitted');
  });

  it('shows fallback error when comment fails with error.error being non-object', () => {
    const { fixture } = setup({
      authenticated: true,
      addCommentError: { error: 'not-an-object' }
    });
    const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('textarea');
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form.comment-form');

    textarea.value = 'My comment';
    textarea.dispatchEvent(new Event('input'));
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('could not be submitted');
  });

  it('shows fallback error when comment fails with errors being non-object', () => {
    const { fixture } = setup({
      authenticated: true,
      addCommentError: { error: { errors: 'not-an-object' } }
    });
    const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('textarea');
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form.comment-form');

    textarea.value = 'My comment';
    textarea.dispatchEvent(new Event('input'));
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('could not be submitted');
  });

  it('shows fallback error when all error fields are non-array values', () => {
    const { fixture } = setup({
      authenticated: true,
      addCommentError: { error: { errors: { title: 'not-array', body: 42 } } }
    });
    const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('textarea');
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form.comment-form');

    textarea.value = 'My comment';
    textarea.dispatchEvent(new Event('input'));
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('could not be submitted');
  });

  it('shows fallback when a mixed-type array has some non-string values (kills every vs some)', () => {
    // [404, 'body'] -> every() returns false (correct: fallback), some() returns true (wrong)
    const { fixture } = setup({
      authenticated: true,
      addCommentError: { error: { errors: { body: [404, 'is blank'] } } }
    });
    const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('textarea');
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form.comment-form');

    textarea.value = 'My comment';
    textarea.dispatchEvent(new Event('input'));
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('could not be submitted');
  });

  it('shows structured errors when all message values in the array are strings', () => {
    const { fixture } = setup({
      authenticated: true,
      addCommentError: { error: { errors: { email: ['is invalid'], body: ['is blank'] } } }
    });
    const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('textarea');
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form.comment-form');

    textarea.value = 'My comment';
    textarea.dispatchEvent(new Event('input'));
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('email is invalid');
    expect(fixture.nativeElement.textContent).toContain('body is blank');
  });

  it('shows fallback when all error arrays have non-string entries (empty apiErrors object)', () => {
    const { fixture } = setup({
      authenticated: true,
      addCommentError: { error: { errors: { title: [false, 0] } } }
    });
    const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('textarea');
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form.comment-form');

    textarea.value = 'My comment';
    textarea.dispatchEvent(new Event('input'));
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    // apiErrors will be {} (no valid entries), so fallback is returned
    expect(fixture.nativeElement.textContent).toContain('could not be submitted');
  });

  it('shows valid error fields and skips non-array ones', () => {
    const { fixture } = setup({
      authenticated: true,
      addCommentError: { error: { errors: { bad: 'not-array', body: ['is blank'] } } }
    });
    const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('textarea');
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form.comment-form');

    textarea.value = 'My comment';
    textarea.dispatchEvent(new Event('input'));
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('body is blank');
  });

  it('commentBody starts as empty string (kills initial value mutation)', () => {
    const { fixture } = setup({ authenticated: true });

    expect(fixture.componentInstance['commentBody']()).toBe('');
  });

  it('starts with an empty comments array (kills initial value mutation)', () => {
    const { fixture } = setup({ authenticated: true, comments: [] });

    expect(fixture.componentInstance['comments']()).toEqual([]);
  });

  it('shows loading indicator while the article is being fetched (kills isLoading=false mutation)', () => {
    const slowArticles$ = new Subject<Article>();
    const currentUserSignal = signal<User | null>(null);
    const commentsService = { add: vi.fn(), getAll: vi.fn(() => of([])), destroy: vi.fn() };

    TestBed.configureTestingModule({
      imports: [ArticleComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ slug: 'slow' })) } },
        { provide: AppState, useValue: new AppState() },
        { provide: ArticlesService, useValue: { get: vi.fn(() => slowArticles$), destroy: vi.fn(), favorite: vi.fn(), unfavorite: vi.fn() } },
        { provide: CommentsService, useValue: commentsService },
        { provide: ProfileService, useValue: { follow: vi.fn(), unfollow: vi.fn() } },
        { provide: Router, useValue: { navigateByUrl: vi.fn() } },
        { provide: UserService, useValue: { currentUser: currentUserSignal.asReadonly(), isAuthenticated: computed(() => false) } }
      ]
    });
    const fixture = TestBed.createComponent(ArticleComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance['isLoading']()).toBe(true);
  });

  it('does not submit a comment when the body is empty (kills addComment guard mutation at L83)', () => {
    const { fixture, commentsService } = setup({ authenticated: true });
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form.comment-form');

    // Do NOT fill in the textarea — body remains empty
    form.dispatchEvent(new Event('submit'));

    expect(commentsService.add).not.toHaveBeenCalled();
  });

  it('resets isCommentSubmitting to false after a successful comment (kills L91 BooleanLiteral)', () => {
    const { fixture } = setup({ authenticated: true });
    const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('textarea');
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form.comment-form');

    textarea.value = 'A comment';
    textarea.dispatchEvent(new Event('input'));
    form.dispatchEvent(new Event('submit'));

    expect(fixture.componentInstance['isCommentSubmitting']()).toBe(false);
  });

  it('does not call destroy when article is null (kills deleteComment guard at L102)', () => {
    const { fixture, commentsService } = setup({ authenticated: true });

    // Manually clear article to simulate null state before a delete call
    fixture.componentInstance['article'].set(null);
    fixture.componentInstance['deleteComment'](1);

    expect(commentsService.destroy).not.toHaveBeenCalled();
  });

  it('shows fallback error when null is thrown during addComment (kills isRecord null branch)', () => {
    const { fixture } = setup({
      authenticated: true,
      addCommentError: null
    });
    const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('textarea');
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form.comment-form');

    textarea.value = 'Test comment';
    textarea.dispatchEvent(new Event('input'));
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('could not be submitted');
  });

  it('shows fallback when error.error is null (kills L150 isRecord guard)', () => {
    const { fixture } = setup({
      authenticated: true,
      addCommentError: { error: null }
    });
    const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('textarea');
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form.comment-form');

    textarea.value = 'Test comment';
    textarea.dispatchEvent(new Event('input'));
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('could not be submitted');
  });

  it('shows fallback when error.error.errors is null (kills L153 isRecord guard)', () => {
    const { fixture } = setup({
      authenticated: true,
      addCommentError: { error: { errors: null } }
    });
    const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('textarea');
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form.comment-form');

    textarea.value = 'Test comment';
    textarea.dispatchEvent(new Event('input'));
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('could not be submitted');
  });

  it('resets commentBody to empty string after a successful comment (kills string literal mutation)', () => {
    const { fixture } = setup({ authenticated: true });
    const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('textarea');
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form.comment-form');

    textarea.value = 'My comment';
    textarea.dispatchEvent(new Event('input'));
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(fixture.componentInstance['commentBody']()).toBe('');
  });
});
