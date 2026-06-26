// Refs: #5 — S3b tests: ArticleMetaComponent.

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';

import { Article } from '../../core/articles.model';
import { ArticleMetaComponent } from './article-meta.component';

const article: Article = {
  slug: 'hello-angular',
  title: 'Hello Angular',
  description: 'Angular migration',
  body: 'Body',
  tagList: ['angular'],
  createdAt: '2026-01-15T12:00:00.000Z',
  updatedAt: '2026-01-15T12:00:00.000Z',
  favorited: false,
  favoritesCount: 1,
  author: {
    username: 'reader',
    bio: null,
    image: 'https://example.test/avatar.png',
    following: false
  }
};

function setup(): ComponentFixture<ArticleMetaComponent> {
  TestBed.configureTestingModule({
    imports: [ArticleMetaComponent],
    providers: [provideRouter([])]
  });
  const fixture = TestBed.createComponent(ArticleMetaComponent);
  fixture.componentRef.setInput('article', article);
  fixture.detectChanges();
  return fixture;
}

describe('ArticleMetaComponent', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('renders the author profile link, avatar, and formatted date', () => {
    const fixture = setup();
    const authorLink: HTMLAnchorElement | null = fixture.nativeElement.querySelector('.author');
    const image: HTMLImageElement | null = fixture.nativeElement.querySelector('img');

    expect(authorLink?.textContent?.trim()).toBe('reader');
    expect(authorLink?.getAttribute('href')).toBe('/profile/reader');
    expect(image?.getAttribute('src')).toBe(article.author.image);
    expect(image?.getAttribute('alt')).toBe(article.author.username);
    expect(fixture.nativeElement.querySelector('.date')?.textContent).toContain('2026');
  });

  it('falls back to an empty string for the avatar when the author image is null', () => {
    TestBed.configureTestingModule({
      imports: [ArticleMetaComponent],
      providers: [provideRouter([])]
    });
    const noImageArticle: Article = {
      ...article,
      author: { ...article.author, image: null }
    };
    const fixture = TestBed.createComponent(ArticleMetaComponent);
    fixture.componentRef.setInput('article', noImageArticle);
    fixture.detectChanges();

    const image: HTMLImageElement | null = fixture.nativeElement.querySelector('img');
    expect(image?.getAttribute('src')).toBe('');
  });

  it('renders both the avatar link and author link with the profile route', () => {
    const fixture = setup();
    const links: NodeListOf<HTMLAnchorElement> = fixture.nativeElement.querySelectorAll('a');
    const profileLinks = Array.from(links).filter((l) =>
      l.getAttribute('href')?.includes('/profile/reader')
    );

    expect(profileLinks.length).toBeGreaterThanOrEqual(2);
  });
});
