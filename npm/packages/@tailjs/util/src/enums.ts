import { Entries, define, isDefined, isNumber, isString } from ".";

type MaybeArray<T, Flags, ArrayIfArray = false> = Flags extends true
  ? (ArrayIfArray extends true ? never : T) | T[]
  : T;

type Lookup<T, V, Name extends boolean> = V extends never
  ? never
  : {
      [P in keyof T]: V extends T[P] ? (Name extends true ? P : T[P]) : never;
    } extends infer T
  ? T[keyof T]
  : never;

type ParsedValue<T, V, Flags> = V extends keyof T
  ? T[V]
  : V extends T[keyof T]
  ? Lookup<T, V, false>
  : [Flags, V] extends [true, number]
  ? T[keyof T]
  : never;

export type ParsableEnumValue<
  T extends Record<string, number>,
  Numeric extends boolean | undefined,
  Flags
> =
  | (boolean extends Numeric
      ? MaybeArray<
          | (Flags extends true ? number : T[keyof T])
          | keyof T
          | (Flags extends true ? "any" : never),
          Flags
        >
      : Numeric extends true
      ? Flags extends true
        ? number
        : T[keyof T]
      : Flags extends true
      ? (keyof T)[]
      : keyof T)
  | (undefined extends Numeric ? undefined : never);

type ParsableArg<T extends Record<string, number>, Flags> = ParsableEnumValue<
  T,
  boolean | undefined,
  Flags
>;

type ParseFunction<
  T extends Record<string, number>,
  Flags extends boolean,
  Numeric extends boolean,
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
    : Numeric extends false
    ? MaybeArray<
        ParsedValue<T, V, Flags> extends never
          ? V extends string | number
            ? keyof T | InvalidValue
            : InvalidValue
          : Lookup<T, ParsedValue<T, V, Flags>, true>,
        Flags,
        true
      >
    : ParsedValue<T, V, Flags> extends never
    ? string extends V
      ? T[keyof T] | InvalidValue
      : InvalidValue
    : ParsedValue<T, V, Flags>;
};

export type EnumHelper<
  T extends Record<string, number> = Record<string, number>,
  Flags extends boolean = boolean
> = T &
  ParseFunction<T, Flags, true, never, true> & {
    parse: ParseFunction<T, Flags, true>;
    tryParse: ParseFunction<T, Flags, true, undefined>;
    values: T[keyof T][];
    entries: Entries<T>;
    lookup: ParseFunction<T, Flags, false>;
  } & (Flags extends true
    ? {
        any: T[keyof T];
        map<R = T[keyof T]>(
          flags: ParsableEnumValue<T, boolean | undefined, Flags>,
          map?: (entry: Entries<T>[number], index: number) => R
        ): R[];
      }
    : {});

export const createEnumAccessor = <
  T extends Record<string, number>,
  Flags extends boolean
>(
  names: T,
  flags: Flags,
  enumName: string
): EnumHelper<T, Flags> => {
  const entries = Object.entries(names);
  const values = Object.values(names);
  const any = values.reduce((any, flag) => any | flag, 0);

  const nameLookup: Record<string, number> = flags ? { ...names, any } : names;
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
        (value: any) =>
          Array.isArray(value)
            ? value.reduce(
                (flags, flag) =>
                  (flag = parseValue(flag)) == null
                    ? flags
                    : (flags ?? 0) | flag,
                undefined as number | undefined
              )
            : parseValue(value),
        (value: any) =>
          (value = tryParse(value)) == null
            ? undefined
            : entries.filter(([, flag]) => value & flag).map(([name]) => name),
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

  return define(parse, names, [
    { enumerable: false },
    {
      parse,
      tryParse,
      entries,
      values,
      lookup,
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
