// Refs: #5 — S3d tests: RegisterComponent auth flow behavior.

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UserService } from '../../core/user.service';
import { RegisterComponent } from './register.component';

const registeredUser = {
  email: 'new@example.com',
  token: 'test-token',
  username: 'newuser',
  bio: null,
  image: null
};

function setup(registerFails = false, errorPayload?: unknown): {
  fixture: ComponentFixture<RegisterComponent>;
  router: Router;
} {
  const defaultError = { error: { errors: { email: ['is invalid'] } } };
  const userService = {
    attemptAuth: vi.fn(() =>
      registerFails
        ? throwError(() => (errorPayload !== undefined ? errorPayload : defaultError))
        : of(registeredUser)
    )
  };

  TestBed.configureTestingModule({
    imports: [RegisterComponent],
    providers: [
      provideRouter([]),
      { provide: UserService, useValue: userService }
    ]
  });

  const router = TestBed.inject(Router);
  vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
  const fixture = TestBed.createComponent(RegisterComponent);
  fixture.detectChanges();

  return { fixture, router };
}

function inputValue(input: HTMLInputElement, value: string): void {
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

describe('RegisterComponent', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('registers a new user with the entered credentials and redirects home', () => {
    const { fixture, router } = setup();
    const userService = TestBed.inject(UserService) as unknown as {
      attemptAuth: ReturnType<typeof vi.fn>;
    };
    const inputs = fixture.nativeElement.querySelectorAll('input') as NodeListOf<HTMLInputElement>;

    inputValue(inputs[0], 'newuser');
    inputValue(inputs[1], 'new@example.com');
    inputValue(inputs[2], 'password123');

    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));

    expect(userService.attemptAuth).toHaveBeenCalledWith('register', {
      email: 'new@example.com',
      password: 'password123',
      username: 'newuser'
    });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('shows API validation errors when registration fails', () => {
    const { fixture } = setup(true);
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('email is invalid');
  });

  it('prevents a second submission while one is already in flight', () => {
    const { fixture } = setup();
    const userService = TestBed.inject(UserService) as unknown as { attemptAuth: ReturnType<typeof vi.fn> };
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form');

    form.dispatchEvent(new Event('submit'));
    form.dispatchEvent(new Event('submit'));

    expect(userService.attemptAuth).toHaveBeenCalledTimes(1);
  });

  it('ignores updateUsername when the event target is not an input element', () => {
    const { fixture } = setup();
    const component = fixture.componentInstance;

    const divEvent = new Event('input');
    Object.defineProperty(divEvent, 'target', { value: document.createElement('div') });
    component['updateUsername'](divEvent);

    expect(component['username']()).toBe('');
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

  it('renders fallback error when the thrown error is not an object', () => {
    const { fixture } = setup(true, 'string error');
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('could not be submitted');
  });

  it('renders fallback error when error.error is not an object', () => {
    const { fixture } = setup(true, { error: 'not-an-object' });
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('could not be submitted');
  });

  it('renders fallback error when error.error.errors is not an object', () => {
    const { fixture } = setup(true, { error: { errors: 'not-an-object' } });
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('could not be submitted');
  });

  it('renders fallback when all error fields are non-array values', () => {
    const { fixture } = setup(true, { error: { errors: { username: 'not-an-array' } } });
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('could not be submitted');
  });

  it('renders fallback when error field array contains non-string values', () => {
    const { fixture } = setup(true, { error: { errors: { username: [42, true] } } });
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('could not be submitted');
  });

  it('renders the structured error skipping non-array fields and displaying valid ones', () => {
    const { fixture } = setup(true, {
      error: { errors: { bad: 'not-array', email: ['is invalid'] } }
    });
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('email is invalid');
    expect(fixture.nativeElement.textContent).not.toContain('bad');
  });

  it('renders fallback when a mixed-type array has some non-string values (kills every vs some)', () => {
    // [42, 'valid'] -> every() returns false (correct: fallback), some() returns true (wrong)
    const { fixture } = setup(true, { error: { errors: { username: [42, 'valid'] } } });
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('could not be submitted');
  });

  it('resets isSubmitting to false after a failed registration attempt', () => {
    const { fixture } = setup(true);
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));

    expect(fixture.componentInstance['isSubmitting']()).toBe(false);
  });

  it('shows fallback when null is thrown (kills isRecord null-check)', () => {
    const { fixture } = setup(true, null);
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('could not be submitted');
  });

  it('shows fallback when error.error is null (kills L18 isRecord guard)', () => {
    const { fixture } = setup(true, { error: null });
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('could not be submitted');
  });

  it('shows fallback when error.error.errors is null (kills L21 isRecord guard)', () => {
    const { fixture } = setup(true, { error: { errors: null } });
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('could not be submitted');
  });
});
