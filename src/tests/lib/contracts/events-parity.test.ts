import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { EVENT_NAMES } from '#lib/contracts/events.js';

/**
 * Parity between the Rust event-name registry (`src-tauri/src/events.rs`)
 * and `EVENT_NAMES` in `src/lib/contracts/events.ts`. Every emit names its
 * event through a `*_EVENT` const, so a string literal at an emit site
 * is a registry bypass.
 */

const RUST_SRC = join(process.cwd(), 'src-tauri/src');

/**
 * Floor on the parsed const count, so a parser that silently stops matching
 * fails here instead of comparing two empty sets. Lower it when an event is
 * removed.
 */
const MIN_EVENTS = 7;

/**
 * A string literal in the event-name slot of a Tauri `Emitter` call. The
 * event is the first argument of `emit` / `emit_str` / `emit_filter` /
 * `emit_str_filter` and the second of `emit_to` / `emit_str_to` (after the
 * target, which may itself be a literal window label).
 */
const EMIT_LITERAL = /\.emit(?:_str)?(?:_filter)?\(\s*"|\.emit(?:_str)?_to\(\s*[^,]*,\s*"/g;

/** Every `.rs` file under `src-tauri/src`, with its source. */
function rustSources(): { file: string; src: string }[] {
	return readdirSync(RUST_SRC, { recursive: true, encoding: 'utf8' })
		.filter((f) => f.endsWith('.rs'))
		.map((f) => ({ file: f, src: readFileSync(join(RUST_SRC, f), 'utf8') }));
}

describe('event-name registry parity', () => {
	it('declares the same event names in Rust and in EVENT_NAMES', () => {
		const consts = rustSources().flatMap(({ file, src }) =>
			[...src.matchAll(/pub\s+const\s+\w+_EVENT\s*:\s*&str\s*=\s*"([^"]+)"/g)].map((m) => ({
				file,
				name: m[1],
			})),
		);
		const rust = consts.map((c) => c.name);
		expect(rust.length).toBeGreaterThanOrEqual(MIN_EVENTS);
		expect(consts.filter((c) => c.file !== 'events.rs')).toEqual([]);
		expect(new Set(rust).size).toBe(rust.length);
		expect(new Set(rust)).toEqual(new Set(Object.values(EVENT_NAMES)));
	});

	it('has no string-literal event name at an emit site', () => {
		const literals = rustSources().flatMap(({ file, src }) =>
			[...src.matchAll(EMIT_LITERAL)].map((m) => `${file}:${src.slice(0, m.index).split('\n').length}`),
		);
		expect(literals).toEqual([]);
	});
});
