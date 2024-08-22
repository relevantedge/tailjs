import msgpack from "@ygoe/msgpack";
const { deserialize: msgDeserialize, serialize: msgSerialize } = msgpack;

import {
  IsNever,
  Nullish,
  isArray,
  isFunction,
  isIterable,
  isNumber,
  isObject,
  isPlainObject,
  isString,
  isSymbol,
  map,
  tryCatch,
  undefined,
  IDENTITY,
  isJsonString,
} from "@tailjs/util";
import { HashFunction, from64u, lfsr, to64u } from ".";

type ConverterFunctionValue<T> = T extends { toJSON(): infer V }
  ? V
  : T extends { valueOf(): infer V }
  ? V
  : T;

type ConverterValue<T> = T extends ConverterFunctionValue<T>
  ? never
  : ConverterFunctionValue<T>;

export type EncodableArray = Encodable[];

export type EncodableTuple = [...Items: Encodable[]];

export type EncodableObject = Partial<{
  [K in string | number]?: Encodable;
}>;

/**
 * All possible values that can be represented with JSON.
 */
export type Encodable =
  | null
  | undefined
  | string
  | number
  | boolean
  | EncodableArray
  | EncodableTuple
  | EncodableObject;

/**
 * The shape of the data that will come back when decoding the encoded value of a type.
 *
 * This assumes that only the shapes permitted by {@link Encodable} are serialized.
 * Otherwise not ignored since functions are in fact serialized as `{}`.
 */
export type Decoded<T = Encodable> = Encodable extends T
  ? Encodable
  : T extends void
  ? undefined // For annoying reason, TypeScript differentiates between `undefined` and `void`. We want `void`.
  : T extends string | number | boolean | null | undefined
  ? T
  : IsNever<ConverterValue<T>> extends false
  ? Decoded<ConverterValue<T>>
  : T extends any[]
  ? { [index in keyof T]: Decoded<T[index]> }
  : T extends Iterable<infer T>
  ? Decoded<T>[]
  : T extends (...args: any[]) => any
  ? undefined
  : T extends object
  ? {
      -readonly [P in keyof T as P extends string | number
        ? Decoded<T[P]> extends undefined
          ? never
          : P
        : never]: Decoded<T[P]>;
    }
  : never;

/**
 * The broadest possible subtype of a given type that can be serialized and then deserialized without violating the type's contract,
 * with the exception of well-known symbol properties. Those are ignored.
 *
 * Not violating the contract does not mean that the type can loslessly be serialized and then deserialized back.
 * It just means that its contract will not be violated if values of a certain type are omitted or deserialized back to another valid subtype.
 * For example, an iterable that is not an array will be deserialized as an array.
 *
 * In particular functions or promises are serialized as empty objects `{}`, and cannot be deserialized back.
 * This means that required constraints on properties that only allow these types can never be met.
 * Similarly, arrays the can only hold functions or promises must be empty (`never[]`) to satisfy the type constraint.
 *
 */
export type EncodableContract<T = Encodable> = Encodable extends T
  ? Encodable
  : T extends void
  ? undefined // For annoying reasons, TypeScript differentiates between `undefined` and `void`. We want `void`.
  : T extends string | number | boolean | null | undefined | void
  ? T
  : IsNever<ConverterValue<T>> extends false
  ? EncodableContract<ConverterValue<T>>
  : T extends any[]
  ? { [index in keyof T]: EncodableContract<T[index]> }
  : T extends Iterable<any>
  ? T
  : T extends (...args: any[]) => any
  ? undefined
  : T extends object
  ? {
      // Fun fact: TypeScript keeps optional properties if we iterate keyof P and then exclude symbols with the `extends` construct.
      //  `(keyof T & symbol)` or `Exclude <keyof T, symbol>` makes all properties required. (`{ a?: undefined}` becomes `{a:undefined}`)
      // Keeping optional `undefined` properties means that the property name is still allowed in a type like `{a()?: boolean}`, even though functions are not allowed.
      [P in keyof T as P extends symbol ? never : P]: EncodableContract<T[P]>;
    }
  : never;

