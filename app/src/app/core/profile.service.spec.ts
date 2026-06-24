// Refs: #5 — S3b tests: ProfileService RealWorld paths/envelopes.

import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiService } from './api.service';
import { Profile } from './articles.model';
import { ProfileService } from './profile.service';

const profile: Profile = {
  username: 'reader',
  bio: null,
  image: null,
  following: false
};

describe('ProfileService', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('gets, follows, and unfollows profiles through RealWorld envelopes', async () => {
    const apiService = {
      get: vi.fn(() => of({ profile })),
      post: vi.fn(() => of({ profile: { ...profile, following: true } })),
      delete: vi.fn(() => of({ profile }))
    };
    TestBed.configureTestingModule({
      providers: [
        ProfileService,
        { provide: ApiService, useValue: apiService }
      ]
    });
    const service = TestBed.inject(ProfileService);

    await expect(firstValueFrom(service.get(profile.username))).resolves.toEqual(profile);
    await expect(firstValueFrom(service.follow(profile.username))).resolves.toEqual({
      ...profile,
      following: true
    });
    await expect(firstValueFrom(service.unfollow(profile.username))).resolves.toEqual(profile);

    expect(apiService.get).toHaveBeenCalledWith('/profiles/reader');
    expect(apiService.post).toHaveBeenCalledWith('/profiles/reader/follow', {});
    expect(apiService.delete).toHaveBeenCalledWith('/profiles/reader/follow');
  });
});
