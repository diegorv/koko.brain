import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { COMMAND_ARGS } from '#lib/contracts/commands.js';
import { parsePathArgs, parsePolicy } from './policy-table';

/**
 * Parity between the Rust commands registered in `generate_handler![...]`
 * and the TS contract in `src/lib/contracts/commands.ts`: arg names and
 * optionality against `COMMAND_ARGS`, arg and result types against the
 * `CommandMap` source.
 */

const ROOT = process.cwd();
const RUST_SRC = join(ROOT, 'src-tauri/src');
const COMMANDS_TS = join(ROOT, 'src/lib/contracts/commands.ts');
const GENERATED = join(ROOT, 'src/lib/contracts/generated');

/**
 * Floor on the parsed command count, so a parser that silently stops
 * matching fails here instead of comparing two empty sets. Lower it when a
 * command is removed from `generate_handler!`.
 */
const MIN_COMMANDS = 57;

/** Params Tauri injects itself; they never cross IPC. */
const INJECTED = new Set(['AppHandle', 'State', 'Webview']);

/** Rust primitives as they arrive in JS over serde_json. */
const PRIMITIVES: Record<string, string> = {
	String: 'string',
	bool: 'boolean',
	u8: 'number',
	i64: 'number',
	u32: 'number',
	u64: 'number',
	usize: 'number',
	f32: 'number',
	'()': 'null',
};

interface RustParam {
	name: string;
	optional: boolean;
	type: string;
}

interface RustCommand {
	name: string;
	params: RustParam[];
	result: string;
}

/** Splits on commas outside `<...>` / `(...)`. */
function splitTopLevel(text: string): string[] {
	const parts: string[] = [];
	let depth = 0;
	let current = '';
	for (const ch of text) {
		if (ch === '<' || ch === '(') depth++;
		if (ch === '>' || ch === ')') depth--;
		if (ch === ',' && depth === 0) {
			parts.push(current);
			current = '';
		} else {
			current += ch;
		}
	}
	parts.push(current);
	return parts.map((p) => p.trim()).filter(Boolean);
}

/** `Outer<inner>` -> `['Outer', 'inner']`; a bare type -> `[type, null]`. */
function unwrap(type: string): [string, string | null] {
	const m = type.match(/^([\w:]+)\s*<([\s\S]*)>$/);
	if (!m) return [type, null];
	return [m[1].replace(/^.*::/, ''), m[2].trim()];
}

