import { T, TAB_ID, bool, createChannel, nil, str, stringify, } from ".";
const print = ([message, group, header], source) => {
    const self = !source ? "(local)" : source === TAB_ID ? " (self)" : "";
    const sourceDescription = `${source ?? ""}${self}`;
    message = `${sourceDescription}: ${str(message) ? message : stringify(message, nil, 2)}`;
    header && console.groupCollapsed(`${header} ${self}`),
        console.log(`${group ? `${group}:` : ""}${str(message) ? message : stringify(message, nil, 2)}`);
    header && console.groupEnd();
};
let chat;
export const debug = (...args) => {
    if (!chat) {
        chat = createChannel("chat");
        chat((payload, source) => print(payload, source), T);
    }
    //if (!args[0] || !__DEBUG__) return T as any;
    if (!args[0])
        return T;
    const texts = [args[0], nil, nil];
    let broadcast = true;
    for (let i = 1; i < args.length; i++) {
        if (bool(args[i])) {
            broadcast = args[i];
            break;
        }
        texts[i] = args[i];
    }
    broadcast ? chat(texts) : print(texts);
    return T;
};
//# sourceMappingURL=debug.js.map