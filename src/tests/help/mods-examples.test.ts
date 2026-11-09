// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { assertVaultPath, evaluateModSource, parseModManifest } from '#lib/plugins/mods/mods.logic.js';
import type { ModActionV1, ModContextV1, ModRailButtonV1, ModRunV1 } from '#lib/plugins/mods/contract/mod-api.v1.js';

/**
 * Loads every example under `help/examples/mods/` through the real loader
 * (`parseModManifest`, `evaluateModSource`) and drives its actions against a
 * fake `ctx`. The `ctx` is the boundary: it models the host's documented
 * behavior in memory (a vault of text files, open tabs, scripted dialogs, mod
 * data), so the tests assert on what a user would see: file contents, opened
 * notes, toasts and the DOM. The host itself is covered by
 * `src/tests/lib/plugins/mods/`. jsdom is for the status chip, which mounts
 * into the app's DOM.
 */

const EXAMPLES = join(process.cwd(), 'help/examples/mods');
const FOLDERS = readdirSync(EXAMPLES, { withFileTypes: true })
	.filter((entry) => entry.isDirectory())
	.map((entry) => entry.name)
	.sort();
/** Absolute vault root the fake app reports */
const VAULT = '/vault';
/** A scripted dialog answer that presses Stop while the dialog is open */
const STOP = Symbol('stop');

/** One scripted answer: a value, Stop, or a function run when the dialog opens (to change state meanwhile) */
type Answer = unknown;

/** An open editor tab, as `editorStore.tabs` holds it */
interface FakeTab {
	path: string;
	name: string;
	content: string;
	savedContent: string;
}

/** One frontmatter property, as `updateNoteFrontmatter` hands them to `mutate` */
interface Property {
	key: string;
	value: string | number | boolean | string[];
	type: string;
}

/** A recorded `ctx.watch` subscription */
interface Watch {
	read: () => unknown;
	onChange: (value: unknown) => void;
	value: unknown;
	live: boolean;
}

/** Theme state as `ctx.theme.current` reports it */
interface Theme {
	mode: 'light' | 'dark';
	colors: Record<string, string>;
}

/** Options of {@link fakeContext} */
interface FakeOptions {
	/** Vault-relative path to text */
	files?: Record<string, string>;
	/** What `loadData` resolves to first; `null` is no data.json */
	data?: unknown;
	/** Replaces members of the fake `ctx.app` */
	app?: Record<string, unknown>;
}

/** A folder holds files when some path lives under it */
function isFolder(files: Map<string, string>, path: string): boolean {
	return [...files.keys()].some((file) => file.startsWith(`${path}/`));
}

