// Refs: #5 — S3a complete route table (path routing, PP-3.2).
// Placeholder components for S3c/S3d routes; guards wired per auth contract.

import { Routes } from '@angular/router';

import { authedGuard, anonGuard } from './core/auth.guards';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./home/home.component').then((m) => m.HomeComponent)
  },
  {
    path: 'login',
    canActivate: [anonGuard],
    loadComponent: () =>
      import('./features/login/login.component').then((m) => m.LoginComponent)
  },
  {
    path: 'register',
    canActivate: [anonGuard],
    loadComponent: () =>
      import('./features/register/register.component').then((m) => m.RegisterComponent)
  },
  {
    path: 'settings',
    canActivate: [authedGuard],
    loadComponent: () =>
      import('./features/settings/settings.component').then((m) => m.SettingsComponent)
  },
  {
    path: 'editor',
    canActivate: [authedGuard],
    loadComponent: () =>
      import('./features/editor/editor.component').then((m) => m.EditorComponent)
  },
  {
    path: 'editor/:slug',
    canActivate: [authedGuard],
    loadComponent: () =>
      import('./features/editor/editor.component').then((m) => m.EditorComponent)
  },
  {
    path: 'article/:slug',
    loadComponent: () =>
      import('./features/article/article.component').then((m) => m.ArticleComponent)
  },
  {
    path: 'profile/:username',
    loadComponent: () =>
      import('./features/profile/profile.component').then((m) => m.ProfilePageComponent)
  },
  {
    path: 'profile/:username/favorites',
    loadComponent: () =>
      import('./features/profile/profile.component').then((m) => m.ProfilePageComponent)
  }
];
