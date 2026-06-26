// Stryker test environment bootstrap — Refs #7
// Uses @analogjs/vitest-angular to initialize Angular TestBed with the
// Angular Vite plugin's compilation pipeline, mirroring what
// @angular/build:unit-test does internally for 'ng test'.

import '@angular/compiler';
import { setupTestBed } from '@analogjs/vitest-angular/setup-testbed';

// zoneless: true matches Angular 21 default + avoids zone.js boot in tests.
// Tests use fixture.detectChanges() explicitly — no zone dependency.
setupTestBed({ zoneless: true });