/** Local YYYY-MM-DD, the fake daily note's file name */
function localDate(d: Date): string {
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Flat `key: value` frontmatter only: enough for the examples, not a YAML parser */
function splitFrontmatter(text: string): { props: Property[]; body: string } {
	const match = text.match(/^---\n([\s\S]*?)\n---\n/);
	if (!match) return { props: [], body: text };
	const props = match[1].split('\n').map((line) => {
		const [key, raw] = [line.slice(0, line.indexOf(':')), line.slice(line.indexOf(':') + 1).trim()];
		return raw === 'true' || raw === 'false'
			? { key, value: raw === 'true', type: 'boolean' }
			: { key, value: raw, type: 'text' };
	});
	return { props, body: text.slice(match[0].length) };
}

function joinFrontmatter(props: Property[], body: string): string {
	if (props.length === 0) return body;
	return `---\n${props.map((p) => `${p.key}: ${String(p.value)}`).join('\n')}\n---\n${body}`;
}

/**
 * An in-memory `ctx` with the host's messages for the members the examples
 * use, plus handles for the test: `files`, `toasts`, `opened`, `tabs`,
 * `fireWatches()`, `setTheme()`, `unload()`.
 */
function fakeContext(id: string, options: FakeOptions = {}) {
	const files = new Map(Object.entries(options.files ?? {}));
	const toasts: { message: string; kind: string }[] = [];
	const opened: string[] = [];
	const actions: ModActionV1[] = [];
	const buttons: ModRailButtonV1[] = [];
	const placements: { actionId: string; options: unknown }[] = [];
	const disposers: (() => void)[] = [];
	const watches: Watch[] = [];
	const themeListeners = new Set<(theme: Theme) => void>();
	const saved: unknown[] = [];
	const loadErrors: unknown[] = [];
	const controller = new AbortController();
	let data: unknown = options.data === undefined ? null : JSON.parse(JSON.stringify(options.data));
	let theme: Theme = { mode: 'dark', colors: { primary: '#112233', foreground: '#eeeeee' } };

	const tabs: FakeTab[] = [];
	let activeIndex = -1;
	/** What CodeMirror shows; equals the active tab unless a test says otherwise */
	let viewDoc = '';
	const view = {
		dom: { isConnected: true },
		state: { doc: { toString: () => viewDoc } },
		dispatch: (spec: { changes: { from: number; to?: number; insert?: string } }) => {
			const { from, to = from, insert = '' } = spec.changes;
			viewDoc = viewDoc.slice(0, from) + insert + viewDoc.slice(to);
			// Like typing: the tab becomes dirty and autosave writes it later.
			if (activeIndex >= 0) tabs[activeIndex].content = viewDoc;
		},
	};
	const openTab = (path: string, opts: { active?: boolean; unsaved?: string; viewText?: string } = {}) => {
		const text = files.get(path) ?? '';
		const tab = { path: `${VAULT}/${path}`, name: path.split('/').pop()!, content: opts.unsaved ?? text, savedContent: text };
		tabs.push(tab);
		if (opts.active !== false) {
			activeIndex = tabs.length - 1;
			viewDoc = opts.viewText ?? tab.content;
		}
		return tab;
	};
	const editorStore = {
		get tabs() {
			return tabs;
		},
		get activeTab() {
			return activeIndex >= 0 ? tabs[activeIndex] : null;
		},
		get activeTabPath() {
			return activeIndex >= 0 ? tabs[activeIndex].path : null;
		},
		get editorView() {
			return activeIndex >= 0 ? view : null;
		},
	};
	const dirtyTab = (path: string) => {
		const tab = tabs.find((t) => t.path === `${VAULT}/${path}`);
		return tab && tab.content !== tab.savedContent ? tab : null;
	};
	const syncTab = (path: string, text: string) => {
		const index = tabs.findIndex((t) => t.path === `${VAULT}/${path}`);
		if (index < 0) return;
		tabs[index].content = tabs[index].savedContent = text;
		if (index === activeIndex) viewDoc = text;
	};
	const relative = (absolute: string) => absolute.slice(VAULT.length + 1);
	const remember = (dispose: () => void) => {
		disposers.push(dispose);
		return dispose;
	};
	const invalid = (message: string) => new Error(`Mod "${id}": ${message}`);

	const vault = {
		read: async (path: string) => {
			assertVaultPath(path);
			const text = files.get(path);
			// Tauri rejects with a bare string, not an Error.
			if (text === undefined) throw `failed to open file at path: ${VAULT}/${path}`;
			return text;
		},
		exists: async (path: string) => {
			assertVaultPath(path);
			return files.has(path) || isFolder(files, path);
		},
		list: async (folder: string) => {
			if (folder !== '') assertVaultPath(folder);
			if (folder !== '' && !isFolder(files, folder)) throw `failed to read directory at path: ${VAULT}/${folder}`;
			const prefix = folder === '' ? '' : `${folder}/`;
			const children = new Map<string, boolean>();
			for (const file of files.keys()) {
				if (!file.startsWith(prefix)) continue;
				const [name, ...rest] = file.slice(prefix.length).split('/');
				children.set(name, (children.get(name) ?? false) || rest.length > 0);
			}
			return [...children].map(([name, folderEntry]) => ({ name, path: `${prefix}${name}`, isFolder: folderEntry }));
		},
		create: async (path: string, content: string) => {
			assertVaultPath(path);
			if (files.has(path) || isFolder(files, path)) throw new Error(`"${path}" already exists; use write`);
			files.set(path, content);
			return path;
		},
		write: async (path: string, content: string) => {
			assertVaultPath(path);
			if (!files.has(path)) throw new Error(`"${path}" does not exist; use create`);
			if (dirtyTab(path)) throw new Error(`"${path}" has unsaved changes in an open tab`);
			files.set(path, content);
			syncTab(path, content);
		},
		rename: async (path: string, newName: string) => {
			assertVaultPath(path);
			const target = [...path.split('/').slice(0, -1), newName].join('/');
			if (files.has(target)) throw new Error(`"${newName}" already exists in this folder`);
			const text = files.get(path);
			if (text === undefined) throw `failed to rename: ${VAULT}/${path}`;
			files.delete(path);
			files.set(target, text);
			const tab = tabs.find((t) => t.path === `${VAULT}/${path}`);
			if (tab) tab.path = `${VAULT}/${target}`;
			return target;
		},
		move: async () => {
			throw new Error('no example moves files');
		},
		delete: async () => {
			throw new Error('no example deletes files');
		},
	};

	const app: Record<string, unknown> = {
		editorStore,
		vaultStore: { path: VAULT },
		dailyNotePath: (date = new Date()) => `${VAULT}/Daily/${localDate(date)}.md`,
		openOrCreateDailyNote: async () => {
			const path = `Daily/${localDate(new Date())}.md`;
			if (!files.has(path)) files.set(path, '# Daily\n');
			opened.push(path);
			openTab(path);
		},
		updateNoteFrontmatter: async (absolute: string, mutate: (props: Property[]) => Property[]) => {
			const path = relative(absolute);
			const base = files.get(path);
			if (base === undefined) throw `failed to open file at path: ${absolute}`;
			const { props, body } = splitFrontmatter(base);
			// The host can run mutate twice; a mod that latches state in it shows up here.
			mutate(props.map((p) => ({ ...p })));
			const next = joinFrontmatter(mutate(props.map((p) => ({ ...p }))), body);
			if (next === base) return base;
			files.set(path, next);
			syncTab(path, next);
			return next;
		},
		// Like the host: the tab is found by exact path, and `markSaved` makes content and savedContent equal.
		syncExternalContentToEditor: (absolute: string, content: string, markSaved: boolean) => {
			const index = tabs.findIndex((t) => t.path === absolute);
			if (index < 0) return;
			tabs[index].content = content;
			if (markSaved) tabs[index].savedContent = content;
			if (index === activeIndex) viewDoc = content;
		},
		...options.app,
	};

	const ctx = {
		apiVersion: 1,
		mod: { id, name: id, version: '1.0.0', dir: `_system/mods/${id}` },
		signal: controller.signal,
		register: (dispose: () => void) => {
			disposers.push(dispose);
		},
		notify: (message: string, opts?: { kind?: string }) => {
			toasts.push({ message, kind: opts?.kind ?? 'info' });
		},
		log: () => {},
		addAction: (action: ModActionV1) => {
			if (actions.some((a) => a.id === action.id)) throw invalid(`duplicate action id "${action.id}"`);
			actions.push(action);
			return remember(() => {});
		},
		addRailButton: (button: ModRailButtonV1) => {
			if (buttons.some((b) => b.id === button.id)) throw invalid(`duplicate rail button id "${button.id}"`);
			buttons.push(button);
			return remember(() => {});
		},
		watch: (read: () => unknown, onChange: (value: unknown) => void) => {
			const watch = { read, onChange, value: read(), live: true };
			watches.push(watch);
			return remember(() => {
				watch.live = false;
			});
		},
		onNoteSaved: () => {
			throw new Error('no example listens to saves');
		},
		vault,
		workspace: {
			openNote: async (path: string) => {
				assertVaultPath(path);
				if (!files.has(path) && !isFolder(files, path)) throw new Error(`"${path}" does not exist`);
				opened.push(path);
			},
		},
		ui: {
			alert: async () => {
				throw new Error('examples ask through run.ui');
			},
			confirm: async () => {
				throw new Error('examples ask through run.ui');
			},
			prompt: async () => {
				throw new Error('examples ask through run.ui');
			},
			pick: async () => {
				throw new Error('examples ask through run.ui');
			},
			loading: async () => {
				throw new Error('examples ask through run.ui');
			},
		},
		theme: {
			get current() {
				return theme;
			},
			onChange: (callback: (theme: Theme) => void) => {
				themeListeners.add(callback);
				return remember(() => {
					themeListeners.delete(callback);
				});
			},
		},
		loadData: async () => {
			if (loadErrors.length > 0) throw loadErrors.shift();
			return data === null ? null : JSON.parse(JSON.stringify(data));
		},
		saveData: async (value: unknown) => {
			data = JSON.parse(JSON.stringify(value));
			saved.push(data);
		},
		labs: {
			place: (actionId: string, opts: { palette?: unknown; menu?: { on?: unknown } }) => {
				if (!actions.some((a) => a.id === actionId)) throw invalid(`unknown action id "${actionId}"`);
				if (opts?.palette !== true && opts?.menu === undefined) throw invalid('labs.place needs palette: true or menu');
				const on = opts.menu?.on;
				if (opts.menu && !(Array.isArray(on) && on.every((o) => o === 'note' || o === 'folder'))) {
					throw invalid('labs.place needs menu.on to list note or folder');
				}
				placements.push({ actionId, options: opts });
				return remember(() => {});
			},
		},
		app,
		kb: async () => {
			throw new Error('no example reads the index');
		},
	};

	return {
		ctx,
		files,
		toasts,
		opened,
		actions,
		buttons,
		placements,
		saved,
		loadErrors,
		tabs,
		openTab,
		get data() {
			return data;
		},
		/** What CodeMirror shows */
		get viewDoc() {
			return viewDoc;
		},
		/** Re-reads every live watch and reports a change by Object.is, as the host's effect does */
		fireWatches: () => {
			for (const watch of watches) {
				if (!watch.live) continue;
				const next = watch.read();
				if (Object.is(next, watch.value)) continue;
				watch.value = next;
				watch.onChange(next);
			}
		},
		setTheme: (next: Theme) => {
			theme = next;
			for (const listener of themeListeners) listener(next);
		},
		activate: (index: number) => {
			activeIndex = index;
			viewDoc = tabs[index]?.content ?? '';
		},
		/** The host's unload: abort, then every cleanup in reverse */
		unload: () => {
			controller.abort();
			for (const dispose of disposers.splice(0).reverse()) dispose();
		},
	};
}

type Fake = ReturnType<typeof fakeContext>;

/**
 * A run whose dialogs answer from `answers` in order. `STOP` presses Stop
 * while that dialog is open: the dialog rejects with an AbortError, as the
 * host's `run.ui` does, and every later call rejects at once. `loading`
 * consumes one answer too: `'done'` lets the task finish, `'cancel'` presses
 * its Cancel first.
 */
function fakeRun(answers: Answer[] = [], target?: { on: 'note' | 'folder'; path: string }) {
	const controller = new AbortController();
	const queue = [...answers];
	const lines: string[] = [];
	const progress: string[] = [];
	const alerts: unknown[] = [];
	const stopped = () => new DOMException('The run was stopped', 'AbortError');
	const next = async (): Promise<unknown> => {
		if (controller.signal.aborted) throw stopped();
		if (queue.length === 0) throw new Error('a dialog asked more than the test answered');
		const answer = queue.shift();
		if (answer === STOP) {
			controller.abort();
			throw stopped();
		}
		return typeof answer === 'function' ? answer() : answer;
	};
	const run = {
		...(target ? { target } : {}),
		signal: controller.signal,
		log: (text: string) => {
			if (!controller.signal.aborted) lines.push(text);
		},
		progress: (done: number, total: number, label?: string) => {
			if (!Number.isFinite(done) || !Number.isFinite(total)) throw new Error('run.progress needs numbers done and total');
			if (!controller.signal.aborted) progress.push(`${done}/${total} ${label ?? ''}`.trim());
		},
		ui: {
			alert: async (opts: unknown) => {
				if (controller.signal.aborted) throw stopped();
				alerts.push(opts);
			},
			confirm: next,
			prompt: next,
			pick: async (opts: { items: { id: string }[] }) => {
				const id = await next();
				if (id === null) return null;
				const item = opts.items.find((i) => i.id === id);
				if (!item) throw new Error(`no pick item "${String(id)}"`);
				return item;
			},
			loading: async (_label: string, task: (signal: AbortSignal) => unknown) => {
				if (controller.signal.aborted) throw stopped();
				const local = new AbortController();
				controller.signal.addEventListener('abort', () => local.abort());
				const answer = queue.shift();
				if (answer === 'cancel') local.abort();
				if (answer === STOP) {
					controller.abort();
					// The host rejects at once; the task goes on with an aborted signal.
					void Promise.resolve(task(local.signal)).catch(() => {});
					throw stopped();
				}
				return task(local.signal);
			},
		},
	};
	return { run, lines, progress, alerts, stop: () => controller.abort() };
}

/** Evaluates an example's `main.js` with the real loader and runs its `onload` against a fresh fake */
function load(folder: string, options?: FakeOptions): Fake {
	const mod = evaluateModSource(readFileSync(join(EXAMPLES, folder, 'main.js'), 'utf8'), folder);
	const fake = fakeContext(folder, options);
	mod.onload(fake.ctx as unknown as ModContextV1);
	return fake;
}

/** Runs one action of a loaded example the way the host does: `run(input, run)` */
async function runAction(fake: Fake, id: string, input: string, run: ReturnType<typeof fakeRun>['run']): Promise<void> {
	const action = fake.actions.find((a) => a.id === id);
	if (!action) throw new Error(`no action ${id}`);
	await action.run(input, run as unknown as ModRunV1);
}

/** The value jsdom keeps after a color is set through `style` */
function cssColor(color: string): string {
	const probe = document.createElement('span');
	probe.style.background = color;
	return probe.style.background;
}

afterEach(() => {
	vi.useRealTimers();
	document.body.replaceChildren();
});

describe('help/examples/mods: every example', () => {
	it('finds the examples', () => {
		expect(FOLDERS).toEqual(expect.arrayContaining(['hello', 'daily-journal', 'note-tools', 'folder-report', 'dialogs-tour', 'click-counter', 'status-chip']));
	});

	describe.each(FOLDERS)('%s', (folder) => {
		it('has a manifest the loader accepts for its folder', () => {
			const result = parseModManifest(readFileSync(join(EXAMPLES, folder, 'manifest.json'), 'utf8'), folder);
			expect(result).toEqual({ ok: true, manifest: expect.objectContaining({ id: folder }) });
		});

		it('evaluates and loads without throwing', () => {
			const fake = load(folder);
			expect(fake.actions.length).toBeGreaterThan(0);
			fake.unload();
		});

		it('lists only registered actions on its rail buttons and places only registered actions', () => {
			const fake = load(folder);
			const ids = fake.actions.map((a) => a.id);
			expect(new Set(ids).size).toBe(ids.length);
			for (const button of fake.buttons) {
				for (const id of button.actions ?? []) expect(ids).toContain(id);
			}
			for (const placement of fake.placements) expect(ids).toContain(placement.actionId);
			fake.unload();
		});
	});
});

describe('help/examples/mods/daily-journal', () => {
	const TODAY = 'Daily/2026-11-08.md';
	const at = () => vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 10, 8, 9, 5) });

	it('is in the palette', () => {
		const fake = load('daily-journal');
		expect(fake.placements).toEqual([{ actionId: 'add-entry', options: { palette: true } }]);
	});

	it('appends a timestamped line on disk when the note is not open', async () => {
		at();
		const fake = load('daily-journal', { files: { [TODAY]: '# Today' } });
		const { run, lines } = fakeRun();
		await runAction(fake, 'add-entry', '  Walked the dog ', run);
		expect(fake.files.get(TODAY)).toBe('# Today\n- 09:05 Walked the dog\n');
		expect(lines).toEqual([`Added to ${TODAY} (on disk)`]);
	});

	it('goes through the editor when it shows the note, keeping unsaved edits', async () => {
		at();
		const fake = load('daily-journal', { files: { [TODAY]: '# Today\n' } });
		const tab = fake.openTab(TODAY, { unsaved: '# Today\nunsaved\n' });
		await runAction(fake, 'add-entry', 'Lunch', fakeRun().run);
		expect(tab.content).toBe('# Today\nunsaved\n- 09:05 Lunch\n');
		expect(fake.files.get(TODAY)).toBe('# Today\n');
	});

	it('writes on disk when the editor still shows another note', async () => {
		at();
		const fake = load('daily-journal', { files: { [TODAY]: '# Today\n' } });
		fake.openTab(TODAY, { viewText: 'the previous note' });
		await runAction(fake, 'add-entry', 'Lunch', fakeRun().run);
		expect(fake.files.get(TODAY)).toBe('# Today\n- 09:05 Lunch\n');
		expect(fake.viewDoc).toBe('# Today\n- 09:05 Lunch\n');
	});

	it('creates and opens a missing daily note after a confirm, then appends', async () => {
		at();
		const fake = load('daily-journal');
		const { run, lines } = fakeRun([true]);
		await runAction(fake, 'add-entry', 'Coffee', run);
		expect(fake.opened).toEqual([TODAY]);
		// The editor may still show the previous note right after the create.
		expect(lines).toEqual([`Added to ${TODAY} (on disk)`]);
		expect(fake.files.get(TODAY)).toBe('# Daily\n- 09:05 Coffee\n');
		expect(fake.tabs[0].content).toBe('# Daily\n- 09:05 Coffee\n');
	});

	it('creates nothing when the confirm is cancelled', async () => {
		at();
		const fake = load('daily-journal');
		await runAction(fake, 'add-entry', 'Coffee', fakeRun([false]).run);
		expect(fake.files.size).toBe(0);
		expect(fake.opened).toEqual([]);
	});

	it('writes nothing when stopped after reading the note', async () => {
		at();
		const fake = load('daily-journal', { files: { [TODAY]: '# Today\n' } });
		const { run, stop } = fakeRun();
		const read = fake.ctx.vault.read;
		fake.ctx.vault.read = async (path) => {
			const text = await read(path);
			stop();
			return text;
		};
		await runAction(fake, 'add-entry', 'Late', run);
		expect(fake.files.get(TODAY)).toBe('# Today\n');
	});

	it('writes nothing when stopped at the create confirm', async () => {
		at();
		const fake = load('daily-journal');
		await expect(runAction(fake, 'add-entry', 'Coffee', fakeRun([STOP]).run)).rejects.toThrow('The run was stopped');
		expect(fake.files.size).toBe(0);
	});

	it('refuses an empty entry and a note with unsaved edits in a background tab', async () => {
		at();
		const fake = load('daily-journal', { files: { [TODAY]: '# Today\n', 'Other.md': 'x' } });
		await expect(runAction(fake, 'add-entry', '  ', fakeRun().run)).rejects.toThrow('Type an entry');
		fake.openTab(TODAY, { unsaved: '# Today\ntyping' });
		fake.openTab('Other.md');
		await expect(runAction(fake, 'add-entry', 'Lunch', fakeRun().run)).rejects.toThrow(`"${TODAY}" has unsaved changes in an open tab`);
		expect(fake.files.get(TODAY)).toBe('# Today\n');
	});

	describe('when the daily note path contains "//" (daily-note folder set to "Daily/")', () => {
		const SLASHED = `${VAULT}/Daily//2026-11-08.md`;
		/** A background tab at the "//" spelling, with the editor showing another note */
		function withSlashedTab(unsaved?: string) {
			at();
			const fake = load('daily-journal', {
				files: { [TODAY]: '# Today\n', 'Other.md': 'x' },
				app: { dailyNotePath: () => SLASHED },
			});
			const tab = fake.openTab(TODAY, { unsaved });
			tab.path = SLASHED;
			fake.openTab('Other.md');
			return { fake, tab };
		}

		it('refuses a dirty tab at that path and writes nothing', async () => {
			const { fake, tab } = withSlashedTab('# Today\ntyping');
			await expect(runAction(fake, 'add-entry', 'Lunch', fakeRun().run)).rejects.toThrow(`"${TODAY}" has unsaved changes in an open tab`);
			expect(fake.files.get(TODAY)).toBe('# Today\n');
			expect(tab.content).toBe('# Today\ntyping');
		});

		it('updates a clean tab at that path with the written text', async () => {
			const { fake, tab } = withSlashedTab();
			await runAction(fake, 'add-entry', 'Lunch', fakeRun().run);
			expect(fake.files.get(TODAY)).toBe('# Today\n- 09:05 Lunch\n');
			expect(tab.content).toBe('# Today\n- 09:05 Lunch\n');
			expect(tab.savedContent).toBe('# Today\n- 09:05 Lunch\n');
		});

		it('goes through the editor when it shows the note at that path', async () => {
			at();
			const fake = load('daily-journal', { files: { [TODAY]: '# Today\n' }, app: { dailyNotePath: () => SLASHED } });
			const tab = fake.openTab(TODAY);
			tab.path = SLASHED;
			await runAction(fake, 'add-entry', 'Lunch', fakeRun().run);
			expect(tab.content).toBe('# Today\n- 09:05 Lunch\n');
			expect(fake.files.get(TODAY)).toBe('# Today\n');
		});
	});
});

