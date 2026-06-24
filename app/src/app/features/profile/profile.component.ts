// Refs: #5 — S3d profile page: profile info, follow, authored/favorited tabs.

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink, UrlSegment } from '@angular/router';
import { combineLatest, of } from 'rxjs';
import { catchError, distinctUntilChanged, map, switchMap } from 'rxjs/operators';

import { ArticleListConfig, Profile } from '../../core/articles.model';
import { ProfileService } from '../../core/profile.service';
import { UserService } from '../../core/user.service';
import { AppState } from '../../shared/app-state';
import { ArticleListComponent } from '../../shared/article-list/article-list.component';
import { FollowButtonComponent } from '../../shared/follow-button/follow-button.component';

const PROFILE_PAGE_SIZE = 5;

type ProfileRouteState = {
  username: string;
  showFavorites: boolean;
};

@Component({
  selector: 'app-profile',
  imports: [ArticleListComponent, FollowButtonComponent, RouterLink],
  template: `
    <div class="profile-page">
      @if (isLoading()) {
        <div class="container page">
          <p>Loading profile...</p>
        </div>
      } @else if (profile(); as loadedProfile) {
        <div class="user-info">
          <div class="container">
            <div class="row">
              <div class="col-xs-12 col-md-10 offset-md-1">
                <img [src]="loadedProfile.image ?? ''" class="user-img" alt="" />
                <h4>{{ loadedProfile.username }}</h4>
                <p>{{ loadedProfile.bio }}</p>

                @if (isUser()) {
                  <a
                    routerLink="/settings"
                    class="btn btn-sm btn-outline-secondary action-btn">
                    <i class="ion-gear-a"></i> Edit Profile Settings
                  </a>
                } @else {
                  <app-follow-button
                    [profile]="loadedProfile"
                    (profileChange)="replaceProfile($event)" />
                }
              </div>
            </div>
          </div>
        </div>

        <div class="container">
          <div class="row">
            <div class="col-xs-12 col-md-10 offset-md-1">
              <div class="articles-toggle">
                <ul class="nav nav-pills outline-active">
                  <li class="nav-item">
                    <a
                      class="nav-link"
                      [class.active]="!showFavorites()"
                      [routerLink]="['/profile', loadedProfile.username]">
                      My Articles
                    </a>
                  </li>
                  <li class="nav-item">
                    <a
                      class="nav-link"
                      [class.active]="showFavorites()"
                      [routerLink]="['/profile', loadedProfile.username, 'favorites']">
                      Favorited Articles
                    </a>
                  </li>
                </ul>
              </div>

              @if (listConfig(); as config) {
                <app-article-list [limit]="profilePageSize" [listConfig]="config" />
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfilePageComponent {
  private readonly appState = inject(AppState);
  private readonly profileService = inject(ProfileService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly userService = inject(UserService);

  protected readonly profilePageSize = PROFILE_PAGE_SIZE;
  protected readonly profile = signal<Profile | null>(null);
  protected readonly listConfig = signal<ArticleListConfig | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly showFavorites = signal(false);
  protected readonly isUser = computed(() => {
    const currentUser = this.userService.currentUser();
    const loadedProfile = this.profile();
    return currentUser !== null && loadedProfile !== null &&
      currentUser.username === loadedProfile.username;
  });

  constructor() {
    combineLatest([this.route.paramMap, this.route.url])
      .pipe(
        map(([params, segments]) => ({
          username: params.get('username') ?? '',
          showFavorites: this.hasFavoritesSegment(segments)
        })),
        distinctUntilChanged((previous, current) =>
          previous.username === current.username &&
          previous.showFavorites === current.showFavorites
        ),
        switchMap((state) => this.loadProfile(state)),
        takeUntilDestroyed()
      )
      .subscribe((result) => {
        if (result === null) return;

        this.profile.set(result.profile);
        this.showFavorites.set(result.showFavorites);
        this.listConfig.set(this.buildListConfig(result.profile.username, result.showFavorites));
        this.appState.title.set(
          result.showFavorites
            ? `Articles favorited by ${result.profile.username}`
            : `@${result.profile.username}`
        );
        this.isLoading.set(false);
      });
  }

  protected replaceProfile(profile: Profile): void {
    this.profile.set(profile);
  }

  private loadProfile(state: ProfileRouteState) {
    this.isLoading.set(true);
    this.profile.set(null);
    this.listConfig.set(null);

    if (!state.username.trim()) {
      this.isLoading.set(false);
      void this.router.navigateByUrl('/');
      return of(null);
    }

    return this.profileService.get(state.username).pipe(
      map((profile) => ({ profile, showFavorites: state.showFavorites })),
      catchError(() => {
        this.isLoading.set(false);
        void this.router.navigateByUrl('/');
        return of(null);
      })
    );
  }

  private buildListConfig(username: string, showFavorites: boolean): ArticleListConfig {
    return {
      type: 'all',
      filters: showFavorites ? { favorited: username } : { author: username },
      currentPage: 1
    };
  }

  private hasFavoritesSegment(segments: UrlSegment[]): boolean {
    return segments.some((segment) => segment.path === 'favorites');
  }
}
