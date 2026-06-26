// Refs: #6 — S2 drafts: DraftService persists editor drafts to localStorage.
// Shape persisted: exactly { title, description, body, tagList } — no slug, no API keys.

import { inject, Injectable } from '@angular/core';

import { JWT_STORAGE } from './app-tokens';

/** The exact shape saved for each draft. No slug — that lives in the storage key. */
export type ArticleDraft = {
  title: string;
  description: string;
  body: string;
  tagList: string[];
};

function isArticleDraft(value: unknown): value is ArticleDraft {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj['title'] === 'string' &&
    typeof obj['description'] === 'string' &&
    typeof obj['body'] === 'string' &&
    Array.isArray(obj['tagList']) &&
    (obj['tagList'] as unknown[]).every((tag) => typeof tag === 'string')
  );
}

@Injectable({ providedIn: 'root' })
export class DraftService {
  private readonly storage = inject(JWT_STORAGE);

  /** Persists the draft under the given namespaced key. */
  save(draftKey: string, draft: ArticleDraft): void {
    this.storage.setItem(draftKey, JSON.stringify(draft));
  }

  /**
   * Loads and validates the draft for the given key.
   * Returns null if absent, not parseable, or malformed.
   */
  load(draftKey: string): ArticleDraft | null {
    const raw = this.storage.getItem(draftKey);
    if (raw === null) return null;

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch {
      return null;
    }

    return isArticleDraft(parsed) ? parsed : null;
  }

  /** Removes the draft for the given key. */
  clear(draftKey: string): void {
    this.storage.removeItem(draftKey);
  }
}
