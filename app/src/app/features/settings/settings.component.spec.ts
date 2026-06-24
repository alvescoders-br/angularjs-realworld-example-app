// Refs: #5 — S3d tests: SettingsComponent update/logout behavior.

import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { User } from '../../core/user.model';
import { UserService } from '../../core/user.service';
import { SettingsComponent } from './settings.component';

const currentUser: User = {
  bio: 'Writer',
  email: 'writer@example.com',
  image: 'https://example.test/avatar.png',
  token: 'test-token',
  username: 'writer'
};

function setup(
  updateFails = false,
  errorPayload?: unknown,
  loggedInUser: User | null = currentUser
): {
  fixture: ComponentFixture<SettingsComponent>;
  router: { navigateByUrl: ReturnType<typeof vi.fn> };
  userService: {
    logout: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
} {
  const currentUserSignal = signal<User | null>(loggedInUser);
  const updatedUser = { ...currentUser, username: 'updated-writer' };
  const defaultError = { error: { errors: { email: ['is invalid'] } } };
  const userService = {
    currentUser: currentUserSignal.asReadonly(),
    isAuthenticated: computed(() => currentUserSignal() !== null),
    logout: vi.fn(),
    update: vi.fn(() =>
      updateFails
        ? throwError(() => (errorPayload !== undefined ? errorPayload : defaultError))
        : of(updatedUser)
    )
  };
  const router = { navigateByUrl: vi.fn() };

  TestBed.configureTestingModule({
    imports: [SettingsComponent],
    providers: [
      { provide: Router, useValue: router },
      { provide: UserService, useValue: userService }
    ]
  });

  const fixture = TestBed.createComponent(SettingsComponent);
  fixture.detectChanges();

  return { fixture, router, userService };
}

function inputValue(input: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

describe('SettingsComponent', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('prefills the current user and omits blank passwords from update payloads', () => {
    const { fixture, router, userService } = setup();
    const inputs = fixture.nativeElement.querySelectorAll('input') as NodeListOf<HTMLInputElement>;
    const bio: HTMLTextAreaElement = fixture.nativeElement.querySelector('textarea');
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form');

    expect(inputs[0].value).toBe('https://example.test/avatar.png');
    expect(inputs[1].value).toBe('writer');
    expect(bio.value).toBe('Writer');
    expect(inputs[2].value).toBe('writer@example.com');

    inputValue(inputs[1], 'updated-writer');
    inputValue(inputs[3], '   ');
    form.dispatchEvent(new Event('submit'));

    expect(userService.update).toHaveBeenCalledWith({
      image: 'https://example.test/avatar.png',
      username: 'updated-writer',
      bio: 'Writer',
      email: 'writer@example.com'
    });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/profile/updated-writer');
  });

  it('includes non-empty new passwords and renders API errors', () => {
    const { fixture, userService } = setup(true);
    const inputs = fixture.nativeElement.querySelectorAll('input') as NodeListOf<HTMLInputElement>;
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form');

    inputValue(inputs[3], 'new-password');
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(userService.update).toHaveBeenCalledWith({
      image: 'https://example.test/avatar.png',
      username: 'writer',
      bio: 'Writer',
      email: 'writer@example.com',
      password: 'new-password'
    });
    expect(fixture.nativeElement.textContent).toContain('email is invalid');
  });

  it('delegates logout to UserService', () => {
    const { fixture, userService } = setup();
    const logoutButton: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-outline-danger');

    logoutButton.click();

    expect(userService.logout).toHaveBeenCalled();
  });

  it('prevents a second submission while one is already in flight', () => {
    const currentUserSignal = signal<User | null>(currentUser);
    const userService = {
      currentUser: currentUserSignal.asReadonly(),
      isAuthenticated: computed(() => currentUserSignal() !== null),
      logout: vi.fn(),
      update: vi.fn(() => new Subject<User>())
    };
    const router = { navigateByUrl: vi.fn() };

    TestBed.configureTestingModule({
      imports: [SettingsComponent],
      providers: [
        { provide: Router, useValue: router },
        { provide: UserService, useValue: userService }
      ]
    });

    const fixture = TestBed.createComponent(SettingsComponent);
    fixture.detectChanges();

    const form: HTMLFormElement = fixture.nativeElement.querySelector('form');
    form.dispatchEvent(new Event('submit'));
    form.dispatchEvent(new Event('submit'));

    expect(userService.update).toHaveBeenCalledTimes(1);
  });

  it('does not pre-fill the form when there is no current user', () => {
    const { fixture } = setup(false, undefined, null);
    const inputs = fixture.nativeElement.querySelectorAll('input') as NodeListOf<HTMLInputElement>;

    expect(inputs[0].value).toBe('');
    expect(inputs[1].value).toBe('');
  });

  it('sends null for image and bio when the fields are empty', () => {
    const userWithNulls: User = { ...currentUser, image: null, bio: null };
    const { fixture, userService } = setup(false, undefined, userWithNulls);
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form');

    form.dispatchEvent(new Event('submit'));

    expect(userService.update).toHaveBeenCalledWith(
      expect.objectContaining({ image: null, bio: null })
    );
  });

  it('ignores updateImage when the event target is not an input element', () => {
    const { fixture } = setup();
    const component = fixture.componentInstance;

    const divEvent = new Event('input');
    Object.defineProperty(divEvent, 'target', { value: document.createElement('div') });
    component['updateImage'](divEvent);

    expect(component['image']()).toBe('https://example.test/avatar.png');
  });

  it('ignores updateUsername when the event target is not an input element', () => {
    const { fixture } = setup();
    const component = fixture.componentInstance;

    const divEvent = new Event('input');
    Object.defineProperty(divEvent, 'target', { value: document.createElement('div') });
    component['updateUsername'](divEvent);

    expect(component['username']()).toBe('writer');
  });

  it('ignores updateBio when the event target is not a textarea element', () => {
    const { fixture } = setup();
    const component = fixture.componentInstance;

    const divEvent = new Event('input');
    Object.defineProperty(divEvent, 'target', { value: document.createElement('input') });
    component['updateBio'](divEvent);

    expect(component['bio']()).toBe('Writer');
  });

  it('ignores updateEmail when the event target is not an input element', () => {
    const { fixture } = setup();
    const component = fixture.componentInstance;

    const divEvent = new Event('input');
    Object.defineProperty(divEvent, 'target', { value: document.createElement('div') });
    component['updateEmail'](divEvent);

    expect(component['email']()).toBe('writer@example.com');
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
    const { fixture } = setup(true, null);
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('could not be updated');
  });

  it('renders fallback error when error.error is not an object', () => {
    const { fixture } = setup(true, { error: 'string' });
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('could not be updated');
  });

  it('renders fallback error when error.error.errors is not an object', () => {
    const { fixture } = setup(true, { error: { errors: [] } });
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('could not be updated');
  });

  it('renders fallback when all error fields are non-array values', () => {
    const { fixture } = setup(true, { error: { errors: { username: 'not-an-array' } } });
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('could not be updated');
  });

  it('renders fallback when error field array contains non-string values', () => {
    const { fixture } = setup(true, { error: { errors: { username: [true, 42] } } });
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('could not be updated');
  });

  it('updates the image field when updateImage receives a valid HTMLInputElement event', () => {
    const { fixture } = setup();
    const component = fixture.componentInstance;

    const input = document.createElement('input');
    input.value = 'https://new-image.test/pic.png';
    const event = new Event('input');
    Object.defineProperty(event, 'target', { value: input });
    component['updateImage'](event);

    expect(component['image']()).toBe('https://new-image.test/pic.png');
  });

  it('updates the bio field when updateBio receives a valid HTMLTextAreaElement event', () => {
    const { fixture } = setup();
    const component = fixture.componentInstance;

    const textarea = document.createElement('textarea');
    textarea.value = 'Updated bio text';
    const event = new Event('input');
    Object.defineProperty(event, 'target', { value: textarea });
    component['updateBio'](event);

    expect(component['bio']()).toBe('Updated bio text');
  });

  it('updates the email field when updateEmail receives a valid HTMLInputElement event', () => {
    const { fixture } = setup();
    const component = fixture.componentInstance;

    const input = document.createElement('input');
    input.value = 'updated@example.com';
    const event = new Event('input');
    Object.defineProperty(event, 'target', { value: input });
    component['updateEmail'](event);

    expect(component['email']()).toBe('updated@example.com');
  });

  it('resets isSubmitting to false after an API error', () => {
    const { fixture } = setup(true);
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form');

    form.dispatchEvent(new Event('submit'));

    expect(fixture.componentInstance['isSubmitting']()).toBe(false);
  });

  it('shows valid error fields and skips non-array ones', () => {
    const { fixture } = setup(true, {
      error: { errors: { bad: 'not-array', username: ['is taken'] } }
    });
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('username is taken');
  });

  it('renders fallback when a mixed-type array has some non-string values (kills every vs some)', () => {
    // [404, 'email'] -> every() = false (correct: fallback), some() = true (wrong)
    const { fixture } = setup(true, {
      error: { errors: { email: [404, 'is taken'] } }
    });
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('could not be updated');
  });

  it('bio starts as empty string when no user is loaded (kills StringLiteral mutation)', () => {
    const { fixture } = setup(false, undefined, null);

    expect(fixture.componentInstance['bio']()).toBe('');
  });

  it('email starts as empty string when no user is loaded (kills StringLiteral mutation)', () => {
    const { fixture } = setup(false, undefined, null);

    expect(fixture.componentInstance['email']()).toBe('');
  });

  it('password starts as empty string (kills StringLiteral mutation)', () => {
    const { fixture } = setup(false, undefined, null);

    expect(fixture.componentInstance['password']()).toBe('');
  });
});
