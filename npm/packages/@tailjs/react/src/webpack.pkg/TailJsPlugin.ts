import path from "path";
import resolveFrom from "resolve-from";

import type { Compiler } from "webpack";

export interface TailJsPluginConfiguration {
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

export class TailJsPlugin {
  public readonly config: TailJsPluginConfiguration;
  constructor(config: TailJsPluginConfiguration = {}) {
    this.config = config as any;
  }

  apply(compiler: Compiler) {
    // const {  customReactPackage, originalReactPackage, packagePath } = this.options;

    const context = compiler.context;

    const mappings = {
      react: "@tailjs/react/jsx",
      "react/jsx-runtime": "@tailjs/react/jsx/jsx-runtime",
      "react/jsx-dev-runtime": "@tailjs/react/jsx/jsx-dev-runtime",
    };
    // Everything in the @tailjs/react package.
    const packagePath = path.resolve(
      path.join(
        //@ts-ignore
        __dirname,
        ".."
      )
    );

    const isPackageContext = (context: string) =>
      context === packagePath || path.dirname(context).startsWith(packagePath);

    const tryMapRequest = (
      request: string,
      context?: string
    ): string | undefined => {
      if (this.config.disable || (context && isPackageContext(context))) {
        return undefined;
      }

      const aliased = request.replace(
        /(?<=^|\s)([^\s]+)$/,
        (name) => mappings[name] ?? name
      );
      return aliased !== request ? aliased : undefined;
    };

    compiler.hooks.environment.tap("TailJsPlugin", () => {
      let externals = compiler.options.externals;

      if (!Array.isArray(externals)) {
        externals = externals ? [externals] : [];
      }

      externals.push(async (data: any) => {
        if (data.request?.endsWith("/tailjs.client.config.js")) {
          return this.config.config ?? "/tailjs.client.config";
        }
      });

      if (this.config.config) {
        externals.push(async (data: any) => {
          if (data.request?.endsWith("/tailjs.client.config")) {
            return this.config.config;
          }
        });
      }

      externals = externals.map((external) => {
        if (
          !this.config.disable &&
          (typeof external === "function" ||
            (typeof external === "string" && tryMapRequest(external)))
        ) {
          return async (data) => {
            let calledBack = false;
            let callbackResult: any = undefined;
            let result =
              typeof external === "function"
                ? await external(data, (err: any, result: any) => {
                    calledBack = true;
                    callbackResult = result;
                  })
                : external;
            if (calledBack) {
              result = callbackResult;
            }

            const mapped =
              typeof result === "string" && tryMapRequest(result, data.context);
            return mapped ? undefined : result;
          };
        }
        return external;
      });
      externals.push({ "@tailjs/react/webpack": "var {}" });

      compiler.options.externals = externals;
    });

    if (!this.config.disable) {
      compiler.hooks.normalModuleFactory.tap("TailJsPlugin", (factory) => {
        factory.hooks.resolve.tapAsync(
          "TailJsPlugin",
          (resolveData, callback) => {
            const {
              request,
              contextInfo: { issuer },
            } = resolveData;
            let mapped = tryMapRequest(request, issuer);
            if (mapped) {
              resolveData.request = mapped;
            } else if (isPackageContext(issuer) && mappings[request]) {
              if (this.config.resolveReactFromContext) {
                resolveData.request = resolveFrom(context, request);
              }
            }

            callback();
          }
        );
      });
    }
  }
}
