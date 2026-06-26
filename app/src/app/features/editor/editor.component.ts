// Refs: #5 — S3d editor page: create/edit articles without mutating caller payloads.
// Refs: #6 — S2 drafts: autosave with debounce + restore on open + clear on publish success.

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, of, switchMap, catchError } from 'rxjs';

import { Article, ArticleSave } from '../../core/articles.model';
import { ArticlesService } from '../../core/articles.service';
import { DRAFT_STORAGE_KEY_NEW, DRAFT_STORAGE_KEY_PREFIX } from '../../core/app-tokens';
import { DraftService } from '../../core/draft.service';
import { ApiErrors, ListErrorsComponent } from '../../shared/list-errors/list-errors.component';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function extractApiErrors(error: unknown): ApiErrors {
  const fallback: ApiErrors = { body: ['could not be saved'] };
  if (!isRecord(error)) return fallback;

  const responseBody = error['error'];
  if (!isRecord(responseBody)) return fallback;

  const errors = responseBody['errors'];
  if (!isRecord(errors)) return fallback;

  const apiErrors: ApiErrors = {};
  for (const [field, messages] of Object.entries(errors)) {
    if (!Array.isArray(messages)) continue;
    if (!messages.every((message): message is string => typeof message === 'string')) continue;

    apiErrors[field] = messages;
  }

  return Object.keys(apiErrors).length > 0 ? apiErrors : fallback;
}

