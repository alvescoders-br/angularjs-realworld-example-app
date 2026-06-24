import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AppState {
  readonly title = signal('Conduit');
}
