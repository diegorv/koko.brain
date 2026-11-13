// @ts-nocheck - build-time script, not part of the app's type-checked surface.
// codemap.test.ts imports it, which would otherwise pull it into the
// svelte-check program.
/**
 * ts.mjs
 *
 * TS/Svelte facts for the code map: exported symbols with
 * signatures, spans and doc first sentences, the file header, file-local
 * functions, import bindings, the export table, and binding resolution through
 * re-export chains (F2, F3); uses of those bindings in scripts and Svelte
 * markup with their F4e enclosing scope, and the `by` users built from them
 * (F4); store objects with their members, readers, writers and `w-via` (F5);
 * the IPC and event sites of the TS end (F8, F9); test relations (F6);
 * registries and facets (F11); side-effect sites (F15); component mounts
 * (F17). Parsing uses the `typescript` parser only, once per code region
 * (`codeRegions` from `scripts/import-graph.mjs`); markup is scanned as text.
 */
import { createRequire } from 'node:module';
import { posix } from 'node:path';

import { codeRegions, extractImportsFromSource, resolveSpecifier } from '../import-graph.mjs';

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

/**
 * The source text of `[start, end)` of a parsed file with every comment inside
 * `root` that lies in that range replaced by a space, whitespace collapsed.
 */
function codeExcerpt(sf, root, start, end) {
	const comments = new Map();
	const visit = (n) => {
		// Comments on the line of the previous token are trailing ranges, the rest leading ones.
		const ranges = [...(ts.getTrailingCommentRanges(sf.text, n.pos) ?? []), ...(ts.getLeadingCommentRanges(sf.text, n.pos) ?? [])];
		for (const r of ranges) if (r.pos >= start && r.end <= end) comments.set(r.pos, r.end);
		for (const c of n.getChildren(sf)) visit(c);
	};
	visit(root);
	let out = '';
	let at = start;
	for (const pos of [...comments.keys()].sort((a, b) => a - b)) {
		out += `${sf.text.slice(at, pos)} `;
		at = comments.get(pos);
	}
	return collapse(out + sf.text.slice(at, end));
}

/** `codeExcerpt` of one whole node. */
const nodeExcerpt = (sf, node) => codeExcerpt(sf, node, node.getStart(sf), node.end);

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

/**
 * Import bindings of one region: static named, default and namespace imports,
 * and `const { a } = await import(x)`. `top` is the region's file scope,
 * `(module)` or `(script)`: the `enclosing` of a static binding, while a
 * dynamic one takes the F4e enclosing of its declaration.
 */
function bindingsOf(region, out, top) {
	const { sf, lineOffset } = region;
	const lineOf = (n) => lineOffset + sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
	for (const st of sf.statements) {
		if (!ts.isImportDeclaration(st) || !ts.isStringLiteral(st.moduleSpecifier) || !st.importClause) continue;
		const c = st.importClause;
		const spec = st.moduleSpecifier.text;
		const stmtType = c.phaseModifier === ts.SyntaxKind.TypeKeyword;
		const line = lineOf(st);
		const add = (local, imported, node, typeOnly) =>
			out.push({ local, imported, spec, line, specLine: lineOf(node), typeOnly, dynamic: false, enclosing: top });
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
						importLine: lineOf(init),
						enclosing: enclosingOf(e, top, lineOf),
					});
				}
			}
		}
		ts.forEachChild(n, visit);
	};
	visit(sf);
}

