import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';

import { CONDUIT_API_URL, JWT_STORAGE } from './app-tokens';
import { JwtService } from './jwt.service';
import { MemoryStorage } from './testing-storage';
import { User } from './user.model';
import { UserService } from './user.service';

const testUser: User = {
  bio: null,
  email: 'test@example.com',
  image: null,
  token: 'signed-token',
  username: 'tester'
};

describe('UserService', () => {
  function setup(): {
    httpTestingController: HttpTestingController;
    jwtService: JwtService;
    userService: UserService;
  } {
    const storage = new MemoryStorage();

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: CONDUIT_API_URL,
          useValue: 'https://example.test/api'
        },
        {
          provide: JWT_STORAGE,
          useValue: storage
        }
      ]
    });

    return {
      httpTestingController: TestBed.inject(HttpTestingController),
      jwtService: TestBed.inject(JwtService),
      userService: TestBed.inject(UserService)
    };
  }

  it('logs in through /users/login, saves jwtToken, and exposes the current user', () => {
    const { httpTestingController, jwtService, userService } = setup();

    userService
      .attemptAuth('login', { email: 'test@example.com', password: 'test-password' })
      .subscribe((user) => {
        expect(user).toEqual(testUser);
      });

    const request = httpTestingController.expectOne('https://example.test/api/users/login');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      user: { email: 'test@example.com', password: 'test-password' }
    });
    request.flush({ user: testUser });

    expect(jwtService.get()).toBe('signed-token');
    expect(userService.currentUser()).toEqual(testUser);
    expect(userService.isAuthenticated()).toBe(true);
    httpTestingController.verify();
  });

  it('registers through /users and preserves the RealWorld user envelope', () => {
    const { httpTestingController, userService } = setup();

    userService
      .attemptAuth('register', {
        email: 'test@example.com',
        password: 'test-password',
        username: 'tester'
      })
      .subscribe((user) => {
        expect(user.username).toBe('tester');
      });

    const request = httpTestingController.expectOne('https://example.test/api/users');
    expect(request.request.method).toBe('POST');
    request.flush({ user: testUser });
    httpTestingController.verify();
  });

  it('returns false from verifyAuth when jwtToken is absent', () => {
    const { httpTestingController, userService } = setup();

    userService.verifyAuth().subscribe((isAuthenticated) => {
      expect(isAuthenticated).toBe(false);
    });

    expect(userService.currentUser()).toBeNull();
    httpTestingController.expectNone('https://example.test/api/user');
    httpTestingController.verify();
  });

  it('fetches /user when jwtToken exists and no current user is cached', () => {
    const { httpTestingController, jwtService, userService } = setup();
    jwtService.save('signed-token');

    userService.verifyAuth().subscribe((isAuthenticated) => {
      expect(isAuthenticated).toBe(true);
    });

    const request = httpTestingController.expectOne('https://example.test/api/user');
    expect(request.request.method).toBe('GET');
    request.flush({ user: testUser });

    expect(userService.currentUser()).toEqual(testUser);
    httpTestingController.verify();
  });

  it('destroys jwtToken when verifyAuth cannot load the current user', () => {
    const { httpTestingController, jwtService, userService } = setup();
    jwtService.save('signed-token');

    userService.verifyAuth().subscribe((isAuthenticated) => {
      expect(isAuthenticated).toBe(false);
    });

    const request = httpTestingController.expectOne('https://example.test/api/user');
    request.flush({ errors: { body: ['invalid'] } }, { status: 401, statusText: 'Unauthorized' });

    expect(jwtService.get()).toBeNull();
    expect(userService.currentUser()).toBeNull();
    httpTestingController.verify();
  });

  it('isAuthenticated returns false before any login', () => {
    const { httpTestingController, userService } = setup();

    expect(userService.isAuthenticated()).toBe(false);
    expect(userService.currentUser()).toBeNull();
    httpTestingController.verify();
  });

  it('verifyAuth returns true without an HTTP call when currentUser is already set', () => {
    const { httpTestingController, jwtService, userService } = setup();
    jwtService.save('signed-token');

    // First call to populate currentUser
    userService.verifyAuth().subscribe();
    const request = httpTestingController.expectOne('https://example.test/api/user');
    request.flush({ user: testUser });

    // Second call should short-circuit -- no new HTTP request
    let secondCallResult: boolean | undefined;
    userService.verifyAuth().subscribe((result) => {
      secondCallResult = result;
    });
    httpTestingController.expectNone('https://example.test/api/user');

    expect(secondCallResult).toBe(true);
    httpTestingController.verify();
  });

  it('updates the current user through /user and stores the returned token', () => {
    const { httpTestingController, jwtService, userService } = setup();
    const updatedUser: User = {
      ...testUser,
      bio: 'Updated bio',
      token: 'updated-token',
      username: 'updated-tester'
    };

    userService.update({ bio: 'Updated bio', username: 'updated-tester' }).subscribe((user) => {
      expect(user).toEqual(updatedUser);
    });

    const request = httpTestingController.expectOne('https://example.test/api/user');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({
      user: { bio: 'Updated bio', username: 'updated-tester' }
    });
    request.flush({ user: updatedUser });

    expect(jwtService.get()).toBe('updated-token');
    expect(userService.currentUser()).toEqual(updatedUser);
    expect(userService.isAuthenticated()).toBe(true);
    httpTestingController.verify();
  });

  it('logout clears the current user, destroys the token, and navigates home', () => {
    const { httpTestingController, jwtService, userService } = setup();
    const router = TestBed.inject(Router);
    const navigateByUrl = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    userService
      .attemptAuth('login', { email: 'test@example.com', password: 'test-password' })
      .subscribe();
    const request = httpTestingController.expectOne('https://example.test/api/users/login');
    request.flush({ user: testUser });

    userService.logout();

    expect(userService.currentUser()).toBeNull();
    expect(userService.isAuthenticated()).toBe(false);
    expect(jwtService.get()).toBeNull();
    expect(navigateByUrl).toHaveBeenCalledWith('/');
    httpTestingController.verify();
  });
});
