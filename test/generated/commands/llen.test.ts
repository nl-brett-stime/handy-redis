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

test("scripts/redis-doc/commands/llen.md example 1", async t => {
    const overrider = getOverride("scripts/redis-doc/commands/llen.md");
    let snapshot: any;
    const commands = [
        `await handy.lpush("mylist", "World")`,
        `await handy.lpush("mylist", "Hello")`,
        `await handy.llen("mylist")`,
    ];
    const output: any[] = [];
    try {
        output.push(await handy.lpush("mylist", "World"));
        output.push(await handy.lpush("mylist", "Hello"));
        output.push(await handy.llen("mylist"));
        const overridenOutput = overrider(output);
        snapshot = zip(commands, overridenOutput).map(pair => `${padEnd(pair[0], 37)} => ${JSON.stringify(pair[1])}`);
    } catch (err) {
        snapshot = { _commands: commands, _output: output, err };
    }
    t.snapshot(snapshot);
});