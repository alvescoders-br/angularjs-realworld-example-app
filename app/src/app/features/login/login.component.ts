// Refs: #5 — S3d auth page: login.

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { UserService } from '../../core/user.service';
import { ApiErrors, ListErrorsComponent } from '../../shared/list-errors/list-errors.component';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function extractApiErrors(error: unknown): ApiErrors {
  const fallback: ApiErrors = { body: ['could not be submitted'] };
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
  selector: 'app-login',
  imports: [ListErrorsComponent, RouterLink],
  template: `
    <div class="auth-page">
      <div class="container page">
        <div class="row">
          <div class="col-md-6 offset-md-3 col-xs-12">
            <h1 class="text-xs-center">Sign in</h1>
            <p class="text-xs-center">
              <a routerLink="/register">Need an account?</a>
            </p>

            <app-list-errors [errors]="errors()" />

            <form (submit)="submit($event)">
              <fieldset [disabled]="isSubmitting()">
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
                    placeholder="Password"
                    [value]="password()"
                    (input)="updatePassword($event)" />
                </fieldset>

                <button class="btn btn-lg btn-primary pull-xs-right" type="submit">
                  Sign in
                </button>
              </fieldset>
            </form>
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent {
  private readonly router = inject(Router);
  private readonly userService = inject(UserService);

  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly errors = signal<ApiErrors | null>(null);
  protected readonly isSubmitting = signal(false);

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
    this.userService
      .attemptAuth('login', {
        email: this.email(),
        password: this.password()
      })
      .subscribe({
        next: () => {
          void this.router.navigateByUrl('/');
        },
        error: (error: unknown) => {
          this.errors.set(extractApiErrors(error));
          this.isSubmitting.set(false);
        }
      });
  }
}