describe('help/examples/mods/note-tools', () => {
	const NOTE = 'Notes/A.md';
	const TEXT = '---\ntitle: A\n---\nBody\n';

	it('places both actions in the palette and the note menu', () => {
		const fake = load('note-tools');
		expect(fake.placements.map((p) => p.actionId)).toEqual(['toggle-reviewed', 'rename']);
		for (const p of fake.placements) expect(p.options).toEqual({ palette: true, menu: { on: ['note'] } });
	});

	it('toggles the property on the clicked note, then off again', async () => {
		const fake = load('note-tools', { files: { [NOTE]: TEXT } });
		await runAction(fake, 'toggle-reviewed', '', fakeRun([], { on: 'note', path: NOTE }).run);
		expect(fake.files.get(NOTE)).toBe('---\ntitle: A\nreviewed: true\n---\nBody\n');
		await runAction(fake, 'toggle-reviewed', '', fakeRun([], { on: 'note', path: NOTE }).run);
		expect(fake.files.get(NOTE)).toBe(TEXT);
		expect(fake.toasts).toEqual([
			{ message: `${NOTE}: reviewed set`, kind: 'success' },
			{ message: `${NOTE}: reviewed removed`, kind: 'success' },
		]);
	});

	it('falls back to the active tab from the palette', async () => {
		const fake = load('note-tools', { files: { [NOTE]: 'Body\n' } });
		fake.openTab(NOTE);
		await runAction(fake, 'toggle-reviewed', '', fakeRun().run);
		expect(fake.files.get(NOTE)).toBe('---\nreviewed: true\n---\nBody\n');
	});

	it('refuses a folder, no open note, and a file that is not a note', async () => {
		const fake = load('note-tools', { files: { 'Board.canvas': '{}' } });
		await expect(runAction(fake, 'toggle-reviewed', '', fakeRun([], { on: 'folder', path: 'Notes' }).run)).rejects.toThrow('Pick a note, not a folder');
		await expect(runAction(fake, 'toggle-reviewed', '', fakeRun().run)).rejects.toThrow('Open a note first');
		fake.openTab('Board.canvas');
		await expect(runAction(fake, 'rename', '', fakeRun().run)).rejects.toThrow('Board.canvas is not a Markdown note');
		expect(fake.files.get('Board.canvas')).toBe('{}');
	});

	it('stays quiet on a failed save the editor already reported, and reports other refusals', async () => {
		const refuse = (reason: string) => async () => {
			throw Object.assign(new Error(`Frontmatter write ${reason}: ${VAULT}/${NOTE}`), { name: 'FrontmatterWriteError', reason });
		};
		const quiet = load('note-tools', { files: { [NOTE]: TEXT }, app: { updateNoteFrontmatter: refuse('save-failed') } });
		await runAction(quiet, 'toggle-reviewed', '', fakeRun([], { on: 'note', path: NOTE }).run);
		expect(quiet.toasts).toEqual([]);

		const loud = load('note-tools', { files: { [NOTE]: TEXT }, app: { updateNoteFrontmatter: refuse('nested') } });
		await expect(runAction(loud, 'toggle-reviewed', '', fakeRun([], { on: 'note', path: NOTE }).run)).rejects.toThrow(`Cannot update ${NOTE}: Frontmatter write nested`);
	});

	it('reports a bare-string rejection by its text', async () => {
		const fake = load('note-tools');
		await expect(runAction(fake, 'toggle-reviewed', '', fakeRun([], { on: 'note', path: 'Gone.md' }).run)).rejects.toThrow(
			`Cannot update Gone.md: failed to open file at path: ${VAULT}/Gone.md`,
		);
	});

	it('renames the note the run started on, even if the tab changes during the prompt', async () => {
		const fake = load('note-tools', { files: { [NOTE]: TEXT, 'Notes/B.md': 'b' } });
		fake.openTab(NOTE);
		fake.openTab('Notes/B.md', { active: false });
		await runAction(fake, 'rename', '', fakeRun([() => (fake.activate(1), '  Renamed  ')]).run);
		expect([...fake.files.keys()].sort()).toEqual(['Notes/B.md', 'Notes/Renamed.md']);
		expect(fake.files.get('Notes/Renamed.md')).toBe(TEXT);
		expect(fake.toasts).toEqual([{ message: 'Renamed to Notes/Renamed.md', kind: 'success' }]);
	});

	it('renames nothing on cancel, on the same name, or when stopped at the prompt', async () => {
		const fake = load('note-tools', { files: { [NOTE]: TEXT } });
		const target = { on: 'note' as const, path: NOTE };
		await runAction(fake, 'rename', '', fakeRun([null], target).run);
		await runAction(fake, 'rename', '', fakeRun(['A'], target).run);
		await expect(runAction(fake, 'rename', '', fakeRun([STOP], target).run)).rejects.toThrow('The run was stopped');
		expect([...fake.files.keys()]).toEqual([NOTE]);
		expect(fake.toasts).toEqual([]);
	});

	it('refuses a name with a slash and a name that is taken', async () => {
		const fake = load('note-tools', { files: { [NOTE]: TEXT, 'Notes/B.md': 'b' } });
		const target = { on: 'note' as const, path: NOTE };
		await expect(runAction(fake, 'rename', '', fakeRun(['a/b'], target).run)).rejects.toThrow('A name cannot hold');
		await expect(runAction(fake, 'rename', '', fakeRun(['B'], target).run)).rejects.toThrow('"B.md" already exists in this folder');
		expect([...fake.files.keys()].sort()).toEqual(['Notes/A.md', 'Notes/B.md']);
	});
});

