import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, map, Observable, of, tap } from 'rxjs';

import { ApiService } from './api.service';
import { JwtService } from './jwt.service';
import { AuthCredentials, AuthMode, User, UserEnvelope, UserUpdate } from './user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly apiService = inject(ApiService);
  private readonly jwtService = inject(JwtService);
  private readonly router = inject(Router);
  private readonly currentUserState = signal<User | null>(null);

  readonly currentUser = this.currentUserState.asReadonly();
  readonly isAuthenticated = computed(() => this.currentUserState() !== null);

  attemptAuth(mode: AuthMode, credentials: AuthCredentials): Observable<User> {
    const path = mode === 'login' ? '/users/login' : '/users';

    return this.apiService
      .post<UserEnvelope, { user: AuthCredentials }>(path, { user: credentials })
      .pipe(map((response) => this.setAuth(response.user)));
  }

  update(fields: UserUpdate): Observable<User> {
    return this.apiService
      .put<UserEnvelope, { user: UserUpdate }>('/user', { user: fields })
      .pipe(map((response) => this.setAuth(response.user)));
  }

  logout(): void {
    this.currentUserState.set(null);
    this.jwtService.destroy();
    void this.router.navigateByUrl('/');
  }

  verifyAuth(): Observable<boolean> {
    if (this.jwtService.get() === null) {
      this.currentUserState.set(null);
      return of(false);
    }

    if (this.currentUserState() !== null) {
      return of(true);
    }

    return this.apiService.get<UserEnvelope>('/user').pipe(
      tap((response) => this.currentUserState.set(response.user)),
      map(() => true),
      catchError(() => {
        this.currentUserState.set(null);
        this.jwtService.destroy();
        return of(false);
      })
    );
  }

  private setAuth(user: User): User {
    this.jwtService.save(user.token);
    this.currentUserState.set(user);

    return user;
  }
}
