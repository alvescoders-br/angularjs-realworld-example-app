// Refs: #5 — S3a layout component: footer.

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  imports: [RouterLink],
  template: `
    <footer>
      <div class="container">
        <a class="logo-font" routerLink="/">conduit</a>
        <span class="attribution">
          &copy; {{ currentYear }}.
          An interactive learning project from
          <a href="https://thinkster.io">Thinkster</a>.
          Code licensed under MIT.
        </span>
      </div>
    </footer>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FooterComponent {
  protected readonly currentYear = new Date().getFullYear();
}