@Component({
  selector: 'app-editor',
  imports: [ListErrorsComponent],
  template: `
    <div class="editor-page">
      <div class="container page">
        <div class="row">
          <div class="col-md-10 offset-md-1 col-xs-12">
            <app-list-errors [errors]="errors()" />

            @if (isLoading()) {
              <p>Loading article...</p>
            } @else {
              <form (submit)="submit($event)">
                <fieldset [disabled]="isSubmitting()">
                  <fieldset class="form-group">
                    <input
                      class="form-control form-control-lg"
                      type="text"
                      placeholder="Article Title"
                      [value]="title()"
                      (input)="updateTitle($event)" />
                  </fieldset>

                  <fieldset class="form-group">
                    <input
                      class="form-control"
                      type="text"
                      placeholder="What's this article about?"
                      [value]="description()"
                      (input)="updateDescription($event)" />
                  </fieldset>

                  <fieldset class="form-group">
                    <textarea
                      class="form-control"
                      rows="8"
                      placeholder="Write your article (in markdown)"
                      [value]="body()"
                      (input)="updateBody($event)"></textarea>
                  </fieldset>

                  <fieldset class="form-group">
                    <input
                      class="form-control"
                      type="text"
                      placeholder="Enter tags"
                      [value]="tagField()"
                      (input)="updateTagField($event)"
                      (keydown.enter)="addTag($event)" />

                    <div class="tag-list">
                      @for (tag of tagList(); track tag) {
                        <span class="tag-default tag-pill">
                          <i class="ion-close-round" (click)="removeTag(tag)"></i>
                          {{ tag }}
                        </span>
                      }
                    </div>
                  </fieldset>

                  <button class="btn btn-lg pull-xs-right btn-primary" type="submit">
                    Publish Article
                  </button>
                </fieldset>
              </form>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EditorComponent {
  private readonly articlesService = inject(ArticlesService);
  private readonly draftService = inject(DraftService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly title = signal('');
  protected readonly description = signal('');
  protected readonly body = signal('');
  protected readonly tagField = signal('');
  protected readonly tagList = signal<string[]>([]);
  protected readonly slug = signal<string | undefined>(undefined);
  protected readonly errors = signal<ApiErrors | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly isSubmitting = signal(false);

  /** Namespaced localStorage key for the current draft. */
  private readonly draftKey = computed<string>(() => {
    const currentSlug = this.slug();
    return currentSlug !== undefined
      ? `${DRAFT_STORAGE_KEY_PREFIX}${currentSlug}`
      : DRAFT_STORAGE_KEY_NEW;
  });

  /** Autosave subject — emits the current draft shape after each field mutation. */
  private readonly draftSave$ = new Subject<void>();

  constructor() {
    this.route.paramMap
      .pipe(
        map((params) => params.get('slug')),
        distinctUntilChanged(),
        switchMap((slug) => this.loadArticleForEditing(slug)),
        takeUntilDestroyed()
      )
      .subscribe((article) => {
        if (article === null) return;

        this.setArticle(article);
      });

    // Autosave with 500 ms debounce — fires after every field change.
    this.draftSave$.pipe(debounceTime(500), takeUntilDestroyed()).subscribe(() => {
      this.draftService.save(this.draftKey(), {
        title: this.title(),
        description: this.description(),
        body: this.body(),
        tagList: [...this.tagList()]
      });
    });
  }

  protected updateTitle(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;

    this.title.set(target.value);
    this.draftSave$.next();
  }

  protected updateDescription(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;

    this.description.set(target.value);
    this.draftSave$.next();
  }

  protected updateBody(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLTextAreaElement)) return;

    this.body.set(target.value);
    this.draftSave$.next();
  }

  protected updateTagField(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;

    this.tagField.set(target.value);
  }

  protected addTag(event: Event): void {
    event.preventDefault();
    const tag = this.tagField().trim();
    if (!tag || this.tagList().includes(tag)) return;

    this.tagList.update((tags) => [...tags, tag]);
    this.tagField.set('');
    this.draftSave$.next();
  }

  protected removeTag(tagName: string): void {
    this.tagList.update((tags) => tags.filter((tag) => tag !== tagName));
    this.draftSave$.next();
  }

  protected submit(event: Event): void {
    event.preventDefault();
    if (this.isSubmitting()) return;

    const article: ArticleSave = {
      title: this.title(),
      description: this.description(),
      body: this.body(),
      tagList: [...this.tagList()],
      slug: this.slug()
    };

    this.isSubmitting.set(true);
    this.errors.set(null);
    this.articlesService.save(article).subscribe({
      next: (savedArticle) => {
        // Clear the draft only after a successful publish.
        this.draftService.clear(this.draftKey());
        void this.router.navigateByUrl(`/article/${savedArticle.slug}`);
      },
      error: (error: unknown) => {
        this.errors.set(extractApiErrors(error));
        this.isSubmitting.set(false);
      }
    });
  }

  private loadArticleForEditing(slug: string | null) {
    this.errors.set(null);
    this.isSubmitting.set(false);

    if (slug === null) {
      this.resetArticle();
      return of(null);
    }

    this.isLoading.set(true);
    return this.articlesService.get(slug).pipe(
      catchError(() => {
        this.isLoading.set(false);
        void this.router.navigateByUrl('/');
        return of(null);
      })
    );
  }

  private resetArticle(): void {
    this.slug.set(undefined);
    this.isLoading.set(false);

    // Restore draft for a new article if one exists; otherwise start empty.
    const draft = this.draftService.load(DRAFT_STORAGE_KEY_NEW);
    if (draft !== null) {
      this.title.set(draft.title);
      this.description.set(draft.description);
      this.body.set(draft.body);
      this.tagList.set([...draft.tagList]);
    } else {
      this.title.set('');
      this.description.set('');
      this.body.set('');
      this.tagList.set([]);
    }
    this.tagField.set('');
  }

  private setArticle(article: Article): void {
    this.slug.set(article.slug);
    this.isLoading.set(false);

    // Start from the API-loaded values …
    const editKey = `${DRAFT_STORAGE_KEY_PREFIX}${article.slug}`;
    const draft = this.draftService.load(editKey);

    // … then overlay with the saved draft if one exists.
    if (draft !== null) {
      this.title.set(draft.title);
      this.description.set(draft.description);
      this.body.set(draft.body);
      this.tagList.set([...draft.tagList]);
    } else {
      this.title.set(article.title);
      this.description.set(article.description);
      this.body.set(article.body);
      this.tagList.set([...article.tagList]);
    }
    this.tagField.set('');
  }
}
