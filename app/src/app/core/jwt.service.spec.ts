import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { JWT_STORAGE, JWT_STORAGE_KEY } from './app-tokens';
import { JwtService } from './jwt.service';
import { MemoryStorage } from './testing-storage';

describe('JwtService', () => {
  function setup(): { jwtService: JwtService; storage: MemoryStorage } {
    const storage = new MemoryStorage();

    TestBed.configureTestingModule({
      providers: [
        {
          provide: JWT_STORAGE,
          useValue: storage
        }
      ]
    });

    return {
      jwtService: TestBed.inject(JwtService),
      storage
    };
  }

  it('persists tokens under the legacy jwtToken key', () => {
    const { jwtService, storage } = setup();

    jwtService.save('signed-token');

    expect(storage.getItem(JWT_STORAGE_KEY)).toBe('signed-token');
    expect(jwtService.get()).toBe('signed-token');
  });

  it('removes the persisted token', () => {
    const { jwtService } = setup();

    jwtService.save('signed-token');
    jwtService.destroy();

    expect(jwtService.get()).toBeNull();
  });
});
