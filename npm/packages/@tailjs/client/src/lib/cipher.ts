import { createEvent, type Nullish } from "@tailjs/util";
import { Decoder, Encoder, createTransport } from "@tailjs/transport";
import { DEBUG, NOT_INITIALIZED } from ".";

export const [httpEncode, httpDecode] = createTransport();

export let [httpEncrypt, httpDecrypt] = [
  NOT_INITIALIZED,
  NOT_INITIALIZED,
] as any as [Encoder, Decoder];

export let USE_ENCRYPTION = true;

export const [addEncryptionNegotiatedListener, dispatchEncryptionNegotiated] =
  createEvent<[httpEncrypt: Encoder, httpDecrypt: Decoder]>();

export const setStorageKey = (key: string | Nullish) => {
  if (httpDecrypt !== NOT_INITIALIZED) return;

  [httpEncrypt, httpDecrypt] = createTransport(key, {
    json: !key,
    prettify: false,
  });

  USE_ENCRYPTION = !!key;

  dispatchEncryptionNegotiated(httpEncrypt, httpDecrypt);
};
