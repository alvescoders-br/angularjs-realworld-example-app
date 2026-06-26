// Refs: #5 — S3a ProfileService: RealWorld /profiles/:username endpoints.

import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { ApiService } from './api.service';
import { Profile, ProfileEnvelope } from './articles.model';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly apiService = inject(ApiService);

  get(username: string): Observable<Profile> {
    return this.apiService
      .get<ProfileEnvelope>(`/profiles/${username}`)
      .pipe(map((envelope) => envelope.profile));
  }

  follow(username: string): Observable<Profile> {
    return this.apiService
      .post<ProfileEnvelope, Record<never, never>>(`/profiles/${username}/follow`, {})
      .pipe(map((envelope) => envelope.profile));
  }

  unfollow(username: string): Observable<Profile> {
    return this.apiService
      .delete<ProfileEnvelope>(`/profiles/${username}/follow`)
      .pipe(map((envelope) => envelope.profile));
  }
}
