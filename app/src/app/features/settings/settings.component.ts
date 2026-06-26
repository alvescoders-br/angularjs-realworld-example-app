// Refs: #5 — S3d settings page: update current user and logout.

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { User, UserUpdate } from '../../core/user.model';
import { UserService } from '../../core/user.service';
import { ApiErrors, ListErrorsComponent } from '../../shared/list-errors/list-errors.component';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function extractApiErrors(error: unknown): ApiErrors {
  const fallback: ApiErrors = { body: ['could not be updated'] };
  if (!isRecord(error)) return fallback;

  const responseBody = error['error'];
  if (!isRecord(responseBody)) return fallback;

  const errors = responseBody['errors'];
  if (!isRecord(errors)) return fallback;

  const apiErrors: ApiErrors = {};
  for (const [field, messages] of Object.entries(errors)) {
    if (!Array.isArray(messages)) continue;
    if (!messages.every((message): message is string => typeof message === 'string')) continue;

    apiErrors[field] = messages;
  }

  return Object.keys(apiErrors).length > 0 ? apiErrors : fallback;
}

@Component({
  selector: 'app-settings',
  imports: [ListErrorsComponent],
  template: `
    <div class="settings-page">
      <div class="container page">
        <div class="row">
          <div class="col-md-6 offset-md-3 col-xs-12">
            <h1 class="text-xs-center">Your Settings</h1>

            <app-list-errors [errors]="errors()" />

            <form (submit)="submit($event)">
              <fieldset [disabled]="isSubmitting()">
                <fieldset class="form-group">
                  <input
                    class="form-control"
                    type="text"
                    placeholder="URL of profile picture"
                    [value]="image()"
                    (input)="updateImage($event)" />
                </fieldset>

                <fieldset class="form-group">
                  <input
                    class="form-control form-control-lg"
                    type="text"
                    placeholder="Username"
                    [value]="username()"
                    (input)="updateUsername($event)" />
                </fieldset>

                <fieldset class="form-group">
                  <textarea
                    class="form-control form-control-lg"
                    rows="8"
                    placeholder="Short bio about you"
                    [value]="bio()"
                    (input)="updateBio($event)"></textarea>
                </fieldset>

                <fieldset class="form-group">
                  <input
                    class="form-control form-control-lg"
                    type="email"
                    placeholder="Email"
                    [value]="email()"
                    (input)="updateEmail($event)" />
                </fieldset>

                <fieldset class="form-group">
                  <input
                    class="form-control form-control-lg"
                    type="password"
                    placeholder="New Password"
                    [value]="password()"
                    (input)="updatePassword($event)" />
                </fieldset>

                <button class="btn btn-lg btn-primary pull-xs-right" type="submit">
                  Update Settings
                </button>
              </fieldset>
            </form>

            <hr />

            <button class="btn btn-outline-danger" type="button" (click)="logout()">
              Or click here to logout.
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsComponent {
  private readonly router = inject(Router);
  private readonly userService = inject(UserService);

  protected readonly image = signal('');
  protected readonly username = signal('');
  protected readonly bio = signal('');
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly errors = signal<ApiErrors | null>(null);
  protected readonly isSubmitting = signal(false);

  constructor() {
    const currentUser = this.userService.currentUser();
    if (currentUser !== null) {
      this.setFormData(currentUser);
    }
  }

  protected updateImage(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;

    this.image.set(target.value);
  }

  protected updateUsername(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;

    this.username.set(target.value);
  }

  protected updateBio(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLTextAreaElement)) return;

    this.bio.set(target.value);
  }

  protected updateEmail(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;

    this.email.set(target.value);
  }

  protected updatePassword(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;

    this.password.set(target.value);
  }

  protected submit(event: Event): void {
    event.preventDefault();
    if (this.isSubmitting()) return;

    this.isSubmitting.set(true);
    this.errors.set(null);
    this.userService.update(this.buildUpdate()).subscribe({
      next: (user) => {
        void this.router.navigateByUrl(`/profile/${user.username}`);
      },
      error: (error: unknown) => {
        this.errors.set(extractApiErrors(error));
        this.isSubmitting.set(false);
      }
    });
  }

  protected logout(): void {
    this.userService.logout();
  }

  private buildUpdate(): UserUpdate {
    const update: UserUpdate = {
      image: this.image() || null,
      username: this.username(),
      bio: this.bio() || null,
      email: this.email()
    };
    const password = this.password();
    if (password.trim()) {
      update.password = password;
    }

    return update;
  }

  private setFormData(user: User): void {
    this.image.set(user.image ?? '');
    this.username.set(user.username);
    this.bio.set(user.bio ?? '');
    this.email.set(user.email);
    this.password.set('');
  }
}
