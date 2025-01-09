import { Falsish, Nullish } from "..";
import {
  AllowAdditionalElements,
  EntryTypeOf,
  KeyTypeOf,
  KeyValueType,
  KeyValueTypeLike,
  ValueTypeOf,
} from "./_internal";

export type ObjectSource<K extends keyof any = keyof any, V = any> =
  | ({ [P in K]: V } & { [Symbol.iterator]?: undefined })
  | Iterable<KeyValueTypeLike<K, V> | Falsish>
  | Falsish;

export type AssignSource<Source> = Source extends Nullish
  ? never
  :
      | ({ [P in keyof any & KeyTypeOf<Source>]: ValueTypeOf<Source, P> } & {
          [Symbol.iterator]?: undefined;
        })
      | Iterable<AllowAdditionalElements<EntryTypeOf<Source>> | Falsish>
      | Falsish;
