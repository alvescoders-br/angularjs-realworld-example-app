// Refs: #7 — fase-5-qualidade: mutation score — kills survived mutants in app-tokens.ts.

import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';

import {
  BROWSER_WINDOW,
  CONDUIT_API_URL,
  DRAFT_STORAGE_KEY_NEW,
  DRAFT_STORAGE_KEY_PREFIX,
  JWT_STORAGE,
  JWT_STORAGE_KEY,
  THEME_STORAGE_KEY
} from './app-tokens';

function createFakeStorage(): Storage {
  return {
    length: 0,
    clear: vi.fn(),
    getItem: vi.fn(),
    key: vi.fn(),
    removeItem: vi.fn(),
    setItem: vi.fn()
  };
}

describe('app-tokens — string constant exact values', () => {
  it('JWT_STORAGE_KEY equals the literal string "jwtToken"', () => {
    expect(JWT_STORAGE_KEY).toBe('jwtToken');
  });

  it('THEME_STORAGE_KEY equals the literal string "conduit.theme"', () => {
    expect(THEME_STORAGE_KEY).toBe('conduit.theme');
  });

  it('DRAFT_STORAGE_KEY_NEW equals the literal string "conduit.draft.new"', () => {
    expect(DRAFT_STORAGE_KEY_NEW).toBe('conduit.draft.new');
  });

  it('DRAFT_STORAGE_KEY_PREFIX equals the literal string "conduit.draft."', () => {
    expect(DRAFT_STORAGE_KEY_PREFIX).toBe('conduit.draft.');
  });
});

describe('CONDUIT_API_URL injection token', () => {
  it('factory resolves to the exact RealWorld production API URL', () => {
    TestBed.configureTestingModule({});
    const url = TestBed.inject(CONDUIT_API_URL);
    expect(url).toBe('https://conduit.productionready.io/api');
  });

  it('token description is the string "CONDUIT_API_URL"', () => {
    expect(String(CONDUIT_API_URL)).toContain('CONDUIT_API_URL');
  });
});

describe('JWT_STORAGE injection token', () => {
  it('factory resolves to the current globalThis.localStorage object', () => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    const fakeStorage = createFakeStorage();

    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: fakeStorage
    });

    try {
      TestBed.configureTestingModule({});
      const storage = TestBed.inject(JWT_STORAGE);

      expect(storage).toBe(fakeStorage);
      expect(storage).toBe(globalThis.localStorage);
    } finally {
      if (originalDescriptor) {
        Object.defineProperty(globalThis, 'localStorage', originalDescriptor);
      } else {
        delete (globalThis as { localStorage?: Storage }).localStorage;
      }
    }
  });

  it('token description is the string "JWT_STORAGE"', () => {
    expect(String(JWT_STORAGE)).toContain('JWT_STORAGE');
  });
});

describe('BROWSER_WINDOW injection token', () => {
  it('factory resolves to globalThis.window (not undefined or {})', () => {
    TestBed.configureTestingModule({});
    const win = TestBed.inject(BROWSER_WINDOW);
    expect(win).toBe(globalThis.window);
    expect(win).not.toBeUndefined();
    expect(win).not.toEqual({});
  });

  it('token description is the string "BROWSER_WINDOW"', () => {
    expect(String(BROWSER_WINDOW)).toContain('BROWSER_WINDOW');
  });
});
