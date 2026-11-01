import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { EVENT_NAMES } from '#lib/contracts/events.js';

/**
 * Parity between the Rust event-name registry (`src-tauri/src/events.rs`)
 * and `EVENT_NAMES` in `src/lib/contracts/events.ts`. Every emit names its
 * event through a const declared in `events.rs`, so any other expression at
 * an emit site (a literal, or a const declared elsewhere) is a registry bypass.
 */

const RUST_SRC = join(process.cwd(), 'src-tauri/src');
const REGISTRY_FILE = 'events.rs';

/**
 * Floor on the parsed const count, so a parser that silently stops matching
 * fails here instead of comparing two empty sets. Lower it when an event is
 * removed.
 */
const MIN_EVENTS = 7;

interface RustSource {
	file: string;
	src: string;
}

/** Every `.rs` file under `src-tauri/src`, with its source. */
function rustSources(): RustSource[] {
	return readdirSync(RUST_SRC, { recursive: true, encoding: 'utf8' })
		.filter((f) => f.endsWith('.rs'))
		.map((f) => ({ file: f, src: readFileSync(join(RUST_SRC, f), 'utf8') }));
}

/** A `&str` const in `events.rs`, any visibility, capturing name and value. */
const REGISTRY_CONST = /^\s*(?:pub(?:\([^)]*\))?\s+)?const\s+(\w+)\s*:\s*&(?:'static\s+)?str\s*=\s*"([^"]+)"/gm;

/**
 * The opening of a Tauri `Emitter` call, as a method (`app.emit(`) or in UFCS
 * form (`Emitter::emit(&app, `), optionally with a turbofish. Group 1 is the
 * UFCS prefix when present, group 2 the method: the event is the first
 * argument of `emit` / `emit_str` / `emit_filter` / `emit_str_filter` and the
 * second of `emit_to` / `emit_str_to` (after the target), each shifted by one
 * in UFCS form (after the emitter).
 */
const EMIT_CALL = /(?:\.|\b(Emitter::))(emit(?:_str)?_to|emit(?:_str)?(?:_filter)?)(?:::<[^>]*>)?\(/g;

/**
 * An event argument that names a const: an identifier, optionally
 * path-qualified (`events::X`, `crate::events::X`). Group 1 is the last segment.
 */
const CONST_PATH = /^(?:\w+::)*([A-Za-z_]\w*)$/;

/**
 * Any binding that could stand in for a registry const at an emit site: a
 * `const`, `static` or `let` declaration, or a `use ... as NAME` rename.
 * Captures the name.
 */
const BINDING_DECL = /\b(?:(?:const|static(?:\s+mut)?|let(?:\s+mut)?)\s+|as\s+)(\w+)/g;

/** A `const` declaration at the start of a line (not the word in a doc comment). */
const CONST_LINE = /^\s*(?:pub(?:\([^)]*\))?\s+)?const\s/gm;

/** The consts declared in `events.rs`, as name -> event value. */
function parseRegistry(src: string): Map<string, string> {
	return new Map([...src.matchAll(REGISTRY_CONST)].map((m) => [m[1], m[2]]));
}

/** 1-based line of `index` in `src`. */
function lineOf(src: string, index: number): number {
	return src.slice(0, index).split('\n').length;
}

/**
 * The event argument of the Emitter call whose `(` ends at `start`, trimmed.
 * `ufcs` skips the leading emitter argument of `Emitter::method(&app, ...)`.
 * Splits on the first commas, so an argument holding a comma (a target label
 * such as `"a,b"`) yields text that is not a const path and fails closed.
 */
function eventArgument(src: string, start: number, method: string, ufcs: boolean): string {
	let rest = src.slice(start);
	if (ufcs) rest = rest.slice(rest.indexOf(',') + 1);
	if (method.endsWith('_to')) rest = rest.slice(rest.indexOf(',') + 1);
	const end = rest.search(/[,)]/);
	return (end === -1 ? rest : rest.slice(0, end)).trim();
}

/**
 * Returns `file:line` for every Emitter call whose event argument is not a
 * const named in `registry`, and for every binding outside `events.rs` that
 * reuses a registry name (a shadow that would pass the name check with
 * another value).
 */
function emitOffenders(sources: RustSource[], registry: Set<string>): string[] {
	return sources.flatMap(({ file, src }) => {
		const calls = [...src.matchAll(EMIT_CALL)]
			.filter((m) => {
				const arg = eventArgument(src, m.index + m[0].length, m[2], m[1] !== undefined);
				const name = CONST_PATH.exec(arg)?.[1];
				return name === undefined || !registry.has(name);
			})
			.map((m) => m.index);
		const shadows =
			file === REGISTRY_FILE
				? []
				: [...src.matchAll(BINDING_DECL)].filter((m) => registry.has(m[1])).map((m) => m.index);
		return [...calls, ...shadows].sort((a, b) => a - b).map((i) => `${file}:${lineOf(src, i)}`);
	});
}

