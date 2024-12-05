import {
  MaybeUndefined,
  Nullish,
  PickRequired,
  PrettifyIntersection,
  RecordType,
  concat2,
  forEach,
  forEach2,
  group2,
  isArray,
  isString,
  join,
  join2,
  map,
  map2,
  match,
  nil,
  obj2,
  skip2,
  stop2,
  undefined,
} from ".";

type QueryStringDelimiterValue =
  | boolean
  | string
  | readonly string[]
  | readonly [];

export type ParsedUri<
  QueryStringDelimiters extends QueryStringDelimiterValue = QueryStringDelimiterValue
> = {
  /** The original URI that was parsed. */
  source: string;
  /** The name of the scheme excluding colon and slashes. */
  scheme?: string;

  /**
   * Whether the scheme includes two slashes or not (in which case it is a urn).
   * Slashes are only included when formatting the URI if this value is explicity `false`,
   * or {@link scheme} has a value and it is not explicitly `true`.
   *
   * @default false
   */
  urn?: boolean;

  /**
   * User name, password, host and port as much as any of these are part of the URI.
   * When formatting a parsed URI, this is not used, but rather the individual parts.
   */
  authority?: string;

  user?: string;
  password?: string;
  host?: string;
  port?: number;
  path?: string;
  query?: QueryStringDelimiters extends false
    ? string
    : ParsedQueryString<Exclude<QueryStringDelimiters, null>>;
  fragment?: string;
};

export const parameterListSymbol = Symbol();
export type ParsedQueryString<Delimiters extends QueryStringDelimiterValue> =
  Record<
    string,
    Delimiters extends Nullish | readonly [] | false
      ? string
      : string | string[]
  > & {
    [parameterListSymbol]?: [
      string,
      Delimiters extends Nullish | readonly [] | false
        ? string
        : string | string[]
    ];
  };

export const uriEncode = (value: any) =>
  value != nil ? encodeURIComponent(value) : undefined;

export const parseKeyValue = <
  Delimiters extends QueryStringDelimiterValue = ["|", ";", ","]
>(
  value: string | Nullish,
  {
    delimiters = ["|", ";", ","] as any,
    decode = true,
    lowerCase,
  }: QueryStringParseOptions<Delimiters> = {}
):
  | readonly [key: string, value: string | undefined, values: string[]]
  | undefined => {
  if (!value) return undefined;
  const parts: [string, string, string[]] = value.split("=").map((v) => {
    v = decode ? decodeURIComponent(v.trim()).replaceAll("+", " ") : v.trim();
    return lowerCase ? v.toLowerCase() : v;
  }) as any;
  let split: string[];
  parts[1] ??= "";
  parts[2] =
    (parts[1] &&
      ((isString(delimiters) && (delimiters = [delimiters] as any)) ||
        isArray(delimiters)) &&
      forEach2(delimiters as string[], (delim) =>
        (split = parts[1]!.split(delim)).length > 1 ? stop2(split) : undefined
      )) ||
    (parts[1] ? [parts[1]] : []);

  return parts;
};

// // Browsers accepts `//` as "whatever the protocol is" is links.
// // A scheme can only be letters, digits, `+`, `-` and `.`.
// // The slashes are captured so we can put the parsed URI correctly back together.
// // https://datatracker.ietf.org/doc/html/rfc3986#section-3.1
// Scheme (group 1 and 2) = `//` or `name:` or `name://` = (?:(?:([\w+.-]+):)?(\/\/)?)

// // https://datatracker.ietf.org/doc/html/rfc3986#section-3.2.1
// User Information (groups 4 and 5) = `user@` or `user:password@` = (?:([^:@]+)(?:\:([^@]*))?@)

// // If an IPv6 address is used with a port it is wrapped in square brackets.
// // Otherwise a host is anything until port, path or query string.
// // Se also https://serverfault.com/questions/205793/how-can-one-distinguish-the-host-and-the-port-in-an-ipv6-url about the brackets.
// // https://datatracker.ietf.org/doc/html/rfc3986#section-3.2.2
// Host (group 6 or 7) = `[ IPv6 or IPvFuture ]:port` or IPv6 or `IPv4:port` or `domain:port`  = (?:\[([^\]]+)\]|([0-9:]+|[^/+]+?))

