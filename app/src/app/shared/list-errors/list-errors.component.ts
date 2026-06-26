// Refs: #5 — S3a shared component: list-errors.
// Displays field-level errors from the RealWorld API (e.g. { email: ['is invalid'] }).

import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { KeyValuePipe } from '@angular/common';

/** Map of fieldName → array of error messages from the RealWorld API. */
export type ApiErrors = Record<string, string[]>;

@Component({
  selector: 'app-list-errors',
  imports: [KeyValuePipe],
  template: `
    @if (errors()) {
      <ul class="error-messages">
        @for (entry of errors() | keyvalue; track entry.key) {
          @for (message of entry.value; track message) {
            <li>{{ entry.key }} {{ message }}</li>
          }
        }
      </ul>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ListErrorsComponent {
  readonly errors = input<ApiErrors | null>(null);
}
