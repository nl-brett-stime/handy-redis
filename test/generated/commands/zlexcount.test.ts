import ava from "ava";
import { zip, padEnd } from "lodash";
import { IHandyRedis, createHandyClient } from "../../../src";
import { getOverride } from "../../_manual-overrides";
let handy: IHandyRedis;
ava.before(async t => {
    handy = createHandyClient();
    await handy.ping("ping");
});
ava.beforeEach(async t => {
    await handy.flushall();
});
const test = ava.serial;

test("scripts/redis-doc/commands/zlexcount.md example 1", async t => {
    const overrider = getOverride("scripts/redis-doc/commands/zlexcount.md");
    let snapshot: any;
    const commands = [
        `await handy.zadd("myzset", [0, "a"], [0, "b"], [0, "c"], [0, "d"], [0, "e"])`,
        `await handy.zadd("myzset", [0, "f"], [0, "g"])`,
        `await handy.zlexcount("myzset", "-", "+")`,
        `await handy.zlexcount("myzset", "[b", "[f")`,
    ];
    const output: any[] = [];
    try {
        output.push(await handy.zadd("myzset", [0, "a"], [0, "b"], [0, "c"], [0, "d"], [0, "e"]));
        output.push(await handy.zadd("myzset", [0, "f"], [0, "g"]));
        output.push(await handy.zlexcount("myzset", "-", "+"));
        output.push(await handy.zlexcount("myzset", "[b", "[f"));
        const overridenOutput = overrider(output);
        snapshot = zip(commands, overridenOutput).map(pair => `${padEnd(pair[0], 77)} => ${JSON.stringify(pair[1])}`);
    } catch (err) {
        snapshot = { _commands: commands, _output: output, err };
    }
    t.snapshot(snapshot);
});