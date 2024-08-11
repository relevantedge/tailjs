import { OutputChunk } from "rollup";

export function applyChunkNames(extension = ".js") {
  let nextChunkId = 0;
  return {
    chunkFileNames: (chunk: OutputChunk) => {
      const name = chunk.name.replace(/([^.]+).*/, "$1");
      return `${name}_${nextChunkId++}${extension}`;
    },
    entryFileNames: (chunk: OutputChunk) => {
      nextChunkId = 0;
      const name = chunk.name.replace(/([^.]+).*/, "$1");
      return `${name}${extension}`;
    },
  };
}
