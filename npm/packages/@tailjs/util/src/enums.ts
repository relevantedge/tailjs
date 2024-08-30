import {
  AllKeys,
  Entries,
  Extends,
  Nullish,
  Property,
  array,
  define,
  entries,
  enumerate,
  fromEntries,
  isArray,
  isInteger,
  isNumber,
  isObject,
  isString,
  map,
  obj,
  quote,
  throwError,
  undefined,
} from ".";

export type ParsableLabelValue<Target, Labels extends string> =
  | Nullish
  | Target
  | Labels
  | false
  | (string & {})
  | readonly (Labels | (string & {}) | false | Nullish)[]
  | ParsableLabelValue<Target, Labels>[];

export const source = Symbol();

export type LabelMapper<Target, Labels extends string> = (
  target: Target,
  label: Labels
) => void;
export type LabelMapping<Target, Labels extends string> = {
  readonly [P in Labels & string]: LabelMapper<Target, Labels>;
};

export type LabelSet<Labels extends string> =
  | Labels
  | false
  | Nullish
  | LabelSet<Labels>[];

export type LabelGenerator<Target, Labels extends string> = (
  value: Target,
  useDefault: boolean
) => LabelSet<Labels>;

/** Only one of the labels are allowed from each group. */
export type LabelGroups<Labels> = readonly (readonly Labels[])[];

export interface LabelParser<
  Target,
  Labels extends string,
  Flags extends boolean
> {
  (value: ParsableLabelValue<Target, Labels>): Target | undefined;
  readonly labels: Labels[] & { readonly [P in Labels]: P };

  merge<T extends Target | Nullish>(
    current: T,
    value: ParsableLabelValue<Target, Labels>
  ): T extends Nullish ? undefined : Target;

  format<T extends Target | Nullish, UseDefault extends boolean = false>(
    value: T,
    includeDefault?: UseDefault
  ): T extends Nullish
    ? undefined
    : (Flags extends true ? Labels[] : Labels) | undefined;

  readonly [source]: {
    mappings: LabelMapping<Target, Labels>;
    generator: LabelGenerator<Target, Labels>;
    mutex?: LabelGroups<Labels>;
  };
}

export interface EnumParser<Levels extends string> {
  <T extends Levels | (string & {}) | number | Nullish>(
    value: T
  ): T extends Nullish ? undefined : Levels;
  readonly levels: Levels[];
  readonly ranks: { [P in Levels]: number };
  compare(lhs: Levels | number, rhs: Levels | number): number;
  min(...values: (Levels | number | Nullish)[]): Levels | undefined;
  max(...values: (Levels | number | Nullish)[]): Levels | undefined;
}

export const createEnumParser: <Levels extends string>(
  name: string,
  levels: Levels[]
) => EnumParser<Levels> = (name, levels) => {
  const ranks = fromEntries(levels.map((key, i) => [key, i])) as any;

  const getRank = (value: any): number | undefined =>
    value == null ? undefined : isNumber(value) ? value : ranks[value];
  const minMax =
    (max: boolean) =>
    (...levels: any[]) => {
      const testValues = map(levels, getRank);
      return testValues.length
        ? levels[Math[max ? "max" : "min"](...testValues)]
        : undefined;
    };

  return Object.assign(
    (value: any) =>
      value == null
        ? undefined
        : ((isNumber(value)
            ? levels[value]
            : (ranks[value] != null ? value : null) ??
              throwError(
                `The ${name} '${quote(value)}' is not defined.`
              )) as any),
    {
      levels,
      ranks,
      compare: (lhs: any, rhs: any) => getRank(lhs)! - getRank(rhs)!,
      min: minMax(false),
      max: minMax(true),
    }
  );
};

/**
 *  Assumes an object in the form `{setting1?: ..., setting2?: ...}` that
 *  may represented as a combination of string labels, e.g. "setting1", "setting2", "both", "none"
 *  that can be combined.
 */
export const createLabelParser: <
  Target,
  Labels extends string,
  Flags extends boolean