describe('help/examples/mods/folder-report', () => {
	const FILES = { 'Projects/A.md': 'a', 'Projects/sub/B.md': 'b', 'Projects/img.png': 'png', 'Other/C.md': 'c' };
	const REPORT = 'Folder report/Projects.md';
	const target = { on: 'folder' as const, path: 'Projects' };

	it('is in the folder menu only', () => {
		const fake = load('folder-report');
		expect(fake.placements).toEqual([{ actionId: 'report', options: { menu: { on: ['folder'] } } }]);
		expect(fake.buttons).toEqual([]);
	});

	it('walks the folder, writes the report after a confirm and opens it', async () => {
		const fake = load('folder-report', { files: FILES });
		const { run, progress, lines } = fakeRun([true], target);
		await runAction(fake, 'report', '', run);
		const report = fake.files.get(REPORT)!;
		expect(report).toMatch(/^# Report: Projects\n\nYour notes here are kept/);
		expect(report).toContain(': 2 notes in 2 folders.\n\n- [[Projects/A]]\n- [[Projects/sub/B]]\n<!-- folder-report:generated:end -->\n');
		expect(report).not.toContain('img');
		expect(report).not.toContain('Other');
		expect(progress).toEqual(['1/2 Projects', '2/2 Projects/sub']);
		expect(lines).toEqual([`Wrote ${REPORT}`]);
		expect(fake.opened).toEqual([REPORT]);
	});

	it('regenerates only the block and keeps the user text around it', async () => {
		const before = '# Mine\n\nkeep above\n<!-- folder-report:generated:start v1 -->\nold\n<!-- folder-report:generated:end -->\nkeep below\n';
		const fake = load('folder-report', { files: { ...FILES, [REPORT]: before } });
		await runAction(fake, 'report', '', fakeRun([true], target).run);
		const after = fake.files.get(REPORT)!;
		expect(after.startsWith('# Mine\n\nkeep above\n<!-- folder-report:generated:start v1 -->\nGenerated ')).toBe(true);
		expect(after.endsWith('- [[Projects/sub/B]]\n<!-- folder-report:generated:end -->\nkeep below\n')).toBe(true);
		expect(after).not.toContain('\nold\n');
	});

	it('refuses to guess when the markers were edited', async () => {
		const edited = '# Mine\n<!-- folder-report:generated:start v1 -->\nold\n';
		const fake = load('folder-report', { files: { ...FILES, [REPORT]: edited } });
		await expect(runAction(fake, 'report', '', fakeRun([true], target).run)).rejects.toThrow('The report markers were edited or removed');
		expect(fake.files.get(REPORT)).toBe(edited);
		expect(fake.opened).toEqual([]);
	});

	it('writes nothing when the confirm is cancelled', async () => {
		const fake = load('folder-report', { files: FILES });
		await runAction(fake, 'report', '', fakeRun([false], target).run);
		expect(fake.files.has(REPORT)).toBe(false);
	});

	it('writes nothing and asks nothing when stopped during the walk', async () => {
		const fake = load('folder-report', { files: FILES });
		const { run, stop } = fakeRun([], target);
		const list = fake.ctx.vault.list;
		fake.ctx.vault.list = async (folder) => {
			const entries = await list(folder);
			stop();
			return entries;
		};
		await runAction(fake, 'report', '', run);
		expect(fake.files.has(REPORT)).toBe(false);
	});

	it('writes nothing when stopped at the confirm', async () => {
		const fake = load('folder-report', { files: FILES });
		await expect(runAction(fake, 'report', '', fakeRun([STOP], target).run)).rejects.toThrow('The run was stopped');
		expect(fake.files.has(REPORT)).toBe(false);
	});

	it('refuses no target, the vault root and its own folder, and reports a bare-string list failure', async () => {
		const fake = load('folder-report', { files: FILES });
		await expect(runAction(fake, 'report', '', fakeRun().run)).rejects.toThrow('Right-click a folder in Files');
		await expect(runAction(fake, 'report', '', fakeRun([], { on: 'folder', path: '' }).run)).rejects.toThrow('not the vault root');
		await expect(runAction(fake, 'report', '', fakeRun([], { on: 'folder', path: 'Folder report' }).run)).rejects.toThrow('holds the reports themselves');
		await expect(runAction(fake, 'report', '', fakeRun([], { on: 'folder', path: 'Missing' }).run)).rejects.toThrow(
			`Cannot list Missing: failed to read directory at path: ${VAULT}/Missing`,
		);
		expect([...fake.files.keys()].sort()).toEqual(Object.keys(FILES).sort());
	});
});

describe('help/examples/mods/dialogs-tour', () => {
	const NOTE = 'Dialogs tour/Lake day.md';
	const answers = (...overrides: Answer[]) => [...overrides, ...['Lake day', 'calm', 'Swam.\nRead.', true, 'done'].slice(overrides.length)];

	it('walks through every dialog, creates the note and opens it', async () => {
		const fake = load('dialogs-tour');
		const { run, alerts } = fakeRun(answers());
		await runAction(fake, 'tour', '', run);
		expect(fake.files.get(NOTE)).toBe('# Lake day\n\n#mood/calm\n\nSwam.\nRead.\n');
		expect(alerts).toEqual([{ title: 'Done', message: `Created ${NOTE}`, kind: 'success' }]);
		expect(fake.opened).toEqual([NOTE]);
	});

	it.each([
		['title', [null]],
		['mood', ['Lake day', null]],
		['text', ['Lake day', 'calm', null]],
		['confirm', ['Lake day', 'calm', 'x', false]],
		['loading', ['Lake day', 'calm', 'x', true, 'cancel']],
	])('writes nothing when cancelled at the %s step', async (step, script) => {
		const fake = load('dialogs-tour');
		await runAction(fake, 'tour', '', fakeRun(script).run);
		expect(fake.files.size).toBe(0);
		expect(fake.toasts).toEqual([{ message: `Cancelled at the ${step} step; nothing was written`, kind: 'info' }]);
	});

	it('writes nothing when stopped at the confirm', async () => {
		const fake = load('dialogs-tour');
		await expect(runAction(fake, 'tour', '', fakeRun(answers('Lake day', 'calm', 'x', STOP)).run)).rejects.toThrow('The run was stopped');
		expect(fake.files.size).toBe(0);
	});

	it('writes nothing when stopped under the loading dialog, though the task goes on', async () => {
		const fake = load('dialogs-tour');
		await expect(runAction(fake, 'tour', '', fakeRun(answers('Lake day', 'calm', 'x', true, STOP)).run)).rejects.toThrow('The run was stopped');
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(fake.files.size).toBe(0);
	});

	it('fails on a taken name and an empty title', async () => {
		const fake = load('dialogs-tour', { files: { [NOTE]: 'mine' } });
		await expect(runAction(fake, 'tour', '', fakeRun(answers()).run)).rejects.toThrow(`${NOTE} already exists`);
		await expect(runAction(fake, 'tour', '', fakeRun(['   ']).run)).rejects.toThrow('Type a title');
		expect(fake.files.get(NOTE)).toBe('mine');
		expect(fake.opened).toEqual([]);
	});
});

describe('help/examples/mods/click-counter', () => {
	it('counts from nothing and saves every click', async () => {
		const fake = load('click-counter');
		await runAction(fake, 'click', '', fakeRun().run);
		await runAction(fake, 'click', '', fakeRun().run);
		expect(fake.data).toEqual({ version: 1, count: 2, step: 1 });
		expect(fake.toasts.map((t) => t.message)).toEqual(['Count: 1', 'Count: 2']);
	});

	it('picks a step that later clicks use', async () => {
		const fake = load('click-counter', { data: { version: 1, count: 3, step: 1 } });
		await runAction(fake, 'settings', '', fakeRun(['5']).run);
		await runAction(fake, 'click', '', fakeRun().run);
		expect(fake.data).toEqual({ version: 1, count: 8, step: 5 });
	});

	it('saves nothing when the picker is cancelled, picks the current step, or is stopped', async () => {
		const fake = load('click-counter', { data: { version: 1, count: 3, step: 1 } });
		await runAction(fake, 'settings', '', fakeRun([null]).run);
		await runAction(fake, 'settings', '', fakeRun(['1']).run);
		await expect(runAction(fake, 'settings', '', fakeRun([STOP]).run)).rejects.toThrow('The run was stopped');
		expect(fake.saved).toEqual([]);
	});

	it('resets only after a confirm, and not once stopped', async () => {
		const fake = load('click-counter', { data: { version: 1, count: 3, step: 5 } });
		await runAction(fake, 'reset', '', fakeRun([false]).run);
		await expect(runAction(fake, 'reset', '', fakeRun([STOP]).run)).rejects.toThrow('The run was stopped');
		expect(fake.data).toEqual({ version: 1, count: 3, step: 5 });
		await runAction(fake, 'reset', '', fakeRun([true]).run);
		expect(fake.data).toEqual({ version: 1, count: 0, step: 5 });
	});

	it('saves nothing when stopped before the write', async () => {
		const fake = load('click-counter');
		const { run, stop } = fakeRun();
		const loadData = fake.ctx.loadData;
		fake.ctx.loadData = async () => {
			const value = await loadData();
			stop();
			return value;
		};
		await runAction(fake, 'click', '', run);
		expect(fake.saved).toEqual([]);
	});

	it('starts over after a corrupt data file, naming the kept copy', async () => {
		const fake = load('click-counter');
		const corruptPath = '.kokobrain/mods/click-counter/data.corrupt-1.json';
		fake.loadErrors.push(Object.assign(new Error('data.json is not valid JSON'), { name: 'ModDataCorruptError', corruptPath }));
		await runAction(fake, 'click', '', fakeRun().run);
		expect(fake.data).toEqual({ version: 1, count: 1, step: 1 });
		expect(fake.toasts[0]).toEqual({ message: expect.stringContaining(corruptPath), kind: 'warning' });
	});

	it('never overwrites data it cannot read or does not know', async () => {
		const unknown = load('click-counter', { data: { count: 'many' } });
		await expect(runAction(unknown, 'click', '', fakeRun().run)).rejects.toThrow('unknown shape');
		expect(unknown.data).toEqual({ count: 'many' });

		const failing = load('click-counter', { data: { version: 1, count: 3, step: 1 } });
		failing.loadErrors.push(new Error('read failed for data.json: permission denied'));
		await expect(runAction(failing, 'click', '', fakeRun().run)).rejects.toThrow('Cannot read the counter: read failed for data.json: permission denied');
		expect(failing.saved).toEqual([]);
	});
});

describe('help/examples/mods/status-chip', () => {
	/** The status bar's markup the chip depends on */
	function statusBar(): HTMLElement[] {
		const groups = [document.createElement('div'), document.createElement('div')];
		for (const group of groups) {
			group.className = 'status-bar-group';
			document.body.append(group);
		}
		groups[1].append(document.createElement('span'));
		return groups;
	}
	const chip = () => document.querySelector<HTMLButtonElement>('[data-mod-status-chip]');
	const start = (files: Record<string, string> = {}, app?: Record<string, unknown>) => {
		vi.useFakeTimers({ now: new Date(2026, 10, 8, 9, 5) });
		return load('status-chip', { files, app });
	};

	it('mounts first in the right group with the open note, the time and the theme', () => {
		const groups = statusBar();
		const fake = start({ 'Notes/A.md': 'a' });
		fake.openTab('Notes/A.md');
		fake.fireWatches();
		expect(groups[1].firstElementChild).toBe(chip());
		expect(groups[0].children).toHaveLength(0);
		expect(chip()!.textContent).toBe('A.md 09:05');
		expect(chip()!.title).toContain('dark theme');
		expect((chip()!.firstElementChild as HTMLElement).style.background).toBe(cssColor('#112233'));
		fake.unload();
	});

	it('follows the active tab and the theme', () => {
		statusBar();
		const fake = start({ 'A.md': 'a', 'B.md': 'b' });
		expect(chip()!.textContent).toBe('No note 09:05');
		fake.openTab('A.md');
		fake.fireWatches();
		expect(chip()!.textContent).toBe('A.md 09:05');
		fake.openTab('B.md');
		fake.fireWatches();
		expect(chip()!.textContent).toBe('B.md 09:05');
		fake.setTheme({ mode: 'light', colors: { primary: '#445566' } });
		expect(chip()!.title).toContain('light theme');
		expect((chip()!.firstElementChild as HTMLElement).style.background).toBe(cssColor('#445566'));
		fake.unload();
	});

	it('updates the clock on its timer and comes back when the app replaces the bar', () => {
		const groups = statusBar();
		const fake = start();
		groups.forEach((group) => group.remove());
		expect(chip()).toBeNull();
		const replaced = statusBar();
		vi.advanceTimersByTime(30_000);
		expect(replaced[1].firstElementChild).toBe(chip());
		expect(chip()!.textContent).toBe('No note 09:05');
		vi.advanceTimersByTime(30_000);
		expect(chip()!.textContent).toBe('No note 09:06');
		fake.unload();
	});

	it('loads without a status bar and attaches once one appears', () => {
		const fake = start();
		expect(chip()).toBeNull();
		statusBar();
		vi.advanceTimersByTime(30_000);
		expect(chip()).not.toBeNull();
		fake.unload();
	});

	it('hides and shows from its action, and a hidden chip stays out on the timer', async () => {
		statusBar();
		const fake = start();
		await runAction(fake, 'toggle', '', fakeRun().run);
		expect(chip()).toBeNull();
		vi.advanceTimersByTime(30_000);
		expect(chip()).toBeNull();
		await runAction(fake, 'toggle', '', fakeRun().run);
		expect(chip()).not.toBeNull();
		expect(fake.placements).toEqual([{ actionId: 'toggle', options: { palette: true } }]);
		fake.unload();
	});

	it("opens today's note on click and warns with a bare-string failure's text", async () => {
		statusBar();
		const fake = start();
		chip()!.click();
		await vi.advanceTimersByTimeAsync(0);
		expect(fake.opened).toEqual(['Daily/2026-11-08.md']);
		fake.unload();

		const failing = start({}, { openOrCreateDailyNote: () => Promise.reject('template not found') });
		chip()!.click();
		await vi.advanceTimersByTimeAsync(0);
		expect(failing.toasts).toEqual([{ message: "Cannot open today's note: template not found", kind: 'warning' }]);
		failing.unload();
	});

	it('removes the chip, the timer, the click listener and its subscriptions at unload', async () => {
		statusBar();
		const fake = start({ 'A.md': 'a' });
		const node = chip()!;
		fake.unload();
		expect(chip()).toBeNull();
		expect(vi.getTimerCount()).toBe(0);
		node.click();
		await vi.advanceTimersByTimeAsync(0);
		expect(fake.opened).toEqual([]);
		fake.openTab('A.md');
		fake.fireWatches();
		fake.setTheme({ mode: 'light', colors: { primary: '#445566' } });
		expect(node.textContent).toBe('No note 09:05');
		expect(node.title).toContain('dark theme');
	});
});
