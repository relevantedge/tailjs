import { DataClassification, DataPurposes, VariableScope } from ".";

/**
 * To be used in functions that both alow enum values and their names.
 * T is supposed to a read-only record in the form `{name1: enumvalue1, name2: enumvalue2, ...} as const`.
 * T may optionally have a parse function that will be excluded, that is
 */
type KeysOrValues<T, Flags extends boolean> = T extends (infer T)[]
  ? KeysOrValues<T, Flags>[]
  : keyof T | (Flags extends true ? number : T[keyof T]);

type ParsedValue<T, V, Flags extends boolean> = V extends keyof T
  ? T[V]
  : V extends T[keyof T]
  ? V
  : Flags extends true
  ? V extends number
    ? T[keyof T]
    : undefined
  : undefined;

type MaybeArray<T, Flags> = Flags extends true ? T | T[] : T;

type ParseFunction<T, Flags> = {
  <V extends MaybeArray<KeysOrValues<T, true> | null | undefined, Flags>>(
    value: V
  ): ParsedValue<T, V extends any[] ? V[number] : V, true>;

  (value: MaybeArray<string | number | null | undefined, Flags>):
    | T[keyof T]
    | undefined;
};

type NameFunction<T, Flags extends boolean> = {
  <V extends MaybeArray<KeysOrValues<T, Flags> | null | undefined, Flags>>(
    value: V
  ): Flags extends true ? (keyof T)[] : keyof T;
  (
    value: MaybeArray<string | number | null | undefined, Flags>
  ): Flags extends true ? (keyof T)[] : keyof T | undefined;
};

// type NameFunction<T> =
//   <V extends null | undefined | KeysOrValues<T, false>>()

export const addEnumParsers = <
  T extends Record<string, number>,
  Flags extends boolean
>(
  names: T,
  flags: Flags
): T & {
  parse: ParseFunction<T, Flags>;
  levels: (keyof T)[];
} & (Flags extends true
    ? {
        names: NameFunction<T, true>;
        map<P extends keyof T, R>(
          projection: (item: [key: P, value: T[P]], index: number) => R,
          flags?: number
        ): R[];
      }
    : {
        name: NameFunction<T, false>;
        map<P extends keyof T, R>(
          projection: (item: [key: P, value: T[P]], index: number) => R
        ): R[];
      }) => {
  const parse = (value: any) =>
    typeof value === "string"
      ? names[value]
      : typeof value === "number"
      ? value
      : undefined;

  const entries = Object.entries(names);
  const lookup = Object.fromEntries(
    entries.map(([key, value]) => [value, key])
  );
  const values = Object.values(names);

  const name = (value: any) =>
    typeof value === "number"
      ? lookup[value]
      : typeof value === "string"
      ? value in names
        ? value
        : undefined
      : undefined;

  Object.defineProperties(names, {
    parse: {
      enumerable: false,
      configurable: false,
      value: flags
        ? (value: any) =>
            Array.isArray(value)
              ? value.reduce(
                  (flags, flag) =>
                    flag == null ? flags : flags & parse(flag)!,
                  0
                )
              : parse(value)
        : parse,
    },
    map: {
      enumerable: false,
      configurable: false,
      value: flags
        ? (project: any, flags?: number) =>
            (flags == null
              ? entries
              : entries.filter(([, flag]) => flag & flags)
            ).map(project)
        : (project: any) => entries.map(project),
    },
    [flags ? "names" : "name"]: {
      enumerable: false,
      configurable: false,
      value: flags
        ? (value: any) => (
            (value = parse(value)),
            values
              .map((flag) => (value & flag ? lookup[flag] : undefined))
              .filter((value) => value)
          )
        : name,
    },
  });
  return names as any;
};

export type NamedDataClassification =
  (typeof dataClassification)["levels"][number];

export type ParsableDataClassification<Strict = false> = Strict extends true
  ? DataClassification
  : NamedDataClassification | DataClassification;

export const dataClassification = addEnumParsers(
  {
    none: DataClassification.None,
    indirect: DataClassification.Indirect,
    direct: DataClassification.Direct,
    sensitive: DataClassification.Sensitive,
  } as const,
  false
);

export type NamedDataPurposes = (typeof dataPurposes)["levels"];
export type ParsableDataPurposes<Strict = false> = Strict extends true
  ? DataPurposes
  : MaybeArray<NamedDataPurposes[number] | DataPurposes, true>;

export const dataPurposes = addEnumParsers(
  {
    necessary: DataPurposes.Necessary,
    functionality: DataPurposes.Functionality,
    performance: DataPurposes.Performance,
    targeting: DataPurposes.Targeting,
    security: DataPurposes.Security,
  },
  true
);

export const variableScope = addEnumParsers(
  {
    global: VariableScope.Global,
    session: VariableScope.Session,
    device: VariableScope.Device,
    user: VariableScope.User,
    entity: VariableScope.Entity,
  },
  false
);

export type NamedVariableScope = (typeof variableScope)["levels"][number];
export type ParsableVariableScope<Strict = false> = Strict extends true
  ? VariableScope
  : NamedVariableScope | VariableScope;