/**
 * Encodes the specified value to an HTTP querystring/header safe string, that is, does not need to be URI escaped.
 * The function is analogous to `JSON.stringify`, except this one also supports references.
 * @param value The value to encode.
 * @param binary whether to serialize to a string (URL safe base 64) or Uint8Array. @default false
 *
 * @returns The HTTP encoded representation of the value.
 */
export type Encoder = {
  <Binary extends boolean = false>(
    value: any,
    binary?: Binary
  ): Binary extends true ? Uint8Array : string;
};

/**
 * Decodes a value encoded with an {@link Encoder}.
 */
export type Decoder = <T = any>(
  encoded: string | Uint8Array | Nullish
) => T | undefined;

const REF_PROP = "$ref";

const includeValue = (key: any, value: any, includeDefaultValues: boolean) =>
  isSymbol(key)
    ? undefined
    : includeDefaultValues
    ? value !== undefined
    : value === null || value;

/**
 * Converts an in-memory object to a format that can be serialized over a wire including cyclic references.
 */
const serialize = <Msgpack extends boolean>(
  value: any,
  msgpack: Msgpack,
  { defaultValues = true, prettify = false }
): Msgpack extends true ? Uint8Array : string => {
  // TODO: Clone when required instead of adding "cleaners". Probably adds more overhead.
  let cleaners: (() => void)[] | undefined;
  let refs: Map<any, number> | undefined;
  let refIndex: number | undefined;
  const patchProperty = (
    target: any,
    key: any,
    value = target[key],
    patched = includeValue(key, value, defaultValues) ? inner(value) : undefined
  ) => (
    value !== patched &&
      (patched === undefined && !isArray(target)
        ? delete target[key]
        : (target[key] = patched),
      addCleaner(() => (target[key] = value))),
    patched
  );

  const addCleaner = (cleaner: () => void) => (cleaners ??= []).push(cleaner);

  const inner = (value: any) => {
    if (value == null || isFunction(value) || isSymbol(value)) {
      return undefined;
    }

    if (!isObject(value)) {
      return value;
    }

    if ((value as any).toJSON && value !== (value = (value as any).toJSON())) {
      return inner(value);
    }

    if ((refIndex = refs?.get(value)) != null) {
      if (!value[REF_PROP]) {
        // Only assign ID parameter if used.
        value[REF_PROP] = refIndex;
        addCleaner(() => delete value[REF_PROP]);
      }
      return { [REF_PROP]: refIndex };
    }

    if (isPlainObject(value)) {
      (refs ??= new Map()).set(value, refs.size + 1);
      for (const key in value) patchProperty(value, key);
    } else if (isIterable(value) && !(value instanceof Uint8Array)) {
      // Array with undefined values or iterable (which is made into array.). ([,1,2,3] does not reveal its first entry).
      (!isArray(value) || Object.keys(value).length < value.length
        ? [...(value as any)]
        : value
      ).forEach((_, i) =>
        i in value
          ? patchProperty(value, i)
          : // Handle arrays like [value1,,value3,value4,,,value6]. The missing elements does not serialize well with msgpack.
            ((value[i] = null), addCleaner(() => delete value[i]))
      );
    }

    return value;
  };

  return tryCatch(
    () =>
      msgpack
        ? (msgSerialize(inner(value) ?? null) as any)
        : tryCatch(
            () => JSON.stringify(value, undefined, prettify ? 2 : 0),
            () => JSON.stringify(inner(value), undefined, prettify ? 2 : 0)
          ),
    true,
    () => cleaners?.forEach((cleaner) => cleaner())
  );
};

/**
 * Hydrates the format returned by {@link serialize} back to its original in-memory format.
 */
