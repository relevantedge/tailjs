export const CLIENT_SCRIPT_REVISION = globalThis.REVISION;

export const appendClientScriptRevision = (scriptSrc: string) =>
  scriptSrc.replace(
    /^([^?]*)(\?.*?(&)?)?$/g,
    (_, prefix, query, amp) =>
      `${prefix}${query ? (amp ? "" : "&") : "?"}_rev=${CLIENT_SCRIPT_REVISION}`
  );
