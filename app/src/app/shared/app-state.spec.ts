// Refs: #7 — fase-5-qualidade: mutation score — AppState defaults.

import { describe, expect, it } from 'vitest';

import { AppState } from './app-state';

describe('AppState', () => {
  it('starts with the Conduit document title', () => {
    const appState = new AppState();

    expect(appState.title()).toBe('Conduit');
  });
});
