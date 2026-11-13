// @ts-nocheck - build-time script, not part of the app's type-checked surface.
// codemap.test.ts imports it, which would otherwise pull it into the
// svelte-check program.
/**
 * ts.mjs
 *
 * TS/Svelte facts for the code map: exported symbols with
 * signatures, spans and doc first sentences, the file header, file-local
 * functions, import bindings, the export table, and binding resolution through
 * re-export chains. Parsing uses the `typescript` parser only, once per code
 * region (`codeRegions` from `scripts/import-graph.mjs`).
 */
import { createRequire } from 'node:module';
import { posix } from 'node:path';

import { codeRegions, resolveSpecifier } from '../import-graph.mjs';

const require = createRequire(import.meta.url);
const ts = require('typescript');

/** Code-unit comparison, the only sort order of the code map. */
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/** Longest signature kept, ellipsis included. */
const SIG_CAP = 120;

/** Longest callee kept in a `= <callee>(…)` signature, ellipsis included. */
const CALLEE_CAP = 40;

/** Longest doc first sentence kept, ellipsis included. */
const DOC_CAP = 160;

/** Hops a binding may follow through re-exports before it counts as unresolved. */
const MAX_DEPTH = 8;

/** A ts-rs binding file; a chain ending there is the DTO named by the file. */
const GENERATED_RE = /^src\/lib\/contracts\/generated\/([^/]+)\.ts$/;

/** Words whose trailing `.` does not end a sentence. */
const ABBREV_RE = /(?:^|[^\w.])(?:e\.g|i\.e|etc|vs|cf)$/i;

/** `{@link X}`, `{@linkcode X}`, `{@linkplain X}`, each with an optional `|` or space label. */
const LINK_RE = /\{@link(?:code|plain)?\s+([^\s|}]+)\s*(?:\|\s*)?([^}]*)\}/g;

/** Collapses every whitespace run, newlines and tabs included, to one space. */
const collapse = (s) => s.replace(/\s+/g, ' ').trim();

/** Cuts `s` to `n` UTF-16 units, the last being `…`, when it is longer; never splits a surrogate pair. */
function cap(s, n) {
	if (s.length <= n) return s;
	const keep = /[\uD800-\uDBFF]/.test(s[n - 2]) ? n - 2 : n - 1;
	return `${s.slice(0, keep)}…`;
}

/**
 * The first sentence of a doc comment: CRLF read as LF, links replaced by their
 * label or target, cut at the first blank line, whitespace collapsed, ended at the
 * first `.`, `?` or `!` outside backticks that is followed by the end, or by a
 * space and an uppercase letter, backtick, `(` or `[`. A `.` after `e.g`,
 * `i.e`, `etc`, `vs` or `cf` does not end it.
 *
 * @param {string} text doc text without comment markers
 * @returns {string} at most 160 UTF-16 units; empty when the text is blank
 */
