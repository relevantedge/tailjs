import { Entries, define, isDefined, isNumber, isString, undefined } from ".";

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
  Numeric extends boolean | undefined,
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
      ? Lc<keyof T>[]
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

export type EnumHelper<
  T extends EnumSource,
  Flags extends boolean = boolean
> = {
  parse: ParseFunction<T, Flags, "numeric">;
  tryParse: ParseFunction<T, Flags, "numeric", undefined>;
  values: T[keyof T][];
  entries: Entries<T>;
  lookup: ParseFunction<T, Flags, "lookup">;
  format: ParseFunction<T, Flags, "format">;
} & (Flags extends true
  ? {
      any: T[keyof T];
      map<R = T[keyof T]>(
        flags: ParsableEnumValue<T, boolean | undefined, Flags>,
        map?: (entry: Entries<T>[number], index: number) => R
      ): R[];
    }
  : {});

export const createEnumAccessor = <T extends EnumSource, Flags extends boolean>(
  sourceEnum: T,
  flags: Flags,
  enumName: string
): EnumHelper<Lowercased<T>, Flags> => {
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
  const throwError = (err: any) => {
    throw err;
  };

  let originalValue: any;
  const parse = (value: any) =>
    value == null
      ? undefined
      : (value = tryParse((originalValue = value))) == null
      ? throwError(
          new TypeError(
            `${JSON.stringify(originalValue)} is not a valid ${enumName} value.`
          )
        )
      : value;

  return define({}, [
    { enumerable: false },
    {
      parse,
      tryParse,
      entries,
      values,
      lookup,
      format: (value: any) => lookup(value, true),
    } as const,
    flags &&
      ({
        any,
        map: (flags: any, map?: (flag: any, index: number) => any) => (
          (flags = parse(flags)),
          entries
            .filter(([, flag]) => flag & flags)
            .map(map ?? (([, flag]) => flag))
        ),
      } as const),
  ]) as any;
};
