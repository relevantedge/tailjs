import type { Json, JsonObject, MaybePromiseLike, Wrapped } from "@tailjs/util";
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
  /*
   * An identifier that will be used to reference the tracker's session indirectly.
   * This can be used for anonymous tracking even if the session reference itself may
   * identify the individual, since the reference is only used to anonymize the user
   * and will not be tracked itself.
   *
   * If unspecified, a probabilistically unique identifier will be mapped based on
   * suitable data found in the request.
   */
  sessionReferenceId?: string;

  body?: Wrapped<
    MaybePromiseLike<Uint8Array | string | JsonObject | null | undefined>
  >;
}