export function firstSentence(text) {
	const linked = text.replace(/\r\n?/g, '\n').replace(LINK_RE, (_, target, label) => label.trim() || target);
	const s = collapse(linked.split(/\n[ \t]*\n/)[0]);
	let inCode = false;
	for (let i = 0; i < s.length; i++) {
		const c = s[i];
		if (c === '`') inCode = !inCode;
		if (inCode || (c !== '.' && c !== '?' && c !== '!')) continue;
		const ends = i + 1 === s.length || (s[i + 1] === ' ' && /[\p{Lu}`([]/u.test(s[i + 2] ?? ''));
		if (!ends || (c === '.' && ABBREV_RE.test(s.slice(0, i)))) continue;
		return cap(s.slice(0, i + 1), DOC_CAP);
	}
	return cap(s, DOC_CAP);
}

/** The description of a raw `/** … *\/` block: markers and leading `*` removed, cut before the first tag line. */
function blockText(raw) {
	const lines = raw
		.replace(/^\/\*\*/, '')
		.replace(/\*\/$/, '')
		.split('\n')
		.map((l) => l.replace(/^\s*\* ?/, ''));
	const tag = lines.findIndex((l) => /^\s*@\w/.test(l));
	return (tag === -1 ? lines : lines.slice(0, tag)).join('\n');
}

/** Doc first sentence of the last JSDoc block whose host is `host`. */
function docOf(node, host) {
	const blocks = ts.getJSDocCommentsAndTags(node).filter((d) => ts.isJSDoc(d) && d.parent === host);
	const last = blocks.at(-1);
	return last ? firstSentence(ts.getTextOfJSDocComment(last.comment) ?? '') : '';
}

/** Whether a statement carries an `export` modifier. */
const isExported = (node) => Boolean(node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword));

/** Whether a statement carries a `default` modifier (`export default function f`). */
const isDefault = (node) => Boolean(node.modifiers?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword));

/** The root identifier of a property access chain such as `A.B.C`, or null. */
function accessRoot(node) {
	if (!node || !ts.isPropertyAccessExpression(node)) return null;
	let n = node;
	while (ts.isPropertyAccessExpression(n)) n = n.expression;
	return ts.isIdentifier(n) ? n.text : null;
}

/** Whether an expression is an arrow function or a function expression. */
const isFnExpr = (node) => Boolean(node) && (ts.isArrowFunction(node) || ts.isFunctionExpression(node));

/** `<T>(a: A, b: B): R` of a function-like node, each part as written, whitespace collapsed. */
function fnSig(fn, sf) {
	const tp = fn.typeParameters ? `<${fn.typeParameters.map((p) => p.getText(sf)).join(', ')}>` : '';
	const ret = fn.type ? `: ${fn.type.getText(sf)}` : '';
	return collapse(`${tp}(${fn.parameters.map((p) => p.getText(sf)).join(', ')})${ret}`);
}

/** Signature of a `const|let` declarator: `: <type>`, a function signature, or ` = <callee>(…)`. */
function declaratorSig(d, sf) {
	if (d.type) return `: ${collapse(d.type.getText(sf))}`;
	if (isFnExpr(d.initializer)) return fnSig(d.initializer, sf);
	if (d.initializer && ts.isCallExpression(d.initializer))
		return ` = ${cap(collapse(d.initializer.expression.getText(sf)), CALLEE_CAP)}(…)`;
	return '';
}

/** Whether an initializer is an object literal with a getter: a store object. */
const isStoreObject = (init) =>
	Boolean(init) && ts.isObjectLiteralExpression(init) && init.properties.some((p) => ts.isGetAccessorDeclaration(p));

/** The `props:` field of a component from its `$props()` destructuring, or ''. */
function propsOf(sf) {
	for (const st of sf.statements) {
		if (!ts.isVariableStatement(st)) continue;
		for (const d of st.declarationList.declarations) {
			const init = d.initializer;
			if (!init || !ts.isCallExpression(init) || init.expression.getText(sf) !== '$props') continue;
			if (!ts.isObjectBindingPattern(d.name)) continue;
			const props = d.name.elements.map((e) => {
				const key = (e.propertyName ?? e.name).getText(sf);
				if (e.dotDotDotToken) return `...${key}`;
				if (!e.initializer) return key;
				const bindable = ts.isCallExpression(e.initializer) && e.initializer.expression.getText(sf) === '$bindable';
				return bindable ? `${key}=$bindable` : `${key}=`;
			});
			if (props.length) return ` props:${props.join(',')}`;
		}
	}
	return '';
}

/** Lines of a text, a final newline not starting another. */
const lineCount = (text) => (text === '' ? 0 : text.split('\n').length - (text.endsWith('\n') ? 1 : 0));

/**
 * The header doc of a file's first code region, or '': the first JSDoc block
 * before the first statement, when that statement is an import or an
 * export-from, or when two or more JSDoc blocks precede it.
 */
function headerOf(region) {
	const { sf } = region;
	const first = sf.statements[0];
	if (!first) return '';
	const code = sf.getFullText();
	const blocks = (ts.getLeadingCommentRanges(code, first.pos) ?? [])
		.map((r) => code.slice(r.pos, r.end))
		.filter((t) => t.startsWith('/**') && t !== '/**/');
	if (!blocks.length) return '';
	const importLike = ts.isImportDeclaration(first) || (ts.isExportDeclaration(first) && Boolean(first.moduleSpecifier));
	return importLike || blocks.length >= 2 ? firstSentence(blockText(blocks[0])) : '';
}

/** Import bindings of one region: static named, default and namespace imports, and `const { a } = await import(x)`. */
function bindingsOf(region, out) {
	const { sf, lineOffset } = region;
	const lineOf = (n) => lineOffset + sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
	for (const st of sf.statements) {
		if (!ts.isImportDeclaration(st) || !ts.isStringLiteral(st.moduleSpecifier) || !st.importClause) continue;
		const c = st.importClause;
		const spec = st.moduleSpecifier.text;
		const stmtType = c.phaseModifier === ts.SyntaxKind.TypeKeyword;
		const line = lineOf(st);
		const add = (local, imported, node, typeOnly) =>
			out.push({ local, imported, spec, line, specLine: lineOf(node), typeOnly, dynamic: false });
		if (c.name) add(c.name.text, 'default', c.name, stmtType);
		const nb = c.namedBindings;
		if (nb && ts.isNamespaceImport(nb)) add(nb.name.text, '*', nb, stmtType);
		if (nb && ts.isNamedImports(nb))
			for (const e of nb.elements) add(e.name.text, (e.propertyName ?? e.name).text, e, stmtType || e.isTypeOnly);
	}
	const visit = (n) => {
		if (ts.isVariableDeclaration(n) && ts.isObjectBindingPattern(n.name) && n.initializer) {
			const init = ts.isAwaitExpression(n.initializer) ? n.initializer.expression : null;
			const a = init && ts.isCallExpression(init) && init.expression.kind === ts.SyntaxKind.ImportKeyword ? init.arguments[0] : null;
			if (a && (ts.isStringLiteral(a) || ts.isNoSubstitutionTemplateLiteral(a))) {
				for (const e of n.name.elements) {
					if (e.dotDotDotToken || !ts.isIdentifier(e.name)) continue;
					const line = lineOf(e);
					out.push({
						local: e.name.text,
						imported: (e.propertyName ?? e.name).getText(sf),
						spec: a.text,
						line,
						specLine: line,
						typeOnly: false,
						dynamic: true,
					});
				}
			}
		}
		ts.forEachChild(n, visit);
	};
	visit(sf);
}

/**
 * Parses one TS or Svelte file and reads its F2 facts and F3 inputs.
 *
 * Symbol kinds: `fn`, `class`, `interface`, `type`, `const`, `store` (an
 * exported const object literal with a getter), `method` (an instance-script
 * `export function` or `export const` arrow, kept out of the export table) and
 * `component` (every `.svelte` file, at line 1, its span the file's line
 * count, `sig` its ` props:…` field). An overloaded function counts once, at
 * its implementation. `export default function f` and `export default class C`
 * are the export `default` of the symbol `f` or `C`; `export default <expr>`
 * is not read.
 *
 * @param {string} file repo-relative POSIX path
 * @param {string} text file content
 * @returns {{
 *   file: string,
 *   regions: {sf: import('typescript').SourceFile, lineOffset: number, module: boolean}[],
 *   header: string,
 *   symbols: {name: string, kind: string, line: number, span: number, sig: string, doc: string}[],
 *   locals: {name: string, kind: 'fn', line: number, span: number, sig: string}[],
 *   bindings: {local: string, imported: string, spec: string, line: number, specLine: number, typeOnly: boolean, dynamic: boolean}[],
 *   exports: {names: Map<string, {local: string} | {spec: string, name: string}>, stars: string[]},
 *   aliases: Map<string, string>,
 * }} lines are 1-based from the file start; symbols and locals by (line, name);
 *   `imported` is `default` or `*` for default and namespace imports; an
 *   export entry `{spec, name: '*'}` is an `export * as` namespace; `aliases`
 *   maps a top-level non-exported `const X = A.B…` to its root identifier `A`
 */
export function extractTsFile(file, text) {
	const svelte = file.endsWith('.svelte');
	const regions = codeRegions(file, text).map(({ code, lineOffset, module }) => ({
		sf: ts.createSourceFile('x.ts', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS),
		lineOffset,
		module,
	}));
	const symbols = [];
	const locals = [];
	const bindings = [];
	const names = new Map();
	const stars = [];
	const aliases = new Map();
	if (svelte) {
		const instance = regions.find((r) => !r.module);
		const sig = instance ? propsOf(instance.sf) : '';
		symbols.push({ name: posix.basename(file, '.svelte'), kind: 'component', line: 1, span: lineCount(text), sig, doc: '' });
		names.set('default', { local: 'default' });
	}
	for (const region of regions) {
		const { sf, lineOffset } = region;
		const line = (n) => lineOffset + sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
		const span = (n) => sf.getLineAndCharacterOfPosition(n.end).line - sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
		const instance = svelte && !region.module;
		const exportName = (st, name) => {
			if (!instance) names.set(isDefault(st) ? 'default' : name, { local: name });
		};
		bindingsOf(region, bindings);
		for (const st of sf.statements) {
			const exported = isExported(st);
			if (ts.isFunctionDeclaration(st) && st.name) {
				// An overload signature has no body; the implementation carries the symbol.
				if (!st.body) continue;
				const entry = { name: st.name.text, line: line(st), span: span(st), sig: cap(fnSig(st, sf), SIG_CAP) };
				if (!exported) locals.push({ ...entry, kind: 'fn' });
				else {
					symbols.push({ ...entry, kind: instance ? 'method' : 'fn', doc: docOf(st, st) });
					exportName(st, st.name.text);
				}
			} else if (ts.isVariableStatement(st)) {
				for (const d of st.declarationList.declarations) {
					if (!ts.isIdentifier(d.name)) continue;
					const fn = isFnExpr(d.initializer);
					const entry = { name: d.name.text, line: line(d), span: span(d), sig: cap(declaratorSig(d, sf), SIG_CAP) };
					if (!exported) {
						if (fn) locals.push({ ...entry, kind: 'fn' });
						const root = accessRoot(d.initializer);
						if (root) aliases.set(d.name.text, root);
						continue;
					}
					const doc = docOf(d, d) || docOf(st, st);
					if (instance) {
						if (fn) symbols.push({ ...entry, kind: 'method', doc });
						continue;
					}
					const kind = fn ? 'fn' : isStoreObject(d.initializer) ? 'store' : 'const';
					symbols.push({ ...entry, kind, doc });
					exportName(st, d.name.text);
				}
			} else if (exported && !instance && (ts.isClassDeclaration(st) || ts.isInterfaceDeclaration(st) || ts.isTypeAliasDeclaration(st))) {
				if (!st.name) continue;
				const kind = ts.isClassDeclaration(st) ? 'class' : ts.isInterfaceDeclaration(st) ? 'interface' : 'type';
				const ext = ts.isClassDeclaration(st)
					? st.heritageClauses?.find((h) => h.token === ts.SyntaxKind.ExtendsKeyword)?.types[0]
					: null;
				const sig = ext ? cap(` extends ${collapse(ext.getText(sf))}`, SIG_CAP) : '';
				symbols.push({ name: st.name.text, kind, line: line(st), span: span(st), sig, doc: docOf(st, st) });
				exportName(st, st.name.text);
			} else if (ts.isExportDeclaration(st) && !instance) {
				const spec = st.moduleSpecifier && ts.isStringLiteral(st.moduleSpecifier) ? st.moduleSpecifier.text : null;
				if (!st.exportClause) {
					if (spec !== null) stars.push(spec);
				} else if (ts.isNamespaceExport(st.exportClause)) {
					if (spec !== null) names.set(st.exportClause.name.text, { spec, name: '*' });
				} else if (ts.isNamedExports(st.exportClause)) {
					for (const e of st.exportClause.elements) {
						const local = (e.propertyName ?? e.name).text;
						names.set(e.name.text, spec === null ? { local } : { spec, name: local });
					}
				}
			}
		}
	}
	const byLineName = (a, b) => a.line - b.line || cmp(a.name, b.name);
	return {
		file,
		regions,
		header: regions.length ? headerOf(regions[0]) : '',
		symbols: symbols.sort(byLineName),
		locals: locals.sort(byLineName),
		bindings,
		exports: { names, stars },
		aliases,
	};
}

/** The package of a bare specifier: `@scope/name` or the first segment. */
function packageOf(spec) {
	const parts = spec.split('/');
	return spec.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

/**
 * Resolves `name` imported from `spec` by the file `from`. The name `*` (an
 * `export * as` namespace) stays file-level, like a namespace import.
 *
 * @returns {string | null} `<file>:<name>` (`<file>:default` for a component),
 *   `dto:<T>`, `external:<package>`, or null when the chain breaks, loops or
 *   runs past MAX_DEPTH hops
 */
function resolveImport(from, spec, name, ctx, depth, seen) {
	const target = resolveSpecifier(from, spec, ctx.exists);
	if (target === null) return `external:${packageOf(spec)}`;
	if (name === '*') return null;
	return resolveExport(target, name, ctx, depth, seen);
}

/** Resolves the export `name` of `file`, following its export table and bindings. */
function resolveExport(file, name, ctx, depth, seen) {
	const dto = GENERATED_RE.exec(file);
	if (dto) return `dto:${dto[1]}`;
	const key = `${file}\0${name}`;
	if (depth > MAX_DEPTH || seen.has(key)) return null;
	seen.add(key);
	const facts = ctx.files.get(file);
	if (!facts) return null;
	const entry = facts.exports.names.get(name);
	if (entry && 'spec' in entry) return resolveImport(file, entry.spec, entry.name, ctx, depth + 1, seen);
	if (entry) {
		// `const Root = Pkg.Root` re-exported as `Root` is the package's member.
		const root = facts.aliases.get(entry.local);
		const ab = root ? facts.bindings.find((x) => x.local === root && !x.dynamic) : null;
		if (ab && resolveSpecifier(file, ab.spec, ctx.exists) === null) return `external:${packageOf(ab.spec)}`;
		const b = facts.bindings.find((x) => x.local === entry.local && !x.dynamic);
		if (!b) return `${file}:${entry.local}`;
		return b.imported === '*' ? null : resolveImport(file, b.spec, b.imported, ctx, depth + 1, seen);
	}
	for (const star of facts.exports.stars) {
		const id = resolveImport(file, star, name, ctx, depth + 1, seen);
		if (id !== null) return id;
	}
	return null;
}

/**
 * Resolves every non-namespace binding of every file. A specifier resolves
 * only to a file of `files`, so a folder or an unparsed file never shadows the
 * `.ts` file or `index.ts` it stands for.
 *
 * @param {Map<string, ReturnType<typeof extractTsFile>>} files facts by repo-relative path
 * @returns {{from: string, local: string, imported: string, spec: string, line: number, specLine: number, typeOnly: boolean, dynamic: boolean, id: string | null}[]}
 *   files by path, bindings in source order; `id` as `resolveImport` gives it
 */
export function resolveBindings(files) {
	const ctx = { files, exists: (p) => files.has(p) };
	const out = [];
	for (const from of [...files.keys()].sort(cmp)) {
		for (const b of files.get(from).bindings) {
			if (b.imported === '*') continue;
			out.push({ from, ...b, id: resolveImport(from, b.spec, b.imported, ctx, 0, new Set()) });
		}
	}
	return out;
}

/**
 * The public symbols: those a non-test file outside their module imports.
 *
 * @param {{from: string, id: string | null}[]} resolved output of `resolveBindings`
 * @param {(file: string) => string | null} moduleOf the module of a file
 * @param {(file: string) => boolean} isTest whether a file is a test or e2e file
 * @returns {Set<string>} symbol IDs, inserted in code-unit order
 */
export function publicIds(resolved, moduleOf, isTest) {
	const out = new Set();
	for (const r of resolved) {
		if (!r.id || r.id.startsWith('dto:') || r.id.startsWith('external:') || isTest(r.from)) continue;
		if (moduleOf(r.from) !== moduleOf(r.id.slice(0, r.id.indexOf(':')))) out.add(r.id);
	}
	return new Set([...out].sort(cmp));
}
