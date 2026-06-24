// Refs: #5 — S3a app shell: wires Header, Footer and RouterOutlet.
// AppState.title() drives the document title (PP-3.1 Signals).

import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Title } from '@angular/platform-browser';

import { AppState } from './shared/app-state';
import { HeaderComponent } from './layout/header.component';
import { FooterComponent } from './layout/footer.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent, FooterComponent],
  template: `
    <app-header />
    <router-outlet />
    <app-footer />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
  private readonly appState = inject(AppState);
  private readonly titleService = inject(Title);

  protected readonly title = computed(() => this.appState.title());

  constructor() {
    effect(() => {
      this.titleService.setTitle(this.title());
    });
  }
}
