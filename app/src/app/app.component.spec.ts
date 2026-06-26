// Refs: #7 — fase-5-qualidade: mutation score — app shell title wiring.

import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { RouterOutlet } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppComponent } from './app.component';
import { FooterComponent } from './layout/footer.component';
import { HeaderComponent } from './layout/header.component';
import { AppState } from './shared/app-state';

@Component({
  selector: 'app-header',
  template: '',
  standalone: true
})
class HeaderStubComponent {}

@Component({
  selector: 'router-outlet',
  template: '',
  standalone: true
})
class RouterOutletStubComponent {}

@Component({
  selector: 'app-footer',
  template: '',
  standalone: true
})
class FooterStubComponent {}

describe('AppComponent', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  function setup(): {
    appState: AppState;
    fixture: ComponentFixture<AppComponent>;
    title: { setTitle: ReturnType<typeof vi.fn> };
  } {
    const appState = new AppState();
    const title = { setTitle: vi.fn() };

    TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        { provide: AppState, useValue: appState },
        { provide: Title, useValue: title }
      ]
    });
    TestBed.overrideComponent(AppComponent, {
      remove: { imports: [HeaderComponent, RouterOutlet, FooterComponent] },
      add: { imports: [HeaderStubComponent, RouterOutletStubComponent, FooterStubComponent] }
    });

    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    return { appState, fixture, title };
  }

  it('renders the application shell regions', () => {
    const { fixture } = setup();

    expect(fixture.nativeElement.querySelector('app-header')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('router-outlet')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-footer')).not.toBeNull();
  });

  it('sets and updates the document title from AppState', () => {
    const { appState, title } = setup();

    expect(title.setTitle).toHaveBeenCalledWith('Conduit');

    appState.title.set('Custom page');
    TestBed.flushEffects();

    expect(title.setTitle).toHaveBeenLastCalledWith('Custom page');
  });
});
