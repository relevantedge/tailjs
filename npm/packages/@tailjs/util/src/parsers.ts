import {
  MaybeUndefined,
  Nullish,
  PickRequired,
  PrettifyIntersection,
  RecordType,
  concat,
  forEach,
  isArray,
  isString,
  join,
  map,
  mapFirst,
  match,
  nil,
  obj,
  undefined,
} from ".";

type QueryStringDelimiterValue = boolean | readonly string[] | readonly [];

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

export const parameterList = Symbol();
export type ParsedQueryString<Delimiters extends QueryStringDelimiterValue> =
  Record<
    string,
    Delimiters extends null | readonly [] | false ? string : string | string[]
  > & {
    [parameterList]?: [
      string,
      Delimiters extends null | readonly [] | false ? string : string | string[]
    ];
  };

export const uriEncode = (value: any) =>
  value != nil ? encodeURIComponent(value) : undefined;

export const parseKeyValue = (
  value: string | Nullish,
  arrayDelimiters: readonly string[] | readonly [] = ["|", ";", ","],
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
      arrayDelimiters?.length &&
      mapFirst(arrayDelimiters, (delim, _, split = parts[1]!.split(delim)) =>
        split.length > 1 ? split : undefined
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
  QueryString extends QueryStringDelimiterValue = true,
  RequireAuthority extends boolean = false
>(
  uri: Uri,
  query: QueryString = true as any,
  requireAuthority?: RequireAuthority
):
  | PrettifyIntersection<
      RequireAuthority extends true
        ? PickRequired<
            ParsedUri<QueryString>,
            "scheme" | "host" | "urn" | "path"
          >
        : ParsedUri<QueryString>,
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
              query === false
                ? queryString
                : parseQueryString(queryString, query),
            fragment,
          };
          parsed.path =
            parsed.path ||
            (parsed.authority ? (parsed.urn ? "" : "/") : undefined);
          return parsed;
        }
      ) as any);

export const parseHttpHeader = <
  V extends string | Nullish,
  Delimiters extends QueryStringDelimiterValue = [","]
>(
  query: V,
  arrayDelimiters: Delimiters = [","] as any,
  decode = true
): PrettifyIntersection<ParsedQueryString<Delimiters>> =>
  parseParameters(query, "; ", arrayDelimiters, decode);

export const parseQueryString = <
  V extends string | Nullish,
  Delimiters extends QueryStringDelimiterValue = true
>(
  query: V,
  arrayDelimiters?: Delimiters,
  decode = true
): PrettifyIntersection<ParsedQueryString<Delimiters>> =>
  parseParameters(query, "&", arrayDelimiters, decode);

export const parseParameters = <
  V extends string | Nullish,
  Delimiters extends QueryStringDelimiterValue = true
>(
  query: V,
  separator: string,
  arrayDelimiters?: Delimiters,
  decode = true
): PrettifyIntersection<ParsedQueryString<Delimiters>> => {
  const list: [string, any][] = [];

  const results =
    query == nil
      ? undefined
      : (obj(
          query?.match(/(?:^.*?\?|^)([^#]*)/)?.[1]?.split(separator),
          (
            part,
            _,
            [key, value, values] = parseKeyValue(
              part,
              arrayDelimiters === false
                ? []
                : arrayDelimiters === true
                ? undefined
                : arrayDelimiters,
              decode
            ) ?? [],
            kv: any
          ) => (
            (kv =
              (key = key?.replace(/\[\]$/, "")) != null
                ? arrayDelimiters !== false
                  ? [key, values!.length > 1 ? values! : (value! as any)]
                  : [key, value!]
                : undefined),
            list.push(kv),
            kv
          ),
          (current, value) =>
            current
              ? arrayDelimiters !== false
                ? concat(current, value)
                : (current ? current + "," : "") + value
              : value
        ) as any);

  results && (results[parameterList] = list);

  return results;
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
                : uriEncode(value)) ?? ""
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
    : join([
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
      ]) || undefined!;
