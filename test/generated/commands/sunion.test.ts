import { zip, padEnd } from "lodash";
import { IHandyRedis, createHandyClient } from "../../../src";
import { getOverride } from "../../_manual-overrides";
let client: IHandyRedis;
beforeAll(async () => {
    client = createHandyClient();
    await client.ping("ping");
});
beforeEach(async () => {
    await client.flushall();
});

it("scripts/redis-doc/commands/sunion.md example 1", async () => {
    const overrider = getOverride("scripts/redis-doc/commands/sunion.md");
    let snapshot: any;
    const commands = [
        `await client.sadd("key1", "a")`,
        `await client.sadd("key1", "b")`,
        `await client.sadd("key1", "c")`,
        `await client.sadd("key2", "c")`,
        `await client.sadd("key2", "d")`,
        `await client.sadd("key2", "e")`,
        `await client.sunion("key1", "key2")`,
    ];
    const output: any[] = [];
    try {
        output.push(await client.sadd("key1", "a"));
        output.push(await client.sadd("key1", "b"));
        output.push(await client.sadd("key1", "c"));
        output.push(await client.sadd("key2", "c"));
        output.push(await client.sadd("key2", "d"));
        output.push(await client.sadd("key2", "e"));
        output.push(await client.sunion("key1", "key2"));
        const overridenOutput = overrider(output);
        snapshot = zip(commands, overridenOutput)
            .map(pair => `${padEnd(pair[0], 36)} => ${JSON.stringify(pair[1])}`)
            .map(expression => expression.replace(/['"]/g, q => q === `'` ? `"` : `'`));
    } catch (err) {
        snapshot = { _commands: commands, _output: output, err };
    }
    expect(snapshot).toMatchSnapshot();
});
