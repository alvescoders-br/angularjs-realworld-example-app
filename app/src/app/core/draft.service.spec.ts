// Refs: #6 â€” S2 drafts: unit tests for DraftService.

import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { DRAFT_STORAGE_KEY_NEW, DRAFT_STORAGE_KEY_PREFIX, JWT_STORAGE } from './app-tokens';
import { ArticleDraft, DraftService } from './draft.service';
import { MemoryStorage } from './testing-storage';

function setup(initialEntries: Record<string, string> = {}): {
  draftService: DraftService;
  storage: MemoryStorage;
} {
  const storage = new MemoryStorage();
  for (const [key, value] of Object.entries(initialEntries)) {
    storage.setItem(key, value);
  }

  TestBed.configureTestingModule({
    providers: [{ provide: JWT_STORAGE, useValue: storage }]
  });

  const draftService = TestBed.inject(DraftService);
  return { draftService, storage };
}

const sampleDraft: ArticleDraft = {
  title: 'Draft Title',
  description: 'Draft description',
  body: 'Draft body in markdown',
  tagList: ['angular', 'test']
};

describe('DraftService', () => {
  it('saves and loads a draft from storage', () => {
    const { draftService } = setup();

    draftService.save(DRAFT_STORAGE_KEY_NEW, sampleDraft);
    const loaded = draftService.load(DRAFT_STORAGE_KEY_NEW);

    expect(loaded).toEqual(sampleDraft);
  });

  it('returns null when no draft exists for the key', () => {
    const { draftService } = setup();

    expect(draftService.load(DRAFT_STORAGE_KEY_NEW)).toBeNull();
  });

  it('returns null when the stored value is not valid JSON', () => {
    const { draftService } = setup({ [DRAFT_STORAGE_KEY_NEW]: 'not-json' });

    expect(draftService.load(DRAFT_STORAGE_KEY_NEW)).toBeNull();
  });

  it('returns null when the stored JSON has the wrong shape (missing body)', () => {
    const malformed = JSON.stringify({ title: 'x', description: 'y', tagList: [] });
    const { draftService } = setup({ [DRAFT_STORAGE_KEY_NEW]: malformed });

    expect(draftService.load(DRAFT_STORAGE_KEY_NEW)).toBeNull();
  });

  it('returns null when tagList contains non-string values', () => {
    const malformed = JSON.stringify({
      title: 'x',
      description: 'y',
      body: 'z',
      tagList: [1, 2]
    });
    const { draftService } = setup({ [DRAFT_STORAGE_KEY_NEW]: malformed });

    expect(draftService.load(DRAFT_STORAGE_KEY_NEW)).toBeNull();
  });

  it('clears a draft from storage', () => {
    const { draftService } = setup();

    draftService.save(DRAFT_STORAGE_KEY_NEW, sampleDraft);
    draftService.clear(DRAFT_STORAGE_KEY_NEW);

    expect(draftService.load(DRAFT_STORAGE_KEY_NEW)).toBeNull();
  });

  it('saves edit-article draft under the slug-based key', () => {
    const { draftService, storage } = setup();
    const slug = 'hello-angular';
    const editKey = `${DRAFT_STORAGE_KEY_PREFIX}${slug}`;

    draftService.save(editKey, sampleDraft);

    expect(storage.getItem(editKey)).not.toBeNull();
    expect(draftService.load(editKey)).toEqual(sampleDraft);
  });

  it('does not collide with jwtToken or conduit.theme keys', () => {
    const { draftService, storage } = setup({
      jwtToken: 'signed-token',
      'conduit.theme': 'dark'
    });

    draftService.save(DRAFT_STORAGE_KEY_NEW, sampleDraft);

    expect(storage.getItem('jwtToken')).toBe('signed-token');
    expect(storage.getItem('conduit.theme')).toBe('dark');
  });

  it('returns null when the stored JSON is a null literal', () => {
    const { draftService } = setup({ [DRAFT_STORAGE_KEY_NEW]: 'null' });

    expect(draftService.load(DRAFT_STORAGE_KEY_NEW)).toBeNull();
  });

  it('returns null when the stored JSON is a primitive number', () => {
    const { draftService } = setup({ [DRAFT_STORAGE_KEY_NEW]: '42' });

    expect(draftService.load(DRAFT_STORAGE_KEY_NEW)).toBeNull();
  });

  it('returns null when tagList is mixed (some non-string values)', () => {
    // every() vs some(): a mixed list should fail the every() check
    const malformed = JSON.stringify({
      title: 'x',
      description: 'y',
      body: 'z',
      tagList: [1, 'valid-tag']
    });
    const { draftService } = setup({ [DRAFT_STORAGE_KEY_NEW]: malformed });

    expect(draftService.load(DRAFT_STORAGE_KEY_NEW)).toBeNull();
  });

  it('returns null when title is missing', () => {
    const malformed = JSON.stringify({ description: 'y', body: 'z', tagList: [] });
    const { draftService } = setup({ [DRAFT_STORAGE_KEY_NEW]: malformed });

    expect(draftService.load(DRAFT_STORAGE_KEY_NEW)).toBeNull();
  });

  it('returns null when description is missing', () => {
    const malformed = JSON.stringify({ title: 'x', body: 'z', tagList: [] });
    const { draftService } = setup({ [DRAFT_STORAGE_KEY_NEW]: malformed });

    expect(draftService.load(DRAFT_STORAGE_KEY_NEW)).toBeNull();
  });

  it('returns a valid draft when all fields are correct strings with an empty tagList', () => {
    const validDraft = JSON.stringify({ title: 'x', description: 'y', body: 'z', tagList: [] });
    const { draftService } = setup({ [DRAFT_STORAGE_KEY_NEW]: validDraft });

    expect(draftService.load(DRAFT_STORAGE_KEY_NEW)).toEqual({
      title: 'x',
      description: 'y',
      body: 'z',
      tagList: []
    });
  });

  it('returns null when the stored JSON is null literal (kills L17 isRecord guard)', () => {
    // JSON.parse('null') = null. Without the null-guard, code would crash on property access.
    const { draftService } = setup({ [DRAFT_STORAGE_KEY_NEW]: 'null' });

    expect(draftService.load(DRAFT_STORAGE_KEY_NEW)).toBeNull();
  });

  it('returns null when stored JSON is not a valid draft but is an object missing fields', () => {
    // An object that's truthy but missing required fields — to kill L17 condition variant
    const { draftService } = setup({ [DRAFT_STORAGE_KEY_NEW]: JSON.stringify({ title: 42 }) });

    expect(draftService.load(DRAFT_STORAGE_KEY_NEW)).toBeNull();
  });

  it('returns null when raw key has no entry (kills L43 null-check mutation)', () => {
    // storage.getItem returns null when key absent; if guard removed, JSON.parse(null) runs
    const { draftService } = setup({});

    expect(draftService.load('non-existent-key')).toBeNull();
  });

  it('returns null when the JSON is unparseable (kills L48 catch block mutation)', () => {
    // If the catch block becomes empty ({}), the function returns undefined instead of null.
    const { draftService } = setup({ [DRAFT_STORAGE_KEY_NEW]: '{invalid json' });

    expect(draftService.load(DRAFT_STORAGE_KEY_NEW)).toBeNull();
  });
});