const deserialize = (value: string | Uint8Array) => {
  let refs: any[] | undefined;
  let matchedRef: any;

  const inner = (value: any) => {
    if (!isObject(value)) return value;

    if (value[REF_PROP] && (matchedRef = (refs ??= [])[value[REF_PROP]])) {
      return matchedRef;
    }

    if (value[REF_PROP]) {
      refs![value[REF_PROP]] = value;
      delete value[REF_PROP];
    }

    Object.entries(value).forEach(
      ([k, v]) => v !== (v = inner(v)) && (value[k] = v)
    );

    return value;
  };

  return inner(
    isString(value)
      ? tryCatch(
          () => JSON.parse(value as any),
          () => console.error(`Invalid JSON received.`, value)
        )
      : value != null
      ? tryCatch(
          () => msgDeserialize(value as any),
          () => (console.error(`Invalid message received.`, value), undefined)
        )
      : value
  );
};

export type Transport = [
  encode: Encoder,
  decode: Decoder,
  hash: HashFunction<any>
];

export interface TransportOptions {
  /**
   * Serialize/deserialize as JSON.
   *
   * @default false
   */
  json?: boolean;

  /**
   * Omit falsish values (`""`, `0` and `false`) unless explicitly set to `null`.
   *
   * @default true
   */
  defaultValues?: boolean;

  /** Indent JSON encoded strings. @default true */
  prettify?: boolean;

  /** Allow received messages to be JSON. */
  decodeJson?: boolean;
}

let _defaultTransports: [cipher: Transport, json: Transport] | undefined;
/**
 * Creates a pair of {@link Encoder} and {@link Decoder}s as well as a {@link HashFunction<string>}.
 * MessagePack is used for serialization, {@link lfsr} encryption is optionally used if a key is specified, and the input and outputs are Base64URL encoded.
 */
export const createTransport = (
  key?: string | Nullish,
  options: TransportOptions = {}
): Transport => {
  const factory = (
    key: string | Nullish,
    { json = false, decodeJson = false, ...serializeOptions }: TransportOptions
  ): Transport => {
    const fastStringHash = (value: any, bitsOrNumeric: any) => {
      if (isNumber(value) && bitsOrNumeric === true) return value;

      value = isString(value)
        ? new Uint8Array(map(value.length, (i) => value.charCodeAt(i) & 255))
        : json
        ? tryCatch(
            () => JSON.stringify(value),
            () => JSON.stringify(serialize(value, false, serializeOptions))
          )
        : serialize(value, true, serializeOptions);
      return hash(value, bitsOrNumeric);
    };
    const jsonDecode = (encoded: any) =>
      encoded == null
        ? undefined
        : tryCatch(() => deserialize(encoded), undefined);
    if (json) {
      return [
        (data: any) => serialize(data, false, serializeOptions) as any,
        jsonDecode,
        (value: any, numericOrBits?: any) =>
          fastStringHash(value, numericOrBits) as any,
      ];
    }
    const [encrypt, decrypt, hash] = lfsr(key);

    return [
      (data: any, binary) =>
        (binary ? IDENTITY : to64u)(
          encrypt(serialize(data, true, serializeOptions))
        ) as any,
      (encoded: any) =>
        encoded != null
          ? deserialize(
              decrypt(
                encoded instanceof Uint8Array
                  ? encoded
                  : decodeJson && isJsonString(encoded)
                  ? jsonDecode(encoded)
                  : from64u(encoded)
              )
            )
          : null,
      (value: any, numericOrBits?: any) =>
        fastStringHash(value, numericOrBits) as any,
    ];
  };

  if (!key) {
    let json = +(options.json ?? 0);
    if (json && options.prettify !== false) {
      return (_defaultTransports ??= [
        factory(null, { json: false }),
        factory(null, { json: true, prettify: true }),
      ])[+json];
    }
  }
  return factory(key, options);
};

export const defaultTransport = createTransport();
/** A transport that encrypts and decrypts messages, but also allows plain JSON message to be decoded.  */
export const defaultJsonDecodeTransport = createTransport(null, {
  json: true,
  decodeJson: true,
});
export const defaultJsonTransport = createTransport(null, {
  json: true,
  prettify: true,
});

export const [httpEncode, httpDecode, hash] = defaultTransport;
export const [jsonEncode, jsonDecode] = defaultJsonTransport;
