import { OutputChunk } from "rollup";

export function applyChunkNames(extension = ".js") {
  let _ids: Record<string, number> = {};

  const nextChunkId = (chunk: OutputChunk, reset = false) => {
    reset && (_ids = {});
    const prefix = chunk.name.replace(/([^.]+).*/, "$1");
    console.log(chunk.name, prefix);
    let id = (_ids[prefix] = (_ids[prefix] ?? -1) + 1);
    return (id ? prefix + "_" + id : prefix) + extension;
  };

  return {
    chunkFileNames: (chunk: OutputChunk) => nextChunkId(chunk),
    entryFileNames: (chunk: OutputChunk) => nextChunkId(chunk, true),
  };
}
