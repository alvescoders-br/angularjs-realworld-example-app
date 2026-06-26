// Refs: #5 — S3d tests: LoginComponent auth form.

import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { User } from '../../core/user.model';
import { UserService } from '../../core/user.service';
import { LoginComponent } from './login.component';

const user: User = {
  bio: null,
  email: 'reader@example.com',
  image: null,
  token: 'test-token',
  username: 'reader'
};

function setup(authFails = false, errorPayload?: unknown): {
  fixture: ComponentFixture<LoginComponent>;
  router: Router;
  userService: { attemptAuth: ReturnType<typeof vi.fn> };
} {
  const currentUser = signal<User | null>(null);
  const defaultError = { error: { errors: { email: ['is invalid'] } } };
  const userService = {
    currentUser: currentUser.asReadonly(),
    isAuthenticated: signal(false).asReadonly(),
    attemptAuth: vi.fn(() =>
      authFails
        ? throwError(() => (errorPayload !== undefined ? errorPayload : defaultError))
        : of(user)
    )
  };

  TestBed.configureTestingModule({
    imports: [LoginComponent],
    providers: [
      provideRouter([]),
      { provide: UserService, useValue: userService }
    ]
  });

  const router = TestBed.inject(Router);
  vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
  const fixture = TestBed.createComponent(LoginComponent);
  fixture.detectChanges();

  return { fixture, router, userService };
}

describe('LoginComponent', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('submits login credentials and redirects home', () => {
    const { fixture, router, userService } = setup();
    const inputs = fixture.nativeElement.querySelectorAll('input') as NodeListOf<HTMLInputElement>;
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form');

    inputs[0].value = 'reader@example.com';
    inputs[0].dispatchEvent(new Event('input'));
    inputs[1].value = 'test-password';
    inputs[1].dispatchEvent(new Event('input'));
    form.dispatchEvent(new Event('submit'));

    expect(userService.attemptAuth).toHaveBeenCalledWith('login', {
      email: 'reader@example.com',
      password: 'test-password'
    });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('renders API errors when login fails', () => {
    const { fixture } = setup(true);
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form');

    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('email is invalid');
  });

  it('prevents a second submission while one is already in flight', () => {
    const currentUser = signal<User | null>(null);
    const userService = {
      currentUser: currentUser.asReadonly(),
      isAuthenticated: signal(false).asReadonly(),
      attemptAuth: vi.fn(() => new Subject<User>())
    };

    TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        { provide: UserService, useValue: userService }
      ]
    });

    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();

    const form: HTMLFormElement = fixture.nativeElement.querySelector('form');
    form.dispatchEvent(new Event('submit'));
    form.dispatchEvent(new Event('submit'));

    expect(userService.attemptAuth).toHaveBeenCalledTimes(1);
  });

  it('ignores updateEmail when the event target is not an input element', () => {
    const { fixture } = setup();
    const component = fixture.componentInstance;

    const divEvent = new Event('input');
    Object.defineProperty(divEvent, 'target', { value: document.createElement('div') });
    component['updateEmail'](divEvent);

    expect(component['email']()).toBe('');
  });

  it('ignores updatePassword when the event target is not an input element', () => {
    const { fixture } = setup();
    const component = fixture.componentInstance;

    const divEvent = new Event('input');
    Object.defineProperty(divEvent, 'target', { value: document.createElement('div') });
    component['updatePassword'](divEvent);

    expect(component['password']()).toBe('');
  });

  it('renders fallback error when the thrown value is not an object', () => {
    const { fixture } = setup(true, 'plain string error');
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('could not be submitted');
  });

  it('renders fallback error when error.error is not an object', () => {
    const { fixture } = setup(true, { error: 42 });
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('could not be submitted');
  });

  it('renders fallback error when error.error.errors is not an object', () => {
    const { fixture } = setup(true, { error: { errors: null } });
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('could not be submitted');
  });

  it('renders fallback when all error fields are non-array values', () => {
    const { fixture } = setup(true, { error: { errors: { email: 'not-an-array' } } });
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('could not be submitted');
  });

  it('renders fallback when error field array contains non-string values', () => {
    const { fixture } = setup(true, { error: { errors: { email: [404, false] } } });
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('could not be submitted');
  });

  it('shows valid fields and skips non-array ones', () => {
    const { fixture } = setup(true, {
      error: { errors: { bad: 'not-array', password: ['is too short'] } }
    });
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('password is too short');
  });

  it('renders fallback when a mixed-type array has some non-string values (kills every vs some)', () => {
    // [404, 'valid'] -> every() returns false (correct: fallback), some() returns true (wrong: shows 'valid')
    const { fixture } = setup(true, { error: { errors: { email: [404, 'valid'] } } });
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('could not be submitted');
  });

  it('resets isSubmitting to false after a failed login attempt', () => {
    const { fixture } = setup(true);
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));

    expect(fixture.componentInstance['isSubmitting']()).toBe(false);
  });
});
