import {
  CONTEXT_MENU_QUERY,
  EVENT_HUB_QUERY,
  VARIABLES_QUERY,
} from "@constants";
import { T, join, replace, split, type Nullish } from "@tailjs/util";
import { document, parseDomain } from ".";

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
export const TRACKER_DOMAIN =
  args[1] || parseDomain(SCRIPT_SRC)?.domain?.domainName;

export const isInternalUrl = (url: string | Nullish) =>
  !!(
    TRACKER_DOMAIN &&
    parseDomain(url)?.domain?.domainName.endsWith(TRACKER_DOMAIN) === T
  );

export const mapUrl = (...urlParts: string[]) =>
  replace(
    join(urlParts, ""),
    /(^(?=\?))|(^\.(?=\/))/,
    SCRIPT_SRC.split("?")[0]
  );

export const VAR_URL = mapUrl("?", EVENT_HUB_QUERY);
export const MNT_URL = mapUrl("?", CONTEXT_MENU_QUERY);
export const USR_URL = mapUrl("?", VARIABLES_QUERY);