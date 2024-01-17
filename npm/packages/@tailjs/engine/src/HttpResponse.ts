import type { ClientResponseCookie, Cookie, HttpRequest } from "./shared";

export interface HttpResponse<Binary extends boolean = false> {
  body: Binary extends true ? Uint8Array : string;
  cookies: Record<string, Cookie>;
  headers: Record<string, string>;
  request: HttpRequest<Binary>;
  status: number;
}

export interface CallbackResponse {
  body?: string | Uint8Array;
  cacheKey?: string;
  cookies: ClientResponseCookie[];
  error?: Error;
  headers: Record<string, string>;
  status: number;
}
