// Refs: #5 — S3b tests: TagsService RealWorld envelope.

import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiService } from './api.service';
import { TagsService } from './tags.service';

describe('TagsService', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('loads tags from the immutable /tags endpoint and unwraps the envelope', async () => {
    const apiService = {
      get: vi.fn(() => of({ tags: ['angular', 'testing'] }))
    };
    TestBed.configureTestingModule({
      providers: [
        TagsService,
        { provide: ApiService, useValue: apiService }
      ]
    });

    await expect(firstValueFrom(TestBed.inject(TagsService).getAll())).resolves.toEqual([
      'angular',
      'testing'
    ]);
    expect(apiService.get).toHaveBeenCalledWith('/tags');
  });
});
