import { describe, it, expect, vi } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
import { buildKBPage } from '#lib/plugins/queryjs/queryjs.logic.js';
import type { KBPageRootKeyV1 } from '#lib/plugins/queryjs/contract/kb-api.v1.js';
import { buildNoteRecord } from '#lib/features/collection/collection.logic.js';
import type { PropertyIndexRecord } from '#lib/features/collection/collection.types.js';
import type { NoteEntryV2 } from '#lib/types/vault-v2.types.js';

vi.mock('#lib/core/editor/editor.service.js', () => ({
	openFileInEditor: vi.fn(),
}));

/**
 * Firewall between the Rust IPC DTOs (`NoteEntryV2`, the collection
 * `PropertyIndexRecord`) and the script-facing `KBPageV1`: `buildKBPage` maps one to
 * the other, and nothing in the contract or the public KBAPI signatures may
 * name a DTO. A new or renamed DTO field then either fails to compile in the
 * mapping or leaves the page unchanged; exposing it needs a contract edit.
 */

const QUERYJS_DIR = resolve(process.cwd(), 'src/lib/plugins/queryjs');

/** Module specifiers that carry IPC DTOs. */
const DTO_MODULE = /vault-v2|#lib\/contracts|\/generated\/|collection\.types/;

/** Every `import ... from` / `export ... from` / `import()` specifier in `source`. */
function moduleSpecifiers(source: string): string[] {
	const sf = ts.createSourceFile('x.ts', source, ts.ScriptTarget.Latest, true);
	const specs: string[] = [];
	const visit = (node: ts.Node) => {
		if (
			(ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
			node.moduleSpecifier &&
			ts.isStringLiteral(node.moduleSpecifier)
		) {
			specs.push(node.moduleSpecifier.text);
		}
		if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) {
			const lit = node.argument.literal;
			if (ts.isStringLiteral(lit)) specs.push(lit.text);
		}
		ts.forEachChild(node, visit);
	};
	visit(sf);
	return specs;
}

function read(rel: string): string {
	return readFileSync(resolve(QUERYJS_DIR, rel), 'utf8');
}

