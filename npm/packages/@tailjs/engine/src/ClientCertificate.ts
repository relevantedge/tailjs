export interface ClientCertificate {
  id: string;
  pfx?: boolean;
  cert: Uint8Array | string;
  key?: string;
}