// //Port is included in the optional host group to separate `about:blank` like schemes from `localhost:1337` like hosts
// // https://datatracker.ietf.org/doc/html/rfc3986#section-3.2.3
// Port (group 8) = (?::(\d*))?

// Authority (group 3) = User Information + Host + Port

// // Anything until an optional query or fragment
// // https://datatracker.ietf.org/doc/html/rfc3986#section-3.3
// Path and  (group 9) = (\/[^#?]*)

// // Anything following a `?` until an optional fragment.
// // https://datatracker.ietf.org/doc/html/rfc3986#section-3.4
// Query (group 10) = (?:\?([^#]*))

// // Anything following a pound sign until end.
// // https://datatracker.ietf.org/doc/html/rfc3986#section-3.5
// Fragment (group 11) = (?:#.*)

// Everything put together
// ^(?:(?:([\w+.-]+):)?(?:\/\/)?)?((?:([^:@]+)(?:\:([^@]*))?@)?(?:\[([^\]]+)\]|([0-9:]+|[^/+]+?))?(?::(\d*))?)?(\/[^#?]*)?(?:\?([^#]*))?(?:#(.*))?$

/**
 * Parses an URI according to https://www.rfc-editor.org/rfc/rfc3986#section-2.1.
 * The parser is not pedantic about the allowed characters in each group
 *
 * @param uri The URI to parse
 * @param query Whether to parse the query into a record with each parameter and its value(s) or just the string.
 *  If an array is provided these are the characters that are used to split query string values. If this is empty, arrays are not parsed.
 * @returns A record with the different parts of the URI.
 */
export const parseUri = <
  Uri extends string | Nullish,
  Delimiter extends QueryStringDelimiterValue = true,
  RequireAuthority extends boolean = false
