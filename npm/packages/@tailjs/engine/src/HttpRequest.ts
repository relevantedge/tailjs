import type { Json, JsonObject, MaybePromise, Wrapped } from "@tailjs/util";
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
  headers: Record<string, string | readonly string[] | undefined>;

  clientIp?: string | null;
}

export interface ClientRequest extends ClientRequestHeaders {
  body?: Wrapped<
    MaybePromise<Uint8Array | string | JsonObject | null | undefined>
  >;
}
