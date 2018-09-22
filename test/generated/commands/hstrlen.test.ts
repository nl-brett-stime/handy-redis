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

test("scripts/redis-doc/commands/hstrlen.md example 1", async t => {
    const overrider = getOverride("scripts/redis-doc/commands/hstrlen.md");
    let snapshot: any;
    const commands = [
        `await handy.hmset("myhash", ["f1", "HelloWorld"], ["f2", "99"], ["f3", "-256"])`,
        `await handy.hstrlen("myhash", "f1")`,
        `await handy.hstrlen("myhash", "f2")`,
        `await handy.hstrlen("myhash", "f3")`,
    ];
    const output: any[] = [];
    try {
        output.push(await handy.hmset("myhash", ["f1", "HelloWorld"], ["f2", "99"], ["f3", "-256"]));
        output.push(await handy.hstrlen("myhash", "f1"));
        output.push(await handy.hstrlen("myhash", "f2"));
        output.push(await handy.hstrlen("myhash", "f3"));
        const overridenOutput = overrider(output);
        snapshot = zip(commands, overridenOutput).map(pair => `${padEnd(pair[0], 80)} => ${JSON.stringify(pair[1])}`);
    } catch (err) {
        snapshot = { _commands: commands, _output: output, err };
    }
    t.snapshot(snapshot);
});