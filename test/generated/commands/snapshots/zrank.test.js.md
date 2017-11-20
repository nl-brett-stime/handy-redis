# Snapshot report for `test\generated\commands\zrank.test.js`

The actual snapshot is saved in `zrank.test.js.snap`.

Generated by [AVA](https://ava.li).

## scripts/redis-doc/commands/zrank.md example 1

> Snapshot 1

    [
      'await handy.zadd("myzset", [1, "one"])    => 1',
      'await handy.zadd("myzset", [2, "two"])    => 1',
      'await handy.zadd("myzset", [3, "three"])  => 1',
      'await handy.zrank("myzset", "three")      => 2',
      'await handy.zrank("myzset", "four")       => null',
    ]