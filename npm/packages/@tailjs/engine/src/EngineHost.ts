import { ChangeHandler, HostResponse, HttpRequest, LogMessage } from "./shared";

export interface ResourceEntry {
  path: string;
  name: string;
  type: "file" | "dir";
  created?: number;
  modified?: number;
}

export interface EngineHost {
  compress(data: string, algorithm: string): Promise<Uint8Array | null>;
  log<T extends string | Record<string, any>>(message: LogMessage<T>): void;

  ls(path: string): Promise<ResourceEntry[] | null>;

  readText(
    path: string,
    changeHandler?: ChangeHandler<string>
  ): Promise<string | null>;
  read(
    path: string,
    changeHandler?: ChangeHandler<Uint8Array>
  ): Promise<Uint8Array | null>;

  request<Binary extends boolean = false>(
    request: HttpRequest<Binary>
  ): Promise<HostResponse<Binary extends true ? Uint8Array : string>>;
}
