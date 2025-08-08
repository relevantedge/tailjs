import { __DEBUG__ } from "@constants";
import { formatDataUsage, formatVariableKey } from "@tailjs/types";
import { ansi, concat, F, map, skip, sort, T } from "@tailjs/util";
import { addVariablesChangedListener, childGroups, debug } from ".";
import { ClientVariable, isLocalScopeKey } from "../interfaces";

const formatVariables = (variables: ClientVariable[]) => {
  return map(
    sort(variables, [(variable) => variable.scope, (variable) => variable.key]),
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
        : skip
  );
};

export const addDebugListeners = __DEBUG__
  ? () => {
      addVariablesChangedListener((changes, all, local) => {
        const variables = concat(
          formatVariables(
            map(changes, ([, current]) => (current ? current : skip))
          ),
          [
            [
              {
                [childGroups]: formatVariables(
                  map(all, ([, current]) => (current ? current : skip))
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
            } (${changes.length} changed, ${all.size} in total).`,
            "2;3"
          )
        );
      });
    }
  : () => {};
