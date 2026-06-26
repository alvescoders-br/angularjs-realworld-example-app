// Refs: #5 - S3a layout component: header / nav bar.
// Shows guest nav (Home / Sign in / Sign up) or authed nav (Home / New Article / Settings / Profile).
// Reads UserService.currentUser() and isAuthenticated() as Signals (PP-3.1).
// Refs: #6 #13 - dark mode: toggle button appended to nav without reorganizing existing items.

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { ThemeService } from '../core/theme.service';
import { UserService } from '../core/user.service';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="navbar navbar-light">
      <div class="container">

        <a class="navbar-brand" routerLink="/">conduit</a>

        @if (!userService.isAuthenticated()) {
          <!-- Guest nav -->
          <ul class="nav navbar-nav pull-xs-right">
            <li class="nav-item">
              <a class="nav-link" routerLink="/" routerLinkActive="active"
                [routerLinkActiveOptions]="{ exact: true }">Home</a>
            </li>
            <li class="nav-item">
              <a class="nav-link" routerLink="/login" routerLinkActive="active">Sign in</a>
            </li>
            <li class="nav-item">
              <a class="nav-link" routerLink="/register" routerLinkActive="active">Sign up</a>
            </li>
            <li class="nav-item">
              <button
                class="nav-link btn btn-link theme-toggle"
                type="button"
                [attr.aria-label]="themeService.isDark() ? 'Switch to light mode' : 'Switch to dark mode'"
                [attr.aria-pressed]="themeService.isDark()"
                (click)="themeService.toggle()">
                @if (themeService.isDark()) {
                  <span class="theme-toggle-icon" aria-hidden="true">&#9728;</span>
                } @else {
                  <span class="theme-toggle-icon" aria-hidden="true">&#9790;</span>
                }
              </button>
            </li>
          </ul>
        } @else {
          <!-- Authed nav -->
          <ul class="nav navbar-nav pull-xs-right">
            <li class="nav-item">
              <a class="nav-link" routerLink="/" routerLinkActive="active"
                [routerLinkActiveOptions]="{ exact: true }">Home</a>
            </li>
            <li class="nav-item">
              <a class="nav-link" routerLink="/editor" routerLinkActive="active">
                <i class="ion-compose"></i>&nbsp;New Article
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link" routerLink="/settings" routerLinkActive="active">
                <i class="ion-gear-a"></i>&nbsp;Settings
              </a>
            </li>
            <li class="nav-item">
              <a
                class="nav-link"
                [routerLink]="['/profile', userService.currentUser()!.username]"
                routerLinkActive="active">
                @if (userService.currentUser()?.image) {
                  <img
                    [src]="userService.currentUser()!.image!"
                    class="user-pic"
                    [alt]="userService.currentUser()!.username" />
                }
                {{ userService.currentUser()!.username }}
              </a>
            </li>
            <li class="nav-item">
              <button
                class="nav-link btn btn-link theme-toggle"
                type="button"
                [attr.aria-label]="themeService.isDark() ? 'Switch to light mode' : 'Switch to dark mode'"
                [attr.aria-pressed]="themeService.isDark()"
                (click)="themeService.toggle()">
                @if (themeService.isDark()) {
                  <span class="theme-toggle-icon" aria-hidden="true">&#9728;</span>
                } @else {
                  <span class="theme-toggle-icon" aria-hidden="true">&#9790;</span>
                }
              </button>
            </li>
          </ul>
        }

      </div>
    </nav>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeaderComponent {
  protected readonly userService = inject(UserService);
  protected readonly themeService = inject(ThemeService);
}
