export const commandTest = (...name) => (command) => command === name[0] ||
    name.some((name) => typeof name === "string" && command?.[name] !== undefined);
//# sourceMappingURL=shared.js.map