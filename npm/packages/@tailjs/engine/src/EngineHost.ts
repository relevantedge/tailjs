import { MaybePromise, Nullish } from "@tailjs/util";
import { ChangeHandler, HostResponse, HttpRequest, LogMessage } from "./shared";

export interface ResourceEntry {
  path: string;
  name: string;
  type: "file" | "dir";
  readonly: boolean;
  created?: number;
  modified?: number;
}

export interface EngineHost {
  log(message: LogMessage): void;

  /** Returns */
  ls(path: string): Promise<ResourceEntry[] | null>;

  read(
    path: string,
    changeHandler?: ChangeHandler<Uint8Array>
  ): Promise<Uint8Array | null>;
  readText(
    path: string,
    changeHandler?: ChangeHandler<string>
  ): Promise<string | null>;

  write(path: string, data: Uint8Array): Promise<void>;

  writeText(path: string, text: string): Promise<void>;

  delete(path: string): Promise<boolean>;

  request<Binary extends boolean = false>(
    request: HttpRequest<Binary>
  ): Promise<HostResponse<Binary extends true ? Uint8Array : string>>;

  compress?(
    data: Uint8Array | string,
    algorithm: "br" | "gzip"
  ): MaybePromise<Uint8Array | Nullish>;
}
