import { createTransport } from "@tailjs/util/transport";
export const [httpEncode, httpDecode] = createTransport();
export let [httpEncrypt, httpDecrypt] = [null, null]; // [httpEncode, httpDecode];
export const setStorageKey = (key) => ([httpEncrypt, httpDecrypt] = createTransport(key));
//# sourceMappingURL=cipher.js.map