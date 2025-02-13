import { Nullish, isNumber, map2, skip2, throwError, undefined } from ".";

export type EnumParser<Values> = _EnumParser<FilterEnumValues<Values>>;

export const createEnumParser: <Values>(
  name: string,
  values: Values
) => EnumParser<Values> = (name, values) => {
  const levels: string[] = [];
  const ranks: Record<string, number> = {};
  const parser: Record<string, string> = {};

  let rank = 0;
  for (let key in values) {
    if (key === values[key]) {
      Object.defineProperty(parser, key, {
        value: key,
        writable: false,
        enumerable: true,
        configurable: false,
      });
      ranks[key] = rank++;
      levels.push(key);
    }
  }

  const parse = (value: any, validate = true) =>
    value == null
      ? undefined
      : ranks[value] != null
      ? value
      : validate
      ? throwError(`The ${name} "${value}" is not defined.`)
      : undefined;

  const propertySettings = {
    writable: false,
    enumerable: false,
    configurable: false,
  };
  Object.defineProperties(parser, {
    parse: {
      value: parse,
      ...propertySettings,
    },
    ranks: {
      value: ranks,
      ...propertySettings,
    },
    levels: {
      value: levels,
      ...propertySettings,
    },
    compare: {
      value: (lhs: any, rhs: any) => {
        const rank1 = ranks[parse(lhs)],
          rank2 = ranks[parse(rhs)];
        return rank1 < rank2 ? -1 : rank1 > rank2 ? 1 : 0;
      },
      ...propertySettings,
    },
  });

  return parser as any;
};

type FilterEnumValues<T> = Pick<
  T,
  {
    [P in keyof T]: [T[P]] extends [P] ? T[P] : never;
  }[keyof T]
>;

type _EnumParser<
  Values,
  Keys extends string = keyof Values & string
> = Values & {
  parse<
    T extends Keys | (string & {}) | number | Nullish,
    Validate extends boolean = true
  >(
    value: T,
    validate?: Validate
  ): T extends Nullish
    ? undefined
    : Keys | (Validate extends true ? never : undefined);

  readonly levels: Keys[];
  readonly ranks: { [P in Keys]: number };

  compare(lhs: Keys, rhs: Keys): number;
};
