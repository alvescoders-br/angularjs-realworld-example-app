// Refs: #6 — S1 dark mode foundation: ThemeService manages conduit.theme preference.
// Persists 'light' | 'dark' to localStorage and applies/removes the `theme-dark` class
// on <html> so that CSS custom property overrides target only the dark layer.

import { DOCUMENT } from '@angular/common';
import { effect, inject, Injectable, signal } from '@angular/core';

import { JWT_STORAGE, THEME_STORAGE_KEY } from './app-tokens';

export type Theme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly storage = inject(JWT_STORAGE);
  private readonly document = inject(DOCUMENT);

  private readonly themeState = signal<Theme>(this.loadTheme());

  /** Read-only signal exposing the current theme value. */
  readonly theme = this.themeState.asReadonly();

  /** True when the current theme is dark. */
  readonly isDark = () => this.themeState() === 'dark';

  constructor() {
    // Reactively apply/remove the CSS class whenever the theme signal changes.
    effect(() => {
      this.applyTheme(this.themeState());
    });
  }

  /** Toggles between 'light' and 'dark', persisting the result. */
  toggle(): void {
    const next: Theme = this.themeState() === 'dark' ? 'light' : 'dark';
    this.themeState.set(next);
    this.storage.setItem(THEME_STORAGE_KEY, next);
  }

  private loadTheme(): Theme {
    return this.storage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light';
  }

  private applyTheme(theme: Theme): void {
    const htmlEl = this.document.documentElement;
    if (theme === 'dark') {
      htmlEl.classList.add('theme-dark');
    } else {
      htmlEl.classList.remove('theme-dark');
    }
  }
}
