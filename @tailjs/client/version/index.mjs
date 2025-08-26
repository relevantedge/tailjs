const CLIENT_SCRIPT_REVISION = "meso6c9w";
const appendClientScriptRevision = (scriptSrc)=>scriptSrc.replace(/^([^?]*)(\?.*?(&)?)?$/g, (_, prefix, query, amp)=>`${prefix}${query ? amp ? "" : "&" : "?"}_rev=${CLIENT_SCRIPT_REVISION}`);

export { CLIENT_SCRIPT_REVISION, appendClientScriptRevision };
