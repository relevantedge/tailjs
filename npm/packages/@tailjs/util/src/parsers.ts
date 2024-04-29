import {
  If,
  MaybeUndefined,
  Nullish,
  forEach,
  isArray,
  isDefined,
  isString,
  concat,
  map,
  mapFirst,
  obj,
  undefined,
} from ".";

type ParsedQueryString<Values extends string | string[]> = Record<
  string,
  Values
>;

const encode = (value: any) =>
  value != null ? encodeURIComponent(value) : undefined;

const parseKeyValue = (
  value: string | Nullish,
  arrayDelimiters: string[] | null = ["|", ";", ","],
  decode = true
):
  | readonly [key: string, value: string | undefined, values: string[]]
  | undefined => {
  if (!value) return undefined;
  const parts: [string, string, string[]] = value
    .split("=")
    .map((v) =>
      decode ? decodeURIComponent(v.trim()).replaceAll("+", " ") : v.trim()
    ) as any;
  parts[1] ??= "";
  parts[2] =
    (parts[1] &&
      mapFirst(arrayDelimiters, (delim, _, split = parts[1]!.split(delim)) =>
        split.length > 1 ? split : undefined
      )) ||
    (parts[1] ? [parts[1]] : []);
  return parts;
};

export const parseQueryString = <
  V extends string | Nullish,
  Delimiters extends string[] | null = string[]
>(
  value: V,
  arrayDelimiters: Delimiters = ["|", ";", ","] as any,
  decode = true
): ParsedQueryString<If<Delimiters, string[] | string, string>> => {
  return obj(
    value?.match(/(?:^.*?\?|^)(.*)$/)?.[1]?.split("&"),
    (
      part,
      _,
      [key, value, values] = parseKeyValue(part, arrayDelimiters, decode) ?? []
    ) =>
      isDefined((key = key?.replace(/\[\]$/, "")))
        ? arrayDelimiters
          ? [key, values!.length > 1 ? values! : value!]
          : [key, value!]
        : undefined,
    (current, value) =>
      current
        ? arrayDelimiters
          ? concat(current, value)
          : (current ? current + "," : "") + value
        : value
  ) as any;
};

export const toQueryString = <
  P extends
    | Record<string, any>
    | Iterable<readonly [key: string, value: any]>
    | undefined
>(
  parameters: P,
  delimiter = ","
): MaybeUndefined<P, string> =>
  map(parameters, ([key, value]) =>
    isString(key)
      ? key +
          "=" +
          (isArray(value)
            ? map(value, encode).join(delimiter)
            : encode(value)) ?? ""
      : undefined
  )?.join("&") as any;

export const appendQueryString = <Url extends string | undefined>(
  baseUrl: Url,
  parameters:
    | Record<string, any>
    | Iterable<readonly [key: string, value: any]>
    | undefined
): MaybeUndefined<Url, string> => {
  if (!baseUrl) return undefined!;
  const qs = toQueryString(parameters);
  return baseUrl.match(/^[^?]*/)![0] + (qs ? "?" + qs : "");
};

export const mergeQueryString = <Url extends string | undefined>(
  currentUrl: Url,
  parameters:
    | Record<string, any>
    | Iterable<readonly [key: string, value: any]>
    | undefined
): MaybeUndefined<Url, string> => {
  if (!currentUrl) return undefined!;
  const current = parseQueryString(currentUrl);
  forEach(parameters, ([key, value]) => (current[key] = current[key] ?? value));
  return appendQueryString(currentUrl, current);
};