/** Methods whose call changes their receiver, for the F5 write sets. */
const MUTATORS = new Set(['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'fill', 'set', 'delete', 'clear', 'add']);

/** Callees whose callback is a reactive effect scope. */
const EFFECTS = new Set(['$effect', '$effect.pre', '$effect.root']);

/** Markup that holds no template expressions: comments, `<script>` and `<style>` blocks. */
const MARKUP_HIDE_RE = /<!--[\s\S]*?-->|<script\b[^>]*>[\s\S]*?<\/script\b[^>]*>|<style\b[^>]*>[\s\S]*?<\/style\b[^>]*>/gi;

/** `s` with every character but a newline replaced by a space. */
const blankKeepLines = (s) => s.replace(/[^\n]/g, ' ');

/** The expression under `(…)`, `as T`, `satisfies T`, `<T>` and `!` wrappers. */
function unwrap(node) {
	let n = node;
	while (
		n &&
		(ts.isParenthesizedExpression(n) ||
			ts.isAsExpression(n) ||
			ts.isSatisfiesExpression(n) ||
			ts.isTypeAssertionExpression(n) ||
			ts.isNonNullExpression(n))
	)
		n = n.expression;
	return n;
}

/** Whether a variable declaration sits in a statement directly under the source file. */
const isTopLevel = (v) =>
	ts.isVariableDeclarationList(v.parent) && ts.isVariableStatement(v.parent.parent) && ts.isSourceFile(v.parent.parent.parent);

/** The name of the top-level `const` an object literal initializes (through wrappers), or null. */
function topConstOf(obj) {
	let e = obj;
	while (e.parent && unwrap(e.parent) === obj) e = e.parent;
	const v = e.parent;
	if (!v || !ts.isVariableDeclaration(v) || v.initializer !== e || !ts.isIdentifier(v.name) || !isTopLevel(v)) return null;
	return v.parent.flags & ts.NodeFlags.Const ? v.name.text : null;
}

/** The text of a property or member name. */
const propName = (name) =>
	ts.isIdentifier(name) || ts.isPrivateIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)
		? name.text
		: name.getText();

/** `$effect`, `$effect.pre`, `$derived.by` and the like for a callee written as `a` or `a.b`, else ''. */
function calleeText(call) {
	const e = call.expression;
	if (ts.isIdentifier(e)) return e.text;
	if (ts.isPropertyAccessExpression(e) && ts.isIdentifier(e.expression) && ts.isIdentifier(e.name))
		return `${e.expression.text}.${e.name.text}`;
	return '';
}

/** Whether a node is a `$derived(…)` or `$derived.by(…)` call. */
const isDerivedCall = (n) => Boolean(n) && ts.isCallExpression(n) && ['$derived', '$derived.by'].includes(calleeText(n));

/** Whether a node or its subtree holds no value uses: types, type declarations, `implements`, imports and export lists. */
const isSkipped = (n) =>
	(n.kind >= ts.SyntaxKind.FirstTypeNode && n.kind <= ts.SyntaxKind.LastTypeNode) ||
	ts.isInterfaceDeclaration(n) ||
	ts.isTypeAliasDeclaration(n) ||
	(ts.isHeritageClause(n) && n.token === ts.SyntaxKind.ImplementsKeyword) ||
	ts.isImportDeclaration(n) ||
	ts.isExportDeclaration(n);

/** The identifiers a binding name declares: the name, or each name of a destructuring pattern. */
function bindingNames(name, out = []) {
	if (ts.isIdentifier(name)) out.push(name);
	else if (ts.isObjectBindingPattern(name) || ts.isArrayBindingPattern(name))
		for (const e of name.elements) if (!ts.isOmittedExpression(e)) bindingNames(e.name, out);
	return out;
}

/** Whether an expression is `await import(…)`. */
const isAwaitImport = (n) =>
	Boolean(n) && ts.isAwaitExpression(n) && ts.isCallExpression(n.expression) && n.expression.expression.kind === ts.SyntaxKind.ImportKeyword;

/**
 * Adds the names a declaration list declares to a scope: null (a shadow) for
 * each, or for a destructure of `await import(x)` the symbol ID `dyn` gives.
 */
function declareList(list, scope, dyn, dynamicOnly) {
	for (const d of list.declarations) {
		const fromImport = isAwaitImport(d.initializer);
		if (dynamicOnly && !fromImport) continue;
		for (const id of bindingNames(d.name)) scope.set(id.text, fromImport ? dyn(id) : null);
	}
}

/** Adds the `const`/`let`/`var`/`function`/`class`/`enum` names of a statement list to a scope. */
function declareStatements(statements, scope, dyn, dynamicOnly) {
	for (const st of statements) {
		if (ts.isVariableStatement(st)) declareList(st.declarationList, scope, dyn, dynamicOnly);
		else if (!dynamicOnly && (ts.isFunctionDeclaration(st) || ts.isClassDeclaration(st) || ts.isEnumDeclaration(st)) && st.name)
			scope.set(st.name.text, null);
	}
}

/**
 * The names a node declares for its subtree, or null when it opens no scope:
 * parameters of a function-like node (and a function expression's own name),
 * declarations of a block, case block, `for` head or `catch` clause. At the
 * source file only `await import` destructures count: every other top-level
 * name is the import or same-file binding itself.
 */
function scopeOf(n, dyn) {
	const opens =
		ts.isSourceFile(n) ||
		ts.isFunctionLike(n) ||
		ts.isBlock(n) ||
		ts.isCaseBlock(n) ||
		ts.isForStatement(n) ||
		ts.isForInStatement(n) ||
		ts.isForOfStatement(n) ||
		ts.isCatchClause(n);
	if (!opens) return null;
	const scope = new Map();
	if (ts.isSourceFile(n)) declareStatements(n.statements, scope, dyn, true);
	else if (ts.isFunctionLike(n)) {
		for (const p of n.parameters) for (const id of bindingNames(p.name)) scope.set(id.text, null);
		if (ts.isFunctionExpression(n) && n.name) scope.set(n.name.text, null);
	} else if (ts.isBlock(n)) declareStatements(n.statements, scope, dyn, false);
	else if (ts.isCaseBlock(n)) for (const c of n.clauses) declareStatements(c.statements, scope, dyn, false);
	else if ((ts.isForStatement(n) || ts.isForInStatement(n) || ts.isForOfStatement(n)) && n.initializer && ts.isVariableDeclarationList(n.initializer))
		declareList(n.initializer, scope, dyn, false);
	else if (ts.isCatchClause(n) && n.variableDeclaration)
		for (const id of bindingNames(n.variableDeclaration.name)) scope.set(id.text, null);
	return scope.size ? scope : null;
}

/** The innermost scope entry for a name: `{id}` (null id for a shadow), or null when no scope declares it. */
function lookup(name, scopes) {
	for (let i = scopes.length - 1; i >= 0; i--) if (scopes[i].has(name)) return { id: scopes[i].get(name) };
	return null;
}

/**
 * Visits every node of `root` outside type positions, imports and export
 * lists, with the scope stack in force at the node (`scopes` plus the scopes
 * of its ancestors and its own). A node other than `root` for which `prune`
 * returns true is not visited, nor is its subtree.
 */
function walkScoped(root, scopes, dyn, onNode, prune = null) {
	const visit = (n, sc) => {
		if (isSkipped(n) || (prune && n !== root && prune(n))) return;
		const own = scopeOf(n, dyn);
		const inner = own ? [...sc, own] : sc;
		onNode(n, inner);
		ts.forEachChild(n, (c) => visit(c, inner));
	};
	visit(root, scopes);
}

/** Whether an identifier reads a value: not a declaration name, a property name, a label or an export specifier. */
function isValueRef(id) {
	const p = id.parent;
	if (!p) return false;
	if (ts.isShorthandPropertyAssignment(p)) return p.name === id;
	if (p.name === id || p.propertyName === id || p.label === id) return false;
	return !ts.isQualifiedName(p) && !ts.isExportSpecifier(p);
}

/** Whether an expression is the target of `=`, a compound assignment, `++` or `--`. */
function isAssigned(e) {
	const g = e.parent;
	if (ts.isBinaryExpression(g))
		return g.left === e && g.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && g.operatorToken.kind <= ts.SyntaxKind.LastAssignment;
	if (ts.isPrefixUnaryExpression(g) || ts.isPostfixUnaryExpression(g))
		return g.operator === ts.SyntaxKind.PlusPlusToken || g.operator === ts.SyntaxKind.MinusMinusToken;
	return false;
}

/** The identifier at the root of a property or element access chain, or null. */
function chainRoot(e) {
	let n = unwrap(e);
	while (n && (ts.isPropertyAccessExpression(n) || ts.isElementAccessExpression(n))) n = unwrap(n.expression);
	return n && ts.isIdentifier(n) ? n : null;
}

/** Array methods whose result is an element of their receiver, for F5 local aliases. */
const ELEMENT_OF = new Set(['find', 'findLast', 'at']);

/** The identifier an expression takes its value from through property and element access and `.find`, `.findLast`, `.at` calls, or null. */
function sourceRoot(e) {
	let n = unwrap(e);
	for (;;) {
		if (n && (ts.isPropertyAccessExpression(n) || ts.isElementAccessExpression(n))) n = unwrap(n.expression);
		else if (n && ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && ELEMENT_OF.has(n.expression.name.text))
			n = unwrap(n.expression.expression);
		else break;
	}
	return n && ts.isIdentifier(n) ? n : null;
}

/** Methods (and arrow or function properties) of an object literal, the `do` candidates of F4 and F5. */
const isMethodLike = (p) => ts.isMethodDeclaration(p) || (ts.isPropertyAssignment(p) && isFnExpr(p.initializer));

/**
 * The F5 members of a store object literal, in source order, with `w-via` on
 * each `get` member: the `do` members that write a module-level binding the
 * getter reads, directly, through one module-level `$derived` initializer, or
 * through a `this.<get member>` it reads. A write through a body-local
 * `const`/`let` set from a module binding (`const tab = tabs.find(…)`, then
 * `tab.saved = true` or `tab.push(x)`) writes that binding; reassigning the
 * local itself does not.
 */
function storeMembers(obj, sf, lineOf) {
	const moduleNames = new Set();
	const derived = new Map();
	const fns = new Map();
	for (const st of sf.statements) {
		if (ts.isFunctionDeclaration(st) && st.name && st.body) fns.set(st.name.text, st);
		if (!ts.isVariableStatement(st)) continue;
		for (const v of st.declarationList.declarations) {
			for (const id of bindingNames(v.name)) moduleNames.add(id.text);
			if (!ts.isIdentifier(v.name)) continue;
			if (isFnExpr(v.initializer)) fns.set(v.name.text, v.initializer);
			if (isDerivedCall(v.initializer)) derived.set(v.name.text, v.initializer);
		}
	}
	const noDyn = () => null;
	const free = (id, sc) => moduleNames.has(id.text) && !lookup(id.text, sc);
	const reads = (root, thisRefs) => {
		const out = new Set();
		walkScoped(root, [], noDyn, (n, sc) => {
			if (ts.isIdentifier(n) && isValueRef(n) && free(n, sc)) out.add(n.text);
			if (thisRefs && ts.isPropertyAccessExpression(n) && n.expression.kind === ts.SyntaxKind.ThisKeyword) thisRefs.add(n.name.text);
		});
		return out;
	};
	const writes = (root) => {
		const out = new Set();
		const queue = [root];
		const seen = new Set();
		while (queue.length) {
			const aliases = new Map();
			walkScoped(queue.shift(), [], noDyn, (n, sc) => {
				// A bare alias is written only as a mutator receiver: `tab = x` rebinds the local.
				const mark = (e, bareWrites) => {
					const r = chainRoot(e);
					if (!r) return;
					if (free(r, sc)) out.add(r.text);
					else if (aliases.has(r.text) && (bareWrites || unwrap(e) !== r)) out.add(aliases.get(r.text));
				};
				if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer) {
					const r = sourceRoot(n.initializer);
					if (r && free(r, sc)) aliases.set(n.name.text, r.text);
					else if (r && aliases.has(r.text)) aliases.set(n.name.text, aliases.get(r.text));
				} else if (ts.isBinaryExpression(n) && isAssigned(n.left)) mark(n.left, false);
				else if ((ts.isPrefixUnaryExpression(n) || ts.isPostfixUnaryExpression(n)) && isAssigned(n.operand)) mark(n.operand, false);
				else if (ts.isCallExpression(n)) {
					const e = n.expression;
					if (ts.isPropertyAccessExpression(e) && MUTATORS.has(e.name.text)) mark(e.expression, true);
					if (ts.isIdentifier(e) && fns.has(e.text) && !lookup(e.text, sc) && !seen.has(e.text)) {
						seen.add(e.text);
						queue.push(fns.get(e.text));
					}
				}
			});
		}
		return out;
	};
	const members = [];
	for (const p of obj.properties) {
		let kind;
		if (ts.isGetAccessorDeclaration(p)) kind = 'get';
		else if (ts.isSetAccessorDeclaration(p)) kind = 'set';
		else if (isMethodLike(p)) kind = 'do';
		else continue;
		const body = ts.isPropertyAssignment(p) ? p.initializer : p;
		const thisRefs = new Set();
		const set = kind === 'get' ? reads(body, thisRefs) : kind === 'do' ? writes(body) : new Set();
		if (kind === 'get') for (const name of [...set]) if (derived.has(name)) for (const r of reads(derived.get(name))) set.add(r);
		members.push({ name: propName(p.name), kind, line: lineOf(p), doc: docOf(p, p), set, thisRefs });
	}
	const getters = new Map(members.filter((m) => m.kind === 'get').map((m) => [m.name, m]));
	for (let grew = true; grew; ) {
		grew = false;
		for (const g of getters.values())
			for (const ref of g.thisRefs)
				for (const b of getters.get(ref)?.set ?? [])
					if (!g.set.has(b)) {
						g.set.add(b);
						grew = true;
					}
	}
	return members.map(({ set, thisRefs, ...m }) => ({
		...m,
		wVia: m.kind === 'get' ? members.filter((d) => d.kind === 'do' && [...d.set].some((b) => set.has(b))).map((d) => d.name) : [],
	}));
}

/**
 * The markup of a `.svelte` file reduced to its template expressions: every
 * character outside a brace-matched `{…}` span, and every string literal or
 * `//` and `/* *\/` comment character inside one, becomes a space; newlines
 * stay, so offsets and lines match the file. HTML comments, `<script>` and
 * `<style>` count as outside. Template literals keep their `${…}` parts.
 */
function markupCode(text) {
	const src = text.replace(MARKUP_HIDE_RE, blankKeepLines);
	const out = [];
	const stack = [];
	const blank = (c) => (c === '\n' ? '\n' : ' ');
	for (let i = 0; i < src.length; i++) {
		const c = src[i];
		const top = stack.at(-1);
		if (top === undefined) {
			if (c === '{') stack.push({ depth: 0 });
			out.push(blank(c));
		} else if (typeof top === 'object') {
			if (c === '/' && (src[i + 1] === '/' || src[i + 1] === '*')) {
				const line = src[i + 1] === '/';
				const close = line ? src.indexOf('\n', i) : src.indexOf('*/', i + 2);
				const stop = close === -1 ? src.length : line ? close : close + 2;
				for (; i < stop; i++) out.push(blank(src[i]));
				i--;
				continue;
			}
			if (c === "'" || c === '"' || c === '`') {
				stack.push(c);
				out.push(' ');
				continue;
			}
			if (c === '}' && top.depth === 0) {
				stack.pop();
				out.push(' ');
				continue;
			}
			if (c === '{') top.depth++;
			else if (c === '}') top.depth--;
			out.push(c);
		} else if (c === '\\') {
			out.push(' ');
			if (i + 1 < src.length) out.push(blank(src[++i]));
		} else if (c === top) {
			stack.pop();
			out.push(' ');
		} else if (top === '`' && c === '$' && src[i + 1] === '{') {
			stack.push({ depth: 0 });
			out.push(' ', ' ');
			i++;
		} else out.push(blank(c));
	}
	return out.join('');
}

/**
 * The F4e enclosing scope of a node, nearest ancestor first: a function
 * declaration's name; `Obj.member` for a method, accessor or function
 * property of an object literal bound to a top-level `const Obj`;
 * `Class.method` for a class member; the variable an arrow or function
 * expression is bound to; `$effect@<line>` (`$effect.pre@<line>`) for the
 * arguments of `$effect(…)`, `$effect.pre(…)`, `$effect.root(…)`;
 * `X=$derived` or `$derived@<line>` for the arguments of `$derived(…)` and
 * `$derived.by(…)`; `X` for the initializer of a top-level `const|let X`.
 * Anonymous callbacks resolve outward; with no match, `top`.
 *
 * @param {import('typescript').Node} node a node of a parsed region
 * @param {string} top `(module)` or `(script)`
 * @param {(n: import('typescript').Node) => number} lineOf file line of a node
 * @returns {string}
 */
