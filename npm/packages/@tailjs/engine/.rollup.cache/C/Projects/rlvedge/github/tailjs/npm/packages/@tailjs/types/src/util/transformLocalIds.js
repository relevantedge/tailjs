export function transformLocalIds(ev, transform) {
    ev = { ...ev };
    assign(ev, "id");
    assign(ev, "view");
    assign(ev, "related");
    return ev;
    function assign(target, property) {
        if (target?.[property]) {
            target[property] = transform(target[property]) || target[property];
        }
    }
}
//# sourceMappingURL=transformLocalIds.js.map