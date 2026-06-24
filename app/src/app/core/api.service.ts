import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { CONDUIT_API_URL } from './app-tokens';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly httpClient = inject(HttpClient);
  private readonly apiUrl = inject(CONDUIT_API_URL);

  get<ResponseBody>(
    path: string,
    queryParams?: Record<string, string | number | boolean>
  ): Observable<ResponseBody> {
    const params = queryParams ? this.buildParams(queryParams) : undefined;
    return this.httpClient.get<ResponseBody>(this.buildUrl(path), { params });
  }

  post<ResponseBody, RequestBody extends object>(
    path: string,
    body: RequestBody
  ): Observable<ResponseBody> {
    return this.httpClient.post<ResponseBody>(this.buildUrl(path), body);
  }

  put<ResponseBody, RequestBody extends object>(
    path: string,
    body: RequestBody
  ): Observable<ResponseBody> {
    return this.httpClient.put<ResponseBody>(this.buildUrl(path), body);
  }

  delete<ResponseBody>(path: string): Observable<ResponseBody> {
    return this.httpClient.delete<ResponseBody>(this.buildUrl(path));
  }

  private buildUrl(path: string): string {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;

    return `${this.apiUrl}${normalizedPath}`;
  }

  private buildParams(
    queryParams: Record<string, string | number | boolean>
  ): HttpParams {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined && value !== null) {
        params = params.set(key, String(value));
      }
    }
    return params;
  }
}
