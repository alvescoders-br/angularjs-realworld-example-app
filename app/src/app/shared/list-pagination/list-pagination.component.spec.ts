// Refs: #5 — S3a tests: ListPaginationComponent.

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';

import { ListPaginationComponent } from './list-pagination.component';

function setup(totalPages: number, currentPage: number): {
  fixture: ComponentFixture<ListPaginationComponent>;
} {
  TestBed.configureTestingModule({ providers: [provideRouter([])] });
  const fixture = TestBed.createComponent(ListPaginationComponent);
  fixture.componentRef.setInput('totalPages', totalPages);
  fixture.componentRef.setInput('currentPage', currentPage);
  fixture.detectChanges();
  return { fixture };
}

describe('ListPaginationComponent', () => {
  it('renders nothing when totalPages is 1', () => {
    const { fixture } = setup(1, 1);
    const nav = fixture.nativeElement.querySelector('nav');
    expect(nav).toBeNull();
  });

  it('renders one page-item per page when totalPages > 1', () => {
    const { fixture } = setup(3, 1);
    const items: NodeListOf<HTMLLIElement> = fixture.nativeElement.querySelectorAll('.page-item');
    expect(items.length).toBe(3);
  });

  it('marks the currentPage item as active', () => {
    const { fixture } = setup(4, 2);
    const items: NodeListOf<HTMLLIElement> = fixture.nativeElement.querySelectorAll('.page-item');
    expect(items[1].classList.contains('active')).toBe(true);
    expect(items[0].classList.contains('active')).toBe(false);
  });

  it('emits pageChange with the clicked page number', () => {
    const { fixture } = setup(3, 1);
    const handler = vi.fn();
    fixture.componentInstance.pageChange.subscribe(handler);
    const links: NodeListOf<HTMLAnchorElement> = fixture.nativeElement.querySelectorAll('a.page-link');
    links[1].click();
    expect(handler).toHaveBeenCalledWith(2);
  });
});
