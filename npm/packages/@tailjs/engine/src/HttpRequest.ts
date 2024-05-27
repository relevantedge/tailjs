import type { MaybePromise } from "@tailjs/util";
import type { ClientCertificate } from "./shared";

export interface HttpRequest<Binary extends boolean = false> {
  body?: Binary extends true ? Uint8Array : string;
  binary?: Binary;
  headers?: Record<string, string>;
  method?: string;
  url: string;
  x509?: ClientCertificate;
}

export interface ClientRequestHeaders {
  url: string | null;
  method: string;
  headers: Record<string, string | string[] | null | undefined>;

  clientIp?: string | null;
}

export interface ClientRequest extends ClientRequestHeaders {
  payload?: () => MaybePromise<Uint8Array | string | null>;
}
