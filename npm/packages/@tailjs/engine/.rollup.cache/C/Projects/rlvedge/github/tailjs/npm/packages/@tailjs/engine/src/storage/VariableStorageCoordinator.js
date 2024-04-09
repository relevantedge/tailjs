import { isConflictResult, isErrorResult, isVariablePatch, } from "@tailjs/types";
import { delay, isDefined } from "@tailjs/util";
import { applyPatchOffline, partitionItems, withSourceIndex, } from "../lib";
import { VariableSplitStorage, isWritable, } from "..";
export class VariableStorageCoordinator extends VariableSplitStorage {
    _settings;
    constructor({ mappings, retries = 3, transientRetryDelay = 50, errorRetryDelay = 250, }) {
        super(mappings);
        this._settings = {
            mappings,
            retries,
            transientRetryDelay,
            errorRetryDelay,
        };
    }
    async _setWithRetry(setters, targetStorage, context, patch) {
        const finalResults = [];
        let pending = withSourceIndex(setters);
        const retries = this._settings.retries;
        for (let i = 0; pending.length && i <= retries; i++) {
            const current = pending;
            let retryDelay = this._settings.transientRetryDelay;
            pending = [];
            try {
                const results = await (targetStorage ? targetStorage.set : super.set)(partitionItems(current), context);
                results.forEach((result, j) => {
                    finalResults[j] = result;
                    if (isErrorResult(result) && result.transient) {
                        pending.push(current[j]);
                    }
                    else if (isConflictResult(result) && patch) {
                        const patched = patch(j, result);
                        patched && pending.push([j, patched]);
                    }
                });
            }
            catch (e) {
                retryDelay = this._settings.errorRetryDelay;
                current.map(([index, source]) => source &&
                    (finalResults[index] = {
                        status: 7 /* VariableSetStatus.Error */,
                        error: `Operation did not complete after ${retries} attempts. ${e}`,
                        source: source,
                    }));
                pending = current;
            }
            if (pending.length) {
                await delay((0.8 + 0.2 * Math.random()) * retryDelay * (i + 1));
            }
        }
        // Map original sources (lest something was patched).
        finalResults.forEach((result, i) => result && (result.source = setters[i]));
        return finalResults;
    }
    async _patchGetResults(storage, getters, results) {
        const initializerSetters = [];
        for (let i = 0; i < getters.length; i++) {
            const getter = getters[i];
            if (!getter.initializer || results[i]) {
                continue;
            }
            if (!isWritable(storage)) {
                throw new Error(`A getter with an initializer was specified for a non-writable storage.`);
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
    async _patchSetResults(storage, setters, results, context) {
        const patches = [];
        let setter;
        results.forEach((result, i) => result?.status === 3 /* VariableSetStatus.Unsupported */ &&
            isVariablePatch((setter = setters[i])) &&
            patches.push([i, setter]));
        if (patches.length) {
            const applyPatch = (patchIndex, current) => {
                const [sourceIndex, patch] = patches[patchIndex];
                //const current = currentValues[i];
                const patched = applyPatchOffline(current, patch);
                if (!patched) {
                    results[sourceIndex] = {
                        status: 1 /* VariableSetStatus.Unchanged */,
                        current,
                        source: setters[sourceIndex],
                    };
                }
                return patched ? { ...setters[sourceIndex], ...patched } : undefined;
            };
            const patchSetters = [];
            const currentValues = storage.get(partitionItems(patches), context);
            for (let i = 0; i < patches.length; i++) {
                const patched = applyPatch(i, currentValues[i]);
                if (patched) {
                    patchSetters.push([i, patched]);
                }
            }
            if (patchSetters.length > 0) {
                (await this._setWithRetry(partitionItems(patchSetters), storage, context, (sourceIndex, result) => isConflictResult(result)
                    ? applyPatch(patchSetters[sourceIndex][0], result.current)
                    : undefined)).forEach((result, i) => {
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
//# sourceMappingURL=VariableStorageCoordinator.js.map