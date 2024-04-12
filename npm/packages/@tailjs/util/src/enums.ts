import {
  Entries,
  define,
  isDefined,
  isInteger,
  isNumber,
  isString,
  throwError,
  undefined,
} from ".";
import { conjunct, quote } from "./types/strings";

type EnumSource = Record<string, string | number>;

type MaybeArray<T, Flags, ArrayIfArray = false> = Flags extends true
  ? (ArrayIfArray extends true ? never : T) | T[]
  : T;

type Lowercased<T extends EnumSource> = {
  [P in keyof T & string as Lowercase<P>]: T[P];
};

type Lookup<T extends EnumSource, V, Name extends boolean> = V extends never
  ? never
  : {
      [P in keyof T]: V extends T[P] ? (Name extends true ? P : T[P]) : never;
    } extends infer T
  ? T[keyof T]
  : never;

type ParsedValue<T extends EnumSource, V, Flags> = V extends keyof T
  ? T[V]
  : V extends T[keyof T]
  ? Lookup<T, V, false>
  : [Flags, V] extends [true, number]
  ? T[keyof T]
  : never;

type Lc<T> = T extends string ? Lowercase<T> : never;

export type ParsableEnumValue<
  T extends EnumSource,
  Numeric,
  Flags extends boolean,
  Enum extends number = T[keyof T] & number
> =
  | (boolean extends Numeric
      ? MaybeArray<
          | (Flags extends true ? number | Enum : Enum)
          | Lc<keyof T>
          | (Flags extends true ? "any" | "none" : never),
          Flags
        >
      : Numeric extends true
      ? Flags extends true
        ? Enum | (number & {})
        : Enum
      : Flags extends true
      ? Lc<keyof T> | Lc<keyof T>[]
      : Lc<keyof T>)
  | (undefined extends Numeric ? undefined : never);

type ParsableArg<
  T extends EnumSource,
  Flags extends boolean
> = ParsableEnumValue<T, boolean | undefined, Flags>;

type ParseFunction<
  T extends EnumSource,
  Flags extends boolean,
  Type extends "numeric" | "lookup" | "format",
  InvalidValue extends undefined | never = never,
  MainFunction = false
> = {
  <V extends string | number | symbol | null | undefined>(
    value:
      | V
      | ParsableArg<T, Flags>
      | (Flags extends true ? V[] | ParsableArg<T, Flags>[] : never),
    ...args: MainFunction extends true ? [] : [validateNumbers?: boolean]
  ): V extends null | undefined
    ? undefined
    : Type extends "lookup" | "format"
    ? MaybeArray<
        | (ParsedValue<T, V, Flags> extends never
            ? V extends string | number
              ? keyof T | "any" | "none" | InvalidValue
              : InvalidValue
            : Lookup<T, ParsedValue<T, V, Flags>, true>)
        | (Type extends "format"
            ? V extends keyof T | T[keyof T]
              ? never
              : "any" | "none"
            : never),
        Flags,
        Type extends "lookup" ? true : false
      >
    : ParsedValue<T, V, Flags> extends never
    ? string extends V
      ? T[keyof T] | InvalidValue
      : InvalidValue
    : ParsedValue<T, V, Flags>;
};

type EntriesByValue<T extends Record<keyof any, any>, V extends keyof any> = {
  [P in keyof T as T[P]]: readonly [P, T[P]];
}[V] extends infer T // Use the infer trick to make vscode intellisense expand the values.
  ? T
  : never;

export type EnumHelper<
  T extends EnumSource,
  Flags extends boolean,
  PureFlags extends number
