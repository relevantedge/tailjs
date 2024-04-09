import { F } from ".";
const ssrLock = (action, timeout) => {
    if (!action)
        return F;
    if (timeout === F)
        return action();
    return (async () => await action())();
};
export const lock = (id, ...args) => ssrLock(...args);
//# sourceMappingURL=lock.js.map