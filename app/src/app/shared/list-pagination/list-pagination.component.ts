// Refs: #5 — S3a shared component: list-pagination.
// Emits a pageChange output when a page is selected. Hidden when totalPages <= 1.

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output
} from '@angular/core';

@Component({
  selector: 'app-list-pagination',
  template: `
    @if (totalPages() > 1) {
      <nav>
        <ul class="pagination">
          @for (pageNumber of pageRange(); track pageNumber) {
            <li
              class="page-item"
              [class.active]="pageNumber === currentPage()">
              <a
                class="page-link"
                href=""
                (click)="changePage($event, pageNumber)">
                {{ pageNumber }}
              </a>
            </li>
          }
        </ul>
      </nav>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ListPaginationComponent {
  readonly totalPages = input.required<number>();
  readonly currentPage = input.required<number>();
  readonly pageChange = output<number>();

  protected readonly pageRange = computed(() =>
    Array.from({ length: this.totalPages() }, (_, index) => index + 1)
  );

  changePage(event: Event, pageNumber: number): void {
    event.preventDefault();
    this.pageChange.emit(pageNumber);
  }
}
