// Refs: #5 — S3c tests: markdown is rendered after DomSanitizer cleanup.
// Refs: #7 — S3 mutation-kill: effect re-render on input change, empty content, viewInitialized guard.

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { MarkdownContentComponent } from './markdown-content.component';

describe('MarkdownContentComponent', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  function setup(markdown: string): ComponentFixture<MarkdownContentComponent> {
    TestBed.configureTestingModule({ imports: [MarkdownContentComponent] });
    const fixture = TestBed.createComponent(MarkdownContentComponent);
    fixture.componentRef.setInput('markdown', markdown);
    fixture.detectChanges();
    return fixture;
  }

  it('renders markdown blocks through the sanitized renderer', () => {
    const fixture = setup('# Rendered title\n\nThis is **safe** content.');

    expect(fixture.nativeElement.querySelector('h1')?.textContent).toBe('Rendered title');
    expect(fixture.nativeElement.querySelector('strong')?.textContent).toBe('safe');
  });

  it('drops executable markup before attaching nodes to the page', () => {
    const fixture = setup('# Safe title\n\n<script>alert(1)</script>');

    expect(fixture.nativeElement.querySelector('h1')?.textContent).toBe('Safe title');
    expect(fixture.nativeElement.querySelector('script')).toBeNull();
  });

  it('renders an empty host element when given an empty string', () => {
    const fixture = setup('');

    const hostDiv = fixture.nativeElement.querySelector('div');
    expect(hostDiv?.children.length ?? 0).toBe(0);
  });

  it('re-renders content when the markdown input is updated', () => {
    const fixture = setup('# First heading');

    expect(fixture.nativeElement.querySelector('h1')?.textContent).toBe('First heading');

    fixture.componentRef.setInput('markdown', '# Second heading\n\nUpdated paragraph.');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('h1')?.textContent).toBe('Second heading');
    expect(fixture.nativeElement.querySelector('p')?.textContent).toContain('Updated paragraph');
  });

  it('replaces old nodes when markdown is updated (no stale nodes remain)', () => {
    const fixture = setup('# Original\n\n- item A\n- item B');

    expect(fixture.nativeElement.querySelectorAll('li').length).toBe(2);

    fixture.componentRef.setInput('markdown', '# Replaced\n\n- only one item');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('h1')?.textContent).toBe('Replaced');
    expect(fixture.nativeElement.querySelectorAll('li').length).toBe(1);
  });

  it('renders paragraph text for plain prose without markup', () => {
    const fixture = setup('Just plain text without any markdown.');

    expect(fixture.nativeElement.querySelector('p')?.textContent).toContain(
      'Just plain text without any markdown.'
    );
  });

  it('renders inline code and code blocks correctly', () => {
    const fixture = setup('Use `signal()` or:\n\n```ts\nconst x = 1;\n```');

    expect(fixture.nativeElement.querySelector('code')?.textContent).toContain('signal()');
  });
});
