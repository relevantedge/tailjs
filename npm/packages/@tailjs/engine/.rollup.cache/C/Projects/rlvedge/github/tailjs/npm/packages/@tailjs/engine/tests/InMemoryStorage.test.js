import { setStatus, } from "@tailjs/types";
import { InMemoryStorage } from "../src";
describe("Variable stores store.", () => {
    it("InMemoryStore handles get/set.", async () => {
        const store = new InMemoryStorage();
        const key = {
            key: "test",
            scope: "global",
        };
        expect((await store.set([
            {
                ...key,
                classification: "direct",
                value: "test",
            },
        ]))[0].status).toBe(0 /* VariableSetStatus.Success */);
        expect((await store.get([{ ...key }]))[0]?.value).toBe("test");
        const sessionKeys = ["1", "2", "123"].map((targetId) => ({
            ...key,
            scope: "session",
            targetId,
        }));
        expect(await store.get(sessionKeys)).toEqual([
            undefined,
            undefined,
            undefined,
        ]);
        const setSessions = await store.set(sessionKeys.map((key, i) => ({
            ...key,
            classification: "direct",
            value: `test${i}`,
        })));
        expect(setSessions.map((result) => [result.status, result.current?.value])).toEqual([
            [setStatus.success, "test0"],
            [setStatus.success, "test1"],
            [setStatus.success, "test2"],
        ]);
    });
    it("InMemoryStore handles version conflicts.", async () => {
        const key = {
            scope: "user",
            targetId: "u",
            key: "test",
            classification: "direct",
        };
        const store = new InMemoryStorage();
        let result = (await store.set([{ ...key, value: "version1" }]))[0];
        expect(result?.status).toBe(0 /* VariableSetStatus.Success */);
        expect((result = (await store.set([{ ...key, value: "version1" }]))[0])?.status).toBe(2 /* VariableSetStatus.Conflict */);
        let firstVersion = result.current?.version;
        expect([!!firstVersion, result.current?.value]).toEqual([true, "version1"]);
        expect((result = (await store.set([
            { ...key, value: "version2", version: result.current.version },
        ]))[0])?.status).toBe(0 /* VariableSetStatus.Success */);
        expect(result.current?.version).toBeDefined();
        expect(result.current?.version).not.toBe(firstVersion);
        expect((result = (await store.set([
            { ...key, patch: (current) => ({ value: current?.value + ".1" }) },
        ]))[0])?.status).toBe(0 /* VariableSetStatus.Success */);
        expect(result.current?.value).toBe("version2.1");
        expect((result = (await store.set([
            {
                ...key,
                patch: { type: "ifMatch", match: undefined, value: "version3" },
            },
        ]))[0])?.status).toBe(1 /* VariableSetStatus.Unchanged */);
        expect(result.current?.value).toBe("version2.1");
        expect((result = (await store.set([
            {
                ...key,
                patch: { type: "ifMatch", match: "version2.1", value: "version3" },
            },
        ]))[0])?.status).toBe(0 /* VariableSetStatus.Success */);
        expect(result.current?.value).toBe("version3");
        const currentVersion = result.current?.version;
        expect((await store.get([{ ...key, version: currentVersion }]))[0].unchanged).toBe(true);
        expect((await store.get([{ ...key, version: currentVersion + "not" }]))[0]
            .unchanged).not.toBe(true);
    });
    it("InMemoryStore handles queries.", async () => {
        const target = {
            scope: "session",
            targetId: "s",
            classification: "anonymous",
            key: "",
        };
        const store = new InMemoryStorage();
        await store.set([
            { ...target, key: "key1", value: "value1" },
            {
                ...target,
                key: "key2",
                value: "value2",
                purposes: ["infrastructure"],
                tags: ["tag1"],
            },
            {
                ...target,
                key: "key3",
                value: "value3",
                classification: "direct",
                tags: ["tag1", "tag2"],
            },
        ]);
        let results = await store.query([{ keys: ["key1"] }]);
        expect(results.count).toBeUndefined();
        expect(results.results[0].value).toBe("value1");
        results = await store.query([{ keys: ["key1"] }], { count: true });
        expect(results.count).toBe(1);
        results = await store.query([{ keys: ["*"] }], { count: true });
        expect(results.results.map((result) => [result.key, result.value])).toEqual([
            ["key1", "value1"],
            ["key2", "value2"],
            ["key3", "value3"],
        ]);
        expect(results.count).toBe(3);
        const query = async (filters) => (await store.query(filters)).results.map((result) => result.key);
        expect(await query([{ keys: ["*"], classification: { max: "anonymous" } }])).toEqual(["key1", "key2"]);
        expect(await query([{ keys: ["*"], classification: { min: "indirect" } }])).toEqual(["key3"]);
        expect(await query([{ keys: ["*"], classification: { min: "direct" } }])).toEqual(["key3"]);
        expect(await query([
            {
                keys: ["*"],
                classification: { levels: ["anonymous", "indirect"] },
            },
        ])).toEqual(["key1", "key2"]);
        expect(await query([
            {
                keys: ["*"],
                purposes: "infrastructure",
            },
        ])).toEqual(["key2"]);
        expect(await query([
            {
                keys: ["*"],
                tags: [["tag1"]],
            },
        ])).toEqual(["key2", "key3"]);
        expect(await query([
            {
                keys: ["*"],
                tags: [["tag1", "tag2"]],
            },
        ])).toEqual(["key3"]);
        expect(await query([
            {
                keys: ["*"],
                tags: [["tag1"], ["tag1", "tag2"], ["tag3"]],
            },
        ])).toEqual(["key2", "key3"]);
        expect(await query([
            {
                keys: ["*"],
                tags: [["tag3"]],
            },
        ])).toEqual([]);
        expect(await query([
            {
                keys: ["*"],
                tags: [["tag2"]],
            },
            {
                keys: ["*"],
                purposes: "infrastructure",
            },
        ])).toEqual(["key3", "key2"]);
        expect(await query([
            {
                keys: ["*"],
                tags: [["tag1"]],
                purposes: "infrastructure",
            },
        ])).toEqual(["key2"]);
        await store.purge([{ keys: ["*"], classification: { min: "indirect" } }]);
        expect(await query([{ keys: ["*"] }])).toEqual(["key1", "key2"]);
    });
});
//# sourceMappingURL=InMemoryStorage.test.js.map