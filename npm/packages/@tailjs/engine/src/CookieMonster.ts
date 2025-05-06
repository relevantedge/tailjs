import { forEach } from "@tailjs/util";
import { ClientResponseCookie, Cookie, CookieConfiguration } from "./shared";

const getCookieChunkName = (key: string, chunk?: number) =>
  chunk === 0 ? key : `${key}-${chunk}`;

export const requestCookieHeader = Symbol("request cookie header");
export const requestCookies = Symbol("request cookies");

export type ParsedCookieHeaders = Record<string, Cookie> & {
  // We keep the original number of chunks in the request so we can clear them if we return a shorter value (with fewer chunks) in the response
  [requestCookies]: Record<string, Cookie & { chunks: number }>;
  [requestCookieHeader]?: string;
};

export class CookieMonster {
  private readonly _secure: boolean;

  public constructor(config: CookieConfiguration) {
    this._secure = config.secure !== false;
  }

  public mapResponseCookies(
    cookies: ParsedCookieHeaders
  ): ClientResponseCookie[] {
    const responseCookies: ClientResponseCookie[] = [];

    forEach(cookies, ([key, cookie]: [string, Cookie]) => {
      // These are the chunks
      if (typeof key !== "string") return;

      const requestCookie = cookies[requestCookies]?.[key];

      // These cookies should not be sent back, since nothing have updated them and we don't want to mess with Max-Age etc..
      if (requestCookie && requestCookie?.value === cookie.value) return;

      responseCookies.push(
        ...this._mapClientResponseCookies(key, cookie, requestCookie?.chunks)
      );
    });

    return responseCookies;
  }

  public static parseCookieHeader(
    value: string | null | undefined
  ): ParsedCookieHeaders {
    const cookies: ParsedCookieHeaders = { [requestCookies]: {} };
    cookies[requestCookieHeader] = value ?? undefined;

    if (!value) return cookies;
    const sourceCookies = Object.fromEntries(
      value
        .split(";")
        .map((part) => part.trim())
        .flatMap((part) => {
          try {
            const parts = part.split("=").map(decodeURIComponent);
            return (parts[1] ? [parts] : []) as [string, string][];
          } catch (e) {
            console.error(e);
            return [];
          }
        })
    );
    for (const key in sourceCookies) {
      const chunks: string[] = [];
      for (let i = 0; ; i++) {
        const chunkKey = getCookieChunkName(key, i);
        const chunkValue = sourceCookies[chunkKey];
        if (chunkValue === undefined) {
          break;
        }
        chunks.push(chunkValue);
      }
      const value = chunks.join("");
      cookies[key] = {
        fromRequest: true,
        value: value,
        _originalValue: value,
      } as Cookie;

      cookies[requestCookies][key] = { ...cookies[key], chunks: chunks.length };
    }

    return cookies;
  }

  public mapResponseCookie(name: string, cookie: Cookie) {
    return {
      name: name,
      value: cookie.value,
      maxAge: cookie.maxAge,
      httpOnly: cookie.httpOnly ?? true,
      sameSitePolicy:
        cookie.sameSitePolicy === "None" && !this._secure
          ? "Lax"
          : cookie.sameSitePolicy ?? "Lax",
      essential: cookie.essential ?? false,
      secure: this._secure,
      headerString: this._getHeaderValue(name, cookie)[0],
    };
  }

  private _getHeaderValue(
    name: string,
    cookie: Cookie
  ): [header: string, overflow: string] {
    const clear = cookie.value == null || cookie.maxAge! <= 0;

    const parts = ["Path=/"];
    if (this._secure) {
      parts.push("Secure");
    }
    if (cookie.httpOnly) {
      parts.push("HttpOnly");
    }
    if (cookie.maxAge != null || clear) {
      parts.push(`Max-Age=${clear ? 0 : Math.min(34560000, cookie.maxAge!)}`);
    }
    parts.push(
      `SameSite=${
        cookie.sameSitePolicy === "None" && !this._secure
          ? "Lax"
          : cookie.sameSitePolicy ?? "Lax"
      }`
    );
    let attributeLength = parts.join().length;
    if (attributeLength > 0) {
      attributeLength += 2; // + 2 because additional `; ` between key/value and attributes.
    }
    const cutoff = 4093 - attributeLength;

    const encodedName = encodeURIComponent(name);
    const value = cookie.value ?? "";
    let encodedValue = encodeURIComponent(value);

    // Find maximum unencoded cookie value length
    const maxValueLength = cutoff - encodedName.length - 1; // -1 because `=`.

    let overflow = ""; // The part of the value that did not fit in the cookie.
    if (encodedValue.length > maxValueLength) {
      let sourceChars = 0;
      let encodedChars = 0;
      for (const char in encodedValue.match(/[^%]|%../g)) {
        if (encodedChars + char.length >= maxValueLength) {
          break;
        }
        ++sourceChars;
        encodedChars += char.length;
      }

      if (sourceChars === 0) {
        throw new Error(
          `Invalid cookie name: The length of the encoded cookie name (without value) together with the cookie's attributes will make the header value exceed ${cutoff} bytes.`
        );
      }

      overflow = value.substring(sourceChars);
      encodedValue = encodedValue.substring(0, encodedChars - 1);
    }

    const keyValue = `${encodedName}=${encodedValue}`;
    parts.unshift(keyValue.substring(0, cutoff));
    return [parts.join("; "), overflow];
  }

  private _mapClientResponseCookies(
    name: string,
    cookie: Cookie,
    requestChunks = -1
  ): ClientResponseCookie[] {
    const responseCookies: ClientResponseCookie[] = [];

    for (let i = 0; ; i++) {
      const [headerString, overflow] = cookie.value
        ? this._getHeaderValue(name, cookie)
        : ["", ""];

      if (!headerString) {
        // Clear previous chunk.
        cookie = { ...cookie, maxAge: 0, value: "" };
      }

      if (i < requestChunks || cookie.value) {
        const chunkCookieName = getCookieChunkName(name, i);
        responseCookies.push(this.mapResponseCookie(chunkCookieName, cookie));
      }
      cookie = { ...cookie, value: overflow };

      if (!overflow && i >= requestChunks) {
        break;
      }
    }

    return responseCookies;
  }
}
