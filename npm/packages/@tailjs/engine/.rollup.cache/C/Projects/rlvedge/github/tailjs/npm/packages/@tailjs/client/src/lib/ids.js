import { now, reduce, replace, split } from ".";
const KEY_PREFIX = "(t~";
export const mapSharedId = (id) => `${KEY_PREFIX}${id}`;
const randomValues = (arg) => crypto.getRandomValues(arg);
export const uuidv4 = () => replace([1e7] + -1e3 + -4e3 + -8e3 + -1e11, /[018]/g, (c) => ((c *= 1),
    (c ^ (randomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)));
export const randomSafeInt = (arr) => (randomValues((arr = new Uint32Array(2))),
    // keep all 32 bits of the the first, top 20 of the second for 52 random bits
    arr[0] * (1 << 20) + (arr[1] >>> 12));
const localIdBuffer = new Uint32Array(2);
export const nextId = () => randomSafeInt(localIdBuffer).toString(36);
export const compareTabIds = (id, other) => id.localeCompare(other, "en") < 0 ? id : other;
export const getMinTabId = (id, ...other) => other.length === 0
    ? id
    : other.length === 1
        ? compareTabIds(id, other[0])
        : reduce(other, (min, id) => compareTabIds(id, min), id);
export const TAB_ID = `${now().toString(36)}-${randomSafeInt().toString(36)}`;
let tabIdParts;
export const formatTabId = (tabId = TAB_ID) => ((tabIdParts = split(tabId, "-")),
    `${new Date(parseInt(tabIdParts[0], 36)).toISOString()} (${tabIdParts[1]})`);
//# sourceMappingURL=ids.js.map