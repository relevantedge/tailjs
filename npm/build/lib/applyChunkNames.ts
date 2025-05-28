import { OutputChunk } from "rollup";

export function applyChunkNames(
  extension = ".js",
  baseName?: string | undefined
) {
  let _ids: Record<string, number> = {};

  const nextChunkId = (chunk: OutputChunk, reset = false) => {
    reset && (_ids = {});
    const prefix = baseName ?? chunk.name.replace(/([^.]+).*/, "$1");
    let id = (_ids[prefix] = (_ids[prefix] ?? -1) + 1);
    return (id ? prefix + "_" + id : prefix) + extension;
  };

  return {
    chunkFileNames: (chunk: OutputChunk) => nextChunkId(chunk),
    entryFileNames: (chunk: OutputChunk) => nextChunkId(chunk, true),
  };
}
