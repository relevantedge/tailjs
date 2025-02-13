import { __DEBUG__ } from "@constants";
import { formatDataUsage, formatVariableKey } from "@tailjs/types";
import { ansi, concat, count, F, map2, skip2, sort2, T } from "@tailjs/util";
import { addVariablesChangedListener, childGroups, debug } from ".";
import { ClientVariable, isLocalScopeKey } from "../interfaces";

const formatVariables = (variables: ClientVariable[]) => {
  return map2(
    sort2(variables, [
      (variable) => variable.scope,
      (variable) => variable.key,
    ]),
    (variable) =>
      variable
        ? [
            variable,
            `${formatVariableKey(variable)}, ${
              isLocalScopeKey(variable)
                ? "client-side memory only"
                : formatDataUsage(variable.schema?.usage)
            })`,
            F,
          ]
        : skip2
  );
};

export const addDebugListeners = __DEBUG__
  ? () => {
      addVariablesChangedListener((changes, all, local) => {
        const variables = concat(
          formatVariables(
            map2(changes, ([, current]) => (current ? current : skip2))
          ),
          [
            [
              {
                [childGroups]: formatVariables(
                  map2(all, ([, current]) => (current ? current : skip2))
                ),
              },
              "All variables",
              T,
            ],
          ]
        )!;

        debug(
          { [childGroups]: variables },
          ansi(
            `Variables changed${
              !local ? " - merging changes from another tab" : ""
            } (${changes.length} changed, ${count(all)} in total).`,
            "2;3"
          )
        );
      });
    }
  : () => {};
