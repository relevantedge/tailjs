import * as zlib from "zlib";
import { promisify } from "util";
import * as tar from "tar-stream";
import * as yauzl from "yauzl";

// SO... it finally came to this; using AI code. https://claude.ai/chat/03fad402-1e8e-4c13-bcad-150bc2d70826

// Promisify zlib functions
const gunzip = promisify(zlib.gunzip);

interface DecompressedEntry {
  name: string;
  data: Uint8Array;
}

export async function decompress(
  data: Uint8Array,
  algorithm: "zip" | "tar" | "tar.gz"
): Promise<DecompressedEntry[]> {
  switch (algorithm) {
    case "zip":
      return decompressZip(data);
    case "tar":
      return decompressTar(data);
    case "tar.gz":
      return decompressTarGz(data);
    default:
      throw new Error(`Unsupported algorithm: ${algorithm}`);
  }
}

async function decompressZip(data: Uint8Array): Promise<DecompressedEntry[]> {
  return new Promise((resolve, reject) => {
    const entries: DecompressedEntry[] = [];

    yauzl.fromBuffer(
      Buffer.from(data),
      { lazyEntries: true },
      (err, zipfile) => {
        if (err) return reject(err);
        if (!zipfile) return reject(new Error("Failed to open ZIP file"));

        zipfile.readEntry();

        zipfile.on("entry", (entry) => {
          // Skip directories
          if (/\/$/.test(entry.fileName)) {
            zipfile.readEntry();
            return;
          }

          zipfile.openReadStream(entry, (err, readStream) => {
            if (err) return reject(err);
            if (!readStream)
              return reject(new Error("Failed to open read stream"));

            const chunks: Buffer[] = [];
            readStream.on("data", (chunk) => chunks.push(chunk));
            readStream.on("end", () => {
              const fileData = Buffer.concat(chunks);
              entries.push({
                name: entry.fileName,
                data: new Uint8Array(fileData),
              });
              zipfile.readEntry();
            });
            readStream.on("error", reject);
          });
        });

        zipfile.on("end", () => resolve(entries));
        zipfile.on("error", reject);
      }
    );
  });
}

async function decompressTar(data: Uint8Array): Promise<DecompressedEntry[]> {
  return new Promise((resolve, reject) => {
    const entries: DecompressedEntry[] = [];
    const extract = tar.extract();

    extract.on("entry", (header, stream, next) => {
      // Skip directories
      if (header.type === "directory") {
        stream.resume();
        next();
        return;
      }

      const chunks: Buffer[] = [];
      stream.on("data", (chunk) => chunks.push(chunk));
      stream.on("end", () => {
        const fileData = Buffer.concat(chunks);
        entries.push({
          name: header.name,
          data: new Uint8Array(fileData),
        });
        next();
      });
      stream.on("error", reject);
      stream.resume();
    });

    extract.on("finish", () => resolve(entries));
    extract.on("error", reject);

    // Write the tar data to the extract stream
    extract.write(Buffer.from(data));
    extract.end();
  });
}

async function decompressTarGz(data: Uint8Array): Promise<DecompressedEntry[]> {
  try {
    const decompressedBuffer = await gunzip(Buffer.from(data));
    const decompressedData = new Uint8Array(decompressedBuffer);

    // Then extract the tar
    return decompressTar(decompressedData);
  } catch (error) {
    throw new Error(
      `Failed to decompress tar.gz: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
