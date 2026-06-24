import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, RouterStateSnapshot, UrlTree } from '@angular/router';
import { firstValueFrom, isObservable, Observable, of } from 'rxjs';
import { describe, expect, it } from 'vitest';

import { anonGuard, authedGuard } from './auth.guards';
import { UserService } from './user.service';

type UserServiceStub = {
  verifyAuth: () => Observable<boolean>;
};

describe('auth guards', () => {
  async function runGuard(
    guard: typeof authedGuard,
    isAuthenticated: boolean
  ): Promise<unknown> {
    const userServiceStub: UserServiceStub = {
      verifyAuth: () => of(isAuthenticated)
    };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: UserService,
          useValue: userServiceStub
        }
      ]
    });

    const result = TestBed.runInInjectionContext(() =>
      guard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
    );

    return isObservable(result) ? firstValueFrom(result) : result;
  }

  it('allows authed routes when verifyAuth succeeds', async () => {
    await expect(runGuard(authedGuard, true)).resolves.toBe(true);
  });

  it('redirects authed routes to home when verifyAuth fails', async () => {
    const result = await runGuard(authedGuard, false);

    expect(result instanceof UrlTree).toBe(true);
    expect(String(result)).toBe('/');
  });

  it('allows anonymous routes when verifyAuth fails', async () => {
    await expect(runGuard(anonGuard, false)).resolves.toBe(true);
  });

  it('redirects anonymous routes to home when verifyAuth succeeds', async () => {
    const result = await runGuard(anonGuard, true);

    expect(result instanceof UrlTree).toBe(true);
    expect(String(result)).toBe('/');
  });
});
