import { afterAll, describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
	buildModel,
	commandCalls,
	discoverModules,
	fileRole,
	groupOf,
	handlerCommands,
	linkify,
	moduleOf,
	parseCurated,
	rolesText,
	render,
	rustModuleRefs,
	validate,
	writePages,
} from '../../../../scripts/architecture-map.mjs';

/**
 * The architecture map (`scripts/architecture-map.mjs`) joins the curated module
 * docs in `docs/architecture/` with facts read from the code. The last block runs
 * `validate` on the real repo, so a new module folder without a doc, a doc
 * whose folder is gone, or a repo path it names that no longer exists fails here.
 */

const ROOT = process.cwd();

/** Fixture repos made by this file, removed after the suite. */
const tempDirs: string[] = [];
afterAll(() => {
	for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
});

describe('discoverModules', () => {
	it('names one module per core/features/plugins folder, per other src/lib layer, the routes, and each Rust folder', () => {
		const modules = discoverModules({
			libFiles: [
				'src/lib/core/editor/editor.service.ts',
				'src/lib/core/editor/sub/deep.ts',
				'src/lib/features/tags/Tags.svelte',
				'src/lib/plugins/kanban/kanban.logic.ts',
				'src/lib/app/boot.ts',
				'src/lib/utils/path.ts',
				'src/lib/utils.ts',
			],
			routeFiles: ['src/routes/+layout.svelte'],
			rustFiles: ['src-tauri/src/lib.rs', 'src-tauri/src/vault/index.rs', 'src-tauri/src/db/mod.rs'],
		});
		expect(modules).toEqual([
			'src-tauri/src',
			'src-tauri/src/db',
			'src-tauri/src/vault',
			'src/lib/app',
			'src/lib/core/editor',
			'src/lib/features/tags',
			'src/lib/plugins/kanban',
			'src/lib/utils',
			'src/lib/utils.ts',
			'src/routes',
		]);
	});

	it('returns an empty list when there are no files', () => {
		expect(discoverModules({ libFiles: [], routeFiles: [], rustFiles: [] })).toEqual([]);
	});
});

describe('moduleOf', () => {
	const modules = ['src-tauri/src', 'src-tauri/src/vault', 'src/lib/utils', 'src/lib/utils.ts'];

	it('picks the longest module path that contains the file', () => {
		expect(moduleOf('src-tauri/src/vault/index.rs', modules)).toBe('src-tauri/src/vault');
		expect(moduleOf('src-tauri/src/lib.rs', modules)).toBe('src-tauri/src');
	});

	it('matches a file module exactly and does not treat it as a folder prefix', () => {
		expect(moduleOf('src/lib/utils.ts', modules)).toBe('src/lib/utils.ts');
		expect(moduleOf('src/lib/utils/path.ts', modules)).toBe('src/lib/utils');
	});

	it('returns null for a file outside every module', () => {
		expect(moduleOf('scripts/x.mjs', modules)).toBeNull();
	});
});

describe('groupOf', () => {
	it('sorts modules into the five groups', () => {
		expect(groupOf('src/lib/core/editor')).toBe('core');
		expect(groupOf('src/lib/core/markdown-editor/extensions/live-preview')).toBe('core');
		expect(groupOf('src/lib/features/tags')).toBe('features');
		expect(groupOf('src/lib/plugins/kanban')).toBe('plugins');
		expect(groupOf('src-tauri/src/vault')).toBe('rust');
		expect(groupOf('src/lib/app')).toBe('frontend-root');
		expect(groupOf('src/routes')).toBe('frontend-root');
	});
});

describe('fileRole', () => {
	it('names the role of each file type of the architecture guidelines', () => {
		expect(fileRole('a/x.logic.ts')).toBe('logic');
		expect(fileRole('a/x.store.svelte.ts')).toBe('store');
		expect(fileRole('a/x.service.ts')).toBe('service');
		expect(fileRole('a/X.svelte')).toBe('component');
		expect(fileRole('a/x.types.ts')).toBe('types');
		expect(fileRole('a/x.rs')).toBe('rust');
		expect(fileRole('a/x.ts')).toBe('other');
	});
});

