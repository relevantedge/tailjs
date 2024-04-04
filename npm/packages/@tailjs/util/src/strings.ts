export const changeCase = <S extends string | null | undefined>(
  s: S,
  upper: boolean
): S => (s == null ? s : upper ? s.toUpperCase() : s.toLowerCase()) as S;

export const changeIdentifierCaseStyle = (
  identifier: string,
  type: "camel" | "pascal" | "kebab" | "snake"
) =>
  identifier.replace(
    /([_-]*)(\$*(?:[A-Z]+|[a-z]))([a-z0-9]*)/g,
    (_, underscores, initial, rest, index) =>
      (underscores && (!index || type === "kebab" || type === "snake")
        ? underscores.replace(/./g, type === "snake" ? "-" : "_")
        : "") +
      ((index && (type === "kebab" || type === "snake") && !underscores
        ? type === "snake"
          ? "-"
          : "_"
        : "") +
        changeCase(initial, type === "pascal" || (type === "camel" && index)) +
        changeCase(
          type === "kebab" || type === "snake"
            ? rest.replace(
                /(?<=\D)\d|(?<=\d)\D/g,
                type === "kebab" ? "_$&" : "-$&"
              )
            : rest,
          false
        ))
  );
