// Refs: #5 — S3a shared component: follow-button.
// Toggles profile follow state. Redirects to /register when anonymous.
// Uses Signals (PP-3.1).

import {
  ChangeDetectionStrategy,
  Component,
  inject,
  model,
  signal
} from '@angular/core';
import { Router } from '@angular/router';

import { ProfileService } from '../../core/profile.service';
import { Profile } from '../../core/articles.model';
import { UserService } from '../../core/user.service';

@Component({
  selector: 'app-follow-button',
  template: `
    <button
      class="btn btn-sm action-btn"
      [class.disabled]="isSubmitting()"
      [class.btn-secondary]="profile().following"
      [class.btn-outline-secondary]="!profile().following"
      (click)="submit()">
      <i class="ion-plus-round"></i>&nbsp;
      {{ profile().following ? 'Unfollow' : 'Follow' }} {{ profile().username }}
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FollowButtonComponent {
  private readonly profileService = inject(ProfileService);
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);

  readonly profile = model.required<Profile>();
  readonly isSubmitting = signal(false);

  submit(): void {
    if (this.isSubmitting()) return;

    if (!this.userService.isAuthenticated()) {
      void this.router.navigateByUrl('/register');
      return;
    }

    this.isSubmitting.set(true);

    const action$ = this.profile().following
      ? this.profileService.unfollow(this.profile().username)
      : this.profileService.follow(this.profile().username);

    action$.subscribe({
      next: (updated) => {
        this.profile.set(updated);
        this.isSubmitting.set(false);
      },
      error: () => {
        this.isSubmitting.set(false);
      }
    });
  }
}
