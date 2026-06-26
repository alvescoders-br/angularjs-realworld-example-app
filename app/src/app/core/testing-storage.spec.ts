// Refs: #7 — fase-5-qualidade: mutation score — MemoryStorage utility.

import { describe, expect, it } from 'vitest';

import { MemoryStorage } from './testing-storage';

describe('MemoryStorage', () => {
  it('stores, retrieves, enumerates, removes, and clears string values', () => {
    const storage = new MemoryStorage();

    expect(storage.length).toBe(0);
    expect(storage.getItem('missing')).toBeNull();
    expect(storage.key(0)).toBeNull();

    storage.setItem('first', 'one');
    storage.setItem('second', 'two');

    expect(storage.length).toBe(2);
    expect(storage.getItem('first')).toBe('one');
    expect(storage.key(0)).toBe('first');
    expect(storage.key(1)).toBe('second');
    expect(storage.key(2)).toBeNull();

    storage.removeItem('first');
    expect(storage.length).toBe(1);
    expect(storage.getItem('first')).toBeNull();
    expect(storage.getItem('second')).toBe('two');

    storage.clear();
    expect(storage.length).toBe(0);
    expect(storage.key(0)).toBeNull();
  });
});