export function enclosingOf(node, top, lineOf) {
	let child = node;
	for (let a = node.parent; a && !ts.isSourceFile(a); child = a, a = a.parent) {
		if (ts.isFunctionDeclaration(a) && a.name) return a.name.text;
		let member = null;
		if (ts.isMethodDeclaration(a) || ts.isGetAccessorDeclaration(a) || ts.isSetAccessorDeclaration(a) || ts.isConstructorDeclaration(a))
			member = a;
		else if (isFnExpr(a) && (ts.isPropertyAssignment(a.parent) || ts.isPropertyDeclaration(a.parent)) && a.parent.initializer === a)
			member = a.parent;
		if (member) {
			const name = ts.isConstructorDeclaration(member) ? 'constructor' : propName(member.name);
			const c = member.parent;
			const owner = ts.isObjectLiteralExpression(c) ? topConstOf(c) : (ts.isClassLike(c) && c.name?.text) || null;
			if (owner) return `${owner}.${name}`;
		}
		if (isFnExpr(a) && ts.isVariableDeclaration(a.parent) && a.parent.initializer === a && ts.isIdentifier(a.parent.name))
			return a.parent.name.text;
		if (ts.isCallExpression(a) && child !== a.expression) {
			const callee = calleeText(a);
			if (EFFECTS.has(callee)) return `${callee === '$effect.pre' ? '$effect.pre' : '$effect'}@${lineOf(a)}`;
			if (isDerivedCall(a)) {
				const v = a.parent;
				const bound = ts.isVariableDeclaration(v) && v.initializer === a && ts.isIdentifier(v.name);
				return bound ? `${v.name.text}=$derived` : `$derived@${lineOf(a)}`;
			}
		}
		if (ts.isVariableDeclaration(a) && a.initializer === child && ts.isIdentifier(a.name) && isTopLevel(a)) return a.name.text;
	}
	return top;
}

/**
 * Parses one TS or Svelte file and reads its F2 facts and F3, F4 and F5 inputs.
 *
 * Symbol kinds: `fn`, `class`, `interface`, `type`, `const`, `store` (an
 * exported `const` object literal with a getter), `method` (an instance-script
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
 *   bindings: {local: string, imported: string, spec: string, line: number, specLine: number, typeOnly: boolean, dynamic: boolean, importLine?: number, enclosing: string}[],
 *   exports: {names: Map<string, {local: string} | {spec: string, name: string}>, stars: string[]},
 *   aliases: Map<string, string>,
 *   objects: Map<string, string[]>,
 *   stores: {name: string, line: number, members: {name: string, kind: 'get' | 'set' | 'do', line: number, doc: string, wVia: string[]}[]}[],
 *   markup: string,
 *   template: string,
 * }} lines are 1-based from the file start; symbols and locals by (line, name);
 *   `imported` is `default` or `*` for default and namespace imports; an
 *   export entry `{spec, name: '*'}` is an `export * as` namespace; `aliases`
 *   maps a top-level non-exported `const X = A.B…` to its root identifier `A`;
 *   `objects` maps each top-level `const Obj = {…}` to its method names;
 *   `stores` lists the F5 store objects in line order (`wVia` empty on
 *   members other than `get`); `markup` is `markupCode` of a `.svelte` file,
 *   '' otherwise; a dynamic binding's `importLine` is the line of its
 *   `import()` call; `template` is a `.svelte` file with its comments, `<script>`
 *   and `<style>` blocks blanked (newlines kept), '' otherwise; a binding's `enclosing` is its region's file scope, or for a
 *   dynamic one the F4e enclosing of its declaration
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
	const objects = new Map();
	const stores = [];
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
		bindingsOf(region, bindings, instance ? '(script)' : '(module)');
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
					const obj = unwrap(d.initializer);
					if (obj && ts.isObjectLiteralExpression(obj) && st.declarationList.flags & ts.NodeFlags.Const)
						objects.set(d.name.text, obj.properties.filter(isMethodLike).map((p) => propName(p.name)));
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
					const isConst = Boolean(st.declarationList.flags & ts.NodeFlags.Const);
					const kind = fn ? 'fn' : isConst && isStoreObject(d.initializer) ? 'store' : 'const';
					symbols.push({ ...entry, kind, doc });
					if (kind === 'store')
						stores.push({ name: d.name.text, line: entry.line, members: storeMembers(d.initializer, sf, line) });
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
		objects,
		stores: stores.sort(byLineName),
		markup: svelte ? markupCode(text) : '',
		template: svelte ? text.replace(MARKUP_HIDE_RE, blankKeepLines) : '',
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
 * @returns {{from: string, local: string, imported: string, spec: string, line: number, specLine: number, typeOnly: boolean, dynamic: boolean, enclosing: string, id: string | null}[]}
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
 * The F3 re-exports of every file: each `export { X as Y } from` entry
 * resolved like a binding, and each `export * from` a ts-rs output file as
 * `dto:<T>`. Re-exports make no bindings, so a barrel or an alias file that
 * only re-exports is found here.
 *
 * @param {Map<string, ReturnType<typeof extractTsFile>>} files facts by repo-relative path
 * @returns {{from: string, id: string}[]} files by path, named entries in
 *   source order before stars; unresolved entries left out
 */
