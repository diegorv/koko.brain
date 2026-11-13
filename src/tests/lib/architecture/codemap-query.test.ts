import { beforeAll, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { main } from '../../../../scripts/codemap.mjs';
import { buildModel, readInputs } from '../../../../scripts/codemap/model.mjs';
import { HELP, runQuery } from '../../../../scripts/codemap/query.mjs';
import { renderMap } from '../../../../scripts/codemap/render.mjs';

import { GOLDEN } from './codemap-fixture.js';

/** The code map query CLI (`node scripts/codemap.mjs q …`, `scripts/codemap/query.mjs`). */

/**
 * The golden fixture plus a module-level call with a side-effect importer
 * (`via-file`), a second `label` (an ambiguous name) and `buildTagIndex` (a
 * did-you-mean target).
 */
const TREE: Record<string, string> = {
	...GOLDEN,
	'src/lib/app/init.ts': "import { boot } from './boot.js';\nboot();\n",
	'src/routes/+layout.ts': "import '#lib/app/init.js';\n",
	'src/lib/plugins/cal/format.ts': [
		'/** Formats a label. */',
		'export function label(t: string) {',
		'\treturn t;',
		'}',
		'/** Builds the tag index. */',
		'export function buildTagIndex() {}',
		'',
	].join('\n'),
};

/** Builds the model of an in-memory tree. */
const modelOf = (tree: Record<string, string>) => buildModel(new Map(Object.entries(tree)));

const MODEL = modelOf(TREE);

const TICK = 'src/lib/plugins/cal/tick.ts';
const CAL_TYPES = 'src/lib/plugins/cal/cal.types.ts';

/**
 * `TREE` plus an enclosing that is neither a symbol nor a local (`const t =
 * debounce(…)`), an object method, and an interface with two type-only
 * importers, one of them imported by a third file.
 */
const MORE = modelOf({
	...TREE,
	[TICK]: [
		"import { debounce } from '#lib/utils/debounce.js';",
		'function g() {}',
		'const t = debounce(() => g(), 300);',
		'/** Ticks later. */',
		'export function tick() {',
		'\tt();',
		'}',
		'/** Runs things. */',
		'export const api = {',
		'\trun() {},',
		'};',
		'',
	].join('\n'),
	[CAL_TYPES]: '/** One calendar day. */\nexport interface CalDay {\n\tn: number;\n}\n',
	'src/lib/plugins/cal/days.ts': "import type { CalDay } from './cal.types.js';\n/** All days. */\nexport function days(): CalDay[] {\n\treturn [];\n}\n",
	'src/lib/plugins/cal/view.ts': [
		"import { days } from './days.js';",
		"import type { CalDay } from './cal.types.js';",
		'/** The first day. */',
		'export function first(): CalDay | undefined {',
		'\treturn days()[0];',
		'}',
		'',
	].join('\n'),
	'src/lib/plugins/cal/panel.ts': "import { first } from './view.js';\n/** The top day. */\nexport const top = first();\n",
});

/** Runs one query on a model. */
function q(model: ReturnType<typeof buildModel>, ...argv: string[]) {
	return runQuery(argv, () => model);
}

/** Runs one query on the fixture and returns its stdout lines, expecting exit 0. */
function lines(...argv: string[]): string[] {
	const r = q(MODEL, ...argv);
	expect(r.code, r.stderr).toBe(0);
	return r.stdout.slice(0, -1).split('\n');
}

const SVC = 'src/lib/core/notes/notes.service.ts';
const STORE = 'src/lib/core/notes/notes.store.svelte.ts';
const HOOKS = 'src/lib/core/notes/hooks.ts';
const VIEW = 'src/lib/features/tags/TagsView.svelte';
const ROW = 'src/lib/features/tags/TagRow.svelte';
const TAGS = 'src/lib/features/tags/tags.service.ts';
const NOTES_RS = 'src-tauri/src/commands/notes.rs';
const EMPTY = 'none (no static reference found; see Blind spots in codemap/INDEX.md)';

describe('q commands (test 48)', () => {
	it('sym: exact name and --match', () => {
		expect(lines('sym', 'loadTags')).toEqual([
			'# sym loadTags total 1 (prod 1, tests 0)',
			`sym ${SVC}:18 fn loadTags() L4 | Loads tags from Rust into the store.`,
		]);
		expect(lines('sym', '--match', 'tag')).toEqual([
			'# sym --match tag total 9 (prod 9, tests 0)',
			`mem ${STORE}:6 get notesStore.tags r:${VIEW}:5,${VIEW}:14 w-via:addTag | All tags.`,
			`sym ${NOTES_RS}:9 struct TagAggregate L4 dto:TagAggregate | A tag with its note count.`,
			`sym ${ROW}:1 component TagRow props:tag L4`,
			`sym ${VIEW}:1 component TagsView L16`,
			`mem ${STORE}:13 do notesStore.addTag w:${SVC}:20 | Adds a tag.`,
			`sym ${SVC}:18 fn loadTags() L4 | Loads tags from Rust into the store.`,
			`sym ${NOTES_RS}:16 cmd get_tags() -> Vec<TagAggregate> L3 | Returns every tag.`,
			`sym ${TAGS}:7 fn registerTagsHook() L3 | Rebuilds tags after each save.`,
			'sym src/lib/plugins/cal/format.ts:6 fn buildTagIndex() L1 | Builds the tag index.',
		]);
		expect(lines('sym', '--match', '/^notify/')).toEqual([
			'# sym --match /^notify/ total 1 (prod 1, tests 0)',
			`sym ${HOOKS}:10 fn notifySaved(path: string) L3 | Runs every observer.`,
		]);
	});

	it('file: one --section', () => {
		expect(lines('file', VIEW, '--section', 'imports')).toEqual([
			`# file ${VIEW} --section imports total 3 (prod 3, tests 0)`,
			`imp ${VIEW}:2 -> ${ROW} default`,
			`imp ${VIEW}:3 -> ${STORE} notesStore`,
			`imp ${VIEW}:4 -> ${SVC} loadTags`,
		]);
		expect(lines('file', VIEW, '--section', 'ipc-in')).toEqual([`# file ${VIEW} --section ipc-in total 0 (prod 0, tests 0)`, EMPTY]);
		const bad = q(MODEL, 'file', VIEW, '--section', 'import');
		expect(bad.code).toBe(1);
		expect(bad.stderr).toBe("no match for 'import'; did you mean:\nimported-by\nimports\n");
	});

	it('importers: a file, with --tests, and a symbol', () => {
		expect(lines('importers', SVC)).toEqual([
			`# importers ${SVC} total 2 (prod 2, tests 0)`,
			`imp ${VIEW}:4 -> ${SVC} loadTags`,
			`imp ${TAGS}:2 -> ${SVC} scheduleLoad`,
		]);
		expect(lines('importers', SVC, '--tests')).toEqual([
			`# importers ${SVC} total 3 (prod 2, tests 1)`,
			`imp ${VIEW}:4 -> ${SVC} loadTags`,
			`imp ${TAGS}:2 -> ${SVC} scheduleLoad`,
			`imp src/tests/lib/core/notes/notes.service.test.ts:3 -> ${SVC} saveNote`,
		]);
		expect(lines('importers', 'src/lib/app/boot.ts:boot')).toEqual([
			'# importers src/lib/app/boot.ts:boot total 2 (prod 2, tests 0)',
			'by src/lib/app/boot.ts:boot <- src/lib/app/init.ts:2 in (module) call',
			'by src/lib/app/boot.ts:boot <- src/routes/+page.svelte:4 in (script) call',
		]);
		expect(lines('importers', 'dto:TagAggregate', '--tests')).toEqual([
			'# importers dto:TagAggregate total 3 (prod 2, tests 1)',
			'by dto:TagAggregate <- src/lib/contracts/commands.ts:1 in (module) import',
			'by dto:TagAggregate <- src/lib/contracts/index.ts:1 in (module) import',
			'by dto:TagAggregate <- e2e/mocks/tauri-core.ts:1 in (module) import',
		]);
	});

	it('deps: a file, a module and a test file', () => {
		expect(lines('deps', TAGS)).toEqual([
			`# deps ${TAGS} total 2 (prod 2, tests 0)`,
			`imp ${TAGS}:1 -> ${HOOKS} addSaveObserver`,
			`imp ${TAGS}:2 -> ${SVC} scheduleLoad`,
		]);
		expect(lines('deps', 'src/lib/features/tags')).toEqual([
			'# deps src/lib/features/tags total 1 (prod 1, tests 0)',
			'dep src/lib/features/tags -> src/lib/core/notes 4',
		]);
		expect(lines('deps', 'src/tests/lib/core/notes/notes.service.test.ts')).toEqual([
			'# deps src/tests/lib/core/notes/notes.service.test.ts total 2 (prod 2, tests 0)',
			'test src/tests/lib/core/notes/notes.service.test.ts mocks src/lib/contracts/ipc.ts',
			`test src/tests/lib/core/notes/notes.service.test.ts imports ${SVC} mirror`,
		]);
	});

	it('callers: TS function, local function, store members, component, Rust items, ipc, event, --tests', () => {
		expect(lines('callers', `${HOOKS}:notifySaved`)).toEqual([
			`# callers ${HOOKS}:notifySaved total 1 (prod 1, tests 0)`,
			`call ${SVC}:10 in writeNote -> ${HOOKS}:notifySaved call`,
		]);
		expect(lines('callers', 'writeNote')).toEqual([
			`# callers ${SVC}:writeNote total 1 (prod 1, tests 0)`,
			`call ${SVC}:14 in saveNote -> ${SVC}:writeNote call`,
		]);
		expect(lines('callers', 'notesStore.tags')).toEqual([
			`# callers ${STORE}:notesStore.tags total 3 (prod 3, tests 0)`,
			`call ${SVC}:20 in loadTags -> ${STORE}:notesStore.addTag mcall w-via`,
			`call ${VIEW}:5 in count=$derived -> ${STORE}:notesStore.tags member read`,
			`call ${VIEW}:14 in (markup) -> ${STORE}:notesStore.tags markup read`,
		]);
		expect(lines('callers', 'setActive')).toEqual([
			`# callers ${STORE}:notesStore.setActive total 1 (prod 1, tests 0)`,
			`call src/lib/plugins/cal/cal.ts:6 in listenIndex -> ${STORE}:notesStore.setActive mcall write`,
		]);
		expect(lines('callers', 'TagRow')).toEqual([
			`# callers ${ROW}:default total 1 (prod 1, tests 0)`,
			`call ${VIEW}:15 in (markup) -> ${ROW}:default mount`,
		]);
		expect(lines('callers', 'write_atomic')).toEqual([
			'# callers src-tauri/src/utils/fs.rs:write_atomic total 1 (prod 1, tests 0)',
			`call ${NOTES_RS}:27 in save_note -> src-tauri/src/utils/fs.rs:write_atomic lexical`,
		]);
		expect(lines('callers', 'Index::update_entry')).toEqual([
			'# callers src-tauri/src/index.rs:Index::update_entry total 1 (prod 1, tests 0)',
			`call ${NOTES_RS}:29 in save_note -> src-tauri/src/index.rs:Index::update_entry lexical-method`,
		]);
		expect(lines('callers', 'ipc:save_note')).toEqual([
			'# callers ipc:save_note total 1 (prod 1, tests 0)',
			`call ${SVC}:15 in saveNote -> ipc:save_note call`,
		]);
		expect(lines('callers', 'event:index-updated')).toEqual([
			'# callers event:index-updated total 2 (prod 2, tests 0)',
			`call ${NOTES_RS}:30 in save_note -> event:index-updated emit`,
			'call src/lib/plugins/cal/cal.ts:6 in listenIndex -> event:index-updated listen',
		]);
		expect(lines('callers', 'debounce', '--tests')).toEqual([
			'# callers src/lib/utils/debounce.ts:debounce total 2 (prod 1, tests 1)',
			`call ${SVC}:22 in scheduleLoad -> src/lib/utils/debounce.ts:debounce call`,
			'call src/tests/lib/utils/debounce.test.ts:2 in (module) -> src/lib/utils/debounce.ts:debounce call',
		]);
		expect(lines('callers', 'get_tags', '--tests')).toEqual([
			`# callers ${NOTES_RS}:get_tags total 1 (prod 0, tests 1)`,
			`call src-tauri/tests/notes_test.rs:4 in tags -> ${NOTES_RS}:get_tags lexical`,
		]);
		expect(lines('callers', 'flushLater')).toEqual([`# callers ${SVC}:flushLater total 0 (prod 0, tests 0)`, EMPTY]);
	});

	it('callers and flow: EVENT_NAMES.KEY and the *_EVENT const name mean the event', () => {
		const event = q(MODEL, 'callers', 'event:index-updated');
		expect(q(MODEL, 'callers', 'EVENT_NAMES.INDEX_UPDATED')).toEqual(event);
		expect(q(MODEL, 'callers', 'INDEX_UPDATED_EVENT')).toEqual(event);
		expect(q(MODEL, 'flow', 'saveNote', 'INDEX_UPDATED_EVENT')).toEqual(q(MODEL, 'flow', 'saveNote', 'event:index-updated'));
	});

	it('callers and calls: an enclosing that is not a symbol, by ID and by bare name', () => {
		expect(q(MORE, 'calls', `${TICK}:t`).stdout.split('\n')).toEqual([
			`# calls ${TICK}:t total 2 (prod 2, tests 0)`,
			`call ${TICK}:3 in t -> ${TICK}:g call`,
			`call ${TICK}:3 in t -> src/lib/utils/debounce.ts:debounce call`,
			'',
		]);
		expect(q(MORE, 'calls', 't').stdout).toBe(q(MORE, 'calls', `${TICK}:t`).stdout);
		expect(q(MORE, 'callers', `${TICK}:t`).code).toBe(0);
	});

	it('calls: a symbol and a file', () => {
		expect(lines('calls', 'saveNote')).toEqual([
			`# calls ${SVC}:saveNote total 2 (prod 2, tests 0)`,
			`call ${SVC}:14 in saveNote -> ${SVC}:writeNote call`,
			`call ${SVC}:15 in saveNote -> src/lib/contracts/ipc.ts:call call`,
		]);
		expect(lines('calls', TAGS)).toEqual([
			`# calls ${TAGS} total 3 (prod 3, tests 0)`,
			`call ${TAGS}:4 in onSaved -> ${SVC}:scheduleLoad call`,
			`call ${TAGS}:8 in registerTagsHook -> ${HOOKS}:addSaveObserver call`,
			`call ${TAGS}:8 in registerTagsHook -> ${TAGS}:onSaved ref`,
		]);
	});

	it('impact: depth 1, 2 and 3 with via-mount, via-file, via ipc and --tests', () => {
		expect(lines('impact', 'notifySaved', '--depth', '1')).toEqual([
			`# impact ${HOOKS}:notifySaved total 1 (prod 1, tests 0)`,
			'## depth 1',
			`call ${SVC}:10 in writeNote -> ${HOOKS}:notifySaved call`,
		]);
		expect(lines('impact', 'loadTags', '--depth', '3')).toEqual([
			`# impact ${SVC}:loadTags total 2 (prod 2, tests 0)`,
			'## depth 1',
			`call ${SVC}:22 in scheduleLoad -> ${SVC}:loadTags call`,
			`call ${VIEW}:13 in (markup) -> ${SVC}:loadTags markup`,
			'## depth 2',
			'depth 2 nodes 2 files 2: src/lib/features/tags(1) src/routes(1) · via call(1) via-mount(1)',
			'## depth 3',
			'depth 3 nodes 1 files 1: src/lib/features/tags(1) · via ref(1)',
			'## top files (depth 2+)',
			'hub features src/lib/features/tags/tags.service.ts in1 t0',
			'hub routes src/routes/+page.svelte in0 t0',
		]);
		expect(lines('impact', 'boot')).toEqual([
			'# impact src/lib/app/boot.ts:boot total 2 (prod 2, tests 0)',
			'## depth 1',
			'call src/lib/app/init.ts:2 in (module) -> src/lib/app/boot.ts:boot call',
			'call src/routes/+page.svelte:4 in (script) -> src/lib/app/boot.ts:boot call',
			'## depth 2',
			'depth 2 nodes 1 files 1: src/routes(1) · via via-file(1)',
			'## top files (depth 2+)',
			'hub routes src/routes/+layout.ts in0 t0',
		]);
		expect(lines('impact', 'src-tauri/src/utils/fs.rs:write_atomic')).toEqual([
			'# impact src-tauri/src/utils/fs.rs:write_atomic total 1 (prod 1, tests 0)',
			'## depth 1',
			`call ${NOTES_RS}:27 in save_note -> src-tauri/src/utils/fs.rs:write_atomic lexical`,
			'## depth 2',
			'depth 2 nodes 2 files 2: src-tauri/src(1) src/lib/core/notes(1) · via ipc:save_note(1) via-import(1)',
			'## top files (depth 2+)',
			`hub core ${SVC} in2 t1`,
			'hub rust src-tauri/src/lib.rs in0 t0',
		]);
		expect(lines('impact', HOOKS, '--tests')).toEqual([
			`# impact ${HOOKS} total 3 (prod 2, tests 1)`,
			'## depth 1',
			`imp ${SVC}:6 -> ${HOOKS} notifySaved`,
			`imp ${TAGS}:1 -> ${HOOKS} addSaveObserver`,
			'## depth 2',
			'depth 2 nodes 2 files 2: src/lib/app(1) src/lib/features/tags(1) · via imp(2)',
			'## top files (depth 2+)',
			'hub app src/lib/app/boot.ts in2 t0',
			`hub features ${VIEW} in1 t0`,
			'## tests',
			`test src/tests/lib/core/notes/notes.service.test.ts imports ${SVC} mirror`,
		]);
	});

	it('impact: type-only importers of a symbol count at depth 1 and continue through their files', () => {
		expect(q(MORE, 'impact', `${CAL_TYPES}:CalDay`, '--depth', '1').stdout.split('\n')).toEqual([
			`# impact ${CAL_TYPES}:CalDay total 2 (prod 2, tests 0)`,
			'## depth 1',
			`by ${CAL_TYPES}:CalDay <- src/lib/plugins/cal/days.ts:1 in (module) import`,
			`by ${CAL_TYPES}:CalDay <- src/lib/plugins/cal/view.ts:2 in (module) import`,
			'',
		]);
		expect(q(MORE, 'impact', `${CAL_TYPES}:CalDay`).stdout.split('\n')).toEqual([
			`# impact ${CAL_TYPES}:CalDay total 2 (prod 2, tests 0)`,
			'## depth 1',
			`by ${CAL_TYPES}:CalDay <- src/lib/plugins/cal/days.ts:1 in (module) import`,
			`by ${CAL_TYPES}:CalDay <- src/lib/plugins/cal/view.ts:2 in (module) import`,
			'## depth 2',
			'depth 2 nodes 1 files 1: src/lib/plugins/cal(1) · via imp(1)',
			'## top files (depth 2+)',
			'hub plugins src/lib/plugins/cal/panel.ts in0 t0',
			'',
		]);
	});

	it('impact: --depth above 6 is a usage error', () => {
		expect(q(MODEL, 'impact', 'loadTags', '--depth', '7').code).toBe(2);
		expect(q(MODEL, 'impact', 'loadTags', '--depth', '6').code).toBe(0);
	});

	it('path: found, reverse, module, none and a code-unit tie', () => {
		expect(lines('path', 'src/lib/app/boot.ts', HOOKS)).toEqual([
			`# path src/lib/app/boot.ts -> ${HOOKS} total 2 (prod 2, tests 0)`,
			`imp src/lib/app/boot.ts:1 -> ${TAGS} registerTagsHook`,
			`imp ${TAGS}:1 -> ${HOOKS} addSaveObserver`,
		]);
		expect(lines('path', HOOKS, 'src/lib/app/boot.ts')).toEqual([
			`# path ${HOOKS} -> src/lib/app/boot.ts total 2 (prod 2, tests 0)`,
			`reverse: no import path from ${HOOKS} to src/lib/app/boot.ts; the path from src/lib/app/boot.ts to ${HOOKS}:`,
			`imp src/lib/app/boot.ts:1 -> ${TAGS} registerTagsHook`,
			`imp ${TAGS}:1 -> ${HOOKS} addSaveObserver`,
		]);
		expect(lines('path', 'src/routes', 'src/lib/core/notes')).toEqual([
			'# path src/routes -> src/lib/core/notes total 2 (prod 2, tests 0)',
			'dep src/routes -> src/lib/features/tags 1',
			'dep src/lib/features/tags -> src/lib/core/notes 4',
		]);
		expect(lines('path', 'src/lib/plugins/cal/format.ts', 'src/lib/utils/debounce.ts')).toEqual([
			'# path src/lib/plugins/cal/format.ts -> src/lib/utils/debounce.ts total 0 (prod 0, tests 0)',
			'no path',
		]);
		const tie = modelOf({
			'src/lib/core/a/a.ts': "import { c } from './c.js';\nimport { b } from './b.js';\nexport const a = b + c;\n",
			'src/lib/core/a/b.ts': "import { d } from './d.js';\nexport const b = d;\n",
			'src/lib/core/a/c.ts': "import { d } from './d.js';\nexport const c = d;\n",
			'src/lib/core/a/d.ts': 'export const d = 1;\n',
		});
		expect(q(tie, 'path', 'src/lib/core/a/a.ts', 'src/lib/core/a/d.ts').stdout).toBe(
			[
				'# path src/lib/core/a/a.ts -> src/lib/core/a/d.ts total 2 (prod 2, tests 0)',
				'imp src/lib/core/a/a.ts:2 -> src/lib/core/a/b.ts b',
				'imp src/lib/core/a/b.ts:1 -> src/lib/core/a/d.ts d',
				'',
			].join('\n'),
		);
	});

	it('flow: call, fires, ipc, event and state hops; none', () => {
		expect(lines('flow', 'saveNote', `${TAGS}:onSaved`)).toEqual([
			`# flow ${SVC}:saveNote -> ${TAGS}:onSaved total 3 (prod 3, tests 0)`,
			`call ${SVC}:14 ${SVC}:saveNote -> ${SVC}:writeNote`,
			`call ${SVC}:10 ${SVC}:writeNote -> ${HOOKS}:notifySaved`,
			`fires ${TAGS}:8 ${HOOKS}:notifySaved -> ${TAGS}:onSaved`,
		]);
		expect(lines('flow', 'saveNote', 'src/lib/plugins/cal/cal.ts:listenIndex')).toEqual([
			`# flow ${SVC}:saveNote -> src/lib/plugins/cal/cal.ts:listenIndex total 4 (prod 4, tests 0)`,
			`ipc ${SVC}:15 ${SVC}:saveNote -> ipc:save_note`,
			`ipc ${NOTES_RS}:26 ipc:save_note -> ${NOTES_RS}:save_note`,
			`event ${NOTES_RS}:30 ${NOTES_RS}:save_note -> event:index-updated`,
			'event src/lib/plugins/cal/cal.ts:6 event:index-updated -> src/lib/plugins/cal/cal.ts:listenIndex',
		]);
		expect(lines('flow', 'loadTags', `${VIEW}:count=$derived`)).toEqual([
			`# flow ${SVC}:loadTags -> ${VIEW}:count=$derived total 1 (prod 1, tests 0)`,
			`state ${SVC}:20 ${SVC}:loadTags -> ${VIEW}:count=$derived`,
		]);
		expect(lines('flow', 'notifySaved', 'saveNote')).toEqual([
			`# flow ${HOOKS}:notifySaved -> ${SVC}:saveNote total 0 (prod 0, tests 0)`,
			'no flow within depth 12',
		]);
	});

	it('path and flow: an argument that already meets the other', () => {
		expect(lines('path', HOOKS, HOOKS)).toEqual([`# path ${HOOKS} -> ${HOOKS} total 0 (prod 0, tests 0)`, `same node: ${HOOKS} is ${HOOKS}`]);
		expect(lines('flow', 'src/lib/features/tags', TAGS)).toEqual([
			`# flow src/lib/features/tags -> ${TAGS} total 0 (prod 0, tests 0)`,
			`same node: src/lib/features/tags and ${TAGS} overlap at ${TAGS}:onSaved`,
		]);
	});

	it('ipc, event (name, const, EVENT_NAMES.KEY) and store', () => {
		expect(lines('ipc', 'save_note')).toEqual([
			'# ipc ipc:save_note total 7 (prod 6, tests 1)',
			'ipc ipc:save_note args path,content -> null',
			`ipc ipc:save_note rust ${NOTES_RS}:26`,
			'ipc ipc:save_note reg src-tauri/src/lib.rs:11',
			'ipc ipc:save_note key e2e/mocks/tauri-core.ts:5',
			'ipc ipc:save_note key src/lib/contracts/commands.ts:7',
			`ipc-call ${SVC}:15 in saveNote -> ipc:save_note -> ${NOTES_RS}:26`,
			'ipc ipc:save_note doc Writes one note.',
		]);
		const event = [
			'# event event:index-updated total 7 (prod 7, tests 0)',
			'event event:index-updated const INDEX_UPDATED_EVENT src-tauri/src/events.rs:2',
			'event event:index-updated ts EVENT_NAMES.INDEX_UPDATED src/lib/contracts/events.ts:1',
			'event event:index-updated payload number',
			`event event:index-updated emit ${NOTES_RS}:30 in save_note`,
			'event event:index-updated listen src/lib/plugins/cal/cal.ts:6 in listenIndex',
			`ev ${NOTES_RS}:30 in save_note -> event:index-updated -> src/lib/plugins/cal/cal.ts:6 in listenIndex`,
			'event event:index-updated doc Emitted after the index changes.',
		];
		expect(lines('event', 'index-updated')).toEqual(event);
		expect(lines('event', 'INDEX_UPDATED_EVENT')).toEqual(event);
		expect(lines('event', 'EVENT_NAMES.INDEX_UPDATED')).toEqual(event);
		expect(lines('store', 'notesStore')).toEqual([
			`# store ${STORE}:notesStore total 5 (prod 5, tests 0)`,
			`store ${STORE}:4 notesStore esc:0`,
			`mem ${STORE}:6 get notesStore.tags r:${VIEW}:5,${VIEW}:14 w-via:addTag | All tags.`,
			`mem ${STORE}:9 get notesStore.active r:${VIEW}:7 w-via:setActive`,
			`mem ${STORE}:13 do notesStore.addTag w:${SVC}:20 | Adds a tag.`,
			`mem ${STORE}:16 do notesStore.setActive w:src/lib/plugins/cal/cal.ts:6`,
		]);
		expect(lines('store', 'notesStore.active')).toEqual([
			`# store ${STORE}:notesStore.active total 3 (prod 3, tests 0)`,
			`mem ${STORE}:9 get notesStore.active r:${VIEW}:7 w-via:setActive`,
			`call ${VIEW}:7 in $effect@6 -> ${STORE}:notesStore.active member read`,
			`call src/lib/plugins/cal/cal.ts:6 in listenIndex -> ${STORE}:notesStore.setActive mcall w-via`,
		]);
	});

	it('sink: a sink, a class and --up 2 through a command to its TS caller', () => {
		expect(lines('sink', 'rust-fs.write')).toEqual([
			'# sink rust-fs.write total 1 (prod 1, tests 0)',
			'fx src-tauri/src/utils/fs.rs:5 rust-fs.write in write_atomic',
		]);
		expect(lines('sink', 'timer')).toEqual([
			'# sink timer total 3 (prod 3, tests 0)',
			`fx ${SVC}:22 timer-wrap.debounce args=() => void loadTags(), 300 as scheduleLoad in scheduleLoad`,
			`fx ${SVC}:24 timer.setTimeout delay=0 in flushLater`,
			'fx src/lib/utils/debounce.ts:6 timer.setTimeout delay=delay in debounce',
		]);
		expect(lines('sink', 'rust-fs.write', '--up', '2')).toEqual([
			'# sink rust-fs.write total 3 (prod 3, tests 0)',
			'fx src-tauri/src/utils/fs.rs:5 rust-fs.write in write_atomic',
			'## up 1',
			`call ${NOTES_RS}:27 in save_note -> src-tauri/src/utils/fs.rs:write_atomic lexical`,
			'## up 2',
			`ipc-call ${SVC}:15 in saveNote -> ipc:save_note -> ${NOTES_RS}:26`,
		]);
	});

	it('tests, hubs --layer and reg', () => {
		expect(lines('tests', SVC)).toEqual([
			`# tests ${SVC} total 1 (prod 0, tests 1)`,
			`test src/tests/lib/core/notes/notes.service.test.ts imports ${SVC} mirror`,
		]);
		expect(lines('tests', NOTES_RS)).toEqual([
			`# tests ${NOTES_RS} total 2 (prod 0, tests 2)`,
			`test src-tauri/tests/notes_test.rs imports ${NOTES_RS}`,
			`t:inline ${NOTES_RS}`,
		]);
		expect(lines('hubs', '--layer', 'core')).toEqual([
			'# hubs core total 3 (prod 3, tests 0)',
			`hub core ${STORE} in3 t0`,
			`hub core ${SVC} in2 t1`,
			`hub core ${HOOKS} in2 t0`,
		]);
		expect(lines('reg', 'addSaveObserver')).toEqual([
			`# reg ${HOOKS}:addSaveObserver total 5 (prod 5, tests 0)`,
			`reg ${HOOKS}:addSaveObserver sink ${HOOKS}:3 | stores observers push | doc Registers an after-save observer.`,
			`reg ${HOOKS}:addSaveObserver read-by ${HOOKS}:10 notifySaved`,
			`reg ${HOOKS}:addSaveObserver fired-by ${SVC}:10 in writeNote <- ${SVC}:14 in saveNote`,
			`reg ${HOOKS}:addSaveObserver registered-at ${TAGS}:8 in registerTagsHook args=onSaved -> ${TAGS}:onSaved`,
			`reg ${HOOKS}:addSaveObserver invoked-at src/lib/app/boot.ts:5 in boot`,
		]);
	});

	it('prints help, and runs through the generator entry', () => {
		const help = q(MODEL, 'help');
		expect(help).toEqual({ code: 0, stdout: HELP, stderr: '' });
		const root = mkdtempSync(join(tmpdir(), 'codemap-q-'));
		try {
			for (const [p, t] of Object.entries(TREE)) {
				mkdirSync(join(root, dirname(p)), { recursive: true });
				writeFileSync(join(root, p), t);
			}
			let stdout = '';
			let stderr = '';
			const code = main(['q', 'sym', 'loadTags'], {
				root,
				env: {},
				out: (s: string) => {
					stdout += s;
				},
				err: (s: string) => {
					stderr += s;
				},
			});
			expect({ code, stderr }).toEqual({ code: 0, stderr: '' });
			expect(stdout).toBe(q(MODEL, 'sym', 'loadTags').stdout);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});
});

describe('q limits (test 49)', () => {
	const tree: Record<string, string> = { 'src/lib/core/hub/hub.ts': 'export const x = 1;\n' };
	for (let i = 0; i < 60; i++) tree[`src/lib/features/f${i}/a.ts`] = "import { x } from '#lib/core/hub/hub.js';\nexport const y = x;\n";
	const model = modelOf(tree);
	const importers = Object.keys(tree)
		.filter((p) => p.startsWith('src/lib/features/'))
		.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

	it('cuts at 50 lines with a more line, shows all with --limit 100, filters with --module', () => {
		const out = q(model, 'importers', 'src/lib/core/hub/hub.ts').stdout.slice(0, -1).split('\n');
		expect(out[0]).toBe('# importers src/lib/core/hub/hub.ts total 60 (prod 60, tests 0)');
		expect(out.slice(1, 51)).toEqual(importers.slice(0, 50).map((f) => `imp ${f}:1 -> src/lib/core/hub/hub.ts x`));
		const hiddenFirst = importers[50].split('/').slice(0, 4).join('/');
		expect(out[51]).toBe(`more 10 not shown (total 60): rerun with --limit 60, or narrow with --module ${hiddenFirst}`);
		expect(out).toHaveLength(52);
		const all = q(model, 'importers', 'src/lib/core/hub/hub.ts', '--limit', '100').stdout.slice(0, -1).split('\n');
		expect(all).toHaveLength(61);
		expect(all.some((l) => l.startsWith('more '))).toBe(false);
		expect(q(model, 'importers', 'src/lib/core/hub/hub.ts', '--module', 'src/lib/features/f7').stdout).toBe(
			'# importers src/lib/core/hub/hub.ts total 1 (prod 1, tests 0)\nimp src/lib/features/f7/a.ts:1 -> src/lib/core/hub/hub.ts x\n',
		);
	});

	it('drops a section heading whose lines the limit cuts', () => {
		expect(lines('sink', 'rust-fs.write', '--up', '2', '--limit', '1')).toEqual([
			'# sink rust-fs.write total 3 (prod 3, tests 0)',
			'fx src-tauri/src/utils/fs.rs:5 rust-fs.write in write_atomic',
			'more 2 not shown (total 3): rerun with --limit 3, or narrow with --module src-tauri/src/commands',
		]);
	});
});

describe('q errors (test 50)', () => {
	it('suggests close names, lists ambiguous IDs, prints help on a usage error', () => {
		const typo = q(MODEL, 'sym', 'buildTagIndx');
		expect(typo.code).toBe(1);
		expect(typo.stderr.split('\n').slice(0, 2)).toEqual(["no match for 'buildTagIndx'; did you mean:", 'buildTagIndex']);
		const amb = q(MODEL, 'callers', 'label');
		expect(amb).toEqual({
			code: 1,
			stdout: '',
			stderr: `ambiguous: rerun with one of\n${VIEW}:label\nsrc/lib/plugins/cal/format.ts:label\n`,
		});
		const unknown = q(MODEL, 'nope');
		expect(unknown.code).toBe(2);
		expect(unknown.stderr).toBe(`unknown command 'nope'\n${HELP}`);
		expect(q(MODEL).code).toBe(2);
		expect(q(MODEL, 'callers').code).toBe(2);
		expect(q(MODEL, 'callers', 'x', '--limit', '0').code).toBe(2);
		expect(q(MODEL, 'sym', 'x', '--depth', '2').code).toBe(2);
	});

	it('rejects a scope the file does not have', () => {
		expect(q(MODEL, 'impact', `${VIEW}:$effect@999`).code).toBe(1);
		expect(q(MODEL, 'impact', `${TAGS}:(markup)`).code).toBe(1);
		expect(q(MODEL, 'impact', `${VIEW}:$effect@6`).code).toBe(0);
		expect(q(MODEL, 'impact', `${VIEW}:(markup)`).code).toBe(0);
	});

	it('sym: an object method gets a line, never "no match" with itself as the suggestion', () => {
		expect(q(MORE, 'sym', 'api.run').stdout.split('\n')).toEqual([
			'# sym api.run total 1 (prod 1, tests 0)',
			`sym ${TICK}:9 const api L3 | Runs things.`,
			'',
		]);
	});
});

describe('q IDs (test 51)', () => {
	it('prints only paths and IDs of the model', () => {
		const ids = new Set<string>();
		for (const [file, facts] of MODEL.ts) {
			for (const s of facts.symbols) ids.add(s.kind === 'component' ? `${file}:default` : `${file}:${s.name}`);
			for (const l of facts.locals) ids.add(`${file}:${l.name}`);
		}
		for (const st of MODEL.stores) for (const m of st.members) ids.add(m.id);
		for (const [file, facts] of MODEL.rust) for (const x of [...facts.items, ...facts.locals]) ids.add(`${file}:${x.name}`);
		const scope = /:(?:\(module\)|\(script\)|\(markup\)|\$effect(?:\.pre)?@\d+|[\w$]+=\$derived)$/;
		const runs = [
			['callers', 'notesStore.tags'],
			['callers', 'event:index-updated'],
			['impact', 'loadTags', '--depth', '3'],
			['flow', 'saveNote', `${TAGS}:onSaved`],
			['flow', 'saveNote', 'src/lib/plugins/cal/cal.ts:listenIndex'],
			['sink', 'rust-fs.write', '--up', '2'],
			['calls', SVC],
			['importers', 'src/lib/app/boot.ts:boot'],
		];
		const problems: string[] = [];
		for (const run of runs) {
			for (const line of lines(...run).slice(1)) {
				for (const tok of line.split(/[ ,]/)) {
					const t = tok.replace(/:$/, '').replace(/\(\d+\)$/, '');
					if (!/^(?:src|src-tauri|e2e)\//.test(t)) continue;
					const file = t.replace(/:.*$/, '');
					if (!MODEL.inputs.has(file) && !MODEL.modules.includes(file)) problems.push(`${run.join(' ')}: unknown path ${t}`);
					const rest = t.slice(file.length + 1);
					if (rest && !/^\d+$/.test(rest) && !ids.has(t) && !scope.test(t)) problems.push(`${run.join(' ')}: unknown ID ${t}`);
				}
			}
		}
		expect(problems).toEqual([]);
	});

	it('accepts path:name, in name with --file, and <file>:<Basename> for a component', () => {
		const full = q(MODEL, 'callers', `${HOOKS}:notifySaved`).stdout;
		expect(q(MODEL, 'callers', 'notifySaved').stdout).toBe(full);
		expect(q(MODEL, 'callers', 'in notifySaved', '--file', HOOKS).stdout).toBe(full);
		expect(q(MODEL, 'callers', 'notifySaved', '--file', HOOKS).stdout).toBe(full);
		expect(q(MODEL, 'callers', `${ROW}:TagRow`).stdout).toBe(q(MODEL, 'callers', `${ROW}:default`).stdout);
		expect(q(MODEL, 'callers', 'in', 'notifySaved', '--file', HOOKS).stdout).toBe(full);
	});

	it('resolves every `in <name>` of the output as <file>:<name>', () => {
		const problems: string[] = [];
		const runs = [
			['callers', 'notesStore.tags'],
			['callers', 'event:index-updated'],
			['calls', SVC],
			['calls', TICK],
			['sink', 'timer', '--up', '1'],
			['sink', 'rust-fs.write', '--up', '2'],
			['importers', 'src/lib/app/boot.ts:boot'],
		];
		for (const run of runs)
			for (const line of q(MORE, ...run).stdout.split('\n')) {
				const m = /^\S+ ((?:src|src-tauri|e2e)\/[^ :]+):\d+ in (\S+)/.exec(line);
				if (!m) continue;
				const id = `${m[1]}:${m[2]}`;
				if (q(MORE, 'callers', id).code !== 0) problems.push(`${run.join(' ')}: ${id}`);
			}
		expect(problems).toEqual([]);
	});
});

describe('q file consistency (test 52)', () => {
	it('prints every card byte for byte as the generator writes it', () => {
		const files = renderMap(MODEL, { inputsHash: 'abcdef012345' });
		const cards = [...files.keys()].filter((p) => p.startsWith('files/') && !p.endsWith('.calls.md'));
		expect(cards.length).toBeGreaterThan(20);
		for (const p of cards) {
			const file = p.slice('files/'.length, -'.md'.length);
			expect(q(MODEL, 'file', file), file).toEqual({ code: 0, stdout: files.get(p), stderr: '' });
		}
	});

	/** One file of `n` locals that each call one export: card size grows with `n`. */
	const bigTree = (n: number) => {
		const body = ['export function exportedTargetFunctionWithLongName() {}'];
		for (let i = 0; i < n; i++)
			body.push(`function localFunctionNumber${String(i).padStart(4, '0')}() { exportedTargetFunctionWithLongName(); }`);
		return modelOf({ 'src/lib/core/big/big.ts': `${body.join('\n')}\n` });
	};
	const BIG = 'src/lib/core/big/big.ts';

	it('hints at --section on stderr for a card over 28 KB', () => {
		const model = bigTree(180);
		const files = renderMap(model, { inputsHash: 'abcdef012345' });
		expect(files.has(`files/${BIG}.calls.md`)).toBe(false);
		expect(Buffer.byteLength(files.get(`files/${BIG}.md`)!)).toBeGreaterThan(28 * 1024);
		expect(q(model, 'file', BIG)).toEqual({
			code: 0,
			stdout: files.get(`files/${BIG}.md`),
			stderr: `card is over 28 KB: use q file ${BIG} --section <name>, or Read codemap/files/${BIG}.md\n`,
		});
		expect(q(bigTree(10), 'file', BIG).stderr).toBe('');
	});

	it('reads --section calls of a split card from its calls file', () => {
		const model = bigTree(300);
		const files = renderMap(model, { inputsHash: 'abcdef012345' });
		const split = files.get(`files/${BIG}.calls.md`)!;
		expect(split).toBeDefined();
		expect(q(model, 'file', BIG).stdout).toBe(files.get(`files/${BIG}.md`));
		const calls = q(model, 'file', BIG, '--section', 'calls', '--limit', '1000').stdout.split('\n').filter((l) => l.startsWith('call '));
		expect(calls).toHaveLength(300);
		expect(calls).toEqual(split.split('\n').filter((l) => l.startsWith('call ')));
	});
});

describe('q on the real repo (test 53)', () => {
	const ROOT = process.cwd();

	/** Runs the CLI as an agent would and returns its output and wall time. */
	function cli(...argv: string[]) {
		const t0 = performance.now();
		const run = spawnSync(process.execPath, ['scripts/codemap.mjs', 'q', ...argv], { cwd: ROOT, encoding: 'utf8' });
		const ms = Math.round(performance.now() - t0);
		console.log(`codemap q ${argv.join(' ')}: ${ms} ms`);
		return { ...run, ms };
	}

	it('answers importers and path from the working tree in under 10 s each', () => {
		const imp = cli('importers', 'src/lib/utils/debounce.ts');
		expect(imp.status, imp.stderr).toBe(0);
		const impLines = imp.stdout.split('\n');
		for (const site of [
			'src/lib/core/editor/editor.service.ts:9',
			'src/lib/app/lifecycle/app-lifecycle.service.ts:7',
			'src/lib/features/tags/tags.service.ts:3',
			'src/lib/features/rail-shell/TypesNavigator.svelte:25',
		])
			expect(impLines.some((l) => l.startsWith(`imp ${site} -> src/lib/utils/debounce.ts `)), site).toBe(true);
		expect(imp.ms).toBeLessThan(10_000);
		const path = cli('path', 'src/lib/features/tags/tags.service.ts', 'src/lib/contracts/ipc.ts');
		expect(path.status, path.stderr).toBe(0);
		expect(path.stdout).toMatch(/^# path src\/lib\/features\/tags\/tags\.service\.ts -> src\/lib\/contracts\/ipc\.ts total 1 /);
		expect(path.stdout).toMatch(/^imp src\/lib\/features\/tags\/tags\.service\.ts:\d+ -> src\/lib\/contracts\/ipc\.ts /m);
		expect(path.ms).toBeLessThan(10_000);
	}, 30_000);

	describe('known facts through q (test 43)', () => {
		let model: ReturnType<typeof buildModel>;
		beforeAll(() => {
			model = buildModel(readInputs(ROOT));
		}, 60_000);
		/** Runs one query on the repo model, timed: under 10 s each. */
		const out = (...argv: string[]) => {
			const t0 = performance.now();
			const r = runQuery(argv, () => model);
			const ms = Math.round(performance.now() - t0);
			console.log(`codemap q ${argv.join(' ')}: ${ms} ms`);
			expect(r.code, r.stderr).toBe(0);
			expect(ms).toBeLessThan(10_000);
			return r.stdout;
		};

		it('finds callers, writers, Rust method callers and a runtime flow', () => {
			expect(out('callers', 'src/lib/core/layout/layout.service.ts:toggleRightSidebar', '--limit', '500')).toMatch(
				/^call src\/lib\/app\/AppShell\.svelte:192 in \S+ -> src\/lib\/core\/layout\/layout\.service\.ts:toggleRightSidebar /m,
			);
			expect(out('callers', 'src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateLayout', '--limit', '500')).toMatch(
				/^call src\/lib\/app\/AppShell\.svelte:220 in \(markup\) -> src\/lib\/core\/settings\/settings\.store\.svelte\.ts:settingsStore\.updateLayout mcall (?:\+\d+ )?write$/m,
			);
			expect(out('callers', 'src-tauri/src/vault/index.rs:VaultIndex::update_entry', '--limit', '500')).toMatch(
				/^call src-tauri\/src\/commands\/vault\.rs:343 in \S+ -> src-tauri\/src\/vault\/index\.rs:VaultIndex::update_entry lexical-method/m,
			);
			const flow = out('flow', 'src/lib/core/editor/editor.service.ts:saveFileByPath', 'src/lib/features/search/search.service.ts:registerSearchIndexHook');
			expect(flow).toMatch(/ -> src\/lib\/core\/editor\/editor\.service\.ts:writeTab\n/);
			expect(flow).toMatch(/ -> src\/lib\/core\/editor\/editor\.hooks\.ts:notifyAfterSave\n/);
			expect(flow).toMatch(/^fires .* -> src\/lib\/features\/search\/search\.service\.ts:registerSearchIndexHook$/m);
		});
	});
});
