// Refs: #6 — S1 dark mode: unit tests for ThemeService.

import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { JWT_STORAGE, THEME_STORAGE_KEY } from './app-tokens';
import { MemoryStorage } from './testing-storage';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  function setup(initialStorageEntries: Record<string, string> = {}): {
    themeService: ThemeService;
    storage: MemoryStorage;
    htmlEl: HTMLElement;
  } {
    const storage = new MemoryStorage();
    for (const [key, value] of Object.entries(initialStorageEntries)) {
      storage.setItem(key, value);
    }

    TestBed.configureTestingModule({
      providers: [
        { provide: JWT_STORAGE, useValue: storage }
      ]
    });

    const themeService = TestBed.inject(ThemeService);
    // Flush reactive effects so DOM mutations are applied synchronously.
    TestBed.flushEffects();
    const htmlEl = TestBed.inject(DOCUMENT).documentElement;

    return { themeService, storage, htmlEl };
  }

  it('defaults to light theme when localStorage has no entry', () => {
    const { themeService, htmlEl } = setup();

    expect(themeService.theme()).toBe('light');
    expect(themeService.isDark()).toBe(false);
    expect(htmlEl.classList.contains('theme-dark')).toBe(false);
  });

  it('restores dark theme from localStorage on construction', () => {
    const { themeService, htmlEl } = setup({ [THEME_STORAGE_KEY]: 'dark' });

    expect(themeService.theme()).toBe('dark');
    expect(themeService.isDark()).toBe(true);
    expect(htmlEl.classList.contains('theme-dark')).toBe(true);
  });

  it('toggles from light to dark, persists to localStorage, and applies theme-dark class', () => {
    const { themeService, storage, htmlEl } = setup();

    themeService.toggle();
    TestBed.flushEffects();

    expect(themeService.theme()).toBe('dark');
    expect(themeService.isDark()).toBe(true);
    expect(storage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(htmlEl.classList.contains('theme-dark')).toBe(true);
  });

  it('toggles from dark back to light, updates localStorage, and removes theme-dark class', () => {
    const { themeService, storage, htmlEl } = setup({ [THEME_STORAGE_KEY]: 'dark' });

    themeService.toggle();
    TestBed.flushEffects();

    expect(themeService.theme()).toBe('light');
    expect(themeService.isDark()).toBe(false);
    expect(storage.getItem(THEME_STORAGE_KEY)).toBe('light');
    expect(htmlEl.classList.contains('theme-dark')).toBe(false);
  });

  it('does not collide with the jwtToken localStorage key', () => {
    const { storage } = setup();

    storage.setItem('jwtToken', 'signed-token');
    // ThemeService should not touch jwtToken
    expect(storage.getItem('jwtToken')).toBe('signed-token');
    expect(storage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });
});
