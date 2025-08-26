import { Compiler } from 'webpack';

interface TailJsPluginConfiguration {
    /**
     * The path the the configuration file (excluding extension).
     *
     * @default "/tailjs.client.config.ts"
     */
    config?: string;
    /**
     * Disable tracking.
     *
     * @default false
     */
    disable?: boolean;
    /**
     * If the @tailjs packages are symlinked into node_modules, use this flag to resolve
     * the 'react' package to the version in the project's node_modules.
     */
    resolveReactFromContext?: boolean;
}
declare class TailJsPlugin {
    readonly config: TailJsPluginConfiguration;
    constructor(config?: TailJsPluginConfiguration);
    apply(compiler: Compiler): void;
}

export { TailJsPlugin, type TailJsPluginConfiguration };