describe('rustModuleRefs', () => {
	it('lists the crate modules a file names through crate:: paths, skipping comments', () => {
		const text = [
			'use crate::db::fts_repo;',
			'use crate::{events, vault::index::VaultIndex};',
			'// crate::search is only mentioned here',
			'/// See crate::semantic too.',
			'fn f() { crate::utils::logger::debug_log("a", "b"); }',
		].join('\n');
		expect(rustModuleRefs(text)).toEqual(['db', 'events', 'utils', 'vault']);
	});

	it('reads a brace import split over lines and nested braces, keeping only top-level names', () => {
		const text = 'use crate::{\n    db,\n    vault::{index::VaultIndex, task},\n    search::rrf,\n};';
		expect(rustModuleRefs(text)).toEqual(['db', 'search', 'vault']);
	});

	it('also counts bare paths to the given crate modules, as lib.rs writes them', () => {
		expect(rustModuleRefs('commands::db::open_vault_db,\nfoo::commands::x', ['commands', 'db'])).toEqual(['commands']);
	});

	it('returns an empty list for a file without crate paths', () => {
		expect(rustModuleRefs('fn main() {}')).toEqual([]);
	});
});

describe('handlerCommands', () => {
	it('reads the command paths of generate_handler!, comments and blank lines ignored', () => {
		const lib = [
			'.invoke_handler(tauri::generate_handler![',
			'    commands::db::open_vault_db,',
			'    // a comment',
			'',
			'    quick_capture::commands::dismiss_composer,',
			'])',
		].join('\n');
		expect(handlerCommands(lib)).toEqual([
			{ command: 'open_vault_db', module: 'commands' },
			{ command: 'dismiss_composer', module: 'quick_capture' },
		]);
	});

	it('returns an empty list when lib.rs has no generate_handler!', () => {
		expect(handlerCommands('fn run() {}')).toEqual([]);
	});
});

describe('commandCalls', () => {
	it('finds call() commands, multi-line calls included', () => {
		const text = "await call('open_vault_db', { path });\nconst r = await call(\n\t\"scan_vault\",\n\t{}\n);";
		expect(commandCalls(text)).toEqual(['open_vault_db', 'scan_vault']);
	});

	it('ignores other functions whose name ends in call', () => {
		expect(commandCalls("callModCallback('x'); recall('y')")).toEqual([]);
	});

	it('ignores calls named in line and block comments, but not URLs in strings', () => {
		const text = "// see `call('a_cmd')`\n/* call('b_cmd') */\nconst u = 'https://x.dev'; call('c_cmd');";
		expect(commandCalls(text)).toEqual(['c_cmd']);
	});
});

describe('rolesText', () => {
	it('pluralizes each role name', () => {
		expect(rolesText({ component: 2, store: 1, logic: 3, types: 2, rust: 4, other: 1 })).toBe(
			'2 components, 1 store, 3 logic files, 2 types files, 4 Rust files, 1 other',
		);
	});
});

describe('parseCurated', () => {
	it('splits the summary out of the frontmatter and keeps the body', () => {
		expect(parseCurated('---\nsummary: "Owns tabs."\n---\n\n## Responsibility\n\nText.\n')).toEqual({
			summary: 'Owns tabs.',
			body: '## Responsibility\n\nText.',
		});
	});

	it('returns a null summary when the frontmatter is missing', () => {
		expect(parseCurated('## Responsibility\n')).toEqual({ summary: null, body: '## Responsibility' });
	});
});

describe('linkify', () => {
	const exists = (p: string) => ['src/lib/core/editor/editor.service.ts', 'src/lib/core/editor', 'docs/adr/0003-x.md'].includes(p);

	it('links backticked repo paths that exist, relative to the output page', () => {
		const out = linkify('See `src/lib/core/editor/editor.service.ts` and `src/missing.ts`.', {
			sourceDir: 'docs/architecture/modules/src/lib/core',
			pageDir: 'docs/architecture/generated/modules/src/lib/core',
			exists,
		});
		expect(out).toBe(
			'See [`src/lib/core/editor/editor.service.ts`](../../../../../../../src/lib/core/editor/editor.service.ts) and `src/missing.ts`.',
		);
	});

	it('rewrites a relative Markdown link from the source file location to the page location', () => {
		const out = linkify('[ADR-0003](../../../../adr/0003-x.md)', {
			sourceDir: 'docs/architecture/modules/src/lib',
			pageDir: 'docs/architecture/generated',
			exists,
		});
		expect(out).toBe('[ADR-0003](../../adr/0003-x.md)');
	});

	it('uses the link base for every target when one is given, leaving URLs and anchors alone', () => {
		const out = linkify('`src/lib/core/editor` [a](https://x.dev) [b](#top)', {
			sourceDir: 'docs/architecture',
			pageDir: 'out',
			exists,
			linkBase: 'https://github.com/o/r/blob/abc',
		});
		expect(out).toBe('[`src/lib/core/editor`](https://github.com/o/r/blob/abc/src/lib/core/editor) [a](https://x.dev) [b](#top)');
	});
});

