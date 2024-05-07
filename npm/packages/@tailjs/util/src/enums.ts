import {
  AllKeys,
  Entries,
  Extends,
  Nullish,
  Property,
  define,
  entries,
  isArray,
  isDefined,
  isNumber,
  isString,
  obj,
  throwError,
  undefined,
} from ".";
import { conjunct, quote } from "./types/strings";

export type ParsedValue<
  T extends EnumHelper<any, any, any>,
  V
> = V extends Nullish
  ? V
  : T extends EnumHelper<infer T, infer Flags & boolean, any>
  ? V extends keyof T
    ? T[V]
    : V extends T[keyof T]
    ? V
    : Flags extends true
    ? number
    : never
  : never;

type EnumValue_<
  Names extends string,
  Enum,
  Flags extends boolean,
  Numeric
> = boolean extends Numeric
  ? Names | Enum | (Flags extends true ? (Names | Enum)[] : never)
  : Numeric extends true
  ? Enum
  : Names | (Flags extends true ? Names[] : never);

export type EnumValueOf<
  Helper extends EnumHelper<any, any, any>,
  Numeric = boolean
> = Helper extends EnumHelper<infer T, infer Flags & boolean, any>
  ? EnumValue_<keyof T & string, T[keyof T], Flags & boolean, Numeric>
  : never;

export type EnumValue<
  Names extends Record<string, any>,
  Enum,
  Flags extends boolean,
  Numeric
> = EnumValue_<
  Lowercase<keyof Names extends string ? keyof Names : never>,
  Flags extends true ? Enum | (number & {}) : Enum,
  Flags,
  Numeric
>;

export type EnumHelper<
  T extends EnumSource,
  Flags extends boolean,
  PureFlags extends number