describe('KBAPI DTO firewall', () => {
	describe('imports', () => {
		const contractFiles = readdirSync(resolve(QUERYJS_DIR, 'contract')).filter((f) =>
			f.endsWith('.ts'),
		);

		it('finds the contract files', () => {
			expect(contractFiles).toContain('kb-api.v1.ts');
		});

		it.each(contractFiles)('contract/%s imports only other contract files', (file) => {
			for (const spec of moduleSpecifiers(read(`contract/${file}`))) {
				expect(spec, `contract/${file} imports ${spec}`).toMatch(/^\.\//);
				expect(spec).not.toMatch(DTO_MODULE);
			}
		});

		it('queryjs.types.ts re-exports only the contract', () => {
			const specs = moduleSpecifiers(read('queryjs.types.ts'));
			expect(specs.length).toBeGreaterThan(0);
			for (const spec of specs) {
				expect(spec, `queryjs.types.ts imports ${spec}`).toMatch(/^\.\/contract\//);
			}
		});

		it('the detector sees type-only and inline import() specifiers', () => {
			expect(
				moduleSpecifiers(
					"import type { A } from '#lib/types/vault-v2.types.js';\nlet b: import('../x/generated/B').B;",
				),
			).toEqual(['#lib/types/vault-v2.types.js', '../x/generated/B']);
		});
	});

	describe('public KBAPI signatures', () => {
		const source = read('kb-api.ts');
		const sf = ts.createSourceFile('kb-api.ts', source, ts.ScriptTarget.Latest, true);

		/** Names bound by imports from DTO modules, e.g. `NoteEntryV2`, `PropertyIndexRecord`. */
		const dtoNames = new Set<string>();
		for (const stmt of sf.statements) {
			if (
				ts.isImportDeclaration(stmt) &&
				ts.isStringLiteral(stmt.moduleSpecifier) &&
				DTO_MODULE.test(stmt.moduleSpecifier.text)
			) {
				const bindings = stmt.importClause?.namedBindings;
				if (bindings && ts.isNamedImports(bindings)) {
					for (const el of bindings.elements) dtoNames.add(el.name.text);
				}
			}
		}
		const importedDtoNames = [...dtoNames].sort();

		/** Adds to `names` the local type aliases and interfaces that name one of them (`type Raw = NoteEntryV2`). */
		function addLocalAliases(file: ts.SourceFile, names: Set<string>): void {
			const locals = file.statements.filter(
				(s): s is ts.TypeAliasDeclaration | ts.InterfaceDeclaration =>
					ts.isTypeAliasDeclaration(s) || ts.isInterfaceDeclaration(s),
			);
			let grew = true;
			while (grew) {
				grew = false;
				for (const decl of locals) {
					if (names.has(decl.name.text)) continue;
					const words = new Set(decl.getText(file).match(/[A-Za-z_$][\w$]*/g) ?? []);
					if ([...names].some((n) => words.has(n))) {
						names.add(decl.name.text);
						grew = true;
					}
				}
			}
		}
		addLocalAliases(sf, dtoNames);

		it('the alias detector follows local aliases and interfaces of a DTO', () => {
			const probe = ts.createSourceFile(
				'probe.ts',
				'interface Wrap { e: Raw }\ntype Raw = NoteEntryV2;\ntype Other = string;',
				ts.ScriptTarget.Latest,
				true,
			);
			const names = new Set(['NoteEntryV2']);
			addLocalAliases(probe, names);
			expect([...names].sort()).toEqual(['NoteEntryV2', 'Raw', 'Wrap']);
		});

		const kbapi = sf.statements.find(
			(s): s is ts.ClassDeclaration => ts.isClassDeclaration(s) && s.name?.text === 'KBAPI',
		);

		/** Public instance members; the constructor is internal (the widget builds KBAPI). */
		const publicMembers = (kbapi?.members ?? []).filter((m) => {
			if (ts.isConstructorDeclaration(m)) return false;
			const mods = ts.canHaveModifiers(m) ? (ts.getModifiers(m) ?? []) : [];
			const hidden = mods.some(
				(mod) =>
					mod.kind === ts.SyntaxKind.PrivateKeyword ||
					mod.kind === ts.SyntaxKind.ProtectedKeyword,
			);
			return !hidden && !(m.name && ts.isPrivateIdentifier(m.name));
		});

		function memberName(m: ts.ClassElement): string {
			return m.name ? m.name.getText(sf) : '<anonymous>';
		}

		/** The written signature: everything but a method body or a property initializer. */
		function signatureText(m: ts.ClassElement): string {
			const end =
				(ts.isMethodDeclaration(m) || ts.isGetAccessor(m)) && m.body
					? m.body.getStart(sf)
					: ts.isPropertyDeclaration(m) && m.initializer
						? m.initializer.getStart(sf)
						: m.getEnd();
			return source.slice(m.getStart(sf), end);
		}

		it('finds the class, its DTO imports and its public members', () => {
			expect(kbapi).toBeDefined();
			expect(importedDtoNames).toEqual(['NoteEntryV2', 'PropertyIndexRecord']);
			expect(publicMembers.map(memberName)).toContain('pages');
		});

		it('every public method and getter declares its return type', () => {
			const untyped = publicMembers
				.filter((m) => (ts.isMethodDeclaration(m) || ts.isGetAccessor(m)) && !m.type)
				.map(memberName);
			expect(untyped).toEqual([]);
		});

		it('no public signature names a DTO type', () => {
			const leaks = publicMembers.flatMap((m) => {
				const words = new Set(signatureText(m).match(/[A-Za-z_$][\w$]*/g) ?? []);
				return [...dtoNames].filter((n) => words.has(n)).map((n) => `${memberName(m)}: ${n}`);
			});
			expect(leaks).toEqual([]);
		});
	});

	describe('mapping snapshot', () => {
		const PATH = '/vault/people/ada.md';
		const TEAM = '/vault/Team.md';

		/** Every NoteEntryV2 field populated, so a DTO field the page reads is never empty. */
		const fullEntry: NoteEntryV2 = {
			path: PATH,
			title: 'ada',
			// Rust stores frontmatter under canonical keys (`type` -> `_type`, aliases.rs).
			frontmatter: { _type: 'person', role: 'engineer', _belongs_to: '[[Team]]' },
			outgoingLinks: [{ target: 'Team', alias: 'the team', heading: 'Intro', position: 4 }],
			tags: ['work'],
			modifiedAt: 1700000000,
			createdAt: 1690000000,
			size: 42,
			wordCount: 7,
			snippet: 'Body',
			tasks: [
				{
					text: 'ship it',
					checked: true,
					indent: 0,
					lineNumber: 9,
					status: 'done',
					metadata: {
						description: 'ship it',
						dueDate: '2026-11-02',
						priority: 'high',
						id: 'ship',
						dependsOn: ['plan'],
						tags: ['work'],
					},
				},
			],
			isA: 'Person',
			organized: true,
			archived: false,
			favorite: true,
			belongsTo: ['Team'],
			relatedTo: ['Bob'],
			hasMany: ['Task one'],
			relationships: { _belongs_to: ['Team'] },
		};

		/** The record `project_note_record` makes from `fullEntry` (every injection fires). */
		function fullRecord(): PropertyIndexRecord {
			return {
				path: PATH,
				name: 'ada.md',
				basename: 'ada',
				folder: '/vault/people',
				ext: '.md',
				mtime: 1700000000000,
				ctime: 1690000000000,
				size: 42,
				properties: new Map<string, unknown>([
					['role', 'engineer'],
					['_type', 'Person'],
					['organized', true],
					['archived', false],
					['favorite', true],
					['tags', ['work']],
					['_belongs_to', ['Team']],
					['_related_to', ['Bob']],
					['_has_many', ['Task one']],
				]),
			};
		}

		const sortedKeys = (o: object) => Object.keys(o).sort();

		it('freezes the page root and file key sets', () => {
			const page = buildKBPage(fullRecord(), fullEntry, [PATH, TEAM]);
			expect(sortedKeys(page)).toEqual([
				'_belongs_to',
				'_has_many',
				'_related_to',
				'_type',
				'archived',
				'favorite',
				'file',
				'organized',
				'role',
				'tags',
			]);
			expect(sortedKeys(page.file)).toEqual([
				'basename',
				'ctime',
				'folder',
				'inlinks',
				'link',
				'mtime',
				'name',
				'outlinks',
				'path',
				'size',
				'tags',
				'tasks',
			]);
			expect(page.file.tasks).toEqual([
				{ text: 'ship it', completed: true, line: 9, path: PATH },
			]);
			expect(page.file.outlinks).toEqual([{ path: TEAM, display: 'the team' }]);
		});

		it('a new DTO field (dry run) leaves the page unchanged', () => {
			const before = buildKBPage(fullRecord(), fullEntry, [PATH, TEAM]);
			const widenedEntry = { ...fullEntry, newRustField: 'x' } as NoteEntryV2;
			const widenedRecord = { ...fullRecord(), newRustField: 'x' } as PropertyIndexRecord;
			const after = buildKBPage(widenedRecord, widenedEntry, [PATH, TEAM]);
			expect(sortedKeys(after)).toEqual(sortedKeys(before));
			expect(sortedKeys(after.file)).toEqual(sortedKeys(before.file));
		});
	});

	describe('page-root keys injected by project_note_record', () => {
		/**
		 * The contract's list, checked against `KBPageRootKeyV1` both ways: a
		 * missing or extra name fails `pnpm check`.
		 */
		const ROOT_KEYS = {
			file: true,
			tags: true,
			organized: true,
			archived: true,
			favorite: true,
			_type: true,
			_belongs_to: true,
			_related_to: true,
			_has_many: true,
		} satisfies Record<KBPageRootKeyV1, true>;

		const fixture = JSON.parse(
			readFileSync(
				resolve(process.cwd(), 'src-tauri/tests/fixtures/note-record-projection.json'),
				'utf8',
			),
		) as {
			cases: Array<{
				name: string;
				path: string;
				content: string;
				injected?: Record<string, unknown>;
				record?: Record<string, unknown>;
			}>;
		};

		/**
		 * The Rust golden test (`vault_file_ops_test.rs`) holds `injected` to
		 * exactly what `project_note_record` adds, so a new Rust injection
		 * reaches this list through the fixture. Only injections that some
		 * case's `injected` map fires are seen (the Rust test also drops an
		 * injected value equal to the frontmatter one), so a new conditional
		 * injection needs a fixture case with an `injected` map that fires it.
		 */
		it('the injected keys of the golden fixture are the contract root keys', () => {
			const injected = new Set<string>(['file']);
			for (const c of fixture.cases) {
				for (const key of Object.keys(c.injected ?? {})) injected.add(key);
			}
			expect([...injected].sort()).toEqual(Object.keys(ROOT_KEYS).sort());
		});

		/** A record built the way `collection.service::fromV2` builds one from Rust. */
		function rustRecord(c: (typeof fixture.cases)[number]): PropertyIndexRecord {
			const base = buildNoteRecord(c.path, c.content);
			return { ...base, properties: new Map(Object.entries(c.record ?? {})) };
		}

		it('both property paths give the same page values for multi-line and quoted-comma frontmatter', () => {
			const c = fixture.cases.find(
				(fc) => fc.name === 'multi-line values and arrays with a quoted comma',
			);
			expect(c).toBeDefined();
			if (!c) return;
			const fromRust = buildKBPage(rustRecord(c), undefined, [c.path]) as Record<
				string,
				unknown
			>;
			const fromTs = buildKBPage(buildNoteRecord(c.path, c.content), undefined, [
				c.path,
			]) as Record<string, unknown>;
			const keys = Object.keys(c.record ?? {});
			expect(keys).toEqual(
				expect.arrayContaining(['_type', 'summary', 'folded', 'plain', 'aliases', 'listed']),
			);
			for (const key of keys) {
				expect(fromTs[key], key).toEqual(fromRust[key]);
			}
			expect(fromTs._type).toBe('Person');
			expect(fromTs.summary).toBe('line one\nline two\n');
			expect(fromTs.aliases).toEqual(['a, b', 'c']);
			expect(fromTs.listed).toEqual(['x, y', 'z']);
		});
	});
});
