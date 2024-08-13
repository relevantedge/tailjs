import { OutputChunk } from "rollup";

export function applyChunkNames(extension = ".js") {
  const nextChunkIds: Record<string, number> = {};

  const getChunkPrefix = (chunk: OutputChunk) =>
    chunk.name.replace(/([^.]+).*/, "$1");
  return {
    chunkFileNames: (chunk: OutputChunk) => {
      const name = getChunkPrefix(chunk);
      const nextChunkId = (nextChunkIds[name] = (nextChunkIds[name] ??= 0) + 1);
      return nextChunkId === 1
        ? name + extension
        : name + "_" + (nextChunkId - 1) + extension;
    },
    entryFileNames: (chunk: OutputChunk) => {
      const name = getChunkPrefix(chunk);
      nextChunkIds[name] = 1;
      return name + extension;
    },
  };
}