function snakeToCamel(name: string): string {
	return name.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

/** The `path::to::name` entries of `generate_handler![...]`. */
function handlerEntries(): string[] {
	// Attributes go first: the lazy block match below ends at the first `]`,
	// which a `#[cfg(...)]` inside the list would supply.
	const lib = readFileSync(join(RUST_SRC, 'lib.rs'), 'utf8').replace(/#\[[^\]]*\]/g, '');
	const block = lib.match(/generate_handler!\[([\s\S]*?)\]/);
	if (!block) throw new Error('generate_handler![...] not found in src-tauri/src/lib.rs');
	return splitTopLevel(block[1]);
}

/** Parses the `#[tauri::command]` signature of one handler entry. */
function parseCommand(entry: string): RustCommand {
	const parts = entry.split('::');
	const name = parts.pop()!;
	const file = join(RUST_SRC, ...parts) + '.rs';
	const src = readFileSync(file, 'utf8');
	const re = new RegExp(
		String.raw`#\[tauri::command[^\]]*\]\s*pub\s+(?:async\s+)?fn\s+` +
			name +
			String.raw`\s*(?:<[^>]*>)?\s*\(([\s\S]*?)\)\s*(?:->\s*([^{]*?))?\s*(?:where[^{]*)?\{`,
	);
	const m = src.match(re);
	if (!m) throw new Error(`#[tauri::command] fn ${name} not found in ${file}`);

	const params: RustParam[] = [];
	for (const param of splitTopLevel(m[1])) {
		const colon = param.indexOf(':');
		const rawName = param.slice(0, colon).replace(/^mut\s+/, '').trim();
		const type = param.slice(colon + 1).trim();
		const [outer, inner] = unwrap(type);
		if (INJECTED.has(outer.replace(/^.*::/, ''))) continue;
		const optional = outer === 'Option';
		params.push({ name: snakeToCamel(rawName), optional, type: optional ? inner! : type });
	}

	const ret = (m[2] ?? '()').trim();
	const [outer, inner] = unwrap(ret);
	const result = outer === 'Result' ? splitTopLevel(inner!)[0] : ret;
	return { name, params, result };
}

function parseRustCommands(): RustCommand[] {
	return handlerEntries().map(parseCommand);
}

/** Every generated type name; these pass through the Rust-to-TS table unchanged. */
function generatedNames(): Set<string> {
	return new Set(
		readdirSync(GENERATED, { recursive: true, encoding: 'utf8' })
			.filter((f) => f.endsWith('.ts'))
			.map((f) => f.replace(/^.*\//, '').replace(/\.ts$/, '')),
	);
}

/** The TS type text a Rust type must be declared as in `CommandMap`. */
function rustToTs(type: string, generated: Set<string>): string {
	const [outer, inner] = unwrap(type.trim());
	if (inner !== null) {
		if (outer === 'Vec') return `${rustToTs(inner, generated)}[]`;
		if (outer === 'Option') return `${rustToTs(inner, generated)} | null`;
		throw new Error(`unmapped Rust generic type: ${type}`);
	}
	if (outer in PRIMITIVES) return PRIMITIVES[outer];
	if (generated.has(outer)) return outer;
	throw new Error(`unmapped Rust type: ${type}`);
}

interface TsEntry {
	args: { name: string; optional: boolean; type: string }[];
	result: string;
}

const normalize = (text: string) => text.replace(/\s+/g, '');

/** Reads every `CommandMap` member's args and result type text from source. */
function parseCommandMap(): Map<string, TsEntry> {
	const source = ts.createSourceFile(
		COMMANDS_TS,
		readFileSync(COMMANDS_TS, 'utf8'),
		ts.ScriptTarget.Latest,
		true,
	);
	const map = new Map<string, TsEntry>();
	const iface = source.statements.find(
		(s): s is ts.InterfaceDeclaration =>
			ts.isInterfaceDeclaration(s) && s.name.text === 'CommandMap',
	);
	if (!iface) throw new Error('interface CommandMap not found in commands.ts');
	for (const member of iface.members) {
		if (!ts.isPropertySignature(member) || !member.type || !ts.isTypeLiteralNode(member.type)) {
			throw new Error(`CommandMap member is not { args; result }: ${member.getText()}`);
		}
		const literal = member.type;
		const prop = (key: string) =>
			literal.members.find(
				(m): m is ts.PropertySignature => ts.isPropertySignature(m) && m.name.getText() === key,
			)?.type;
		const argsNode = prop('args');
		const resultNode = prop('result');
		const name = member.name.getText();
		if (!argsNode || !resultNode) throw new Error(`CommandMap.${name} lacks args or result`);
		if (!ts.isTypeLiteralNode(argsNode) && argsNode.getText() !== 'NoArgs') {
			throw new Error(`CommandMap.${name}.args must be a type literal or NoArgs`);
		}
		const args = ts.isTypeLiteralNode(argsNode)
			? argsNode.members.filter(ts.isPropertySignature).map((m) => ({
					name: m.name.getText(),
					optional: m.questionToken !== undefined,
					type: normalize(m.type!.getText()),
				}))
			: [];
		map.set(name, { args, result: normalize(resultNode.getText()) });
	}
	return map;
}

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);

describe('IPC parity: Rust commands vs contracts/commands.ts', () => {
	const rust = parseRustCommands();
	const generated = generatedNames();

	it(`parses every generate_handler! entry (at least ${MIN_COMMANDS})`, () => {
		expect(rust.length).toBeGreaterThanOrEqual(MIN_COMMANDS);
		expect(new Set(rust.map((c) => c.name)).size).toBe(rust.length);
	});

	it('COMMAND_ARGS keys equal the registered commands', () => {
		expect(Object.keys(COMMAND_ARGS).sort()).toEqual(rust.map((c) => c.name).sort());
	});

	it('remote POLICY classifies exactly the registered commands', () => {
		const policy = [...parsePolicy().keys()].filter((name) => !name.startsWith('plugin:'));
		expect(policy.sort()).toEqual(rust.map((c) => c.name).sort());
	});

	it('remote PATH_ARGS lists exactly the path args of the commands a browser may run', () => {
		const policy = parsePolicy();
		const manifest = COMMAND_ARGS as Record<string, readonly string[]>;
		const expected = Object.entries(manifest)
			.filter(([cmd]) => policy.get(cmd) !== 'Denied')
			.flatMap(([cmd, args]) =>
				args.map((a) => a.replace(/\?$/, '')).filter((a) => /path/i.test(a)).map((a) => `${cmd}.${a}`),
			);
		expect(expected.length).toBeGreaterThan(0);
		expect([...parsePathArgs()].sort()).toEqual(expected.sort());
	});

	it('COMMAND_ARGS arg names and optionality match the Rust params', () => {
		const manifest = COMMAND_ARGS as Record<string, readonly string[]>;
		const expected = Object.fromEntries(
			rust.map((c) => [c.name, c.params.map((p) => p.name + (p.optional ? '?' : '')).sort()]),
		);
		const actual = Object.fromEntries(
			rust.map((c) => [c.name, [...(manifest[c.name] ?? [])].sort()]),
		);
		expect(actual).toEqual(expected);
	});

	it('CommandMap arg and result types match the Rust signatures', () => {
		const map = parseCommandMap();
		expect([...map.keys()].sort()).toEqual(rust.map((c) => c.name).sort());
		const expected = Object.fromEntries(
			rust.map((c) => [
				c.name,
				{
					args: c.params
						.map((p) => ({
							name: p.name,
							optional: p.optional,
							type: normalize(rustToTs(p.type, generated)),
						}))
						.sort(byName),
					result: normalize(rustToTs(c.result, generated)),
				},
			]),
		);
		const actual = Object.fromEntries(
			rust.map((c) => {
				const entry = map.get(c.name);
				return [c.name, entry && { args: [...entry.args].sort(byName), result: entry.result }];
			}),
		);
		expect(actual).toEqual(expected);
	});
});
