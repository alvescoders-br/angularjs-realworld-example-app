// Refs: #5 — S3d tests: EditorComponent create/edit article behavior.
// Refs: #6 — S2 drafts: draft restore, autosave and clear-on-publish tests.

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Article } from '../../core/articles.model';
import { ArticlesService } from '../../core/articles.service';
import { DRAFT_STORAGE_KEY_NEW, DRAFT_STORAGE_KEY_PREFIX, JWT_STORAGE } from '../../core/app-tokens';
import { MemoryStorage } from '../../core/testing-storage';
import { EditorComponent } from './editor.component';

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
    username: 'author',
    bio: null,
    image: null,
    following: false
  }
};

type SetupOptions = {
  slug?: string;
  saveFails?: boolean;
  errorPayload?: unknown;
  storage?: MemoryStorage;
};

function setup(options: SetupOptions = {}): {
  fixture: ComponentFixture<EditorComponent>;
  articlesService: {
    get: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };
  router: { navigateByUrl: ReturnType<typeof vi.fn> };
  storage: MemoryStorage;
} {
  const storage = options.storage ?? new MemoryStorage();
  const defaultError = { error: { errors: { title: ['is required'] } } };
  const articlesService = {
    get: vi.fn(() => of(article)),
    save: vi.fn(() =>
      options.saveFails === true
        ? throwError(() => (options.errorPayload !== undefined ? options.errorPayload : defaultError))
        : of(article)
    )
  };
  const router = { navigateByUrl: vi.fn() };

  TestBed.configureTestingModule({
    imports: [EditorComponent],
    providers: [
      {
        provide: ActivatedRoute,
        useValue: {
          paramMap: of(
            convertToParamMap(options.slug === undefined ? {} : { slug: options.slug })
          )
        }
      },
      { provide: ArticlesService, useValue: articlesService },
      { provide: Router, useValue: router },
      { provide: JWT_STORAGE, useValue: storage }
    ]
  });

  const fixture = TestBed.createComponent(EditorComponent);
  fixture.detectChanges();

  return { fixture, articlesService, router, storage };
}

