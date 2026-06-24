// Refs: #5 — S3c markdown renderer: marked + DomSanitizer without trust bypasses.

import { DOCUMENT } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Renderer2,
  SecurityContext,
  effect,
  inject,
  input,
  viewChild
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { marked } from 'marked';

@Component({
  selector: 'app-markdown-content',
  template: '<div #contentHost></div>',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MarkdownContentComponent implements AfterViewInit {
  private readonly contentHost = viewChild.required<ElementRef<HTMLElement>>('contentHost');
  private readonly document = inject(DOCUMENT);
  private readonly renderer = inject(Renderer2);
  private readonly sanitizer = inject(DomSanitizer);
  private viewInitialized = false;

  readonly markdown = input.required<string>();

  constructor() {
    effect(() => {
      const markdown = this.markdown();
      if (!this.viewInitialized) return;

      this.renderMarkdown(markdown);
    });
  }

  ngAfterViewInit(): void {
    this.viewInitialized = true;
    this.renderMarkdown(this.markdown());
  }

  private renderMarkdown(markdown: string): void {
    const hostElement = this.contentHost().nativeElement;
    while (hostElement.firstChild) {
      this.renderer.removeChild(hostElement, hostElement.firstChild);
    }

    const markedOutput = marked.parse(markdown, { async: false });
    const rawHtml = typeof markedOutput === 'string' ? markedOutput : '';
    const sanitizedHtml = this.sanitizer.sanitize(SecurityContext.HTML, rawHtml) ?? '';
    const parsedDocument = new DOMParser().parseFromString(sanitizedHtml, 'text/html');

    for (const node of Array.from(parsedDocument.body.childNodes)) {
      this.renderer.appendChild(hostElement, this.document.importNode(node, true));
    }
  }
}
