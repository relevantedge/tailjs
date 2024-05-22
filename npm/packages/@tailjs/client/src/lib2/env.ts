import {
  CONTEXT_NAV_QUERY,
  EVENT_HUB_QUERY,
  VARIABLES_QUERY,
} from "@constants";
import {
  F,
  T,
  ansi,
  isFunction,
  isObject,
  join,
  parseUri,
  replace,
  some,
  split,
  type Nullish,
} from "@tailjs/util";
import { jsonEncode } from "@tailjs/util/transport";
import { document } from ".";

export const ERR_BUFFER_OVERFLOW = "buffer-overflow";
export const ERR_POST_FAILED = "post-failed";
export const ERR_INVALID_COMMAND = "invalid-command";
export const ERR_INTERNAL_ERROR = "internal-error";
export const ERR_ARGUMENT_ERROR = "invalid-argument";
export const ERR_RESERVED = "reserved";
export const ERR_CONFIG_LOCKED = "config-locked";
export const ERR_DUPLICATE_KEY = "key";

const src = split("" + document.currentScript!["src"], "#");
const args = split("" + (src[1] || ""), ";");

export const SCRIPT_SRC = src[0];
export const TRACKER_DOMAIN = args[1] || parseUri(SCRIPT_SRC, false)?.host!;

export const isInternalUrl = (url: string | Nullish) =>
  !!(
    TRACKER_DOMAIN && parseUri(url, false)?.host?.endsWith(TRACKER_DOMAIN) === T
  );

export const mapUrl = (...urlParts: string[]) =>
  replace(join(urlParts), /(^(?=\?))|(^\.(?=\/))/, SCRIPT_SRC.split("?")[0]);

export const VAR_URL = mapUrl("?", EVENT_HUB_QUERY);
export const MNT_URL = mapUrl("?", CONTEXT_NAV_QUERY);
export const USR_URL = mapUrl("?", VARIABLES_QUERY);

export const groupValue = Symbol();
export const childGroups = Symbol();

export const debug = (
  value: any,
  group?: string,
  collapsed = T,
  nested = F
) => {
  group &&
    (collapsed ? console.groupCollapsed : console.group)(
      (nested ? "" : "tail.js: ") + group
    );
  const children = value?.[childGroups];
  children && (value = value[groupValue]);
  value != null &&
    console.log(
      isObject(value)
        ? ansi(jsonEncode(value), "94")
        : // ? window["chrome"]
        //   ? prettyPrint(value).join("")
        //   : JSON.stringify(value, null, 2)
        isFunction(value)
        ? "" + value
        : value
    );
  children &&
    children.forEach(([value, group, collapsed]) =>
      debug(value, group, collapsed, true)
    );

  group && console.groupEnd();
};