function inputValue(input: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

describe('EditorComponent', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates an article with unique tags and redirects to the article page', () => {
    const { fixture, articlesService, router } = setup();
    const inputs = fixture.nativeElement.querySelectorAll('input') as NodeListOf<HTMLInputElement>;
    const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('textarea');
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form');

    inputValue(inputs[0], 'New Article');
    inputValue(inputs[1], 'Description');
    inputValue(textarea, 'Markdown body');
    inputValue(inputs[2], 'angular');
    inputs[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    inputValue(inputs[2], 'angular');
    inputs[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    inputValue(inputs[2], 'testing');
    inputs[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    form.dispatchEvent(new Event('submit'));

    expect(articlesService.save).toHaveBeenCalledWith({
      title: 'New Article',
      description: 'Description',
      body: 'Markdown body',
      tagList: ['angular', 'testing'],
      slug: undefined
    });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/article/hello-angular');
  });

  it('loads an existing article for editing and keeps the slug when saving', () => {
    const { fixture, articlesService } = setup({ slug: article.slug });
    const titleInput: HTMLInputElement = fixture.nativeElement.querySelector('input');
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form');

    expect(articlesService.get).toHaveBeenCalledWith(article.slug);
    expect(titleInput.value).toBe('Hello Angular');

    inputValue(titleInput, 'Updated title');
    form.dispatchEvent(new Event('submit'));

    expect(articlesService.save).toHaveBeenCalledWith({
      title: 'Updated title',
      description: 'Angular migration',
      body: 'Body',
      tagList: ['angular'],
      slug: article.slug
    });
  });

  it('renders API errors when save fails', () => {
    const { fixture } = setup({ saveFails: true });
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form');

    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('title is required');
  });

  // — Draft: restore —

  it('restores a saved draft for a new article on open', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      DRAFT_STORAGE_KEY_NEW,
      JSON.stringify({
        title: 'Restored Title',
        description: 'Restored desc',
        body: 'Restored body',
        tagList: ['restored']
      })
    );

    const { fixture } = setup({ storage });
    const inputs = fixture.nativeElement.querySelectorAll('input') as NodeListOf<HTMLInputElement>;
    const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('textarea');

    expect(inputs[0].value).toBe('Restored Title');
    expect(inputs[1].value).toBe('Restored desc');
    expect(textarea.value).toBe('Restored body');
    expect(fixture.nativeElement.textContent).toContain('restored');
  });

  it('restores a saved draft for an edit article, overriding the API-loaded values', () => {
    const storage = new MemoryStorage();
    const editKey = `${DRAFT_STORAGE_KEY_PREFIX}${article.slug}`;
    storage.setItem(
      editKey,
      JSON.stringify({
        title: 'Draft Title',
        description: 'Draft desc',
        body: 'Draft body',
        tagList: ['draft-tag']
      })
    );

    const { fixture } = setup({ slug: article.slug, storage });
    const inputs = fixture.nativeElement.querySelectorAll('input') as NodeListOf<HTMLInputElement>;
    const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('textarea');

    expect(inputs[0].value).toBe('Draft Title');
    expect(inputs[1].value).toBe('Draft desc');
    expect(textarea.value).toBe('Draft body');
    expect(fixture.nativeElement.textContent).toContain('draft-tag');
  });

  // — Draft: autosave —

  it('autosaves the draft to localStorage after the debounce interval', () => {
    vi.useFakeTimers();
    const storage = new MemoryStorage();
    const { fixture } = setup({ storage });
    const inputs = fixture.nativeElement.querySelectorAll('input') as NodeListOf<HTMLInputElement>;

    inputValue(inputs[0], 'Autosaved Title');
    vi.advanceTimersByTime(500); // advance past debounce

    const saved = storage.getItem(DRAFT_STORAGE_KEY_NEW);
    expect(saved).not.toBeNull();
    if (saved === null) return;
    const parsed = JSON.parse(saved) as Record<string, unknown>;
    expect(parsed['title']).toBe('Autosaved Title');
  });

  it('does not save to localStorage before the debounce interval elapses', () => {
    vi.useFakeTimers();
    const storage = new MemoryStorage();
    const { fixture } = setup({ storage });
    const inputs = fixture.nativeElement.querySelectorAll('input') as NodeListOf<HTMLInputElement>;

    inputValue(inputs[0], 'Not yet saved');
    vi.advanceTimersByTime(100); // shorter than 500 ms debounce

    expect(storage.getItem(DRAFT_STORAGE_KEY_NEW)).toBeNull();
    vi.advanceTimersByTime(400); // flush remaining timers
  });

  // — Draft: clear on publish —

  it('clears the draft from localStorage after a successful publish', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      DRAFT_STORAGE_KEY_NEW,
      JSON.stringify({
        title: 'To be cleared',
        description: 'd',
        body: 'b',
        tagList: []
      })
    );

    const { fixture } = setup({ storage });
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form');

    form.dispatchEvent(new Event('submit'));

    expect(storage.getItem(DRAFT_STORAGE_KEY_NEW)).toBeNull();
  });

  // — Guards —

  it('prevents a second submission while one is already in flight', () => {
    const storage = new MemoryStorage();
    const articlesService = {
      get: vi.fn(() => of(article)),
      save: vi.fn(() => new Subject<typeof article>())
    };
    const router = { navigateByUrl: vi.fn() };

    TestBed.configureTestingModule({
      imports: [EditorComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({})) }
        },
        { provide: ArticlesService, useValue: articlesService },
        { provide: Router, useValue: router },
        { provide: JWT_STORAGE, useValue: storage }
      ]
    });

    const fixture = TestBed.createComponent(EditorComponent);
    fixture.detectChanges();

    const form: HTMLFormElement = fixture.nativeElement.querySelector('form');
    form.dispatchEvent(new Event('submit'));
    form.dispatchEvent(new Event('submit'));

    expect(articlesService.save).toHaveBeenCalledTimes(1);
  });

  it('removes a tag when the × icon is clicked', () => {
    const { fixture } = setup({ slug: article.slug });
    fixture.detectChanges();

    const closeIcons = fixture.nativeElement.querySelectorAll('.ion-close-round') as NodeListOf<HTMLElement>;
    expect(closeIcons.length).toBeGreaterThan(0);
    closeIcons[0].click();
    fixture.detectChanges();

    const tagPills = fixture.nativeElement.querySelectorAll('.tag-pill') as NodeListOf<HTMLElement>;
    expect(tagPills.length).toBe(0);
  });

  it('does not add an empty tag on Enter', () => {
    const { fixture } = setup();
    const inputs = fixture.nativeElement.querySelectorAll('input') as NodeListOf<HTMLInputElement>;

    inputs[2].value = '   ';
    inputs[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();

    const tagPills = fixture.nativeElement.querySelectorAll('.tag-pill') as NodeListOf<HTMLElement>;
    expect(tagPills.length).toBe(0);
  });

  it('ignores updateTitle when the event target is not an input element', () => {
    const { fixture } = setup();
    const component = fixture.componentInstance;

    const divEvent = new Event('input');
    Object.defineProperty(divEvent, 'target', { value: document.createElement('div') });
    component['updateTitle'](divEvent);

    expect(component['title']()).toBe('');
  });

  it('ignores updateDescription when the event target is not an input element', () => {
    const { fixture } = setup();
    const component = fixture.componentInstance;

    const divEvent = new Event('input');
    Object.defineProperty(divEvent, 'target', { value: document.createElement('div') });
    component['updateDescription'](divEvent);

    expect(component['description']()).toBe('');
  });

  it('ignores updateBody when the event target is not a textarea element', () => {
    const { fixture } = setup();
    const component = fixture.componentInstance;

    const divEvent = new Event('input');
    Object.defineProperty(divEvent, 'target', { value: document.createElement('input') });
    component['updateBody'](divEvent);

    expect(component['body']()).toBe('');
  });

  it('ignores updateTagField when the event target is not an input element', () => {
    const { fixture } = setup();
    const component = fixture.componentInstance;

    const divEvent = new Event('input');
    Object.defineProperty(divEvent, 'target', { value: document.createElement('div') });
    component['updateTagField'](divEvent);

    expect(component['tagField']()).toBe('');
  });

  // — extractApiErrors edge cases —

  it('renders fallback error when the thrown value is not an object', () => {
    const { fixture } = setup({ saveFails: true, errorPayload: 'plain string' });
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('could not be saved');
  });

  it('renders fallback error when error.error is not an object', () => {
    const { fixture } = setup({ saveFails: true, errorPayload: { error: 99 } });
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('could not be saved');
  });

  it('renders fallback error when error.error.errors is not an object', () => {
    const { fixture } = setup({ saveFails: true, errorPayload: { error: { errors: null } } });
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('could not be saved');
  });

  it('renders fallback when all error fields are non-array values', () => {
    const { fixture } = setup({
      saveFails: true,
      errorPayload: { error: { errors: { title: 'not-an-array' } } }
    });
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('could not be saved');
  });

  it('renders fallback when error field array contains non-string values', () => {
    const { fixture } = setup({
      saveFails: true,
      errorPayload: { error: { errors: { title: [false, 0] } } }
    });
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('could not be saved');
  });

  it('shows valid error fields and skips non-array ones', () => {
    const { fixture } = setup({
      saveFails: true,
      errorPayload: { error: { errors: { bad: 'not-array', body: ['is blank'] } } }
    });
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('body is blank');
  });

  it('starts with empty title, description, body, and tagList for a new article without a draft', () => {
    const { fixture } = setup();
    const inputs = fixture.nativeElement.querySelectorAll('input') as NodeListOf<HTMLInputElement>;
    const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('textarea');
    const tagPills: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('.tag-pill');

    expect(inputs[0].value).toBe('');
    expect(inputs[1].value).toBe('');
    expect(textarea.value).toBe('');
    expect(tagPills.length).toBe(0);
  });

  it('clears the tagField after successfully adding a tag', () => {
    const { fixture } = setup();
    const inputs = fixture.nativeElement.querySelectorAll('input') as NodeListOf<HTMLInputElement>;

    inputValue(inputs[2], 'newtag');
    inputs[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();

    expect(fixture.componentInstance['tagField']()).toBe('');
  });

  it('redirects to / when loading an article for editing fails', () => {
    const storage = new MemoryStorage();
    const articlesService = {
      get: vi.fn(() => throwError(() => new Error('not found'))),
      save: vi.fn()
    };
    const router = { navigateByUrl: vi.fn() };

    TestBed.configureTestingModule({
      imports: [EditorComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ slug: 'bad-slug' })) }
        },
        { provide: ArticlesService, useValue: articlesService },
        { provide: Router, useValue: router },
        { provide: JWT_STORAGE, useValue: storage }
      ]
    });

    TestBed.createComponent(EditorComponent).detectChanges();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('resets isSubmitting to false after a save error', () => {
    const { fixture } = setup({ saveFails: true });
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form');

    form.dispatchEvent(new Event('submit'));

    expect(fixture.componentInstance['isSubmitting']()).toBe(false);
  });

  it('autosaves description changes after the debounce interval', () => {
    vi.useFakeTimers();
    const storage = new MemoryStorage();
    const { fixture } = setup({ storage });
    const inputs = fixture.nativeElement.querySelectorAll('input') as NodeListOf<HTMLInputElement>;

    inputValue(inputs[1], 'Autosaved Description');
    vi.advanceTimersByTime(500);

    const saved = storage.getItem(DRAFT_STORAGE_KEY_NEW);
    expect(saved).not.toBeNull();
    if (saved === null) return;
    const parsed = JSON.parse(saved) as Record<string, unknown>;
    expect(parsed['description']).toBe('Autosaved Description');
  });

  it('autosaves body changes after the debounce interval', () => {
    vi.useFakeTimers();
    const storage = new MemoryStorage();
    const { fixture } = setup({ storage });
    const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('textarea');

    inputValue(textarea, 'Autosaved body text');
    vi.advanceTimersByTime(500);

    const saved = storage.getItem(DRAFT_STORAGE_KEY_NEW);
    expect(saved).not.toBeNull();
    if (saved === null) return;
    const parsed = JSON.parse(saved) as Record<string, unknown>;
    expect(parsed['body']).toBe('Autosaved body text');
  });

  it('clears the draft for an edited article after successful publish', () => {
    const storage = new MemoryStorage();
    const editKey = `${DRAFT_STORAGE_KEY_PREFIX}${article.slug}`;
    storage.setItem(
      editKey,
      JSON.stringify({ title: 'To clear', description: 'd', body: 'b', tagList: [] })
    );

    const { fixture } = setup({ slug: article.slug, storage });
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form');

    form.dispatchEvent(new Event('submit'));

    expect(storage.getItem(editKey)).toBeNull();
  });

  it('renders fallback when a mixed-type array has some non-string values (kills every vs some)', () => {
    // [42, 'title'] -> every() = false (correct: fallback), some() = true (wrong: shows 'title')
    const { fixture } = setup({
      saveFails: true,
      errorPayload: { error: { errors: { title: [42, 'is required'] } } }
    });
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('could not be saved');
  });

  it('new article starts with isLoading = false (not stuck in loading)', () => {
    const { fixture } = setup();

    // A new article (no slug) should NOT be in loading state
    expect(fixture.componentInstance['isLoading']()).toBe(false);
  });

  it('shows loading indicator while an existing article is being fetched', () => {
    const storage = new MemoryStorage();
    const slowArticles$ = new Subject<Article>();
    const router = { navigateByUrl: vi.fn() };

    TestBed.configureTestingModule({
      imports: [EditorComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ slug: 'slow-slug' })) }
        },
        { provide: ArticlesService, useValue: { get: vi.fn(() => slowArticles$), save: vi.fn() } },
        { provide: Router, useValue: router },
        { provide: JWT_STORAGE, useValue: storage }
      ]
    });

    const fixture = TestBed.createComponent(EditorComponent);
    fixture.detectChanges();

    // Article hasn't resolved yet — component should show the loading state
    expect(fixture.componentInstance['isLoading']()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Loading article...');
  });

  it('clears tagField after editing an existing article (setArticle)', () => {
    const { fixture } = setup({ slug: article.slug });

    // tagField should be empty string — not any stale value
    expect(fixture.componentInstance['tagField']()).toBe('');
  });

  it('does not add a whitespace-only tag (trim kills mutant at addTag)', () => {
    const { fixture } = setup();
    const inputs = fixture.nativeElement.querySelectorAll('input') as NodeListOf<HTMLInputElement>;

    inputs[2].value = '   ';
    inputs[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();

    const tagPills = fixture.nativeElement.querySelectorAll('.tag-pill') as NodeListOf<HTMLElement>;
    expect(tagPills.length).toBe(0);
  });

  it('removes only the targeted tag from the list (filter mutation at removeTag)', () => {
    const { fixture } = setup({ slug: article.slug });
    fixture.detectChanges();

    // Article has one tag: 'angular' — add another first
    const inputs = fixture.nativeElement.querySelectorAll('input') as NodeListOf<HTMLInputElement>;
    inputValue(inputs[2], 'testing');
    inputs[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();

    // Now remove 'angular' (first tag pill)
    const closeIcons = fixture.nativeElement.querySelectorAll('.ion-close-round') as NodeListOf<HTMLElement>;
    closeIcons[0].click();
    fixture.detectChanges();

    const tagPills = fixture.nativeElement.querySelectorAll('.tag-pill') as NodeListOf<HTMLElement>;
    // 'angular' removed, 'testing' remains
    expect(tagPills.length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('testing');
    expect(fixture.nativeElement.textContent).not.toContain('angular');
  });

  it('trims tag input before adding and autosaves the resulting tag list', () => {
    vi.useFakeTimers();
    const storage = new MemoryStorage();
    const { fixture } = setup({ storage });
    const addTagEvent = new Event('keydown', { cancelable: true });

    fixture.componentInstance['tagField'].set('  trimmed-tag  ');
    fixture.componentInstance['addTag'](addTagEvent);
    vi.advanceTimersByTime(500);

    expect(addTagEvent.defaultPrevented).toBe(true);
    expect(fixture.componentInstance['tagList']()).toEqual(['trimmed-tag']);
    expect(fixture.componentInstance['tagField']()).toBe('');

    const saved = storage.getItem(DRAFT_STORAGE_KEY_NEW);
    expect(saved).not.toBeNull();
    if (saved === null) return;
    expect(JSON.parse(saved)['tagList']).toEqual(['trimmed-tag']);
  });

  it('keeps initial edit-route state empty while the article request is unresolved', () => {
    const storage = new MemoryStorage();
    const slowArticles$ = new Subject<Article>();
    const router = { navigateByUrl: vi.fn() };

    TestBed.configureTestingModule({
      imports: [EditorComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ slug: 'slow-slug' })) }
        },
        { provide: ArticlesService, useValue: { get: vi.fn(() => slowArticles$), save: vi.fn() } },
        { provide: Router, useValue: router },
        { provide: JWT_STORAGE, useValue: storage }
      ]
    });

    const fixture = TestBed.createComponent(EditorComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance['title']()).toBe('');
    expect(fixture.componentInstance['description']()).toBe('');
    expect(fixture.componentInstance['body']()).toBe('');
    expect(fixture.componentInstance['tagField']()).toBe('');
    expect(fixture.componentInstance['tagList']()).toEqual([]);
    expect(fixture.componentInstance['isLoading']()).toBe(true);
    expect(fixture.componentInstance['isSubmitting']()).toBe(false);
  });

  it('clears loading after an edit article load failure', () => {
    const storage = new MemoryStorage();
    const articlesService = {
      get: vi.fn(() => throwError(() => new Error('not found'))),
      save: vi.fn()
    };
    const router = { navigateByUrl: vi.fn() };

    TestBed.configureTestingModule({
      imports: [EditorComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ slug: 'missing-slug' })) }
        },
        { provide: ArticlesService, useValue: articlesService },
        { provide: Router, useValue: router },
        { provide: JWT_STORAGE, useValue: storage }
      ]
    });

    const fixture = TestBed.createComponent(EditorComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance['isLoading']()).toBe(false);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
  });
});