describe('event-name registry parity', () => {
	const sources = rustSources();
	const registrySrc = sources.find((s) => s.file === REGISTRY_FILE)?.src ?? '';
	const registry = parseRegistry(registrySrc);

	it('declares the same event names in Rust and in EVENT_NAMES', () => {
		const values = [...registry.values()];
		expect(registry.size).toBeGreaterThanOrEqual(MIN_EVENTS);
		// Every const in events.rs is a `&str` event name the parser read.
		expect(registrySrc.match(CONST_LINE)?.length).toBe(registry.size);
		expect(new Set(values).size).toBe(values.length);
		expect(new Set(values)).toEqual(new Set(Object.values(EVENT_NAMES)));
	});

	it('names a registry const at every emit site', () => {
		expect(emitOffenders(sources, new Set(registry.keys()))).toEqual([]);
	});
});

describe('emitOffenders', () => {
	const registry = new Set(['VAULT_INDEX_UPDATED_EVENT', 'MENU_SETTINGS_EVENT']);
	const check = (src: string) => emitOffenders([{ file: 'commands/foo.rs', src }], registry);

	it('accepts a registry const, bare or path-qualified, on one line or several', () => {
		expect(check('app.emit(VAULT_INDEX_UPDATED_EVENT, &result);')).toEqual([]);
		expect(check('app.emit(crate::events::MENU_SETTINGS_EVENT, ());')).toEqual([]);
		expect(check('handle.emit(\n\tVAULT_INDEX_UPDATED_EVENT,\n\tPayload { a: 1 },\n);')).toEqual([]);
		expect(check('app.emit_to("main", MENU_SETTINGS_EVENT, ());')).toEqual([]);
		expect(check('app.emit_filter(MENU_SETTINGS_EVENT, (), |t| true);')).toEqual([]);
		expect(check('Emitter::emit(&app, VAULT_INDEX_UPDATED_EVENT, p);')).toEqual([]);
		expect(check('Emitter::emit_to(&app, "main", MENU_SETTINGS_EVENT, ());')).toEqual([]);
	});

	it('rejects a const declared outside events.rs, whatever its visibility or name', () => {
		expect(
			check('pub(crate) const FOO_EVENT: &str = "foo";\nfn f() {\n\tapp.emit(FOO_EVENT, p);\n}'),
		).toEqual(['commands/foo.rs:3']);
		expect(
			check('const SEMANTIC_INDEX_PROGRESS: &str = "x";\nfn f() {\n\tapp.emit(SEMANTIC_INDEX_PROGRESS, p);\n}'),
		).toEqual(['commands/foo.rs:3']);
	});

	it('rejects a local binding that shadows a registry name', () => {
		expect(check('const MENU_SETTINGS_EVENT: &str = "other";')).toEqual(['commands/foo.rs:1']);
		expect(check('static VAULT_INDEX_UPDATED_EVENT: &str = "x";')).toEqual(['commands/foo.rs:1']);
		expect(check('let VAULT_INDEX_UPDATED_EVENT = "x";')).toEqual(['commands/foo.rs:1']);
		expect(check('let mut VAULT_INDEX_UPDATED_EVENT = "x";')).toEqual(['commands/foo.rs:1']);
		expect(check('use foo::BAR as VAULT_INDEX_UPDATED_EVENT;')).toEqual(['commands/foo.rs:1']);
	});

	it('counts only const declarations in the registry, not the word in doc comments', () => {
		const src = '//! each const here names one event\n/// a const\npub const A_EVENT: &str = "a";\n';
		expect(src.match(CONST_LINE)?.length).toBe(1);
	});

	it('rejects literal event names in every emit shape', () => {
		expect(check('app.emit("vault-index-updated", p);')).toEqual(['commands/foo.rs:1']);
		expect(check('app.emit_str("x", s);')).toEqual(['commands/foo.rs:1']);
		expect(check('app.emit_str_filter("x", s, f);')).toEqual(['commands/foo.rs:1']);
		expect(check('app.emit(r"x", p);')).toEqual(['commands/foo.rs:1']);
		expect(check('app.emit::<()>("x", ());')).toEqual(['commands/foo.rs:1']);
		expect(check('app.emit(/* name */ "x", p);')).toEqual(['commands/foo.rs:1']);
		expect(check('app.emit_to("main", "x", p);')).toEqual(['commands/foo.rs:1']);
		expect(check('app.emit_str_to(EventTarget::any(), "x", s);')).toEqual(['commands/foo.rs:1']);
		expect(check('Emitter::emit(&app, "x", p);')).toEqual(['commands/foo.rs:1']);
		expect(check('Emitter::emit_to(&app, "main", "x", p);')).toEqual(['commands/foo.rs:1']);
	});
});
