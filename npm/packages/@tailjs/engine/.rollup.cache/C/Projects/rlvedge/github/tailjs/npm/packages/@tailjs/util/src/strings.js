export const changeCase = (s, upper) => (s == null ? s : upper ? s.toUpperCase() : s.toLowerCase());
export const changeIdentifierCaseStyle = (identifier, type) => identifier.replace(/([_-]*)(\$*(?:[A-Z]+|[a-z]))([a-z0-9]*)/g, (_, underscores, initial, rest, index) => (underscores && (!index || type === "kebab" || type === "snake")
    ? underscores.replace(/./g, type === "snake" ? "-" : "_")
    : "") +
    ((index && (type === "kebab" || type === "snake") && !underscores
        ? type === "snake"
            ? "-"
            : "_"
        : "") +
        changeCase(initial, type === "pascal" || (type === "camel" && index)) +
        changeCase(type === "kebab" || type === "snake"
            ? rest.replace(/(?<=\D)\d|(?<=\d)\D/g, type === "kebab" ? "_$&" : "-$&")
            : rest, false)));
//# sourceMappingURL=strings.js.map