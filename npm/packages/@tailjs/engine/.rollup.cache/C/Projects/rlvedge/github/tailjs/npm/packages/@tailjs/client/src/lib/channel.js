import { F, T, TAB_ID, defer, filter, fun, map, mapSharedId, nil, shared, shift, size, } from ".";
export const createChannel = (id, handlers, self) => {
    id = mapSharedId(`c_${id}`);
    const channelKey = id;
    const getTargetKey = (targetId) => `${id}!${targetId}`;
    const ownKey = getTargetKey(TAB_ID);
    const channel = (arg0, ...rest) => {
        let cleared = T;
        if (fun(arg0)) {
            // Add listener.
            return shared((key, value, _, sourceId) => {
                if (value != nil &&
                    sourceId &&
                    (key === channelKey || key === ownKey)) {
                    const result = arg0(value, sourceId, key === ownKey);
                    return result !== F;
                }
            }, (rest[0] ?? self) === T);
        }
        rest = filter(rest);
        map(size(rest) ? map(rest, getTargetKey) : [id], (destinationKey) => {
            cleared = F;
            shared(destinationKey, arg0);
            defer(() => cleared !== (cleared = T) && shared(destinationKey, nil));
        });
    };
    if (handlers) {
        channel((value, sourceId, direct) => handlers[shift(value)]?.([sourceId, direct, sourceId === TAB_ID], ...value));
    }
    return channel;
};
//# sourceMappingURL=channel.js.map