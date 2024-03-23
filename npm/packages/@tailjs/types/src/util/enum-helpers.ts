import { DataClassification, DataPurposes, VariableScope } from "..";
import { define, isNumber, isString } from "@tailjs/util";

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
  : V extends null | undefined
  ? undefined
  : never;

type ParsableEnumValue<
  T extends Record<string, number>,
  Numeric extends boolean | undefined,
  Flags
> =
  | (boolean extends Numeric
      ? MaybeArray<
          | (Flags extends true ? number : T[keyof T])
          | keyof T
          | (Flags extends true ? "all" : never),
          Flags
        >
      : Numeric extends true
      ? T[keyof T]
      : Flags extends true
      ? (keyof T)[]
      : keyof T)
  | (Numeric extends undefined ? undefined | null : never);

type ParsableArg<T extends Record<string, number>, Flags> = ParsableEnumValue<
  T,
  boolean | undefined,
  Flags
>;

type ParseFunction<
  T extends Record<string, number>,
  Flags extends boolean,
  Numeric extends boolean
> = {
  <V extends string | number | null | undefined>(
    value:
      | V
      | ParsableArg<T, Flags>
      | (Flags extends true ? V[] | ParsableArg<T, Flags>[] : never)
  ): Numeric extends false
    ? MaybeArray<
        ParsedValue<T, V, Flags> extends never
          ? V extends string | number
            ? keyof T | undefined
            : undefined
          : Lookup<T, ParsedValue<T, V, Flags>, true>,
        Flags,
        true
      >
    : ParsedValue<T, V, Flags> extends never
    ? string extends V
      ? T[keyof T] | undefined
      : undefined
    : ParsedValue<T, V, Flags>;
};

export type EnumHelper<
  T extends Record<string, number> = Record<string, number>,
  Flags extends boolean = boolean
> = T &
  ParseFunction<T, Flags, true> & {
    parse: ParseFunction<T, Flags, true>;
    tryParse: ParseFunction<T, Flags, true>;
    values: T[keyof T][];
  } & (Flags extends true
    ? {
        all: T[keyof T];
        names: ParseFunction<T, Flags, false>;
      }
    : {
        name: ParseFunction<T, Flags, false>;
      });

export const createEnumHelper = <
  T extends Record<string, number>,
  Flags extends boolean
>(
  names: T,
  flags: Flags,
  enumName: string
): EnumHelper<T, Flags> => {
  const entries = Object.entries(names);
  const values = Object.values(names);
  const all = values.reduce((all, flag) => all | flag, 0);

  const nameLookup: Record<string, number> = flags
    ? { ...names, all: all }
    : names;
  const valueLookup = Object.fromEntries(
    entries.map(([key, value]) => [value, key])
  );

  const parseValue = (value: any) =>
    isString(value)
      ? nameLookup[value]
      : isNumber(value)
      ? flags
        ? value
        : valueLookup[value]
      : undefined;

  const [tryParse, name] = flags
    ? [
        (value: any) =>
          Array.isArray(value)
            ? value.reduce(
                (flags, flag) =>
                  (flag = tryParse(flag)) == null ? flags : (flags ?? 0) | flag,
                undefined as number | undefined
              )
            : parseValue(value),
        (value: any) =>
          parseValue(value) == null
            ? undefined
            : entries.reduce(
                (names, [name, flag]) => (
                  value & flag && names.push(name), names
                ),
                [] as string[]
              ),
      ]
    : [
        parseValue,
        (value: any) =>
          (value = parseValue(value)) != null ? valueLookup[value] : undefined,
      ];
  const throwError = (err: any) => {
    throw err;
  };

  const parse = (value: any) =>
    value == null
      ? undefined
      : (value = tryParse(value)) == null
      ? throwError(
          new TypeError(
            `${JSON.stringify(value)} is not a valid ${enumName} value.`
          )
        )
      : value;

  return define(
    parse,
    {
      parse,
      tryParse,
      entries,
      values,
      [flags ? "names" : "name"]: name,
    } as const,

    { enumerable: false }
  ) as any;
};

const classifications = {
  none: DataClassification.None,
  indirect: DataClassification.Indirect,
  direct: DataClassification.Direct,
  sensitive: DataClassification.Sensitive,
} as const;

export const dataClassification = createEnumHelper(
  classifications,
  false,
  "data classification"
);

export type DataClassificationValue<
  Numeric extends boolean | undefined = boolean
> = ParsableEnumValue<typeof classifications, Numeric, false>;

const purposes = {
  necessary: DataPurposes.Necessary,
  functionality: DataPurposes.Functionality,
  performance: DataPurposes.Performance,
  targeting: DataPurposes.Targeting,
  security: DataPurposes.Security,
} as const;

export const dataPurposes = createEnumHelper(purposes, true, "data purpose");
export const dataPurpose = createEnumHelper(purposes, false, "data purpose");

export type DataPurposeValue<Numeric extends boolean | undefined = boolean> =
  ParsableEnumValue<typeof purposes, Numeric, true>;

export type SingleDataPurposeValue<
  Numeric extends boolean | undefined = boolean
> = ParsableEnumValue<typeof purposes, Numeric, false>;

const scopes = {
  global: VariableScope.Global,
  session: VariableScope.Session,
  device: VariableScope.Device,
  user: VariableScope.User,
  entity: VariableScope.Entity,
} as const;
export const variableScope = createEnumHelper(scopes, false, "variable scope");

export type VariableScopeValue<Numeric extends boolean | undefined = boolean> =
  ParsableEnumValue<typeof scopes, Numeric, false>;

type UndefinedIfUndefined<Src, T> = Src extends undefined | null
  ? T | undefined
  : T;

/** Transforms properties with known enum types to their parsable counterparts. */
export type Parsable<T, Numeric extends boolean | undefined = boolean> = {
  [P in keyof T]: T[P] extends DataClassification | undefined | null
    ? DataClassificationValue<UndefinedIfUndefined<T[P], Numeric>>
    : T[P] extends DataPurposes | undefined | null
    ? DataPurposeValue<UndefinedIfUndefined<T[P], Numeric>>
    : T[P] extends VariableScope | undefined | null
    ? VariableScopeValue<UndefinedIfUndefined<T[P], Numeric>>
    : Parsable<T[P], Numeric>;
};
