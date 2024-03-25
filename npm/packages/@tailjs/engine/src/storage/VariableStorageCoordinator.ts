import {
  Variable,
  VariableGetter,
  VariablePatch,
  VariableSetResult,
  VariableSetStatus,
  VariableSetter,
  isConflictResult,
  isErrorResult,
  isVariablePatch,
} from "@tailjs/types";
import { delay, isDefined } from "@tailjs/util";
import {
  PartitionItem,
  applyPatchOffline,
  partitionItems,
  withSourceIndex,
} from "../lib";

import {
  PrefixMappings,
  ReadOnlyVariableStorage,
  VariableStorageContext,
  VariableSplitStorage,
  VariableStorage,
  isWritable,
} from "..";

export interface VariableStorageCoordinatorSettings {
  mappings: PrefixMappings;
  retries?: number;
  transientRetryDelay?: number;
  errorRetryDelay?: number;
}

export class VariableStorageCoordinator extends VariableSplitStorage {
  private _settings: Required<VariableStorageCoordinatorSettings>;

  constructor({
    mappings,
    retries = 3,
    transientRetryDelay = 50,
    errorRetryDelay = 250,
  }: VariableStorageCoordinatorSettings) {
    super(mappings);
    this._settings = {
      mappings,
      retries,
      transientRetryDelay,
      errorRetryDelay,
    };
  }

  private async _setWithRetry(
    setters: (VariableSetter<any> | null | undefined)[],
    targetStorage?: VariableStorage,
    context?: VariableStorageContext,
    patch?: (
      sourceIndex: number,
      result: VariableSetResult
    ) => VariableSetter<any> | undefined
  ): Promise<(VariableSetResult | undefined)[]> {
    const finalResults: (VariableSetResult | undefined)[] = [];
    let pending = withSourceIndex(setters);

    const retries = this._settings.retries;
    for (let i = 0; pending.length && i <= retries; i++) {
      const current = pending;
      let retryDelay = this._settings.transientRetryDelay;
      pending = [];
      try {
        const results = await (targetStorage ? targetStorage.set : super.set)(
          partitionItems(current),
          context
        );

        results.forEach((result, j) => {
          finalResults[j] = result;

          if (isErrorResult(result) && result.transient) {
            pending.push(current[j]);
          } else if (isConflictResult(result) && patch) {
            const patched = patch(j, result);
            patched && pending.push([j, patched]);
          }
        });
      } catch (e) {
        retryDelay = this._settings.errorRetryDelay;
        current.map(
          ([index, source]) =>
            source &&
            (finalResults[index] = {
              status: VariableSetStatus.Error as const,
              error: `Operation did not complete after ${retries} attempts. ${e}`,
              source: source,
            })
        );
        pending = current;
      }

      if (pending.length) {
        await delay((0.8 + 0.2 * Math.random()) * retryDelay * (i + 1));
      }
    }

    // Map original sources (lest something was patched).
    finalResults.forEach(
      (result, i) => result && (result.source = setters[i]!)
    );
    return finalResults;
  }

  protected async _patchGetResults(
    storage: ReadOnlyVariableStorage,
    getters: VariableGetter<any>[],
    results: (Variable<any> | undefined)[]
  ): Promise<(Variable<any> | undefined)[]> {
    const initializerSetters: VariableSetter<any>[] = [];

    for (let i = 0; i < getters.length; i++) {
      const getter = getters[i];
      if (!getter.initializer || results[i]) {
        continue;
      }
      if (!isWritable(storage)) {
        throw new Error(
          `A getter with an initializer was specified for a non-writable storage.`
        );
      }

      const initialValue = await getter.initializer();
      if (!isDefined(initialValue)) {
        continue;
      }
      initializerSetters.push({ ...getter, ...initialValue });
    }

    if (isWritable(storage) && initializerSetters.length > 0) {
      await this._setWithRetry(initializerSetters, storage);
    }
    return results;
  }

  protected async _patchSetResults(
    storage: VariableStorage,
    setters: VariableSetter<any, true>[],
    results: (VariableSetResult | undefined)[],
    context?: VariableStorageContext
  ): Promise<(VariableSetResult | undefined)[]> {
    const patches: PartitionItem<VariablePatch<any, true>>[] = [];

    let setter: VariableSetter<any, true>;
    results.forEach(
      (result, i) =>
        result?.status === VariableSetStatus.Unsupported &&
        isVariablePatch((setter = setters[i])) &&
        patches.push([i, setter])
    );

    if (patches.length) {
      const applyPatch = (
        patchIndex: number,
        current: Variable | undefined
      ) => {
        const [sourceIndex, patch] = patches[patchIndex];
        //const current = currentValues[i];
        const patched = applyPatchOffline(current, patch);
        if (!patched) {
          results[sourceIndex] = {
            status: VariableSetStatus.Unchanged,
            current,
            source: setters[sourceIndex],
          };
        }
        return patched ? { ...setters[sourceIndex], ...patched } : undefined;
      };

      const patchSetters: PartitionItem<VariableSetter<any>>[] = [];
      const currentValues = storage.get(partitionItems(patches), context);

      for (let i = 0; i < patches.length; i++) {
        const patched = applyPatch(i, currentValues[i]);
        if (patched) {
          patchSetters.push([i, patched]);
        }
      }

      if (patchSetters.length > 0) {
        (
          await this._setWithRetry(
            partitionItems(patchSetters),
            storage,
            context,
            (sourceIndex, result) =>
              isConflictResult(result)
                ? applyPatch(patchSetters[sourceIndex][0], result.current)
                : undefined
          )
        ).forEach((result, i) => {
          // Map setter to patch to source.
          const sourceIndex = patches[patchSetters[i][0]][0];
          result && (result.source = setters[sourceIndex]);
          results[sourceIndex] = result;
        });
      }
    }
    return results;
  }
}
