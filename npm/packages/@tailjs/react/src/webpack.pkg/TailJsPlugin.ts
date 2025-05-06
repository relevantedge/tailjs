import path from "path";
import type { Compiler } from "webpack";

export interface TailJsPluginConfiguration {
  config: string;
}
export class TailJsPlugin {
  public readonly config: TailJsPluginConfiguration;

  constructor(config: Partial<TailJsPluginConfiguration> = {}) {
    this.config = config as any;
  }

  apply(compiler: Compiler) {
    // const {  customReactPackage, originalReactPackage, packagePath } = this.options;

    const packageName = "@tailjs/react/jsx";
    const packagePath = path.resolve(
      path.join(
        //@ts-ignore
        typeof __dirname === "undefined" ? import.meta.dirname : __dirname,
        "..",
        "jsx"
      )
    );
    const tryMapRequest = (
      request: string,
      context?: string
    ): string | undefined => {
      if (
        context &&
        (context === packagePath ||
          path.dirname(context).startsWith(packagePath))
      ) {
        return undefined;
      }

      const updated = request?.replace?.(
        /(^|\s+)react(\/(?:jsx-runtime|jsx-dev-runtime))?$/g,
        `$1${packageName}$2`
      );

      // // Reserved for future use.
      // .replace(
      //   /(^|\s+)react-server-dom-webpack(\/server(?:\.(?:browser|bun|edge|node))?)$/g,
      //   `$1${packageName}/react-server-dom-webpack$2`
      // )
      // .replace(
      //   /(^|\s+)react-dom(\/server(?:\.(?:browser|bun|edge|node))?)$/g,
      //   `$1${packageName}$2`
      // );

      return updated !== request ? updated : undefined;
    };

    compiler.hooks.environment.tap("TailJsPlugin", () => {
      let externals = compiler.options.externals;
      if (externals != null && !Array.isArray(externals)) {
        externals = [externals];
      }
      if (this.config.config) {
        externals.push(async (data) => {
          if (data.request?.endsWith("/tailjs.client.config")) {
            return this.config.config;
          }
        });
      }
      compiler.options.externals = externals?.map((external) => {
        if (
          typeof external === "function" ||
          (typeof external === "string" && tryMapRequest(external))
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
    });

    compiler.hooks.normalModuleFactory.tap("TailJsPlugin", (factory) => {
      factory.hooks.resolve.tapAsync(
        "TailJsPlugin",
        (resolveData, callback) => {
          try {
            const { request, contextInfo } = resolveData;

            const issuer = contextInfo.issuer; // The module that is importing
            const mapped = tryMapRequest(request, issuer);
            if (mapped) {
              resolveData.request = mapped;
            }
          } catch (e) {
            console.log(e.message);
          }
          callback();
        }
      );
    });
  }
}