> = ParseFunction<T, Flags, "numeric", never, true> &
  Readonly<
    {
      /**
       * The number of possible unique values in the enumeration.
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
      entries: string extends keyof T
        ? readonly [string, T[keyof T]][]
        : Entries<T>;

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
            flags: ParsableEnumTypeValue<T, boolean | undefined, Flags>,
            map?: (entry: EntriesByValue<T, PureFlags>, index: number) => R
          ): R[];
        }
      : {})
  >;

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

type ParsedValueInternal<T extends EnumSource, V, Flags> = V extends keyof T
  ? T[V]
  : V extends T[keyof T]
  ? Lookup<T, V, false>
  : [Flags, V] extends [true, number]
  ? T[keyof T]
  : never;

export type ParsableEnumTypeValue<
  T extends EnumSource,
  Numeric,
  Flags extends boolean,
  Enum extends number = T[keyof T] & number
> =
  | (boolean extends Numeric
      ? MaybeArray<
          | (Flags extends true ? number | Enum : Enum)
          | keyof T
          | (Flags extends true ? "any" | "none" : never),
          Flags
        >
      : Numeric extends true
      ? Flags extends true
        ? Enum | (number & {})
        : Enum
      : Flags extends true
      ? keyof T | readonly (keyof T)[]
      : keyof T)
  | (undefined extends Numeric ? undefined : never);

type ParsableArg<
  T extends EnumSource,
  Flags extends boolean
> = ParsableEnumTypeValue<T, boolean | undefined, Flags>;

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
        | (ParsedValueInternal<T, V, Flags> extends never
            ? V extends string | number
              ? keyof T | "any" | "none" | InvalidValue
              : InvalidValue
            : Lookup<T, ParsedValueInternal<T, V, Flags>, true>)
        | (Type extends "format"
            ? V extends keyof T | T[keyof T]
              ? never
              : "any" | "none"
            : never),
        Flags,
        Type extends "lookup" ? true : false
      >
    : ParsedValueInternal<T, V, Flags> extends never
    ? keyof any extends infer K
      ? K extends V
        ? T[keyof T] | InvalidValue
        : never
      : InvalidValue
    : ParsedValueInternal<T, V, Flags>;
};

type EntriesByValue<T extends Record<keyof any, any>, V extends keyof any> = {
  [P in keyof T as T[P]]: readonly [P, T[P]];
}[V] extends infer T // Use the infer trick to make vscode intellisense expand the values.
  ? T
  : never;

const isBit = (n: number) => ((n = Math.log2(n)), n === (n | 0));

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

  const any = names["any"] ?? values.reduce((any, flag) => any | flag, 0);

  const nameLookup: Record<string, number> = flags
    ? { ...names, any, none: 0 }
    : names;

  const valueLookup = Object.fromEntries(
    Object.entries(nameLookup).map(([key, value]) => [value, key])
  );

  const parseValue = (value: any, validateNumbers?: boolean) =>
    isNumber(value)
      ? !flags && validateNumbers
        ? isDefined(valueLookup[value])
          ? value
          : undefined
        : value
      : isString(value)
      ? nameLookup[value] ?? nameLookup[value.toLowerCase()]
      : undefined;

  let invalid = false;
  let carry: any;
  let carry2: any;

  const [tryParse, lookup] = flags
    ? [
        (value: any, validateNumbers?: boolean) =>
          Array.isArray(value)
            ? value.reduce(
                (flags, flag) =>
                  flag == null || invalid
                    ? flags
                    : (flag = parseValue(flag, validateNumbers)) == null
                    ? ((invalid = true), undefined)
                    : (flags ?? 0) | flag,
                ((invalid = false), undefined as number | undefined)
              )
            : parseValue(value),
        (value: any, format: boolean) =>
          (value = tryParse(value, false)) == null
            ? undefined
            : format && (carry2 = valueLookup[value & any])
            ? (carry = lookup(value & ~(value & any), false)).length
              ? [carry2, ...carry]
              : carry2
            : ((value = entries
                .filter(([, flag]) => flag && value & flag && isBit(flag))
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

  const pure = entries.filter(
    ([, value]) => !pureFlags || ((pureFlags & value) === value && isBit(value))
  );

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

type NumericValues<T, Flags> = Flags extends true ? number : T[keyof T];

type EnumPropertyType<Helper, Value> = Helper extends EnumHelper<
  infer T,
  infer Flags extends boolean,
  any
>
  ? Extends<number | string, Value> extends true
    ? NumericValues<T, Flags>
    : Value extends infer Keys extends keyof T
    ? T[Keys]
    : Value extends NumericValues<T, Flags>
    ? Value
    : never
  : never;

type ParsedEnumResult<
  T,
  EnumProps extends readonly Record<string, EnumHelper<any, any, any>>[]
> = T extends Nullish
  ? T
  : T extends readonly []
  ? []
  : T extends readonly [infer Item, ...infer Rest]
  ? [
      ParsedEnumResult<Item, EnumProps>,
      ...(Rest extends readonly any[] ? ParsedEnumResult<Rest, EnumProps> : [])
    ]
  : T extends readonly (infer Item)[]
  ? ParsedEnumResult<Item, EnumProps>[]
  : T extends infer T
  ? {
      [P in keyof T]: P extends AllKeys<EnumProps[number]>
        ? EnumPropertyType<Property<EnumProps[number], P>, T[P]>
        : T[P];
    }
  : never;

/**
 * Creates a function that parses the specified enum properties to their numeric values on the object provided.
 * Note that it does the parsing directly on the provided object and does not create a copy.
 */
export const createEnumPropertyParser: <
  EnumProps extends readonly Record<string, EnumHelper<any, any, any>>[]
>(
  ...props: EnumProps
) => <T>(value: T) => ParsedEnumResult<T, EnumProps> = ((
  ...props: Record<string, EnumHelper<any, any, any>>[]
) => {
  const parsers = entries(obj(props, true));

  const parse = (source: any, arrayItem?: boolean) =>
    source != null &&
    (!arrayItem && isArray(source)
      ? source.forEach((source, i) => (source[i] = parse(source[i], true)))
      : parsers.forEach(([prop, parsers]) => {
          let parsed = undefined;
          let value: any;
          if ((value = source[prop]) == null) return;
          parsers.length === 1
            ? (source[prop] = parsers[0].parse(value))
            : parsers.forEach(
                (parser, i) =>
                  !parsed &&
                  (parsed =
                    i === parsers.length - 1
                      ? parser.parse(value)
                      : parser.tryParse(value)) != null &&
                  (source[prop] = parsed)
              );
        }));

  return (source: any) => (parse(source), source);
}) as any;