/** Writes a tiny repo with two frontend modules, one Rust module and their docs. */
function fixtureRepo(): string {
	const root = mkdtempSync(join(tmpdir(), 'arch-map-'));
	tempDirs.push(root);
	const files: Record<string, string> = {
		'src/lib/core/editor/editor.service.ts': "import { x } from '#lib/utils/path.js';\nawait call('open_vault_db', {});\n",
		'src/lib/core/editor/editor.store.svelte.ts': '',
		'src/lib/utils/path.ts': 'export const x = 1;\n',
		'src/routes/+page.svelte': "<script>\n\timport { s } from '#lib/core/editor/editor.service.js';\n</script>\n",
		'src-tauri/src/lib.rs': '.invoke_handler(tauri::generate_handler![\n    commands::db::open_vault_db,\n])\n',
		'src-tauri/src/commands/db.rs': 'pub fn open_vault_db() {}\n',
		'src/tests/lib/core/editor/editor.service.test.ts': '',
		'src/tests/routes/page.test.ts': '',
		'docs/architecture/overview.md': 'Overview text.\n',
		'docs/architecture/groups/core.md': 'Core group.\n',
		'docs/architecture/modules/src/lib/core/editor.md': '---\nsummary: "Tabs."\n---\n\n## Key files\n\n- `src/lib/core/editor/editor.service.ts`: lifecycle\n',
		'docs/architecture/modules/src/lib/utils.md': '---\nsummary: "Helpers."\n---\n\nBody.\n',
		'docs/architecture/modules/src/routes.md': '---\nsummary: "Routes."\n---\n\nBody.\n',
		'docs/architecture/modules/src-tauri/src.md': '---\nsummary: "Crate root."\n---\n\nBody.\n',
		'docs/architecture/modules/src-tauri/src/commands.md': '---\nsummary: "IPC."\n---\n\nBody.\n',
	};
	for (const [rel, text] of Object.entries(files)) {
		mkdirSync(join(root, rel, '..'), { recursive: true });
		writeFileSync(join(root, rel), text);
	}
	return root;
}

describe('buildModel', () => {
	it('derives module edges, IPC commands, file roles and test folders from the code', () => {
		const model = buildModel(fixtureRepo());
		expect(model.modules.map((m: { path: string }) => m.path)).toEqual([
			'src-tauri/src',
			'src-tauri/src/commands',
			'src/lib/core/editor',
			'src/lib/utils',
			'src/routes',
		]);
		expect(model.edges).toEqual([
			{ from: 'src-tauri/src', to: 'src-tauri/src/commands', count: 1 },
			{ from: 'src/lib/core/editor', to: 'src/lib/utils', count: 1 },
			{ from: 'src/routes', to: 'src/lib/core/editor', count: 1 },
		]);
		expect(model.commands).toEqual([
			{ command: 'open_vault_db', rust: 'src-tauri/src/commands', callers: ['src/lib/core/editor'] },
		]);
		const editor = model.modules.find((m: { path: string }) => m.path === 'src/lib/core/editor');
		expect(editor?.roles).toEqual({ service: 1, store: 1 });
		expect(editor?.tests).toEqual({ dir: 'src/tests/lib/core/editor', files: 1 });
		expect(editor?.summary).toBe('Tabs.');
		const routes = model.modules.find((m: { path: string }) => m.path === 'src/routes');
		expect(routes?.tests).toEqual({ dir: 'src/tests/routes', files: 1 });
	});
});

