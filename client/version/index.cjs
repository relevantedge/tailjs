'use strict';

const CLIENT_SCRIPT_REVISION = "mfoel3f0";
const appendClientScriptRevision = (scriptSrc)=>scriptSrc.replace(/^([^?]*)(\?.*?(&)?)?$/g, (_, prefix, query, amp)=>`${prefix}${query ? amp ? "" : "&" : "?"}_rev=${CLIENT_SCRIPT_REVISION}`);

exports.CLIENT_SCRIPT_REVISION = CLIENT_SCRIPT_REVISION;
exports.appendClientScriptRevision = appendClientScriptRevision;
