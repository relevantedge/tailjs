import { Encodable, createTransport, lfsr } from "../src/transport.pkg";

describe("LSFR implementation encodes and decodes as it should.", () => {
  function encryptDecrypt(key: string, data: number[]) {
    const [encrypt, decrypt] = lfsr(key);

    const encoded = encrypt(new Uint8Array(data));
    const decoded = decrypt(encoded);
    expect([...decoded]).toEqual(data);
  }

  it("Does it normally", () => {
    encryptDecrypt("Hello", [1, 2, 3, 4]);
  });

  it("Adds entropy", () => {
    const [encrypt] = lfsr("Hello");
    expect([...encrypt(new Uint8Array([1, 2, 3]))]).not.toEqual([
      ...encrypt(new Uint8Array([1, 2, 3])),
    ]);
  });
  it("Works with all padding lengths", () => {
    const [encrypt, decrypt] = lfsr("Hello");
    for (let i = 0; i < 48; i++) {
      const src = [...Array(i).keys()];
      expect([...decrypt(encrypt(new Uint8Array(src)))]).toEqual(src);
    }
  });
  it("Pads", () => {
    const [encrypt] = lfsr("Hello");
    expect(encrypt(new Uint8Array([])).length).toEqual(16);
    expect(encrypt(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8])).length).toEqual(
      16
    );
    expect(
      encrypt(
        new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 16])
      ).length
    ).toEqual(32);
  });
});

describe("Sparse HTTP encoding.", () => {
  const [httpEncode, httpDecode] = createTransport();
  const [httpEncrypt, httpDecrypt] = createTransport("TestKey");

  function encodeDecode(value: Encodable, expected = value) {
    expect(httpDecode(httpEncode(value))).toEqual(expected);
    expect(httpDecrypt(httpEncrypt(value))).toEqual(expected);
  }
  it("respects custom toJSON method", () => {
    function createCounter(): { inc(): number; toJSON(): number } {
      let t0 = 0;

      return {
        inc() {
          ++t0;
        },
        toJSON() {
          return t0;
        },
      } as any;
    }

    const counter = createCounter();
    expect(httpDecode(httpEncode([{ c: counter }]))).toEqual([{ c: 0 }]);
    counter.inc();
    expect(httpDecode(httpEncode([{ c: counter }]))).toEqual([{ c: 1 }]);
  });

  it("decodes encoded (all types)", () => {
    encodeDecode([
      1,
      2,
      3,
      1.1,
      1e-16,
      0.9999999999999999,
      Number.MAX_SAFE_INTEGER,
      Number.MAX_VALUE,
      Number.MIN_SAFE_INTEGER,
      Number.MIN_VALUE,
      Number.NEGATIVE_INFINITY,
      Number.POSITIVE_INFINITY,
      Number.NaN,
    ]);

    encodeDecode({ test: 10 });
    encodeDecode("test");
    encodeDecode([
      {
        type: "view",
        timestamp: -4769,
        id: "lmhun456",
        tab: "lmhs3k6l",
        href: "/en",
        path: "/en",
        domain: { protocol: "https", domainName: "www.dev.local" },
        tabIndex: 14,
        viewport: { width: 840, height: 983 },
        firstTab: true,
        navigationType: "reload",
        redirects: 0,
        page: {
          id: "21e67240-cb83-43f2-853e-e4e93fafd426",
          name: "Home",
          preview: false,
          language: "en",
          version: "1",
        },
        clientId: "lmhun7tn",
      },
      {
        type: "scroll",
        scrollType: "fold",
        offset: { x: 0, y: 0.0491576717843691 },
        timestamp: -2402,
        view: "lmhun456",
        clientId: "lmhun7to",
      },
      {
        type: "scroll",
        scrollType: "page-middle",
        offset: { x: 0, y: 0.501431900291261 },
        timestamp: -2330,
        view: "lmhun456",
        clientId: "lmhun7tp",
      },
      {
        type: "scroll",
        scrollType: "page-end",
        offset: { x: 0, y: 0.9909823225109301 },
        timestamp: -2019,
        view: "lmhun456",
        clientId: "lmhun7tq",
      },
    ]);

    encodeDecode([{ a: undefined, b: 10 }, undefined], [{ b: 10 }, null]);
    encodeDecode([["abc"], 10, { a: 10 }, null, true, 4.3]);

    encodeDecode([]);

    encodeDecode([, 1, 2, 3], [null, 1, 2, 3]);

    const bigNumber = new Date(2022, 0, 1).valueOf();
    encodeDecode([1, 2, bigNumber, 3, { a: [new Date(2022, 2, 1).valueOf()] }]);

    encodeDecode([["abc", [1, 2, 3, { hello: 80 }, [{}]]]]);

    encodeDecode([{ s: "abc~!dfij(" }]);

    encodeDecode([
      {
        type: "view",
        timestamp: -4067,
        id: "lmhterne",
        tab: "lmhs3k6l",
        href: "/en",
        path: "/en",
        domain: {
          protocol: "https",
          domainName: "www.dev.local",
        },
        tabIndex: 8,
        viewport: {
          width: 840,
          height: 983,
        },
        firstTab: true,
        navigationType: "reload",
        redirects: 0,
        page: {
          id: "21e67240-cb83-43f2-853e-e4e93fafd426",
          name: "Home",
          preview: false,
          language: "en",
          version: "1",
        },
        clientId: "lmhteusd",
      },
    ]);
  });

  it("Preserves references", () => {
    const a: any = { a: 10 };
    const b: any = { b: 10, a };
    a[b] = [1, 2, b];
    encodeDecode(a);
  });
});
