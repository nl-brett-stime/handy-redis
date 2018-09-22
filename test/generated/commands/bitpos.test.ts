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

test("scripts/redis-doc/commands/bitpos.md example 1", async t => {
    const overrider = getOverride("scripts/redis-doc/commands/bitpos.md");
    let snapshot: any;
    const commands = [
        `await handy.set("mykey", "xffxf0x00")`,
        `await handy.bitpos("mykey", 0)`,
        `await handy.set("mykey", "x00xffxf0")`,
        `await handy.bitpos("mykey", 1, 0)`,
        `await handy.bitpos("mykey", 1, 2)`,
        `await handy.set("mykey", "x00x00x00")`,
        `await handy.bitpos("mykey", 1)`,
    ];
    const output: any[] = [];
    try {
        output.push(await handy.set("mykey", "xffxf0x00"));
        output.push(await handy.bitpos("mykey", 0));
        output.push(await handy.set("mykey", "x00xffxf0"));
        output.push(await handy.bitpos("mykey", 1, 0));
        output.push(await handy.bitpos("mykey", 1, 2));
        output.push(await handy.set("mykey", "x00x00x00"));
        output.push(await handy.bitpos("mykey", 1));
        const overridenOutput = overrider(output);
        snapshot = zip(commands, overridenOutput).map(pair => `${padEnd(pair[0], 38)} => ${JSON.stringify(pair[1])}`);
    } catch (err) {
        snapshot = { _commands: commands, _output: output, err };
    }
    t.snapshot(snapshot);
});