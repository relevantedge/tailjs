export const QUERY_DEVICE = "qd";
export const INITIALIZE_TRACKER_FUNCTION = ".tail.js.init";

export const INIT_SCRIPT_QUERY = "init";
export const CLIENT_SCRIPT_QUERY = "opt";
export const EVENT_HUB_QUERY = "var";
export const VARIABLES_QUERY = "usr";
export const CONTEXT_NAV_QUERY = "mnt";
export const SCHEMA_QUERY = "$types";
export const BUILD_REVISION_QUERY = globalThis.REVISION
  ? "rev=" + globalThis.REVISION
  : "";

export const SCOPE_INFO_KEY = "@info";
export const CONSENT_INFO_KEY = "@consent";
export const SESSION_REFERENCE_KEY = "@session_reference";

export const PATCH_EVENT_POSTFIX = "_patch";

export const CLIENT_STORAGE_PREFIX = "_tail:";

export const CLIENT_STATE_CHANNEL_ID = CLIENT_STORAGE_PREFIX + "state";

export const CLIENT_CALLBACK_CHANNEL_ID = CLIENT_STORAGE_PREFIX + "push";

export const PLACEHOLDER_SCRIPT: <Quote extends boolean = false>(
  trackerName?: string,
  quote?: Quote
) => Quote extends true ? string : (...commands: any[]) => void = ((
  trackerName = "tail",
  quote: boolean
) => {
  if (quote) {
    const reference = `window[${JSON.stringify(trackerName)}]`;
    return `(${reference}??=c=>${reference}._?.push(c) ?? ${reference}(c))._=[];`;
  }

  (globalThis[trackerName] ??= (c: any) =>
    globalThis[trackerName]._?.push(c) ?? globalThis[trackerName](c))._ = [];
}) as any;

export const __DEBUG__ = true;
