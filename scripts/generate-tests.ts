import { BasicCommandInfo } from "./command";
import { EOL } from "os";
import { quote, simplifyName, tab, indent, buildScript } from "./util";
import * as _ from "lodash";
import { getExampleRuns } from "./cli-examples";
import { getBasicCommands } from "./command";
import { writeFileSync } from "fs";

const tokenizeCommand = (command: string) => {
    return (command
        .match(/("(?:[^"\\]|\\.)*")|([^ ]+)/g) || []) // magic regex that "preserves \"escaped\" strings"
        .map(token => {
            if (token.startsWith(`"`) && token.endsWith(`"`)) {
                return token.slice(1, -1).replace(/\\(.)/g, "$1");
            } else {
                return token;
            }
        });
};

const parseNumber = (token: string): number => {
    if (token === "+inf") {
        return Infinity;
    }
    if (token === "-inf") {
        return -Infinity;
    }
    if (/^[\[\(]\d+$/.test(token)) {
        return `${quote(token)} as any` as any;
    }
    const num = Number(token);
    if (isNaN(num)) {
        throw new TypeCheckError();
    }
    return num;
};

const checkType = (formattedArgs: string[], overloadInfo: BasicCommandInfo) => {
    const overloadArgs = [...overloadInfo.args];
    while (formattedArgs.length > overloadArgs.length && overloadArgs[overloadArgs.length - 1].name.startsWith("...")) {
        overloadArgs.push(overloadArgs[overloadArgs.length - 1]);
    }
    if (formattedArgs.length > overloadArgs.length) {
        return false;
    }
    for (let i = 0; i < formattedArgs.length; i++) {
        const formatted = formattedArgs[i];
        const targetArg = overloadArgs[i];

        if (!checkFormattedArgType(formatted, targetArg.type)) {
            return false;
        }
    }
    return true;
};

const arrayRegex = /^Array<(.+)>|(.+)\[\]$/;
const tupleRegex = /^\[.+]$/;

const checkFormattedArgType = (formatted: string, targetType: string): boolean => {
    if (formatted.endsWith(" as any")) {
        return true;
    }
    if (targetType === "string") {
        return /^[`"].*[`"]/.test(formatted);
    }
    if (targetType === "number") {
        try {
            parseNumber(formatted);
            return true;
        } catch (e) {
            if (e instanceof TypeCheckError) {
                return false;
            }
            throw e;
        }
    }
    const isEnum = /^".+"( | ".+")*$/.test(targetType);
    if (isEnum) {
        return targetType.split(" | ").indexOf(formatted) > -1;
    }
    if (tupleRegex.test(targetType)) {
        if (!tupleRegex.test(formatted)) {
            return false;
        }
        const members = formatted.slice(1, -1).split(", ");
        const targetMemberTypes = targetType.slice(1, -1).split(", ");
        if (members.length !== targetMemberTypes.length) {
            return false;
        }
        const pairs = members.map((m, i) => [m, targetMemberTypes[i]]);
        return _.every(pairs, p => checkFormattedArgType(p[0], p[1]));
    }
    const arrayMatch = targetType.match(arrayRegex);
    if (!arrayMatch) {
        return false;
    }
    return checkFormattedArgType(formatted, arrayMatch[1] || arrayMatch[2]);
};

const formatLiteralArgumentFromOverload = (overloadInfo: BasicCommandInfo, literalTokens: string[]) => {
    const formattedArgs = new Array<string>();
    let nextLiteralIndex = 0;
    for (const arg of overloadInfo.args) {
        if (nextLiteralIndex >= literalTokens.length) {
            break;
        }
        const { type } = arg;
        const arrayMatch = type.match(arrayRegex);
        const isTuple = tupleRegex.test(type);
        const isVariadic = arg.name.startsWith("...");

        /** Formats the next literal token into the target list, coercing it into the target type first */
        const nextFormattedToken = (targetType = type) => {
            const literal = literalTokens[nextLiteralIndex++];
            if (typeof literal === "undefined") {
                console.warn(`Ran out of literal tokens :(`);
            }
            return targetType === "number" ? parseNumber(literal).toString() : quote(literal);
        };

        const nextFormattedTuple = (tupleType: string) => {
            const typeParts = tupleType
                .slice(1, -1) // get rid of `[` and `]`
                .split(", ")
                .map(p => p.trim());
            // todo map
            const formattedTupleParts = new Array<string>();
            for (const targetType of typeParts) {
                const nextFormatted = nextFormattedToken(targetType);
                formattedTupleParts.push(nextFormatted);
            }
            return `[${formattedTupleParts.join(", ")}]`;
        };

        if (arrayMatch && isVariadic) {
            const itemType = arrayMatch[1] || arrayMatch[2];
            const getNext = tupleRegex.test(itemType)
                ? nextFormattedTuple
                : nextFormattedToken;
            while (nextLiteralIndex < literalTokens.length) {
                formattedArgs.push(getNext(itemType));
            }
        } else if (arrayMatch) {
            throw new Error(`This is a genuine error. This library doesn't support arbitrary arrays not at the end of the argument list`);
        } else if (isTuple) { // todo use ternary like above
            const nextArg = nextFormattedTuple(type);
            formattedArgs.push(nextArg);
        } else {
            // regular arg
            const nextArg = nextFormattedToken();
            formattedArgs.push(nextArg);
        }
    }
    // todo ensure all literalTokesns have been used up
    return formattedArgs;
};

class TypeCheckError extends Error {
}

export const generateTests = async () => {
    const typescriptCommands = getBasicCommands();
    const formatLiteralArguments = (commandName: string, literalTokens: string[]) => {
        const matchingCommands = typescriptCommands.filter(c => c.name === commandName);
        if (matchingCommands.length === 0) {
            return [quote(`Couldn't format arguments: Couldn't find command "${commandName}"`)];
        }
        const candidates = matchingCommands.map(overload => {
            try {
                const formattedArgs = formatLiteralArgumentFromOverload(overload, literalTokens);
                return checkType(formattedArgs, overload) ? formattedArgs : null;
            } catch (err) {
                if (err instanceof TypeCheckError) {
                    return null;
                }
                throw err;
            }
        });
        const match = candidates.find(c => !!c);
        if (!match) {
            return [quote(`Couldn't format arguments: No overload for "${commandName}" matches args ${literalTokens}`)];
        }
        return match;
    };

    const examples = await getExampleRuns();

    const tests = examples.map(ex => {
        const actual = ex.example.lines.map(line => {
            const tokens = tokenizeCommand(line);
            const command = simplifyName(tokens[0]);
            const argTokens = tokens.slice(1);

            const args = formatLiteralArguments(command, argTokens).join(", ");

            const prefix = args.includes("Couldn't format arguments: ")
                ? "// not implemented by node redis: "
                : "";

            return `${prefix}await handy.${command}(${args}),`;
        })
        .map(indent);

        const expected = ex.outputs
            .map(o => JSON.stringify(o.value))
            .map(v => `${v},`)
            .map(indent)
            ;

        const testName = `${ex.example.file} example ${ex.example.index + 1}`;

        const body = [
            `const actualOutput = [`,
            ...actual,
            `];`,
            `const expectedOutput = [`,
            ...expected,
            `];`,
            `t.deepEqual(actualOutput, expectedOutput);`,
        ]
        .map(line => `${tab}${line}`);

        return [
            `test(${quote(testName)}, async t => {`,
            ...body,
            `});`,
        ]
        .join(EOL);
    });

    return [
        `import ava from "ava";`,
        `import { IHandyRedis, createHandyClient } from "../src";`,
        `let handy: IHandyRedis;`,
        `ava.before(async t => {`,
        `    handy = createHandyClient();`,
        `    await handy.ping("ping");`,
        `});`,
        `ava.beforeEach(async t => {`,
        `    await handy.flushall();`,
        `});`,
        `const test = ava.serial;`,
        ``,
        ...tests,
        ``,
    ].join(EOL);
};

buildScript(module, async () => {
    const tests = await generateTests();
    writeFileSync(`test/generated-tests.ts`, tests, "utf8");
});