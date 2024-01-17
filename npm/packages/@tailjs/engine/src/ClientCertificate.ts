export interface ClientCertificate {
  id: string;
  cert: Uint8Array | string;
  key?: string;
}
