import { JsxConfiguration } from '@tailjs/react';
import React, { FunctionComponent } from 'react';

type NextJsxConfiguration = Omit<JsxConfiguration, "tracker"> & {
    tracker: Omit<JsxConfiguration["tracker"], "script"> & {
        /**
         * The route for the script.
         * @default "/api/tailjs"
         */
        script?: boolean | string | {
            /** @default "/api/tailjs" */
            route?: string;
            /** Whether `_rev=(client script revision)` gets appended to the route to avoid caching issues. */
            appendRevision?: boolean;
        };
    };
};
declare const createClientConfiguration: (config: NextJsxConfiguration) => JsxConfiguration;

type ConfiguredTrackerComponent = FunctionComponent<any> & {
    /**
     * Use this element as a last resort if it is otherwise impossible to make the tail.js script come before CMPs that blocks it.
     * You can optionally use the {@link TrackerScriptStrategy} `html` to force the script to be rendered as soon as possible.
     *
     * Typically, it is enough just to add the CMP tags as {@link Script} components, as long as the Tracker's script is configured
     * with the same {@link ScriptProps.strategy} or sooner.
     */
    Script: FunctionComponent<any>;
};
/**
 * @deprecated Use the TailJsPlugin from @tailjs/react/webpack instead.
 */
declare const bakeTracker: (props: any, clientTracker?: ConfiguredTrackerComponent, react?: typeof React) => ConfiguredTrackerComponent;

export { type ConfiguredTrackerComponent, type NextJsxConfiguration, bakeTracker, createClientConfiguration };
