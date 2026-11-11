import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { evaluateModSource, parseModManifest } from '#lib/plugins/mods/mods.logic.js';
import type {
	ModActionV1,
	ModContextV1,
	ModRailButtonV1,
	ModRunV1,
} from '#lib/plugins/mods/contract/mod-api.v1.js';

/**
 * Loads `help/examples/mods/hello/` through the real loader so the example in
 * `help/documentation/28-mods.md` cannot drift from the v1 contract. `ctx` is
 * an in-memory recorder: the host's own behavior is covered by
 * `src/tests/lib/plugins/mods/mods-host.service.test.ts`.
 */

const HELLO = join(process.cwd(), 'help/examples/mods/hello');

/** What the fake `ctx` and `run` saw */
interface Recorded {
	actions: ModActionV1[];
	buttons: ModRailButtonV1[];
	toasts: string[];
	files: Map<string, string>;
	opened: string[];
	progress: string[];
	lines: string[];
}

/** Stands in for the `ctx` members the hello example does not use */
function unused(): never {
	throw new Error('the hello example does not use this');
}

function fakeContext(): { ctx: ModContextV1; seen: Recorded } {
	const seen: Recorded = { actions: [], buttons: [], toasts: [], files: new Map(), opened: [], progress: [], lines: [] };
	const ctx: ModContextV1 = {
		apiVersion: 1,
		mod: { id: 'hello', name: 'Hello', version: '1.0.0', dir: '_system/mods/hello' },
		signal: new AbortController().signal,
		register: () => {},
		watch: unused,
		onNoteSaved: unused,
		notify: (message) => {
			seen.toasts.push(message);
		},
		log: () => {},
		addAction: (action) => {
			seen.actions.push(action);
			return () => {};
		},
		addRailButton: (button) => {
			seen.buttons.push(button);
			return () => {};
		},
		vault: {
			rename: unused,
			move: unused,
			delete: unused,
			read: async (path) => seen.files.get(path) ?? '',
			exists: async (path) => seen.files.has(path),
			list: async () => [],
			create: async (path, content) => {
				if (seen.files.has(path)) throw new Error(`"${path}" already exists; use write`);
				seen.files.set(path, content);
				return path;
			},
			write: async (path, content) => {
				seen.files.set(path, content);
			},
			updateFrontmatter: unused,
		},
		query: { matches: unused, notes: unused },
		workspace: {
			openNote: async (path) => {
				seen.opened.push(path);
			},
		},
		ui: { alert: unused, confirm: unused, prompt: unused, pick: unused, loading: unused },
		loadData: unused,
		saveData: unused,
		theme: {
			get current(): never {
				return unused();
			},
			onChange: unused,
		},
	};
	return { ctx, seen };
}

function fakeRun(seen: Recorded, signal = new AbortController().signal): ModRunV1 {
	return {
		signal,
		log: (text) => {
			seen.lines.push(text);
		},
		progress: (done, total, label) => {
			seen.progress.push(`${done}/${total} ${label ?? ''}`.trim());
		},
		ui: { alert: unused, confirm: unused, prompt: unused, pick: unused, loading: unused },
	};
}

function loadHello(): ReturnType<typeof fakeContext> {
	const mod = evaluateModSource(readFileSync(join(HELLO, 'main.js'), 'utf8'), 'hello');
	const fake = fakeContext();
	mod.onload(fake.ctx);
	return fake;
}

function action(seen: Recorded, id: string): ModActionV1 {
	const found = seen.actions.find((a) => a.id === id);
	if (!found) throw new Error(`no action ${id}`);
	return found;
}

describe('help/examples/mods/hello', () => {
	it('has a manifest the loader accepts for its folder', () => {
		const result = parseModManifest(readFileSync(join(HELLO, 'manifest.json'), 'utf8'), 'hello');
		expect(result).toEqual({
			ok: true,
			manifest: expect.objectContaining({ id: 'hello', name: 'Hello', version: '1.0.0' }),
		});
	});

	it('registers its actions and one rail button that lists them', () => {
		const { seen } = loadHello();
		expect(seen.actions.map((a) => a.id)).toEqual(['say-hello', 'new-note']);
		expect(seen.buttons).toEqual([
			{ id: 'main', title: 'Hello', icon: 'lucide:sparkles', actions: ['say-hello', 'new-note'] },
		]);
		expect(action(seen, 'new-note').input).toEqual({ placeholder: 'Note title' });
	});

	it('say-hello shows a toast', async () => {
		const { seen } = loadHello();
		await action(seen, 'say-hello').run('', fakeRun(seen));
		expect(seen.toasts).toEqual(['Hello from a mod']);
	});

	it('new-note creates the note and opens it, with no run output so the run view closes', async () => {
		const { seen } = loadHello();
		await action(seen, 'new-note').run('  Trip / plan  ', fakeRun(seen));
		expect([...seen.files.keys()]).toEqual(['Hello mod/Trip plan.md']);
		expect(seen.files.get('Hello mod/Trip plan.md')).toBe('# Trip / plan\n\nCreated by the hello mod.\n');
		expect(seen.opened).toEqual(['Hello mod/Trip plan.md']);
		// Output would keep the run view open on Done, on top of the note just opened.
		expect(seen.progress).toEqual([]);
		expect(seen.lines).toEqual([]);
	});

	it('new-note names the file so the note stays linkable and visible', async () => {
		const { seen } = loadHello();
		// "#" would end a [[link]] to the note early; a leading dot hides it from the explorer and the index.
		await action(seen, 'new-note').run('.Plan #2: [draft]', fakeRun(seen));
		expect([...seen.files.keys()]).toEqual(['Hello mod/Plan 2 draft.md']);
	});

	it('new-note rejects an empty title, or one with nothing left for a file name, and writes nothing', async () => {
		const { seen } = loadHello();
		await expect(action(seen, 'new-note').run('   ', fakeRun(seen))).rejects.toThrow('Type a title');
		await expect(action(seen, 'new-note').run('../#', fakeRun(seen))).rejects.toThrow('Type a title');
		expect(seen.files.size).toBe(0);
	});

	it('new-note writes and opens nothing once its run is stopped', async () => {
		const { seen } = loadHello();
		const controller = new AbortController();
		controller.abort();
		await action(seen, 'new-note').run('Idea', fakeRun(seen, controller.signal));
		expect(seen.files.size).toBe(0);
		expect(seen.opened).toEqual([]);
	});
});
