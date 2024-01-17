import type { ClientCertificate } from "./shared";

export interface HttpRequest<Binary extends boolean = false> {
  body?: Binary extends true ? Uint8Array : string;
  binary?: Binary;
  headers?: Record<string, string>;
  method?: string;
  url: string;
  x509?: ClientCertificate;
}

export interface ClientRequest {
  clientIp?: string | null;
  headers: Record<string, string | string[] | null | undefined>;
  method: string;
  payload?: () => Promise<string | null> | null;
  url: string | null;
}
