import replace from "@rollup/plugin-replace";
import { RollupOptions } from "rollup";

export function applyDefaultConfiguration(config: RollupOptions) {
  config.watch = {
    exclude: [],
    chokidar: {
      usePolling: false,
      useFsEvents: true,
      awaitWriteFinish: true,
    },
  };

  config.plugins = [
    ...((config.plugins as any) ?? []),
    replace({
      "globalThis.REVISION": JSON.stringify(Date.now().toString(36)),
      preventAssignment: true,
    }),
  ];
  return config;
}