>(
  uri: Uri,
  {
    delimiters = true as any,
    requireAuthority,
    ...options
  }: QueryStringParseOptions<Delimiter> & {
    requireAuthority?: RequireAuthority;
  } = {}
):
  | PrettifyIntersection<
      RequireAuthority extends true
        ? PickRequired<ParsedUri<Delimiter>, "scheme" | "host" | "urn" | "path">
        : ParsedUri<Delimiter>,
      true
    >
  | (Uri extends Nullish ? undefined : never) =>
  uri == nil
    ? undefined
    : (match(
        uri,
        /^(?:(?:([\w+.-]+):)?(\/\/)?)?((?:([^:@]+)(?:\:([^@]*))?@)?(?:\[([^\]]+)\]|([0-9:]+|[^/+]+?))?(?::(\d*))?)?(\/[^#?]*)?(?:\?([^#]*))?(?:#(.*))?$/g,
        (
          source: string,
          scheme,
          slashes,
          authority,
          user,
          password,
          bracketHost,
          host,
          port,
          path,
          queryString,
          fragment
        ) => {
          const parsed: ParsedUri = {
            source,
            scheme,
            urn: scheme ? !slashes : slashes ? false : undefined,
            authority,
            user,
            password,
            host: bracketHost ?? host,
            port: port != null ? parseInt(port) : undefined,
            path,
            query:
              delimiters === false
                ? queryString
                : queryString
                ? parseQueryString(queryString, { ...options, delimiters })
                : undefined,
            fragment,
          };
          parsed.path =
            parsed.path ||
            (parsed.authority ? (parsed.urn ? "" : "/") : undefined);
          return parsed;
        }
      ) as any);

export type QueryStringParseOptions<
  Delimiters extends QueryStringDelimiterValue = [","]
> = {
  delimiters?: Delimiters;
  decode?: boolean;
  lowerCase?: boolean;
};

export const parseHttpHeader = <
  V extends string | Nullish,
  Delimiter extends QueryStringDelimiterValue = ","
>(
  query: V,
  options?: QueryStringParseOptions<Delimiter>
): PrettifyIntersection<ParsedQueryString<Delimiter>> =>
  parseParameters(query, "; ", options);

export const parseQueryString = <
  V extends string | Nullish,
  Delimiters extends QueryStringDelimiterValue = true
>(
  query: V,
  options?: QueryStringParseOptions<Delimiters>
): PrettifyIntersection<ParsedQueryString<Delimiters>> =>
  parseParameters(query, "&", options);

export const parseParameters = <
  V extends string | Nullish,
  Delimiters extends QueryStringDelimiterValue = true
>(
  query: V,
  separator: string,
  {
    delimiters = true as any,
    ...options
  }: QueryStringParseOptions<Delimiters> = {}
): PrettifyIntersection<ParsedQueryString<Delimiters>> => {
  const parameters = map2(
    query?.match(/(?:^.*?\?|^)([^#]*)/)?.[1]?.split(separator),
    (part) => {
      let [key, value, values] =
        parseKeyValue(part, {
          ...options,
          delimiters:
            delimiters === false
              ? []
              : delimiters === true
              ? undefined
              : delimiters,
        }) ?? [];
      return (key = key?.replace(/\[\]$/, "")) != null
        ? delimiters !== false
          ? [key, values!.length > 1 ? values! : value!]
          : [key, value!]
        : skip2;
    }
  );

  const results = obj2(group2(parameters, false), ([key, values]) => [
    key,
    delimiters !== false
      ? values.length > 1
        ? concat2(values)
        : values[0]
      : values.join(","),
  ]) as any;

  return results
    ? ((results[parameterListSymbol] = parameters), results)
    : results;
};

export const toQueryString = <
  P extends
    | Iterable<readonly [string, any]>
    | RecordType<string, any>
    | undefined
>(
  parameters: P,
  delimiter = ","
): MaybeUndefined<P, string> =>
  parameters == nil
    ? undefined
    : (map(parameters, ([key, value]) =>
        isString(key)
          ? key +
            "=" +
            (isArray(value)
              ? map(value, uriEncode).join(delimiter)
              : uriEncode(value) ?? "")
          : undefined
      )?.join("&") as any);

export const appendQueryString = <Uri extends string | undefined>(
  baseUri: Uri,
  parameters:
    | Record<string, any>
    | Iterable<readonly [key: string, value: any]>
    | undefined
): MaybeUndefined<Uri, string> => {
  if (!baseUri) return undefined!;
  const qs = toQueryString(parameters);
  return (baseUri.match(/^[^?]*/)![0] + (qs ? "?" + qs : "")) as any;
};

export const mergeQueryString = <Uri extends string | undefined>(
  currentUri: Uri,
  parameters:
    | Record<string, any>
    | Iterable<readonly [key: string, value: any]>
    | undefined
): MaybeUndefined<Uri, string> => {
  if (!currentUri) return undefined!;
  const current = parseQueryString(currentUri);
  forEach(parameters, ([key, value]) => (current[key] = current[key] ?? value));
  return appendQueryString(currentUri, current) as any;
};

export const formatUri = <Uri extends Omit<ParsedUri, "source">>(
  uri: Uri
): MaybeUndefined<Uri, string> =>
  uri == nil
    ? (undefined as any)
    : join2(
        [
          uri.scheme || uri.urn === false
            ? (uri.scheme ? uri.scheme + ":" : "") + (!uri.urn ? "//" : "")
            : "",
          uri.user,
          uri.password ? ":" + uri.password : undefined,
          uri.user && "@",
          uri.host,
          uri.port ? ":" + uri.port : undefined,
          uri.path === "/" ? "" : uri.path,
          uri.query &&
            "?" + (isString(uri.query) ? uri.query : toQueryString(uri.query)),
          uri.fragment && "#" + uri.fragment,
        ],
        ""
      ) || undefined!;
