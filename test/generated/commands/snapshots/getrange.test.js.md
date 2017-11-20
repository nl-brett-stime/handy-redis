# Snapshot report for `test\generated\commands\getrange.test.js`

The actual snapshot is saved in `getrange.test.js.snap`.

Generated by [AVA](https://ava.li).

## scripts/redis-doc/commands/getrange.md example 1

> Snapshot 1

    [
      'await handy.set("mykey", "This is a string")  => "OK"',
      'await handy.getrange("mykey", 0, 3)           => "This"',
      'await handy.getrange("mykey", -3, -1)         => "ing"',
      'await handy.getrange("mykey", 0, -1)          => "This is a string"',
      'await handy.getrange("mykey", 10, 100)        => "string"',
    ]