import { dataPurposes, sortVariables } from "@tailjs/types";
import { F, T, ansi, concat, count, map } from "@tailjs/util";
import { addVariablesChangedListener, childGroups, debug } from ".";
import { __DEBUG__ } from "@constants";
import { formatAnyVariableScope } from "..";

export const addDebugListeners = __DEBUG__
  ? () => {
      addVariablesChangedListener((changes, all, local) => {
        const variables = concat(
          sortVariables(map(changes, 1))?.map((variable) => [
            variable,
            `${variable.key} (${formatAnyVariableScope(variable.scope)}, ${
              variable.scope < 0
                ? "client-side memory only"
                : dataPurposes.format(variable.purposes)
            })`,
            F,
          ]),
          [
            [
              {
                [childGroups]: sortVariables(map(all, 1))?.map((variable) => [
                  variable,
                  `${variable.key} (${formatAnyVariableScope(
                    variable.scope
                  )}, ${
                    variable.scope < 0
                      ? "client-side memory only"
                      : dataPurposes.format(variable.purposes)
                  })`,
                  F,
                ]),
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
