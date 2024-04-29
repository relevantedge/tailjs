import { type Nullish } from "@tailjs/util";
import { Transport, createTransport } from "@tailjs/util/transport";

export const [httpEncode, httpDecode] = createTransport();

export let [httpEncrypt, httpDecrypt] = [null, null] as any as Transport;

export const setStorageKey = (key: string | Nullish) =>
  ([httpEncrypt, httpDecrypt] = createTransport(key));
