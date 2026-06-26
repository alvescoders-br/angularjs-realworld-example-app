// Refs: #5 — S3a tests: ListErrorsComponent.

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { ListErrorsComponent } from './list-errors.component';

function setup(errors: Record<string, string[]> | null = null): {
  fixture: ComponentFixture<ListErrorsComponent>;
} {
  TestBed.configureTestingModule({});
  const fixture = TestBed.createComponent(ListErrorsComponent);
  fixture.componentRef.setInput('errors', errors);
  fixture.detectChanges();
  return { fixture };
}

describe('ListErrorsComponent', () => {
  it('renders nothing when errors is null', () => {
    const { fixture } = setup(null);
    const list = fixture.nativeElement.querySelector('ul.error-messages');
    expect(list).toBeNull();
  });

  it('renders an <li> for each error message', () => {
    const { fixture } = setup({ email: ['is invalid'], password: ['is too short'] });
    const items: NodeListOf<HTMLLIElement> = fixture.nativeElement.querySelectorAll('li');
    expect(items.length).toBe(2);
  });

  it('includes the field name in the error text', () => {
    const { fixture } = setup({ username: ['is required'] });
    const item: HTMLLIElement = fixture.nativeElement.querySelector('li');
    expect(item.textContent?.trim()).toContain('username');
    expect(item.textContent?.trim()).toContain('is required');
  });
});