export function resolveReexports(files) {
	const ctx = { files, exists: (p) => files.has(p) };
	const out = [];
	for (const from of [...files.keys()].sort(cmp)) {
		const { names, stars } = files.get(from).exports;
		for (const entry of names.values()) {
			if (!('spec' in entry)) continue;
			const id = resolveImport(from, entry.spec, entry.name, ctx, 0, new Set());
			if (id) out.push({ from, id });
		}
		for (const star of stars) {
			const gen = GENERATED_RE.exec(resolveSpecifier(from, star, ctx.exists) ?? '');
			if (gen) out.push({ from, id: `dto:${gen[1]}` });
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

/** Whether a resolved ID names a TS symbol (not a DTO, a package or nothing). */
const isSymbolId = (id) => Boolean(id) && !id.startsWith('dto:') && !id.startsWith('external:');

/** The file part of a `<file>:<name>` ID. */
const fileOfId = (id) => id.slice(0, id.indexOf(':'));

/** The F4 kinds of one use of a binding at identifier `id`, each with the member it goes through (or null). */
function useKinds(id) {
	const p = id.parent;
	if (ts.isCallExpression(p) && p.expression === id) return [{ kind: 'call', member: null }];
	if (ts.isPropertyAccessExpression(p) && p.expression === id) {
		const member = p.name.text;
		const g = p.parent;
		if (ts.isCallExpression(g) && g.expression === p) return [{ kind: 'mcall', member }];
		return [{ kind: isAssigned(p) ? 'assign' : 'member', member }];
	}
	if (ts.isVariableDeclaration(p) && p.initializer === id && ts.isObjectBindingPattern(p.name)) {
		const out = [];
		for (const e of p.name.elements) {
			if (e.dotDotDotToken) continue;
			const key = e.propertyName ?? e.name;
			if (ts.isIdentifier(key) || ts.isStringLiteral(key)) out.push({ kind: 'member', member: key.text });
		}
		return out;
	}
	return [{ kind: 'ref', member: null }];
}

/** Escapes a name for use inside a RegExp. */
const escapeRe = (s) => s.replace(/[$\\^.*+?()[\]{}|]/g, '\\$&');

/** 1-based line of each offset, from the offsets where lines start. */
function lineIndex(text) {
	const starts = [0];
	for (let i = text.indexOf('\n'); i !== -1; i = text.indexOf('\n', i + 1)) starts.push(i + 1);
	return (offset) => {
		let lo = 0;
		let hi = starts.length - 1;
		while (lo < hi) {
			const mid = (lo + hi + 1) >> 1;
			if (starts[mid] <= offset) lo = mid;
			else hi = mid - 1;
		}
		return lo + 1;
	};
}

/**
 * F4: every use, in every file of `files`, of an import binding that
 * resolves to a symbol, of a same-file top-level function (declaration or
 * const-bound arrow or function expression), and of a method of a same-file
 * top-level object literal called as `Obj.m(…)`. Identifiers in type
 * positions, declaration and property names, and names a parameter or an
 * enclosing block declaration shadows are no uses; a destructure of
 * `await import(x)` is the binding F3 resolved, inside its block.
 *
 * Script kinds: `call` (callee), `mcall` (`B.m(…)`, optional chaining
 * included), `assign` (`B.m` assigned, compound-assigned, `++`/`--`),
 * `member` (other `B.m`, and each property of `const { a, b } = B`), `ref`
 * (any other value use). A same-file `Obj.m(…)` is a `call` of `Obj.m`.
 *
 * Markup (`.svelte`, inside `{…}` spans only, enclosing `(markup)`), for each
 * import binding and same-file function B: on a store, `B.m(` of a `do`
 * member is `mcall`, `B.m` of a `do` member is `ref`, `B.m` of another member
 * is `member`; otherwise `B(` is `call` and anything else `ref`.
 *
 * @param {Map<string, ReturnType<typeof extractTsFile>>} files facts by repo-relative path
 * @param {ReturnType<typeof resolveBindings>} resolved bindings of the same files
 * @returns {{file: string, line: number, enclosing: string, kind: 'call' | 'mcall' | 'member' | 'assign' | 'ref', symbol: string, member: string | null, target: string, markup: boolean, site: string}[]}
 *   `symbol` is the binding's symbol ID, `target` the ID used (`<symbol>.<member>`
 *   when the use goes through a member); `site` names the identifier within its
 *   file (`<region index>:<offset>` or `m:<offset>`), shared by the rows of one
 *   destructure; sorted by (file, line, target, kind, enclosing), markup rows
 *   after script rows on ties
 */
export function extractUses(files, resolved) {
	const bound = new Map();
	for (const r of resolved) {
		if (!isSymbolId(r.id)) continue;
		if (!bound.has(r.from)) bound.set(r.from, { static: new Map(), dynamic: new Map() });
		const b = bound.get(r.from);
		if (r.dynamic) b.dynamic.set(`${r.local}@${r.line}`, r.id);
		else if (!r.typeOnly) b.static.set(r.local, r.id);
	}
	const storeKinds = new Map();
	for (const [file, facts] of files)
		for (const st of facts.stores) storeKinds.set(`${file}:${st.name}`, new Map(st.members.map((m) => [m.name, m.kind])));
	const rows = [];
	for (const file of [...files.keys()].sort(cmp)) {
		const facts = files.get(file);
		const b = bound.get(file) ?? { static: new Map(), dynamic: new Map() };
		const own = new Map();
		for (const s of facts.symbols) if (s.kind === 'fn' || s.kind === 'method') own.set(s.name, `${file}:${s.name}`);
		for (const l of facts.locals) own.set(l.name, `${file}:${l.name}`);
		const push = (site, line, enclosing, kind, symbol, member, markup) =>
			rows.push({ file, line, enclosing, kind, symbol, member, target: member === null ? symbol : `${symbol}.${member}`, markup, site });
		for (const [ri, region] of facts.regions.entries()) {
			const { sf, lineOffset } = region;
			const top = file.endsWith('.svelte') && !region.module ? '(script)' : '(module)';
			const lineOf = (n) => lineOffset + sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
			const dyn = (id) => b.dynamic.get(`${id.text}@${lineOf(ts.isBindingElement(id.parent) ? id.parent : id)}`) ?? null;
			walkScoped(sf, [], dyn, (n, sc) => {
				if (!ts.isIdentifier(n) || !isValueRef(n)) return;
				const hit = lookup(n.text, sc);
				const symbol = hit ? hit.id : (b.static.get(n.text) ?? own.get(n.text));
				if (symbol) {
					const enclosing = enclosingOf(n, top, lineOf);
					for (const u of useKinds(n)) push(`${ri}:${n.getStart(sf)}`, lineOf(n), enclosing, u.kind, symbol, u.member, false);
					return;
				}
				if (hit || !facts.objects.has(n.text)) return;
				const p = n.parent;
				if (!ts.isPropertyAccessExpression(p) || p.expression !== n || !ts.isCallExpression(p.parent) || p.parent.expression !== p) return;
				if (facts.objects.get(n.text).includes(p.name.text))
					push(`${ri}:${n.getStart(sf)}`, lineOf(n), enclosingOf(n, top, lineOf), 'call', `${file}:${n.text}`, p.name.text, false);
			});
		}
		if (!facts.markup) continue;
		const code = facts.markup;
		const lineAt = lineIndex(code);
		const names = new Map(own);
		for (const [local, id] of b.static) names.set(local, id);
		for (const [name, symbol] of names) {
			const kinds = storeKinds.get(symbol);
			// A `.` before B is a property access, unless it ends a `...` spread.
			const re = new RegExp(`(?<![\\w$])(?<!(?<!\\.)\\.)${escapeRe(name)}(?![\\w$])`, 'g');
			const memberRe = /\??\.([\w$]+)/y;
			const callRe = /\s*\(/y;
			const calledAt = (i) => {
				callRe.lastIndex = i;
				return callRe.test(code);
			};
			for (const m of code.matchAll(re)) {
				const end = m.index + name.length;
				const line = lineAt(m.index);
				const site = `m:${m.index}`;
				memberRe.lastIndex = end;
				const mm = kinds ? memberRe.exec(code) : null;
				if (mm) {
					const isDo = kinds.get(mm[1]) === 'do';
					push(site, line, '(markup)', isDo ? (calledAt(memberRe.lastIndex) ? 'mcall' : 'ref') : 'member', symbol, mm[1], true);
				} else push(site, line, '(markup)', calledAt(end) ? 'call' : 'ref', symbol, null, true);
			}
		}
	}
	return rows.sort(
		(x, y) =>
			cmp(x.file, y.file) ||
			x.line - y.line ||
			cmp(x.target, y.target) ||
			cmp(x.kind, y.kind) ||
			cmp(x.enclosing, y.enclosing) ||
			Number(x.markup) - Number(y.markup),
	);
}

/**
 * The `by` users of each symbol: one entry per production file other than the
 * defining one, at its first F4 use (kind `markup` for a markup use) or F17
 * mount (kind `mount`, enclosing `(markup)`, of `<component>:default`), `more`
 * counting the further sites in that file with the same enclosing. A file
 * that binds the symbol with no use gets the line of its first import
 * specifier element, kind `import`, with the binding's enclosing. Test and e2e
 * files are left out (F4: their rows feed only `--tests` answers).
 *
 * @param {ReturnType<typeof resolveBindings>} resolved
 * @param {ReturnType<typeof extractUses>} uses
 * @param {(file: string) => boolean} isTest whether a file is a test or e2e file
 * @param {ReturnType<typeof componentMounts>} [mounts]
 * @returns {Map<string, {file: string, line: number, enclosing: string, kind: string, more: number}[]>}
 *   keys in code-unit order, users by file path
 */
export function usersBySymbol(resolved, uses, isTest, mounts = []) {
	const by = new Map();
	const slot = (id) => {
		if (!by.has(id)) by.set(id, new Map());
		return by.get(id);
	};
	const sites = new Set();
	const mountRows = mounts.map((m) => ({
		file: m.file,
		line: m.line,
		enclosing: '(markup)',
		kind: 'mount',
		symbol: `${m.target}:default`,
		markup: false,
		site: `mount:${m.line}:${m.name}`,
	}));
	// A stable sort keeps the uses' own order; a mount goes after the uses of its line.
	const rows = [...uses, ...mountRows].sort((a, b) => cmp(a.file, b.file) || a.line - b.line);
	for (const u of rows) {
		if (fileOfId(u.symbol) === u.file || isTest(u.file)) continue;
		const key = `${u.symbol}\0${u.file}\0${u.site}`;
		if (sites.has(key)) continue;
		sites.add(key);
		const per = slot(u.symbol);
		const first = per.get(u.file);
		if (!first) per.set(u.file, { file: u.file, line: u.line, enclosing: u.enclosing, kind: u.markup ? 'markup' : u.kind, more: 0 });
		else if (first.enclosing === u.enclosing) first.more++;
	}
	for (const r of resolved) {
		if (!isSymbolId(r.id) || fileOfId(r.id) === r.from || isTest(r.from)) continue;
		const per = slot(r.id);
		const first = per.get(r.from);
		if (!first || (first.kind === 'import' && r.specLine < first.line))
			per.set(r.from, { file: r.from, line: r.specLine, enclosing: r.enclosing, kind: 'import', more: 0 });
	}
	const out = new Map();
	for (const id of [...by.keys()].sort(cmp)) {
		const per = by.get(id);
		out.set(id, [...per.keys()].sort(cmp).map((f) => per.get(f)));
	}
	return out;
}

/** @typedef {{file: string, line: number, enclosing: string, kind: string, markup: boolean}} Site a use site of a store member */

/**
 * F5: every store object with its members' readers and writers and its
 * `esc` count. Readers are `member` uses of a `get` member (script and
 * markup). Writers are `mcall` uses and same-file `call`s of a `do` member,
 * markup `ref` uses of a `do` member, and `assign` uses of any member (a
 * `set` member when there is one by that name). `esc` counts the files that
 * use the store itself as a value (`ref`). Uses in test and e2e files count
 * for none of these.
 *
 * @param {Map<string, ReturnType<typeof extractTsFile>>} files facts by repo-relative path
 * @param {ReturnType<typeof extractUses>} uses
 * @param {(file: string) => boolean} isTest whether a file is a test or e2e file
 * @returns {{file: string, name: string, id: string, line: number, esc: number, members: {name: string, kind: 'get' | 'set' | 'do', line: number, doc: string, wVia: string[], id: string, readers: Site[], writers: Site[]}[]}[]}
 *   stores by (file, line), members in source order, sites in `uses` order
 */
export function collectStores(files, uses, isTest) {
	const out = [];
	const byId = new Map();
	for (const file of [...files.keys()].sort(cmp)) {
		for (const st of files.get(file).stores) {
			const id = `${file}:${st.name}`;
			const members = st.members.map((m) => ({ ...m, id: `${id}.${m.name}`, readers: [], writers: [] }));
			const entry = { file, name: st.name, id, line: st.line, esc: 0, members, escFiles: new Set() };
			out.push(entry);
			byId.set(id, entry);
		}
	}
	for (const u of uses) {
		const st = byId.get(u.symbol);
		if (!st || isTest(u.file)) continue;
		if (u.member === null) {
			if (u.kind === 'ref') st.escFiles.add(u.file);
			continue;
		}
		const named = st.members.filter((m) => m.name === u.member);
		if (!named.length) continue;
		const pick = (kind) => named.find((m) => m.kind === kind) ?? named[0];
		const site = { file: u.file, line: u.line, enclosing: u.enclosing, kind: u.kind, markup: u.markup };
		if (u.kind === 'assign') pick('set').writers.push(site);
		else if (u.kind === 'member' && pick('get').kind === 'get') pick('get').readers.push(site);
		else if ((u.kind === 'mcall' || u.kind === 'call' || (u.kind === 'ref' && u.markup)) && pick('do').kind === 'do')
			pick('do').writers.push(site);
	}
	return out.map(({ escFiles, ...st }) => ({ ...st, esc: escFiles.size }));
}

/** The typed IPC wrapper module: `call` and `on`. */
const IPC_TS = 'src/lib/contracts/ipc.ts';

/** The `CommandMap` contract. */
const COMMANDS_TS = 'src/lib/contracts/commands.ts';

/** The `EVENT_NAMES` and `EventMap` contract. */
const EVENTS_TS = 'src/lib/contracts/events.ts';

/** Line of a node within its region, from the file start. */
const regionLine = (region, n) => region.lineOffset + region.sf.getLineAndCharacterOfPosition(n.getStart(region.sf)).line + 1;

/**
 * The names one `export … from` statement takes from its target, in source
 * order: `*` for `export *` and `export * as`, else each element's name in the
 * target, `type:`-prefixed when the statement or the element is type-only.
 *
 * @param {{sf: import('typescript').SourceFile, lineOffset: number}} region a parsed region
 * @param {number} line file line of the statement, as `extractImportsFromSource` gives it
 * @param {string} spec its module specifier
 * @returns {string[]} empty when no such statement exists or it names nothing
 */
export function reexportNames(region, line, spec) {
	for (const st of region.sf.statements) {
		if (!ts.isExportDeclaration(st) || !st.moduleSpecifier || !ts.isStringLiteral(st.moduleSpecifier)) continue;
		if (st.moduleSpecifier.text !== spec || regionLine(region, st) !== line) continue;
		if (!st.exportClause || ts.isNamespaceExport(st.exportClause)) return ['*'];
		return st.exportClause.elements.map((e) => `${st.isTypeOnly || e.isTypeOnly ? 'type:' : ''}${(e.propertyName ?? e.name).text}`);
	}
	return [];
}

/** The members of the interface `name` declared at the top of a file, with their region. */
function interfaceMembers(facts, name) {
	for (const region of facts?.regions ?? []) {
		const decl = region.sf.statements.find((s) => ts.isInterfaceDeclaration(s) && s.name.text === name);
		if (decl) return decl.members.filter(ts.isPropertySignature).map((m) => ({ m, region }));
	}
	return [];
}

/**
 * The IPC contracts read from `contracts/commands.ts` and `contracts/events.ts`:
 * every `CommandMap` member with its args (property names of the `args` type
 * literal comma-joined, `-` for `NoArgs`, else the type text), result type
 * text and doc; every `EVENT_NAMES` property with a string value; every
 * `EventMap` member's payload type text.
 *
 * @param {Map<string, ReturnType<typeof extractTsFile>>} files facts by repo-relative path
 * @returns {{
 *   commands: {name: string, line: number, args: string, result: string, argsText: string, resultText: string, doc: string}[],
 *   eventNames: {key: string, value: string, line: number}[],
 *   eventMap: Map<string, string>,
 *   eventsFile: string,
 * }} commands and event names in source order; type texts whitespace-collapsed
 */
export function extractContracts(files) {
	const commands = [];
	for (const { m, region } of interfaceMembers(files.get(COMMANDS_TS), 'CommandMap')) {
		const sf = region.sf;
		const parts = m.type && ts.isTypeLiteralNode(m.type) ? m.type.members.filter(ts.isPropertySignature) : [];
		const part = (key) => parts.find((p) => propName(p.name) === key)?.type ?? null;
		const argsType = part('args');
		const resultType = part('result');
		const argsText = argsType ? collapse(argsType.getText(sf)) : '';
		let args = argsText || '-';
		if (argsType && ts.isTypeLiteralNode(argsType)) args = argsType.members.map((p) => (p.name ? propName(p.name) : '')).join(',') || '-';
		else if (argsType && ts.isTypeReferenceNode(argsType) && argsType.typeName.getText(sf) === 'NoArgs') args = '-';
		const resultText = resultType ? collapse(resultType.getText(sf)) : '';
		commands.push({ name: propName(m.name), line: regionLine(region, m), args, result: resultText || '-', argsText, resultText, doc: docOf(m, m) });
	}
	const events = files.get(EVENTS_TS);
	const eventNames = [];
	for (const region of events?.regions ?? []) {
		for (const st of region.sf.statements) {
			if (!ts.isVariableStatement(st)) continue;
			for (const d of st.declarationList.declarations) {
				const obj = unwrap(d.initializer);
				if (!ts.isIdentifier(d.name) || d.name.text !== 'EVENT_NAMES' || !obj || !ts.isObjectLiteralExpression(obj)) continue;
				for (const p of obj.properties) {
					if (!ts.isPropertyAssignment(p)) continue;
					const v = unwrap(p.initializer);
					if (ts.isStringLiteral(v) || ts.isNoSubstitutionTemplateLiteral(v))
						eventNames.push({ key: propName(p.name), value: v.text, line: regionLine(region, p) });
				}
			}
		}
	}
	const eventMap = new Map();
	for (const { m, region } of interfaceMembers(events, 'EventMap'))
		if (m.type) eventMap.set(propName(m.name), collapse(m.type.getText(region.sf)));
	return { commands, eventNames, eventMap, eventsFile: EVENTS_TS };
}

/**
 * F8 callers and F9 listens: calls of the binding imported as `call` from
 * `contracts/ipc.ts` whose first argument is a string literal, and calls of
 * the binding imported as `on` whose first argument is `EVENT_NAMES.KEY`
 * (`EVENT_NAMES` imported from `contracts/events.ts`) or a string literal.
 * Aliases and re-exports resolve through F3; a parameter or block
 * declaration of the same name shadows the binding. Lines and F4e enclosing
 * as for F4 uses; test and e2e files included.
 *
 * @param {Map<string, ReturnType<typeof extractTsFile>>} files facts by repo-relative path
 * @param {ReturnType<typeof resolveBindings>} resolved bindings of the same files
 * @returns {{
 *   calls: {file: string, line: number, enclosing: string, command: string}[],
 *   listens: {file: string, line: number, enclosing: string, key: string | null, name: string | null}[],
 * }} by (file, line, name)
 */
export function extractIpcSites(files, resolved) {
	const callId = `${IPC_TS}:call`;
	const onId = `${IPC_TS}:on`;
	const namesId = `${EVENTS_TS}:EVENT_NAMES`;
	const bound = new Map();
	for (const r of resolved) {
		if (r.id !== callId && r.id !== onId && r.id !== namesId) continue;
		if (!bound.has(r.from)) bound.set(r.from, { static: new Map(), dynamic: new Map() });
		const b = bound.get(r.from);
		if (r.dynamic) b.dynamic.set(`${r.local}@${r.line}`, r.id);
		else if (!r.typeOnly) b.static.set(r.local, r.id);
	}
	const calls = [];
	const listens = [];
	for (const file of [...bound.keys()].sort(cmp)) {
		const facts = files.get(file);
		const b = bound.get(file);
		for (const region of facts.regions) {
			const { sf, lineOffset } = region;
			const top = file.endsWith('.svelte') && !region.module ? '(script)' : '(module)';
			const lineOf = (n) => lineOffset + sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
			const dyn = (id) => b.dynamic.get(`${id.text}@${lineOf(ts.isBindingElement(id.parent) ? id.parent : id)}`) ?? null;
			const idOf = (id, sc) => {
				const hit = lookup(id.text, sc);
				return hit ? hit.id : (b.static.get(id.text) ?? null);
			};
			walkScoped(sf, [], dyn, (n, sc) => {
				if (!ts.isCallExpression(n) || !ts.isIdentifier(n.expression)) return;
				const target = idOf(n.expression, sc);
				const arg = n.arguments[0];
				if (!arg || (target !== callId && target !== onId)) return;
				const site = { file, line: lineOf(n), enclosing: enclosingOf(n, top, lineOf) };
				const literal = ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg) ? arg.text : null;
				if (target === callId) {
					if (literal !== null) calls.push({ ...site, command: literal });
				} else if (literal !== null) listens.push({ ...site, key: null, name: literal });
				else if (ts.isPropertyAccessExpression(arg) && ts.isIdentifier(arg.expression) && idOf(arg.expression, sc) === namesId)
					listens.push({ ...site, key: arg.name.text, name: null });
			});
		}
	}
	const order = (x, y) => cmp(x.file, y.file) || x.line - y.line;
	return {
		calls: calls.sort((x, y) => order(x, y) || cmp(x.command, y.command)),
		listens: listens.sort((x, y) => order(x, y) || cmp(x.key ?? x.name, y.key ?? y.name)),
	};
}

/**
 * F8 key sites: property-assignment and property-signature names (identifier
 * or string literal) equal to a command, in `src/lib`, `src/routes` and `e2e`.
 *
 * @param {Map<string, ReturnType<typeof extractTsFile>>} files facts by repo-relative path
 * @param {Set<string>} names command names
 * @returns {{name: string, file: string, line: number}[]} by (name, file, line)
 */
export function keySites(files, names) {
	const out = [];
	for (const file of [...files.keys()].sort(cmp)) {
		if (!/^(?:src\/lib|src\/routes|e2e)\//.test(file)) continue;
		for (const region of files.get(file).regions) {
			const visit = (n) => {
				if ((ts.isPropertyAssignment(n) || ts.isPropertySignature(n)) && (ts.isIdentifier(n.name) || ts.isStringLiteral(n.name)) && names.has(n.name.text))
					out.push({ name: n.name.text, file, line: regionLine(region, n) });
				ts.forEachChild(n, visit);
			};
			visit(region.sf);
		}
	}
	return out.sort((x, y) => cmp(x.name, y.name) || cmp(x.file, y.file) || x.line - y.line);
}

/** Whether a path is a frontend test or e2e file. */
const isTestPath = (f) => f.startsWith('src/tests/') || f.startsWith('e2e/');

/** The stem a mirrored test name starts with: the basename without `.ts`, `.js` or `.svelte`, and without a `.svelte` before `.ts`. */
const sourceStem = (file) =>
	posix
		.basename(file)
		.replace(/\.(?:ts|js|svelte)$/, '')
		.replace(/\.svelte$/, '');

/**
 * What may follow the source stem in a mirrored test's basename: `x.test.ts`
 * and `x-parity.test.ts` mirror `x.ts`, `xy.test.ts` does not.
 */
const MIRROR_SEPARATORS = ['.', '-'];

/** The callees that mock a module in vitest. */
const VI_MOCKS = new Set(['vi.mock', 'vi.doMock']);

/**
 * F6 for the frontend: one row per (test file, source file). `mocks` when the
 * test calls `vi.mock` or `vi.doMock` with a string literal resolving to the
 * file (it wins over an import); else `e2e` for an e2e file and `imports` for
 * a `src/tests` file with a non-type-only import (static, re-export or
 * `import()`) resolving to it. Package mocks and targets that are test files
 * give no row. `mirror` marks an `imports` row whose test sits in
 * `src/tests/<source dir without src/>/` with a basename starting with the
 * source stem and a `.` or `-`.
 *
 * @param {Map<string, ReturnType<typeof extractTsFile>>} files facts by repo-relative path
 * @param {(path: string) => boolean} [exists] whether a repo-relative file is in the inventory
 * @returns {{test: string, relation: 'imports' | 'mocks' | 'e2e', target: string, mirror: boolean}[]}
 *   by (target, mirrored first, relation, test)
 */
export function testRelations(files, exists = (p) => files.has(p)) {
	const rel = new Map();
	for (const test of [...files.keys()].sort(cmp)) {
		if (!isTestPath(test)) continue;
		const set = (spec, relation) => {
			const target = resolveSpecifier(test, spec, exists);
			if (target === null || !exists(target) || isTestPath(target)) return;
			const key = `${test}\0${target}`;
			if (rel.get(key) !== 'mocks') rel.set(key, relation);
		};
		for (const region of files.get(test).regions) {
			for (const imp of extractImportsFromSource(region.sf, region.lineOffset))
				if (imp.spec !== null && !imp.typeOnly) set(imp.spec, test.startsWith('e2e/') ? 'e2e' : 'imports');
			const visit = (n) => {
				if (ts.isCallExpression(n) && VI_MOCKS.has(calleeText(n))) {
					const a = n.arguments[0];
					if (a && (ts.isStringLiteral(a) || ts.isNoSubstitutionTemplateLiteral(a))) set(a.text, 'mocks');
				}
				ts.forEachChild(n, visit);
			};
			visit(region.sf);
		}
	}
	const rows = [...rel].map(([key, relation]) => {
		const [test, target] = key.split('\0');
		const mirror =
			relation === 'imports' &&
			target.startsWith('src/') &&
			posix.dirname(test) === `src/tests/${posix.dirname(target).slice('src/'.length)}` &&
			MIRROR_SEPARATORS.some((sep) => posix.basename(test).startsWith(`${sourceStem(target)}${sep}`));
		return { test, relation, target, mirror };
	});
	return rows.sort(
		(a, b) => cmp(a.target, b.target) || Number(b.mirror) - Number(a.mirror) || cmp(a.relation, b.relation) || cmp(a.test, b.test),
	);
}

/** The identifier that starts at `pos` in a parsed region, found by descending the child that spans it. */
function identifierAt(sf, pos) {
	let n = sf;
	for (;;) {
		const next = ts.forEachChild(n, (c) => (c.pos <= pos && pos < c.end ? c : undefined));
		if (!next) return null;
		if (ts.isIdentifier(next) && next.getStart(sf) === pos) return next;
		n = next;
	}
}

/**
 * The parsed context of a script use row: its region, its identifier and the
 * call it is the callee of (`B(…)` for a row without member, `B.m(…)` for a
 * row with member `m`), or null for a markup row.
 */
function useNode(files, u) {
	if (u.markup) return null;
	const [ri, pos] = u.site.split(':').map(Number);
	const region = files.get(u.file).regions[ri];
	const id = identifierAt(region.sf, pos);
	if (!id) return null;
	const p = id.parent;
	let call = null;
	if (u.member === null && ts.isCallExpression(p) && p.expression === id) call = p;
	else if (u.member !== null && ts.isPropertyAccessExpression(p) && p.expression === id && ts.isCallExpression(p.parent) && p.parent.expression === p)
		call = p.parent;
	return { region, id, call };
}

/** The F4 rows of every script and markup use, keyed by `<file>\0<site>`. */
function rowsBySite(uses) {
	const out = new Map();
	for (const u of uses) {
		const key = `${u.file}\0${u.site}`;
		if (!out.has(key)) out.set(key, []);
		out.get(key).push(u);
	}
	return out;
}

/** The production F4 rows by target ID, each site once. */
function rowsByTarget(uses, isTest) {
	const out = new Map();
	const seen = new Set();
	for (const u of uses) {
		if (isTest(u.file)) continue;
		const key = `${u.target}\0${u.file}\0${u.site}`;
		if (seen.has(key)) continue;
		seen.add(key);
		if (!out.has(u.target)) out.set(u.target, []);
		out.get(u.target).push(u);
	}
	return out;
}

/** Methods whose call on a module-level binding registers into it, for the F11 sink rule. */
const SINK_MUTATORS = new Set(['push', 'add', 'set', 'unshift']);

/** Whether an operator token is `=` or a compound assignment. */
const isAssignOp = (t) => t.kind >= ts.SyntaxKind.FirstAssignment && t.kind <= ts.SyntaxKind.LastAssignment;

/**
 * The top-level functions of a region (declarations and `const|let` bound to
 * arrow or function expressions) and the methods, getters and function
 * properties of its top-level `const` object literals (`Obj.member`), each with
 * its node, line and whether it is exported (its statement, or for a member
 * its object's).
 */
function regionFunctions(region) {
	const { sf, lineOffset } = region;
	const lineOf = (n) => lineOffset + sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
	const out = [];
	for (const st of sf.statements) {
		const exported = isExported(st);
		if (ts.isFunctionDeclaration(st) && st.name && st.body)
			out.push({ name: st.name.text, node: st, line: lineOf(st), exported, member: null });
		if (!ts.isVariableStatement(st)) continue;
		for (const d of st.declarationList.declarations) {
			if (!ts.isIdentifier(d.name)) continue;
			if (isFnExpr(d.initializer)) out.push({ name: d.name.text, node: d.initializer, line: lineOf(d), exported, member: null });
			const obj = unwrap(d.initializer);
			if (!obj || !ts.isObjectLiteralExpression(obj) || !(st.declarationList.flags & ts.NodeFlags.Const)) continue;
			for (const p of obj.properties) {
				let node = null;
				if (ts.isMethodDeclaration(p) || ts.isGetAccessorDeclaration(p)) node = p;
				else if (ts.isPropertyAssignment(p) && isFnExpr(p.initializer)) node = p.initializer;
				if (node) out.push({ name: `${d.name.text}.${propName(p.name)}`, node, line: lineOf(p), exported, member: ts.isGetAccessorDeclaration(p) ? 'get' : 'do' });
			}
		}
	}
	return out;
}

/** The names a region's top-level `const`/`let`/`var` statements declare. */
function moduleBindings(region) {
	const out = new Set();
	for (const st of region.sf.statements)
		if (ts.isVariableStatement(st)) for (const d of st.declarationList.declarations) for (const id of bindingNames(d.name)) out.add(id.text);
	return out;
}

/**
 * The F11 facts of one function: `refs`, the module bindings it reads
 * anywhere in its body; `muts`, those it changes anywhere (assignment,
 * `++`/`--`, or a mutator call on the root of a property chain); and, for its
 * own body only (nested functions left out), whether it returns an arrow or
 * function expression and the registrations it makes (`.push`, `.add`,
 * `.set`, `.unshift` on a module binding, or an assignment to one).
 */
function functionFacts(fn, region, moduleNames) {
	const { sf, lineOffset } = region;
	const lineOf = (n) => lineOffset + sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
	const noDyn = () => null;
	const free = (id, sc) => Boolean(id) && moduleNames.has(id.text) && !lookup(id.text, sc);
	const refs = new Set();
	const muts = new Set();
	walkScoped(fn.node, [], noDyn, (n, sc) => {
		if (ts.isIdentifier(n) && isValueRef(n) && free(n, sc)) refs.add(n.text);
		let target = null;
		if (ts.isBinaryExpression(n) && isAssignOp(n.operatorToken)) target = n.left;
		else if ((ts.isPrefixUnaryExpression(n) || ts.isPostfixUnaryExpression(n)) && isAssigned(n.operand)) target = n.operand;
		else if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && MUTATORS.has(n.expression.name.text)) target = n.expression.expression;
		const root = target && chainRoot(target);
		if (free(root, sc)) muts.add(root.text);
	});
	let returnsFn = false;
	const stores = [];
	walkScoped(
		fn.node,
		[],
		noDyn,
		(n, sc) => {
			if (ts.isReturnStatement(n) && isFnExpr(unwrap(n.expression))) returnsFn = true;
			let root = null;
			let mutation = null;
			if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && SINK_MUTATORS.has(n.expression.name.text)) {
				root = chainRoot(n.expression.expression);
				mutation = n.expression.name.text;
			} else if (ts.isBinaryExpression(n) && isAssignOp(n.operatorToken)) {
				root = chainRoot(n.left);
				mutation = 'assign';
			}
			if (free(root, sc) && !stores.some((s) => s.binding === root.text && s.mutation === mutation))
				stores.push({ binding: root.text, mutation, line: lineOf(n) });
		},
		(n) => ts.isFunctionLike(n),
	);
	return { refs, muts, returnsFn, stores };
}

/**
 * F11: registries and facets.
 *
 * A sink is an exported function, or a method of an exported object literal,
 * whose own body returns an arrow or function expression and registers into a
 * module-level binding of its file (`.push`, `.add`, `.set`, `.unshift`, or an
 * assignment). Its `readBy` are the same-region functions, methods and getters
 * that read a written binding and change none of them. `firedBy` lists, per
 * reader, the chains up the F4 production call graph from the reader (a store
 * getter's first hops are its F5 readers), one hop per distinct (file,
 * enclosing) with its first site, continuing while the hop's enclosing is a
 * file-local function of its file, so each chain ends at an exported
 * function or another scope.
 *
 * A facet is an exported `const` initialized with `Facet.define(…)`; its
 * registrations are `X.of(…)` calls.
 *
 * `registeredAt` are the production script call sites of the sink (or of
 * `X.of`), with `args` the first argument's text (comments dropped, whitespace
 * collapsed, cap 80)
 * and `callbacks`: the first argument when it is an identifier resolving to a
 * function, else the identifier values (function ones) of its object-literal
 * properties, else the site's enclosing scope as `<file>:<enclosing>`.
 * `invokedAt` are the production use sites of each registration's enclosing
 * scope when that scope is an exported symbol of its file.
 *
 * @param {Map<string, ReturnType<typeof extractTsFile>>} files facts by repo-relative path
 * @param {ReturnType<typeof extractUses>} uses
 * @param {(file: string) => boolean} isTest whether a file is a test or e2e file
 * @returns {{id: string, kind: 'sink' | 'facet', file: string, line: number,
 *   stores: {binding: string, mutation: string, line: number}[],
 *   readBy: {id: string, file: string, line: number}[],
 *   firedBy: {via: string, chain: {file: string, line: number, enclosing: string}[]}[],
 *   registeredAt: {file: string, line: number, enclosing: string, args: string, callbacks: string[]}[],
 *   invokedAt: {file: string, line: number, enclosing: string, via: string}[]}[]}
 *   by ID; lists by location, `firedBy` by reader line then first hop
 */
export function collectRegistries(files, uses, isTest) {
	const fnIds = new Set();
	for (const [file, facts] of files) {
		for (const s of facts.symbols) if (s.kind === 'fn' || s.kind === 'method') fnIds.add(`${file}:${s.name}`);
		for (const l of facts.locals) fnIds.add(`${file}:${l.name}`);
		for (const [obj, methods] of facts.objects) for (const m of methods) fnIds.add(`${file}:${obj}.${m}`);
	}
	const bySite = rowsBySite(uses);
	const byTarget = rowsByTarget(uses, isTest);
	const hop = (u) => ({ file: u.file, line: u.line, enclosing: u.enclosing });
	const firstPerScope = (rows) => {
		const out = new Map();
		for (const u of rows) {
			const key = `${u.file}\0${u.enclosing}`;
			if (!out.has(key)) out.set(key, u);
		}
		return [...out.values()];
	};
	const localsOf = new Map([...files].map(([f, facts]) => [f, new Set(facts.locals.map((l) => l.name))]));
	const registries = [];
	for (const file of [...files.keys()].sort(cmp)) {
		if (isTest(file)) continue;
		const facts = files.get(file);
		for (const region of facts.regions) {
			if (file.endsWith('.svelte') && !region.module) continue;
			const moduleNames = moduleBindings(region);
			const fns = regionFunctions(region).map((fn) => ({ ...fn, ...functionFacts(fn, region, moduleNames) }));
			for (const fn of fns) {
				if (!fn.exported || fn.member === 'get' || !fn.returnsFn || !fn.stores.length) continue;
				const written = new Set(fn.stores.map((s) => s.binding));
				const readBy = fns.filter((o) => o !== fn && [...written].some((b) => o.refs.has(b) && !o.muts.has(b)));
				const firedBy = [];
				for (const r of readBy) {
					const id = `${file}:${r.name}`;
					const seen = new Set([id]);
					const climb = (target, chain) => {
						const sites = firstPerScope(byTarget.get(target) ?? []);
						if (!sites.length && chain.length) firedBy.push({ via: id, chain });
						for (const u of sites) {
							const next = [...chain, hop(u)];
							const up = `${u.file}:${u.enclosing}`;
							if (localsOf.get(u.file)?.has(u.enclosing) && !seen.has(up)) {
								seen.add(up);
								climb(up, next);
							} else firedBy.push({ via: id, chain: next });
						}
					};
					climb(id, []);
				}
				registries.push({
					id: `${file}:${fn.name}`,
					kind: 'sink',
					file,
					line: fn.line,
					stores: fn.stores,
					readBy: readBy.map((r) => ({ id: `${file}:${r.name}`, file, line: r.line })),
					firedBy,
					target: `${file}:${fn.name}`,
				});
			}
			for (const st of region.sf.statements) {
				if (!ts.isVariableStatement(st) || !isExported(st)) continue;
				for (const d of st.declarationList.declarations) {
					const init = unwrap(d.initializer);
					if (!ts.isIdentifier(d.name) || !init || !ts.isCallExpression(init) || calleeText(init) !== 'Facet.define') continue;
					const id = `${file}:${d.name.text}`;
					registries.push({ id, kind: 'facet', file, line: regionLine(region, d), stores: [], readBy: [], firedBy: [], target: `${id}.of` });
				}
			}
		}
	}
	const callbacksOf = (u, arg) => {
		const fnAt = (node) => (bySite.get(`${u.file}\0${u.site.split(':')[0]}:${node.getStart(node.getSourceFile())}`) ?? []).find((r) => fnIds.has(r.target))?.target;
		const a = unwrap(arg);
		if (a && ts.isIdentifier(a)) {
			const id = fnAt(a);
			if (id) return [id];
		} else if (a && ts.isObjectLiteralExpression(a)) {
			const ids = [];
			for (const p of a.properties) {
				const v = ts.isShorthandPropertyAssignment(p) ? p.name : ts.isPropertyAssignment(p) && ts.isIdentifier(unwrap(p.initializer)) ? unwrap(p.initializer) : null;
				const id = v && fnAt(v);
				if (id && !ids.includes(id)) ids.push(id);
			}
			if (ids.length) return ids;
		}
		return [`${u.file}:${u.enclosing}`];
	};
	const byLoc = (a, b) => cmp(a.file, b.file) || a.line - b.line;
	return registries
		.sort((a, b) => cmp(a.id, b.id))
		.map(({ target, ...r }) => {
			const registeredAt = [];
			for (const u of byTarget.get(target) ?? []) {
				if (u.kind !== 'call' && u.kind !== 'mcall') continue;
				const node = useNode(files, u);
				if (!node?.call) continue;
				const arg = node.call.arguments[0];
				registeredAt.push({
					file: u.file,
					line: u.line,
					enclosing: u.enclosing,
					args: arg ? cap(nodeExcerpt(node.region.sf, arg), 80) : '',
					callbacks: callbacksOf(u, arg),
				});
			}
			const invokedAt = [];
			const seen = new Set();
			for (const reg of registeredAt) {
				const exported = new Set(files.get(reg.file).symbols.map((s) => s.name));
				if (!exported.has(reg.enclosing.split('.')[0])) continue;
				const via = `${reg.file}:${reg.enclosing}`;
				for (const u of byTarget.get(via) ?? []) {
					const key = `${via}\0${u.file}\0${u.site}`;
					if (seen.has(key)) continue;
					seen.add(key);
					invokedAt.push({ ...hop(u), via });
				}
			}
			return { ...r, registeredAt: registeredAt.sort(byLoc), invokedAt: invokedAt.sort(byLoc) };
		});
}

/** Global timer functions (F15). */
const TIMERS = new Set(['setTimeout', 'setInterval', 'requestAnimationFrame', 'requestIdleCallback', 'queueMicrotask']);

/** Timers whose second argument is a delay. */
const DELAYED = new Set(['setTimeout', 'setInterval']);

/** Objects through which a global timer may be called. */
const GLOBAL_OBJECTS = new Set(['window', 'globalThis']);

/** `@tauri-apps/plugin-fs` functions by F15 class; other plugin-fs functions and every other Tauri API are `host`. */
const TAURI_FS_CLASS = new Map([
	...['writeTextFile', 'writeFile', 'mkdir', 'remove', 'rename', 'copyFile', 'create', 'truncate'].map((n) => [n, 'disk-write']),
	...['readTextFile', 'readFile', 'readDir', 'exists', 'stat', 'lstat', 'readTextFileLines', 'open'].map((n) => [n, 'disk-read']),
]);

/** Marks a scope entry as a destructure of a Tauri package's `await import`. */
const TAURI_MARK = 'tauri\0';

/** The sink origin of a Tauri specifier: `@tauri-apps/plugin-X` → `tauri-X`, `@tauri-apps/api/X` → `tauri-api-X`. */
function tauriOrigin(spec) {
	const rest = spec.slice('@tauri-apps/'.length);
	return `tauri-${rest.startsWith('plugin-') ? rest.slice('plugin-'.length) : rest.replace(/\//g, '-')}`;
}

/** A Tauri site's sink and class from its specifier and exported name. */
function tauriSink(spec, name) {
	const origin = tauriOrigin(spec);
	return { sink: `${origin}.${name}`, class: (origin === 'tauri-fs' && TAURI_FS_CLASS.get(name)) || 'host' };
}

/** `<svelte:window`, `<svelte:document` and `<svelte:body` opening tags. */
const SVELTE_SPECIAL_RE = /<(svelte:(?:window|document|body))(?![\w-])/g;

/** An event handler attribute name, `onx=` or `on:x=`, with optional Svelte 4 modifiers. */
const HANDLER_ATTR_RE = /(?<![\w:-])on:?([A-Za-z]\w*)(?:\|[\w|]*)?\s*=/g;

/**
 * The text of a tag from `from` to its closing `>`, with every character
 * inside `{…}` or a quoted value blanked, so only attribute names remain.
 */
function tagHead(text, from) {
	let depth = 0;
	let quote = null;
	let out = '';
	for (let i = from; i < text.length; i++) {
		const c = text[i];
		if (depth === 0 && quote === null && c === '>') break;
		if (quote !== null) {
			if (c === quote) quote = null;
			out += c === '\n' ? '\n' : ' ';
			continue;
		}
		if (c === '{') depth++;
		else if (c === '}') depth--;
		else if (depth === 0 && (c === '"' || c === "'")) quote = c;
		out += depth > 0 || c === '}' ? (c === '\n' ? '\n' : ' ') : c;
	}
	return out;
}

/** Whether a call's callee is a global timer: `name(…)` not declared in any scope, the file or its imports, or `window.name(…)`/`globalThis.name(…)`. */
function timerName(call, sc, fileNames) {
	const e = call.expression;
	if (ts.isIdentifier(e)) return TIMERS.has(e.text) && !lookup(e.text, sc) && !fileNames.has(e.text) ? e.text : null;
	if (ts.isPropertyAccessExpression(e) && ts.isIdentifier(e.expression) && GLOBAL_OBJECTS.has(e.expression.text) && TIMERS.has(e.name.text))
		return !lookup(e.expression.text, sc) && !fileNames.has(e.expression.text) ? e.name.text : null;
	return null;
}

/** Names a file declares at its top level or imports: a same-named callee is not a global. */
function fileNamesOf(facts) {
	const out = new Set(facts.bindings.map((b) => b.local));
	for (const region of facts.regions) {
		for (const n of moduleBindings(region)) out.add(n);
		for (const st of region.sf.statements) if ((ts.isFunctionDeclaration(st) || ts.isClassDeclaration(st)) && st.name) out.add(st.name.text);
	}
	return out;
}

/**
 * F15 for the frontend, production files only. Sites:
 * - Tauri package calls: a callee bound by a named, aliased, namespace or
 *   `await import` destructure from `@tauri-apps/*`; sink `<origin>.<exported
 *   name>`, class by the plugin-fs table, else `host`.
 * - Global timers (`setTimeout`, `setInterval`, `requestAnimationFrame`,
 *   `requestIdleCallback`, `queueMicrotask`, also through `window.` or
 *   `globalThis.`), sink `timer.<name>`, arg `delay=<2nd argument>` (cap 30)
 *   for `setTimeout` and `setInterval`.
 * - Timer wrapper calls: every F4 `call` of an exported function that holds a
 *   `setTimeout`/`setInterval` whose delay's root identifier is the function's
 *   own parameter; sink `timer-wrap.<name>`, arg `args=<arguments>` (cap 60)
 *   plus ` as X` when the call initializes `const X`.
 * - `$effect`, `$effect.pre`, `$effect.root` calls, sink `svelte.$effect`.
 * - `<expr>.addEventListener('<literal>', …)`, sink `dom.<event>`, arg the
 *   receiver text (cap 30); `on<name>=` / `on:<name>=` attributes of
 *   `<svelte:window|document|body>`, arg the tag name, enclosing `(markup)`.
 * - Tauri calls and global timers inside Svelte markup expressions (see
 *   `markupEffects`).
 * Excerpts drop comments and collapse whitespace. Identical sites (two calls
 * of one sink on one line) are one row.
 *
 * @param {Map<string, ReturnType<typeof extractTsFile>>} files facts by repo-relative path
 * @param {ReturnType<typeof extractUses>} uses
 * @param {(file: string) => boolean} isTest whether a file is a test or e2e file
 * @returns {{file: string, line: number, sink: string, class: string, arg: string, enclosing: string}[]}
 *   by (file, line, sink, arg, enclosing); `arg` '' when there is none
 */
export function tsEffects(files, uses, isTest) {
	const out = [];
	const wrappers = new Set();
	const paths = [...files.keys()].sort(cmp).filter((f) => !isTest(f));
	for (const file of paths) {
		const facts = files.get(file);
		const fileNames = fileNamesOf(facts);
		const tauri = new Map();
		const tauriDyn = new Map();
		for (const b of facts.bindings) {
			if (!b.spec.startsWith('@tauri-apps/') || b.typeOnly) continue;
			if (b.dynamic) tauriDyn.set(`${b.local}@${b.line}`, `${TAURI_MARK}${b.spec}\0${b.imported}`);
			else tauri.set(b.local, b);
		}
		for (const region of facts.regions) {
			const { sf, lineOffset } = region;
			const top = file.endsWith('.svelte') && !region.module ? '(script)' : '(module)';
			const lineOf = (n) => lineOffset + sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
			const dyn = (id) => tauriDyn.get(`${id.text}@${lineOf(ts.isBindingElement(id.parent) ? id.parent : id)}`) ?? null;
			const add = (n, sink, cls, arg) => out.push({ file, line: lineOf(n), sink, class: cls, arg, enclosing: enclosingOf(n, top, lineOf) });
			walkScoped(sf, [], dyn, (n, sc) => {
				if (!ts.isCallExpression(n)) return;
				const e = n.expression;
				if (EFFECTS.has(calleeText(n))) return add(n, 'svelte.$effect', 'reactive', '');
				const timer = timerName(n, sc, fileNames);
				if (timer) {
					const delay = DELAYED.has(timer) && n.arguments[1] ? `delay=${cap(nodeExcerpt(sf, n.arguments[1]), 30)}` : '';
					return add(n, `timer.${timer}`, 'timer', delay);
				}
				if (ts.isIdentifier(e)) {
					const hit = lookup(e.text, sc);
					if (hit?.id?.startsWith(TAURI_MARK)) {
						const [, spec, name] = hit.id.split('\0');
						const t = tauriSink(spec, name);
						return add(n, t.sink, t.class, '');
					}
					const b = !hit && tauri.get(e.text);
					if (b && b.imported !== '*') {
						const t = tauriSink(b.spec, b.imported);
						return add(n, t.sink, t.class, '');
					}
					return;
				}
				if (!ts.isPropertyAccessExpression(e)) return;
				const root = ts.isIdentifier(e.expression) ? e.expression.text : null;
				const ns = root && !lookup(root, sc) ? tauri.get(root) : null;
				if (ns && ns.imported === '*') {
					const t = tauriSink(ns.spec, e.name.text);
					return add(n, t.sink, t.class, '');
				}
				const ev = n.arguments[0];
				if (e.name.text === 'addEventListener' && ev && (ts.isStringLiteral(ev) || ts.isNoSubstitutionTemplateLiteral(ev)))
					add(n, `dom.${ev.text}`, 'dom', cap(nodeExcerpt(sf, e.expression), 30));
			});
			for (const fn of regionFunctions(region)) {
				if (!fn.exported || fn.member !== null) continue;
				let own = null;
				walkScoped(fn.node, [], () => null, (n, sc) => {
					if (n === fn.node) own = sc.at(-1) ?? null;
					if (!own || !ts.isCallExpression(n) || !DELAYED.has(timerName(n, sc, fileNames) ?? '')) return;
					const root = n.arguments[1] && chainRoot(n.arguments[1]);
					if (!root) return;
					for (let i = sc.length - 1; i >= 0; i--) {
						if (!sc[i].has(root.text)) continue;
						if (sc[i] === own) wrappers.add(`${file}:${fn.name}`);
						break;
					}
				});
			}
		}
		const template = facts.template;
		if (template) {
			const lineAt = lineIndex(template);
			for (const m of template.matchAll(SVELTE_SPECIAL_RE)) {
				const from = m.index + m[0].length;
				for (const a of tagHead(template, from).matchAll(HANDLER_ATTR_RE))
					out.push({ file, line: lineAt(from + a.index), sink: `dom.${a[1]}`, class: 'dom', arg: m[1], enclosing: '(markup)' });
			}
			out.push(...markupEffects(file, facts, tauri, fileNames));
		}
	}
	for (const u of uses) {
		if (u.kind !== 'call' || u.member !== null || !wrappers.has(u.target) || isTest(u.file)) continue;
		const node = useNode(files, u);
		if (!node?.call) continue;
		const { call, region } = node;
		const args = call.arguments.length
			? cap(codeExcerpt(region.sf, call, call.arguments[0].getStart(region.sf), call.arguments.at(-1).end), 60)
			: '';
		let e = call;
		while (e.parent && unwrap(e.parent) === call) e = e.parent;
		const v = e.parent;
		const asName =
			v && ts.isVariableDeclaration(v) && v.initializer === e && ts.isIdentifier(v.name) && v.parent.flags & ts.NodeFlags.Const ? v.name.text : null;
		const arg = [args ? `args=${args}` : '', asName ? `as ${asName}` : ''].filter(Boolean).join(' ');
		out.push({ file: u.file, line: u.line, sink: `timer-wrap.${u.target.slice(u.target.lastIndexOf(':') + 1)}`, class: 'timer', arg, enclosing: u.enclosing });
	}
	const seen = new Set();
	return out
		.filter((s) => {
			const key = `${s.file}\0${s.line}\0${s.sink}\0${s.arg}\0${s.enclosing}`;
			if (seen.has(key)) return false;
			seen.add(key);
			return true;
		})
		.sort((a, b) => cmp(a.file, b.file) || a.line - b.line || cmp(a.sink, b.sink) || cmp(a.arg, b.arg) || cmp(a.enclosing, b.enclosing));
}

/** A global timer call in markup code: an optional `window.`/`globalThis.` (group 1) and the timer name (group 2). */
const MARKUP_TIMER_RE = new RegExp(
	`(?<![\\w$])(?<!(?<!\\.)\\.)(?:(${[...GLOBAL_OBJECTS].join('|')})\\s*\\.\\s*)?(${[...TIMERS].join('|')})\\s*\\(`,
	'g',
);

/**
 * The F15 Tauri and timer sites inside the `{…}` expressions of a `.svelte`
 * file's markup, enclosing `(markup)`: a call of a static Tauri binding
 * (`B(` or, for a namespace, `B.name(`), and a global timer call whose name,
 * or its `window`/`globalThis` object, the file does not declare or import.
 * The delay of `setTimeout`/`setInterval` is parsed from the template text at
 * the call.
 */
function markupEffects(file, facts, tauri, fileNames) {
	const code = facts.markup;
	const lineAt = lineIndex(code);
	const out = [];
	const add = (index, sink, cls, arg) => out.push({ file, line: lineAt(index), sink, class: cls, arg, enclosing: '(markup)' });
	const before = '(?<![\\w$])(?<!(?<!\\.)\\.)';
	for (const [local, b] of tauri) {
		const ns = b.imported === '*';
		const re = new RegExp(`${before}${escapeRe(local)}${ns ? '\\s*\\.\\s*([\\w$]+)' : ''}\\s*\\(`, 'g');
		for (const m of code.matchAll(re)) {
			const t = tauriSink(b.spec, ns ? m[1] : b.imported);
			add(m.index, t.sink, t.class, '');
		}
	}
	for (const m of code.matchAll(MARKUP_TIMER_RE)) {
		const [, obj, name] = m;
		if (fileNames.has(obj ?? name)) continue;
		let arg = '';
		if (DELAYED.has(name)) {
			const sf = ts.createSourceFile('x.ts', facts.template.slice(m.index, m.index + 500), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
			const st = sf.statements[0];
			const call = st && ts.isExpressionStatement(st) && ts.isCallExpression(st.expression) ? st.expression : null;
			if (call?.arguments[1]) arg = `delay=${cap(nodeExcerpt(sf, call.arguments[1]), 30)}`;
		}
		add(m.index, `timer.${name}`, 'timer', arg);
	}
	return out;
}

/**
 * F17: each `<B` followed by whitespace, `/` or `>` in a `.svelte` file's
 * template (comments, `<script>` and `<style>` blanked), for every static,
 * non-type import binding B that resolves to a component.
 *
 * @param {Map<string, ReturnType<typeof extractTsFile>>} files facts by repo-relative path
 * @param {ReturnType<typeof resolveBindings>} resolved bindings of the same files
 * @returns {{file: string, line: number, name: string, target: string}[]} by (file, line, name)
 */
export function componentMounts(files, resolved) {
	const out = [];
	const byFile = new Map();
	for (const r of resolved) {
		if (r.dynamic || r.typeOnly || !r.id?.endsWith('.svelte:default') || !r.from.endsWith('.svelte')) continue;
		if (!byFile.has(r.from)) byFile.set(r.from, []);
		byFile.get(r.from).push(r);
	}
	for (const file of [...byFile.keys()].sort(cmp)) {
		const template = files.get(file).template;
		const lineAt = lineIndex(template);
		for (const r of byFile.get(file))
			for (const m of template.matchAll(new RegExp(`<${escapeRe(r.local)}(?=[\\s/>])`, 'g')))
				out.push({ file, line: lineAt(m.index), name: r.local, target: r.id.slice(0, -':default'.length) });
	}
	return out.sort((a, b) => cmp(a.file, b.file) || a.line - b.line || cmp(a.name, b.name));
}
