import { inject, Injectable } from '@angular/core';

import { JWT_STORAGE, JWT_STORAGE_KEY } from './app-tokens';

@Injectable({ providedIn: 'root' })
export class JwtService {
  private readonly storage = inject(JWT_STORAGE);

  save(token: string): void {
    this.storage.setItem(JWT_STORAGE_KEY, token);
  }

  get(): string | null {
    return this.storage.getItem(JWT_STORAGE_KEY);
  }

  destroy(): void {
    this.storage.removeItem(JWT_STORAGE_KEY);
  }
}
