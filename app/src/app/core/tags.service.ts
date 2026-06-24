// Refs: #5 — S3a TagsService: RealWorld /tags endpoint.

import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { ApiService } from './api.service';
import { TagsEnvelope } from './articles.model';

@Injectable({ providedIn: 'root' })
export class TagsService {
  private readonly apiService = inject(ApiService);

  getAll(): Observable<string[]> {
    return this.apiService
      .get<TagsEnvelope>('/tags')
      .pipe(map((envelope) => envelope.tags));
  }
}
