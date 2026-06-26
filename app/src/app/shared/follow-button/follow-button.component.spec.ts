// Refs: #7 — S3 mutation-kill tests: FollowButtonComponent toggle, redirect, and error recovery.

import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Profile } from '../../core/articles.model';
import { ProfileService } from '../../core/profile.service';
import { User } from '../../core/user.model';
import { UserService } from '../../core/user.service';
import { FollowButtonComponent } from './follow-button.component';

const unfollowedProfile: Profile = {
  username: 'writer',
  bio: 'A writer',
  image: null,
  following: false
};

const followedProfile: Profile = {
  ...unfollowedProfile,
  following: true
};

const authenticatedUser: User = {
  email: 'reader@example.com',
  token: 'test-token',
  username: 'reader',
  bio: null,
  image: null
};

function setup(
  authenticated: boolean,
  initialProfile: Profile = unfollowedProfile
): {
  fixture: ComponentFixture<FollowButtonComponent>;
  profileService: {
    follow: ReturnType<typeof vi.fn>;
    unfollow: ReturnType<typeof vi.fn>;
  };
  router: { navigateByUrl: ReturnType<typeof vi.fn> };
} {
  const currentUser = signal<User | null>(authenticated ? authenticatedUser : null);
  const profileService = {
    follow: vi.fn(() => of({ ...unfollowedProfile, following: true })),
    unfollow: vi.fn(() => of({ ...followedProfile, following: false }))
  };
  const router = { navigateByUrl: vi.fn() };
  const userService = {
    currentUser: currentUser.asReadonly(),
    isAuthenticated: computed(() => currentUser() !== null)
  };

  TestBed.configureTestingModule({
    imports: [FollowButtonComponent],
    providers: [
      { provide: ProfileService, useValue: profileService },
      { provide: UserService, useValue: userService },
      { provide: Router, useValue: router }
    ]
  });

  const fixture = TestBed.createComponent(FollowButtonComponent);
  fixture.componentRef.setInput('profile', initialProfile);
  fixture.detectChanges();

  return { fixture, profileService, router };
}

describe('FollowButtonComponent', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('redirects anonymous users to /register without calling the API', () => {
    const { fixture, profileService, router } = setup(false);

    fixture.nativeElement.querySelector('button').click();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/register');
    expect(profileService.follow).not.toHaveBeenCalled();
    expect(profileService.unfollow).not.toHaveBeenCalled();
  });

  it('calls follow and updates the profile model when the user is not following', () => {
    const { fixture, profileService } = setup(true, unfollowedProfile);
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');

    expect(button.textContent).toContain('Follow');

    button.click();
    fixture.detectChanges();

    expect(profileService.follow).toHaveBeenCalledWith('writer');
    expect(fixture.componentInstance.profile().following).toBe(true);
    expect(fixture.componentInstance.isSubmitting()).toBe(false);
    expect(button.textContent).toContain('Unfollow');
  });

  it('calls unfollow and updates the profile model when the user is already following', () => {
    const { fixture, profileService } = setup(true, followedProfile);
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');

    expect(button.textContent).toContain('Unfollow');

    button.click();
    fixture.detectChanges();

    expect(profileService.unfollow).toHaveBeenCalledWith('writer');
    expect(fixture.componentInstance.profile().following).toBe(false);
    expect(fixture.componentInstance.isSubmitting()).toBe(false);
    expect(button.textContent).toContain('Follow');
  });

  it('resets isSubmitting to false when the follow API call fails', () => {
    const { fixture, profileService } = setup(true, unfollowedProfile);
    profileService.follow.mockReturnValue(throwError(() => new Error('network')));

    fixture.nativeElement.querySelector('button').click();

    expect(fixture.componentInstance.isSubmitting()).toBe(false);
  });

  it('resets isSubmitting to false when the unfollow API call fails', () => {
    const { fixture, profileService } = setup(true, followedProfile);
    profileService.unfollow.mockReturnValue(throwError(() => new Error('network')));

    fixture.nativeElement.querySelector('button').click();

    expect(fixture.componentInstance.isSubmitting()).toBe(false);
  });

  it('ignores a second click while a follow request is in flight', () => {
    const { fixture, profileService } = setup(true, unfollowedProfile);
    // Use a never-completing observable to simulate in-flight state
    profileService.follow.mockReturnValue(new Subject<Profile>());

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    button.click();
    button.click();

    expect(profileService.follow).toHaveBeenCalledTimes(1);
  });

  it('displays the username inside the button label', () => {
    const { fixture } = setup(true, unfollowedProfile);
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');

    expect(button.textContent).toContain('writer');
  });
});
