export interface HostResponse<T = string> {
  status: number;
  headers: Record<string, string>;
  cookies: string[];
  body: T;
}
