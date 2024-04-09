import { isDefined } from "@tailjs/util";
import { forEach } from "./lib";
const getCookieChunkName = (key, chunk) => chunk === 0 ? key : `${key}-${chunk}`;
export const sourceCookieChunks = Symbol("Chunks");
export class CookieMonster {
    _secure;
    constructor(config) {
        this._secure = config.secure !== false;
    }
    mapResponseCookies(cookies) {
        const responseCookies = [];
        forEach(cookies, ([key, cookie]) => {
            // These are the chunks
            if (typeof key !== "string")
                return;
            // These cookies should not be sent back, since nothing have updated them and we don't want to mess with Max-Age etc..
            if (cookie.fromRequest && cookie._originalValue === cookie.value)
                return;
            responseCookies.push(...this._mapClientResponseCookies(key, cookie, cookies[sourceCookieChunks]?.[key] ?? -1));
        });
        return responseCookies;
    }
    parseCookieHeader(value) {
        const cookies = { [sourceCookieChunks]: {} };
        if (!value)
            return cookies;
        const sourceCookies = Object.fromEntries(value
            .split(";")
            .map((part) => part.trim())
            .flatMap((part) => {
            try {
                const parts = part.split("=").map(decodeURIComponent);
                return (parts[1] ? [parts] : []);
            }
            catch (e) {
                console.error(e);
                return [];
            }
        }));
        for (const key in sourceCookies) {
            const chunks = [];
            for (let i = 0;; i++) {
                const chunkKey = getCookieChunkName(key, i);
                const chunkValue = sourceCookies[chunkKey];
                if (chunkValue === undefined) {
                    break;
                }
                chunks.push(chunkValue);
                cookies[sourceCookieChunks][key] = i;
            }
            const value = chunks.join("");
            cookies[key] = {
                fromRequest: true,
                value: value,
                _originalValue: value,
            };
        }
        return cookies;
    }
    _getHeaderValue(name, cookie) {
        const clear = !isDefined(cookie.value) || cookie.maxAge <= 0;
        const parts = ["Path=/"];
        if (this._secure) {
            parts.push("Secure");
        }
        if (cookie.httpOnly) {
            parts.push("HttpOnly");
        }
        if (cookie.maxAge != null || clear) {
            parts.push(`Max-Age=${clear ? 0 : Math.min(34560000, cookie.maxAge)}`);
        }
        parts.push(`SameSite=${cookie.sameSitePolicy === "None" && !this._secure
            ? "Lax"
            : cookie.sameSitePolicy ?? "Lax"}`);
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
                throw new Error(`Invalid cookie name: The length of the encoded cookie name (without value) together with the cookie's attributes will make the header value exceed ${cutoff} bytes.`);
            }
            overflow = value.substring(sourceChars);
            encodedValue = encodedValue.substring(0, encodedChars - 1);
        }
        const keyValue = `${encodedName}=${encodedValue}`;
        parts.unshift(keyValue.substring(0, cutoff));
        return [parts.join("; "), overflow];
    }
    _mapClientResponseCookies(name, cookie, originalChunks) {
        const responseCookies = [];
        for (let i = 0;; i++) {
            const [headerString, overflow] = cookie.value
                ? this._getHeaderValue(name, cookie)
                : ["", ""];
            if (!headerString) {
                // Clear previous chunk.
                cookie = { ...cookie, maxAge: 0, value: "" };
            }
            if (i < originalChunks || cookie.value) {
                const chunkCookieName = getCookieChunkName(name, i);
                responseCookies.push({
                    name: chunkCookieName,
                    value: cookie.value,
                    maxAge: cookie.maxAge,
                    httpOnly: cookie.httpOnly ?? true,
                    sameSitePolicy: cookie.sameSitePolicy === "None" && !this._secure
                        ? "Lax"
                        : cookie.sameSitePolicy ?? "Lax",
                    essential: cookie.essential ?? false,
                    secure: this._secure,
                    headerString: this._getHeaderValue(chunkCookieName, cookie)[0],
                });
            }
            cookie = { ...cookie, value: overflow };
            if (!overflow && i >= originalChunks) {
                break;
            }
        }
        return responseCookies;
    }
}
//# sourceMappingURL=CookieMonster.js.map