> = ParseFunction<T, Flags, "numeric", never, true> &
  Readonly<
    {
      /**
       * The number of possible unqiue values in the enumeration.
       */
      length: number;
      /**
       * Converts the provided value to its numeric value or throws an exception if it does not match a value in the enumeration.
       */
      parse: ParseFunction<T, Flags, "numeric">;

      /**
       * Converts the provided value to its numeric value or returns `undefined` if it does not match a value in the enumeration.
       */
      tryParse: ParseFunction<T, Flags, "numeric", undefined>;

      /**
       * All values of the enumeration.
       */
      values: T[keyof T][];

      /**
       * All names and values of the enumeration.
       */
      entries: Entries<T>;

      /**
       * Looks up a value and returns its name or array of names if the enumeration represents flags.
       */
      lookup: ParseFunction<T, Flags, "lookup">;

      /**
       * Looks up a value and returns its name if it matches a single value in the enumeration ,
       * or an array of names if the enumeration represents flags and the value matches more than one.
       */
      format: ParseFunction<T, Flags, "format">;

      /**
       * Pretty prints an enumeration value with its name and values suitable for logging and error messages.
       * For example "The values 'test 1' or 'test 2'".
       */
      logFormat(value: ParsableArg<T, Flags>, conjunction?: string): string;
    } & (Flags extends true
      ? {
          /** Flag values that are not a combination of other flags (that is, a single bit). */
          pure: readonly EntriesByValue<T, PureFlags>[];
          map<R = T[keyof T]>(
            flags: ParsableEnumValue<T, boolean | undefined, Flags>,
            map?: (entry: EntriesByValue<T, PureFlags>, index: number) => R
          ): R[];
        }
      : {})
  >;

export const createEnumAccessor = <
  T extends EnumSource,
  Flags extends boolean,
  PureFlags extends number = 0
>(
  sourceEnum: T,
  flags: Flags,
  enumName: string,
  pureFlags?: PureFlags
): EnumHelper<Lowercased<T>, Flags, PureFlags> => {
  const names: Record<string, number> = Object.fromEntries(
    Object.entries(sourceEnum as any)
      .filter(([key, value]) => isString(key) && isNumber(value))
      .map(([key, value]) => [key.toLowerCase(), value])
  ) as any;

  const entries = Object.entries(names);
  const values = Object.values(names);
  const any = values.reduce((any, flag) => any | flag, 0);

  const nameLookup: Record<string, number> = flags
    ? { ...names, any, none: 0 }
    : names;
  const valueLookup = Object.fromEntries(
    entries.map(([key, value]) => [value, key])
  );

  const parseValue = (value: any, validateNumbers?: boolean) =>
    isString(value)
      ? nameLookup[value] ?? nameLookup[value.toLowerCase()]
      : isNumber(value)
      ? !flags && validateNumbers
        ? isDefined(valueLookup[value])
          ? value
          : undefined
        : value
      : undefined;

  const [tryParse, lookup] = flags
    ? [
        (value: any, validateNumbers?: boolean) =>
          Array.isArray(value)
            ? value.reduce(
                (flags, flag) =>
                  (flag = parseValue(flag, validateNumbers)) == null
                    ? flags
                    : (flags ?? 0) | flag,
                undefined as number | undefined
              )
            : parseValue(value),
        (value: any, format: boolean) =>
          (value = tryParse(value, false)) == null
            ? undefined
            : format && (value & any) === any
            ? "any"
            : ((value = entries
                .filter(([, flag]) => value & flag)
                .map(([name]) => name)),
              format
                ? value.length
                  ? value.length === 1
                    ? value[0]
                    : value
                  : "none"
                : value),
      ]
    : [
        parseValue,
        (value: any) =>
          (value = parseValue(value)) != null ? valueLookup[value] : undefined,
      ];

  let originalValue: any;
  const parse = (value: any, validateNumbers?: boolean) =>
    value == null
      ? undefined
      : (value = tryParse((originalValue = value), validateNumbers)) == null
      ? throwError(
          new TypeError(
            `${JSON.stringify(originalValue)} is not a valid ${enumName} value.`
          )
        )
      : value;

  const pure = entries.filter(([, value]) => !pureFlags || pureFlags & value);
  return define(
    (value: any) => parse(value),
    [
      { configurable: false, enumerable: false },
      {
        parse,
        tryParse,
        entries,
        values,
        lookup,
        length: entries.length,
        format: (value: any) => lookup(value, true),
        logFormat: (value: any, c = "or") => (
          (value = lookup(value, true)),
          value === "any"
            ? "any " + enumName
            : `the ${enumName} ${conjunct(quote(value), c)}`
        ),
      } as const,
      flags &&
        ({
          pure,
          map: (flags: any, map?: (flag: any, index: number) => any) => (
            (flags = parse(flags)),
            pure
              .filter(([, flag]) => flag & flags)
              .map(map ?? (([, flag]) => flag))
          ),
        } as const),
    ]
  ) as any;
};