describe('validate', () => {
	it('passes on a repo whose docs match its modules', () => {
		expect(validate(buildModel(fixtureRepo()))).toEqual([]);
	});

	it('reports a module without a doc, a doc without a folder, a missing summary and a missing repo path', () => {
		const root = fixtureRepo();
		mkdirSync(join(root, 'src/lib/features/tags'), { recursive: true });
		writeFileSync(join(root, 'src/lib/features/tags/Tags.svelte'), '');
		writeFileSync(join(root, 'docs/architecture/modules/src/lib/core/gone.md'), '---\nsummary: "Old."\n---\n');
		writeFileSync(join(root, 'docs/architecture/modules/src/lib/utils.md'), 'No frontmatter.\n');
		writeFileSync(
			join(root, 'docs/architecture/modules/src/routes.md'),
			'---\nsummary: "Routes."\n---\n\n## Key files\n\n- `src/routes/+gone.svelte`: removed\n\n## Collaborators\n\n- `src/lib/core/gone-too`: x, and `src/lib/<feature>` is a pattern\n',
		);
		expect(validate(buildModel(root))).toEqual([
			'docs/architecture/modules/src/lib/core/gone.md: src/lib/core/gone does not exist; delete the doc or fix its path',
			'docs/architecture/modules/src/lib/utils.md: no `summary:` in the frontmatter',
			'docs/architecture/modules/src/routes.md: names src/lib/core/gone-too, which does not exist',
			'docs/architecture/modules/src/routes.md: names src/routes/+gone.svelte, which does not exist',
			'src/lib/features/tags: no doc; write docs/architecture/modules/src/lib/features/tags.md',
		]);
	});
});

describe('render', () => {
	it('writes the index, one page per module, and the graph JSON', () => {
		const pages = render(buildModel(fixtureRepo()), { outDir: 'docs/architecture/generated' });
		expect([...pages.keys()].sort()).toEqual([
			'README.md',
			'graph/modules.json',
			'modules/src-tauri/src.md',
			'modules/src-tauri/src/commands.md',
			'modules/src/lib/core/editor.md',
			'modules/src/lib/utils.md',
			'modules/src/routes.md',
		]);
		const editor = pages.get('modules/src/lib/core/editor.md');
		expect(editor).toContain('# `src/lib/core/editor`');
		expect(editor).toContain('[`src/lib/utils`](../utils.md)');
		expect(editor).toContain('`open_vault_db`');
		expect(editor).toContain('```mermaid');
		const index = pages.get('README.md');
		expect(index).toContain('Overview text.');
		expect(index).toContain('Core group.');
		expect(index).toContain('| [`src/lib/core/editor`](modules/src/lib/core/editor.md) | Tabs. |');
	});

	it('gives the same output for the same input', () => {
		const root = fixtureRepo();
		const a = render(buildModel(root), { outDir: 'out' });
		const b = render(buildModel(root), { outDir: 'out' });
		expect([...a.entries()]).toEqual([...b.entries()]);
	});
});

describe('writePages', () => {
	/** An empty temp folder, removed after the suite. */
	function tempOut(): string {
		const dir = mkdtempSync(join(tmpdir(), 'arch-out-'));
		tempDirs.push(dir);
		return dir;
	}

	it('writes into a folder that holds only a git worktree link, and keeps it', () => {
		const out = tempOut();
		writeFileSync(join(out, '.git'), 'gitdir: /x\n');
		writePages(out, new Map([['README.md', 'a\n']]));
		expect(readFileSync(join(out, '.git'), 'utf8')).toBe('gitdir: /x\n');
		expect(readFileSync(join(out, 'README.md'), 'utf8')).toBe('a\n');
	});

	it('replaces its earlier output, keeping .git and graphify/', () => {
		const out = tempOut();
		writePages(out, new Map([['README.md', 'a\n'], ['modules/gone.md', 'x\n']]));
		writeFileSync(join(out, '.git'), 'gitdir: /x\n');
		mkdirSync(join(out, 'graphify'));
		writeFileSync(join(out, 'graphify/graph.json'), '{}');
		writePages(out, new Map([['README.md', 'b\n']]));
		expect(existsSync(join(out, 'modules/gone.md'))).toBe(false);
		expect(readFileSync(join(out, 'README.md'), 'utf8')).toBe('b\n');
		expect(existsSync(join(out, '.git'))).toBe(true);
		expect(existsSync(join(out, 'graphify/graph.json'))).toBe(true);
	});

	it('refuses a non-empty folder it did not write', () => {
		const out = tempOut();
		writeFileSync(join(out, 'notes.md'), 'mine\n');
		expect(() => writePages(out, new Map([['README.md', 'a\n']]))).toThrow(/refusing/);
		expect(readFileSync(join(out, 'notes.md'), 'utf8')).toBe('mine\n');
	});
});

describe('the real repo', () => {
	it('has a doc for every module and no stale doc or key file', () => {
		expect(validate(buildModel(ROOT))).toEqual([]);
	});

	it('finds at least one frontend caller for most registered commands', () => {
		const { commands } = buildModel(ROOT);
		expect(commands.length).toBeGreaterThan(0);
		const called = commands.filter((c: { callers: string[] }) => c.callers.length > 0);
		expect(called.length / commands.length).toBeGreaterThan(0.8);
	});
});
