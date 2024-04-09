import { define, isDefined, isNumber, isString } from ".";
export const createEnumAccessor = (names, flags, enumName) => {
    const entries = Object.entries(names);
    const values = Object.values(names);
    const any = values.reduce((any, flag) => any | flag, 0);
    const nameLookup = flags ? { ...names, any } : names;
    const valueLookup = Object.fromEntries(entries.map(([key, value]) => [value, key]));
    const parseValue = (value, validateNumbers) => isString(value)
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
            (value) => Array.isArray(value)
                ? value.reduce((flags, flag) => (flag = parseValue(flag)) == null
                    ? flags
                    : (flags ?? 0) | flag, undefined)
                : parseValue(value),
            (value) => (value = tryParse(value)) == null
                ? undefined
                : entries.filter(([, flag]) => value & flag).map(([name]) => name),
        ]
        : [
            parseValue,
            (value) => (value = parseValue(value)) != null ? valueLookup[value] : undefined,
        ];
    const throwError = (err) => {
        throw err;
    };
    let originalValue;
    const parse = (value) => value == null
        ? undefined
        : (value = tryParse((originalValue = value))) == null
            ? throwError(new TypeError(`${JSON.stringify(originalValue)} is not a valid ${enumName} value.`))
            : value;
    return define(parse, names, [
        { enumerable: false },
        {
            parse,
            tryParse,
            entries,
            values,
            lookup,
        },
        flags &&
            {
                any,
                map: (flags, map) => ((flags = parse(flags)),
                    entries
                        .filter(([, flag]) => flag & flags)
                        .map(map ?? (([, flag]) => flag))),
            },
    ]);
};
//# sourceMappingURL=enums.js.map