>(
  name: string,
  flags: Flags,
  mappings: LabelMapping<Target, Labels>,
  generator: LabelGenerator<Target, Labels>,
  mutex?: LabelGroups<Labels>,
  options?: {
    defaultValue?(): Target;
    clone?(current: Target): Target;
  }
) => LabelParser<Target, Labels, Flags> = (
  name,
  flags,
  mappings,
  generator,
  mutex,
  { defaultValue, clone } = {}
) => {
  let mutexGroups: Record<string, number[] | undefined> | undefined;

  mutex?.forEach((values, i) => {
    mutexGroups ??= {};
    values.forEach((value) => (mutexGroups![value] ??= []).push(i));
  });

  let action: any;
  const applyLabel = (target: any, label: string): boolean =>
    (action = mappings[label]) ? (action(target, label), true) : false;

  const apply = (target: any, value: any) => {
    if (value == null) return target;

    if (isArray(value)) {
      value = value.flat().filter(isString);
      if (!value.length) return target;
    } else if (isObject(value)) {
      return target ? apply(target, generator(value, false)) : value;
    }

    target = target
      ? clone
        ? clone(target)
        : { ...target }
      : defaultValue?.() ?? {};

    let invalids: string[] | undefined;

    if (isArray(value)) {
      if (!flags && value.length > 1)
        throwError(`Only a single label is allowed for ${name}.`);
      const seen = mutexGroups ? <string[]>[] : undefined;

      for (const label of value) {
        if (!isString(label)) continue;

        mutexGroups?.[label]?.forEach((group) => {
          const current = seen![group];
          if (current) {
            throwError(
              `The ${name} labels ${quote(current)} and ${quote(
                label
              )} are mutually exclusive.`
            );
          }
          seen![group] = label;
        });

        !applyLabel(target, label) && (invalids ??= []).push(label);
      }
    } else {
      !applyLabel(target, value) && (invalids ??= []).push(value);
    }

    return invalids
      ? throwError(
          invalids.length === 1
            ? `The ${name} label ${quote(invalids[0])} is not defined.`
            : `The ${name} labels ${enumerate(
                quote(invalids)
              )} are not defined.`
        )
      : target;
  };

  const labels = Object.keys(mappings);
  return Object.freeze(
    Object.assign((value: any) => apply(undefined, value), {
      labels: Object.assign(
        Object.keys(mappings) as any[],
        fromEntries(labels.map((label) => [label, label]))
      ) as any,
      format(value: any, useDefault = false) {
        if (value == null) return undefined;

        let labels = generator(value, useDefault) as any[];
        if (!labels) return undefined;
        if (isArray(labels)) {
          labels = labels.flat().filter((value) => value);
          return flags ? labels : labels?.length ? labels[0] : undefined;
        }
        return flags ? [labels] : labels;
      },
      merge(current: any, value: any) {
        return apply(current, value);
      },
      [source]: {
        mappings,
        generator,
        mutex,
      },
    })
  );
};

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

  let allFlags = 0;
  const valueLookup = Object.fromEntries(
    Object.entries(nameLookup).map(
      ([key, value]) => ((allFlags |= value), [value, key])
    )
  );

  const parseValue = (value: any, validateNumbers?: boolean) =>
    isInteger(value)
      ? !flags && validateNumbers
        ? valueLookup[value] != null
          ? value
          : undefined
        : Number.isSafeInteger(value)
        ? value
        : undefined
      : isString(value)
      ? nameLookup[value] ??
        nameLookup[value.toLowerCase()] ??
        // Sometimes a number may have been stored as a string.
        // Let's see if that is the case.
        parseValue(parseInt(value), validateNumbers)
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
            : `the ${enumName} ${enumerate(
                map(array(value), (value) => quote(value)),
                [c]
              )}`
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

export type ParsedEnumResult<
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

  const parse = (source: any) => (
    isObject(source) &&
      (isArray(source)
        ? source.forEach((sourceItem, i) => (source[i] = parse(sourceItem)))
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
          })),
    source
  );

  return parse;
}) as any;
