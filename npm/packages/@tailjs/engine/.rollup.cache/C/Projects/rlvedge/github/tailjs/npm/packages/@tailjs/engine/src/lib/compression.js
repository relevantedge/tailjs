export async function tryCompress(text, { acceptEncoding, cache, compress, }) {
    const encodings = Object.fromEntries(acceptEncoding.flatMap((value) => value.split(/,/g).map((value) => [value.trim().toLowerCase(), true])) ?? []);
    for (const algorithm of ["br", "gzip"]) {
        if (!encodings[algorithm])
            continue;
        let compressed = cache[algorithm];
        if (compressed === null) {
            // Undefined means not generated, null means unavailable.
            continue;
        }
        else if (compressed) {
            return [compressed, algorithm];
        }
        compressed = cache[algorithm] = await compress(text, algorithm);
        if (compressed) {
            return [compressed, algorithm];
        }
    }
    return [text, ""];
}
//# sourceMappingURL=compression.js.map