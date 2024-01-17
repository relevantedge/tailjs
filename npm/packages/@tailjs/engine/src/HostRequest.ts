import { ClientCertificate } from "./shared";

export interface HostRequest<Binary extends boolean = false> {
  body?: string;
  headers: Record<string, string>;
  method: string;
  url: string;
  x509?: ClientCertificate;
  binary?: Binary;
}
