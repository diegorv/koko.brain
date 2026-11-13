// @ts-nocheck - build-time script, not part of the app's type-checked surface.
// codemap.test.ts imports it, which would otherwise pull it into the
// svelte-check program.
/**
 * rust.mjs
 *
 * Rust facts for the code map, read as text with no Rust parser: a lexer
 * giving code-only text and doc comment lines, the production text without
 * `#[cfg(test)]` items, items and file-local fns with signatures, spans and
 * docs (F12); `use` edges, item importers and cross-file callers (F16);
 * same-file calls (F20); disk, database, timer and spawn sites (F15); and the
 * Rust ends of IPC commands (F8), events (F9) and DTOs (F10), joined here with
 * the TS facts that `ts.mjs` reads.
 */
import { firstSentence } from './ts.mjs';

/** Code-unit comparison, the only sort order of the code map. */
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/** Root of the crate sources. */
const SRC = 'src-tauri/src';

/** Root of the crate integration tests. */
const TESTS = 'src-tauri/tests';

/** The crate root files, where a bare path may start with a top-level module. */
const ROOTS = new Set([`${SRC}/lib.rs`, `${SRC}/main.rs`]);

/** The file that holds the `*_EVENT` consts. */
const EVENTS_RS = `${SRC}/events.rs`;

/** A ts-rs output file directly under `contracts/generated/`. */
const GENERATED_RE = /^src\/lib\/contracts\/generated\/([^/]+)\.ts$/;

/** Longest signature kept, ellipsis included. */
const SIG_CAP = 120;

/**
 * Rust std and core method names that contain `_`. A crate method with one of
 * these names is never matched by `.name(` (F16 `lexical-method`).
 */
const RUST_STD_METHOD_NAMES = new Set([
	'is_empty',
	'to_string',
	'as_str',
	'as_ref',
	'get_mut',
	'to_owned',
	'into_iter',
	'iter_mut',
	'unwrap_or',
	'unwrap_or_default',
	'unwrap_or_else',
	'map_err',
	'ok_or',
	'and_then',
	'starts_with',
	'ends_with',
	'push_str',
	'to_lowercase',
	'to_uppercase',
	'split_whitespace',
	'as_bytes',
	'as_path',
	'to_path_buf',
	'file_name',
	'extension',
	'with_capacity',
	'read_to_string',
	'sort_by',
	'sort_by_key',
	'retain',
	'extend_from_slice',
	'is_some',
	'is_none',
	'is_ok',
	'is_err',
	'as_deref',
	'contains_key',
	'entry',
	'or_insert',
	'or_insert_with',
	'get_or_insert_with',
]);

/** `std::fs` and `tokio::fs` functions that write to disk (F15). */
const FS_WRITES = 'write|create_dir_all|create_dir|remove_file|remove_dir_all|remove_dir|rename|copy';

/** Whether a character continues an identifier. */
const isWord = (c) => c !== undefined && /[\w]/.test(c);

/** Collapses every whitespace run to one space. */
const collapse = (s) => s.replace(/\s+/g, ' ').trim();

/** Escapes a name for use inside a RegExp. */
const escapeRe = (s) => s.replace(/[$\\^.*+?()[\]{}|]/g, '\\$&');

/** Cuts `s` to `n` UTF-16 units, the last being `…`, when it is longer; never splits a surrogate pair. */
function cap(s, n) {
	if (s.length <= n) return s;
	const keep = /[\uD800-\uDBFF]/.test(s[n - 2]) ? n - 2 : n - 1;
	return `${s.slice(0, keep)}…`;
}

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

/** Replaces every character of `chars` in [from, to) other than a newline by a space, in place. */
function blankRange(chars, from, to) {
	for (let k = from; k < to; k++) if (chars[k] !== '\n') chars[k] = ' ';
}

/**
 * Lexes Rust source into code-only text: comments (`//`, nested `/* *\/`)
 * and the contents of string literals (`"…"` with escapes, `b"…"`, raw
 * `r"…"`/`r#"…"#`/`br#"…"#`) and char literals are blanked to spaces, every
 * newline and every delimiter kept, so offsets and lines match the source and
 * every brace left is a real one. A `'` opens a char literal only when it is
 * an escape (`'\n'`) or one character followed by `'`; otherwise it is a
 * lifetime or label.
 *
 * @param {string} text Rust source
 * @returns {{code: string, docs: Map<number, {inner: boolean, text: string}>}}
 *   `code` as long as `text`; `docs` maps the line of each `///` (not
 *   `////`) or `//!` comment that starts its line to its text after the marker
 */
export function lexRust(text) {
	const n = text.length;
	const chars = text.split('');
	const docs = new Map();
	const lineAt = lineIndex(text);
	let i = 0;
	while (i < n) {
		const c = text[i];
		if (c === '/' && text[i + 1] === '/') {
			let e = text.indexOf('\n', i);
			if (e === -1) e = n;
			const m = /^\/\/(\/(?!\/)|!)(.*)$/.exec(text.slice(i, e));
			const lineStart = text.lastIndexOf('\n', i - 1) + 1;
			if (m && text.slice(lineStart, i).trim() === '')
				docs.set(lineAt(i), { inner: m[1] === '!', text: m[2].replace(/\r$/, '') });
			blankRange(chars, i, e);
			i = e;
			continue;
		}
		if (c === '/' && text[i + 1] === '*') {
			let depth = 1;
			let k = i + 2;
			while (k < n && depth) {
				if (text[k] === '/' && text[k + 1] === '*') {
					depth++;
					k += 2;
				} else if (text[k] === '*' && text[k + 1] === '/') {
					depth--;
					k += 2;
				} else k++;
			}
			blankRange(chars, i, k);
			i = k;
			continue;
		}
		if (c === 'r' || (c === 'b' && text[i + 1] === 'r')) {
			let k = c === 'b' ? i + 2 : i + 1;
			let hashes = 0;
			while (text[k] === '#') {
				hashes++;
				k++;
			}
			if (text[k] === '"') {
				const close = `"${'#'.repeat(hashes)}`;
				const e = text.indexOf(close, k + 1);
				const end = e === -1 ? n : e;
				blankRange(chars, k + 1, end);
				i = end + close.length;
				continue;
			}
		}
		if (c === '"' || (c === 'b' && text[i + 1] === '"')) {
			let k = c === '"' ? i + 1 : i + 2;
			const start = k;
			while (k < n && text[k] !== '"') k += text[k] === '\\' ? 2 : 1;
			blankRange(chars, start, k);
			i = k + 1;
			continue;
		}
		if (c === "'") {
			if (text[i + 1] === '\\') {
				let k = i + 3;
				while (k < n && text[k] !== "'" && text[k] !== '\n') k++;
				blankRange(chars, i + 1, k);
				i = k + 1;
				continue;
			}
			const w = (text.codePointAt(i + 1) ?? 0) > 0xffff ? 2 : 1;
			if (text[i + 1] !== '\n' && text[i + 1 + w] === "'") {
				blankRange(chars, i + 1, i + 1 + w);
				i += 2 + w;
				continue;
			}
			i++;
			continue;
		}
		if (isWord(c)) {
			while (i < n && isWord(text[i])) i++;
			continue;
		}
		i++;
	}
	return { code: chars.join(''), docs };
}

/** Index of the `}` closing the `{` at `open`, or the last index when unbalanced. */
function braceClose(code, open) {
	let depth = 0;
	for (let k = open; k < code.length; k++) {
		if (code[k] === '{') depth++;
		else if (code[k] === '}' && --depth === 0) return k;
	}
	return code.length - 1;
}

/** Index of the `]` closing the `[` at `open`. */
function bracketClose(code, open) {
	let depth = 0;
	for (let k = open; k < code.length; k++) {
		if (code[k] === '[') depth++;
		else if (code[k] === ']' && --depth === 0) return k;
	}
	return code.length - 1;
}

/** Index of the `)` closing the `(` at `open`. */
function parenClose(code, open) {
	let depth = 0;
	for (let k = open; k < code.length; k++) {
		if (code[k] === '(') depth++;
		else if (code[k] === ')' && --depth === 0) return k;
	}
	return code.length - 1;
}

/**
 * The end of the item starting at `from`: the `}` of its first top-level
 * block, or its `;`, outside parentheses and brackets.
 */
function itemEnd(code, from) {
	let pd = 0;
	for (let k = from; k < code.length; k++) {
		const c = code[k];
		if (c === '(' || c === '[') pd++;
		else if (c === ')' || c === ']') pd--;
		else if (pd <= 0 && c === ';') return k;
		else if (pd <= 0 && c === '{') return braceClose(code, k);
	}
	return code.length - 1;
}

/**
 * The production text: `code` with every item, statement or block that a
 * `#[cfg(test)]` attribute precedes blanked from the attribute to its end,
 * newlines kept.
 *
 * @param {string} code code-only text from `lexRust`
 * @returns {string}
 */
export function productionText(code) {
	const chars = code.split('');
	let done = -1;
	for (const m of code.matchAll(/#\s*\[\s*cfg\s*\(\s*test\s*\)\s*\]/g)) {
		if (m.index <= done) continue;
		done = itemEnd(code, m.index + m[0].length);
		blankRange(chars, m.index, done + 1);
	}
	return chars.join('');
}

/** Item keywords whose statement ends at the close of their first block. */
const BLOCK_HEAD_RE =
	/^(?:pub(?:\s*\([^)]*\))?\s+)?(?:(?:const|async|unsafe|default|extern(?:\s+"[^"]*")?)\s+)*(?:fn|impl|mod|struct|enum|trait|union|extern|macro_rules\s*!)\b/;

/** Whether code[s, j), the text before a statement's first `{`, makes that block end the statement. */
const isBlockHeader = (code, s, j) => {
	const h = code.slice(attributes(code, s, j).at, j).trim();
	return BLOCK_HEAD_RE.test(h) || /!\s*(?:\w+\s*)?$/.test(h);
};

/**
 * The statements in code[from, to): each from its first non-space character
 * to its `;` or, for an item with a block, the block's `}`.
 *
 * @returns {{start: number, end: number, block: [number, number] | null}[]}
 */
function statements(code, from, to) {
	const out = [];
	let i = from;
	while (i < to) {
		while (i < to && /\s/.test(code[i])) i++;
		if (i >= to) break;
		const s = i;
		let pd = 0;
		let block = null;
		let end = to - 1;
		for (let j = s; j < to; j++) {
			const c = code[j];
			if (c === '(' || c === '[') pd++;
			else if (c === ')' || c === ']') pd--;
			else if (c === ';' && pd <= 0) {
				end = j;
				break;
			} else if (c === '{') {
				const close = braceClose(code, j);
				if (pd <= 0 && isBlockHeader(code, s, j)) {
					block = [j, close];
					end = close;
					break;
				}
				j = close;
			} else if (c === '}') {
				end = j === s ? s : j - 1;
				break;
			}
		}
		out.push({ start: s, end, block });
		i = end + 1;
	}
	return out;
}

/** The attributes leading a statement and the index of its first token after them. */
function attributes(code, s, e) {
	const attrs = [];
	let k = s;
	for (;;) {
		while (k < e && /\s/.test(code[k])) k++;
		if (code[k] !== '#') break;
		let b = k + 1;
		if (code[b] === '!') b++;
		while (/\s/.test(code[b] ?? '')) b++;
		if (code[b] !== '[') break;
		const close = bracketClose(code, b);
		attrs.push(code.slice(k, close + 1));
		k = close + 1;
	}
	return { attrs, at: k };
}

/** Visibility, qualifiers, keyword and name (`r#` kept) at the start of an item. */
const ITEM_RE =
	/^(pub(?:\s*\(\s*(crate|super|self|in\b[^)]*)\s*\))?\s+)?((?:(?:const|async|unsafe|extern(?:\s+"[^"]*")?)\s+)*)(fn|struct|enum|trait|type|const|static|union)\s+(?:mut\s+)?((?:r#)?[A-Za-z_]\w*)/;

/** The type an `impl` header implements for: `{type, trait}`, or null when it is not an impl. */
function implHeader(header) {
	const m = /^(?:unsafe\s+)?impl\b/.exec(header);
	if (!m) return null;
	let h = header.slice(m[0].length);
	for (let prev = ''; prev !== h; ) {
		prev = h;
		h = h.replace(/<[^<>]*>/g, ' ');
	}
	h = h.replace(/\bwhere\b[\s\S]*$/, '');
	const parts = h.split(/\bfor\b/);
	const typeText = (parts.length > 1 ? parts[parts.length - 1] : parts[0]).replace(/[&*]|\b(?:mut|dyn|const)\b|'\w+/g, ' ');
	const segs = typeText.trim().split(/\s*::\s*/);
	const type = /^[A-Za-z_]\w*$/.test(segs.at(-1) ?? '') ? segs.at(-1) : null;
	return type ? { type, trait: parts.length > 1 } : null;
}

/** `(params) -> Ret` of a fn whose name ends at `from`, up to `{`, `;` or `where`; whitespace collapsed. */
function fnSignature(code, from, end) {
	let k = from;
	while (k < end && /\s/.test(code[k])) k++;
	if (code[k] === '<') {
		let depth = 0;
		for (; k < end; k++) {
			if (code[k] === '<') depth++;
			else if (code[k] === '>' && code[k - 1] !== '-' && --depth === 0) break;
		}
		k++;
	}
	const open = code.indexOf('(', k);
	if (open === -1 || open > end) return '';
	const close = parenClose(code, open);
	const params = collapse(code.slice(open + 1, close));
	const rest = code.slice(close + 1, end + 1);
	const ret = /^\s*->([\s\S]*?)(?:\bwhere\b|[{;]|$)/.exec(rest);
	return cap(`(${params})${ret ? ` -> ${collapse(ret[1])}` : ''}`, SIG_CAP);
}

/** The module path of a crate file: `a/b.rs` → [a, b], `a/mod.rs` → [a], `lib.rs` → []. */
function modulePathOf(file) {
	if (!file.startsWith(`${SRC}/`)) return [];
	const segs = file.slice(SRC.length + 1).replace(/\.rs$/, '').split('/');
	if (segs.at(-1) === 'mod') segs.pop();
	if (segs.length === 1 && (segs[0] === 'lib' || segs[0] === 'main')) return [];
	return segs;
}

/**
 * Splits a `use` tree into its leaves. `self` in a brace list names the
 * module itself; `as _` keeps the leaf with alias `_`.
 *
 * @param {string} tree the text after `use`, without the `;`
 * @param {number} [base] offset of `tree` in its file
 * @returns {{segs: string[], alias: string | null, glob: boolean, offset: number}[]}
 */
function useLeaves(tree, base = 0) {
	const tokens = [];
	const re = /\s*(::|\{|\}|,|\*|r#\w+|[A-Za-z_]\w*)/y;
	for (let m = re.exec(tree); m; m = re.exec(tree)) tokens.push({ t: m[1], offset: base + m.index + m[0].length - m[1].length });
	const out = [];
	let pos = 0;
	const parse = (prefix) => {
		const segs = [...prefix];
		if (tokens[pos]?.t === '::') pos++;
		for (;;) {
			const tok = tokens[pos];
			if (!tok) return;
			if (tok.t === '{') {
				pos++;
				while (tokens[pos] && tokens[pos].t !== '}') {
					parse(segs);
					if (tokens[pos]?.t === ',') pos++;
					else if (tokens[pos] && tokens[pos].t !== '}') pos++;
				}
				pos++;
				return;
			}
			if (tok.t === '*') {
				out.push({ segs, alias: null, glob: true, offset: tok.offset });
				pos++;
				return;
			}
			if (!/^[\w#]/.test(tok.t)) return;
			segs.push(tok.t);
			pos++;
			if (tokens[pos]?.t === '::') {
				pos++;
				continue;
			}
			let alias = null;
			if (tokens[pos]?.t === 'as' && tokens[pos + 1]) {
				alias = tokens[pos + 1].t;
				pos += 2;
			}
			if (segs.at(-1) === 'self') segs.pop();
			out.push({ segs, alias, glob: false, offset: tok.offset });
			return;
		}
	};
	while (pos < tokens.length) {
		const before = pos;
		parse([]);
		if (pos === before) pos++;
	}
	return out;
}

/**
 * The leaves of a `use` tree as text, `a::b::C`, `a::b::D as E`, `a::f::*`.
 *
 * @param {string} tree the text after `use`, without the `;`
 * @returns {string[]} in source order
 */
export function parseUseTree(tree) {
	return useLeaves(tree).map((l) => `${l.segs.join('::')}${l.glob ? '::*' : ''}${l.alias ? ` as ${l.alias}` : ''}`);
}

/**
 * Lexes one Rust file and reads its F12 items, local fns, inline modules and
 * `use` statements from the production text.
 *
 * Items: depth-0 `pub`, `pub(crate)`, `pub(super)`, `pub(in path)` fn,
 * struct, enum, trait, type, const, static and union; `pub fn` of an inherent
 * `impl` as `Type::name` (kind `method`). A fn with `#[tauri::command]` is kind
 * `cmd`; a restricted visibility adds `(crate)` or `(super)` to the kind
 * (`pub(in path)` gives `(crate)`); `dto` marks a `#[ts(export)]` item.
 * Locals: non-pub and `pub(self)` fns at depth 0 and in impls, and every fn of
 * a trait impl, as `Type::name` in an impl. Of two definitions with one name
 * (cfg-gated twins) only the first is kept, an item before a local. Items
 * inside inline modules are not read.
 *
 * @param {string} file repo-relative POSIX path
 * @param {string} text file content
 * @returns {{
 *   file: string, text: string, code: string, prod: string,
 *   fileDoc: string, inlineTests: boolean,
 *   items: {name: string, kind: string, line: number, span: number, sig: string, doc: string, dto: boolean}[],
 *   locals: {name: string, kind: 'fn', line: number, span: number, sig: string}[],
 *   fns: {name: string, start: number, end: number}[],
 *   impls: {type: string, start: number, end: number}[],
 *   mods: {name: string, start: number, end: number}[],
 *   uses: {start: number, end: number, line: number, leaves: {segs: string[], alias: string | null, glob: boolean, offset: number, line: number}[]}[],
 *   lineAt: (offset: number) => number,
 * }} items and locals by (line, name); offsets index `prod`; `fns` holds
 *   every depth-0 and impl fn (trait impls included) for enclosing lookups
 */
export function extractRustFile(file, text) {
	const { code, docs } = lexRust(text);
	const prod = productionText(code);
	const lineAt = lineIndex(text);
	const items = [];
	const locals = [];
	const fns = [];
	const impls = [];
	const codeLines = code.split('\n');
	const textLines = text.split('\n');
	const plainComment = (l) => codeLines[l - 1].trim() === '' && textLines[l - 1].trim() !== '';
	const docAbove = (sLine, atLine) => {
		const run = [];
		for (let l = atLine - 1; l >= 1; l--) {
			const d = docs.get(l);
			if (d && !d.inner) run.push(d.text);
			else if (l < sLine && !plainComment(l)) break;
		}
		return firstSentence(run.reverse().join('\n'));
	};
	const read = (st, owner) => {
		const { attrs, at } = attributes(prod, st.start, st.end + 1);
		const head = prod.slice(at, st.block ? st.block[0] : st.end + 1);
		const impl = !owner && st.block ? implHeader(head) : null;
		if (impl) {
			impls.push({ type: impl.type, start: st.start, end: st.end });
			for (const inner of statements(prod, st.block[0] + 1, st.block[1])) read(inner, impl);
			return;
		}
		const m = ITEM_RE.exec(head);
		if (!m) return;
		const [, pub, restricted, , keyword, name] = m;
		const line = lineAt(at);
		const span = lineAt(st.end) - line + 1;
		const isFn = keyword === 'fn';
		const id = owner ? `${owner.type}::${name}` : name;
		if (isFn) fns.push({ name: id, start: at, end: st.end });
		const sig = isFn ? fnSignature(prod, at + m[0].length, st.block ? st.block[0] : st.end) : '';
		if (!pub || restricted === 'self' || owner?.trait) {
			if (isFn) locals.push({ name: id, kind: 'fn', line, span, sig });
			return;
		}
		if (owner && !isFn) return;
		const vis = !restricted ? '' : restricted.startsWith('in') ? '(crate)' : `(${restricted})`;
		const cmd = isFn && attrs.some((a) => /^#\s*\[\s*tauri\s*::\s*command\b/.test(a));
		const kind = `${owner ? 'method' : cmd ? 'cmd' : keyword}${vis}`;
		const dto = attrs.some((a) => /\bts\s*\(\s*export\b/.test(a));
		items.push({ name: id, kind, line, span, sig, doc: docAbove(lineAt(st.start), line), dto });
	};
	for (const st of statements(prod, 0, prod.length)) read(st, null);
	const mods = [];
	for (const m of prod.matchAll(/(?<![\w])mod\s+([A-Za-z_]\w*)\s*\{/g)) {
		const open = m.index + m[0].length - 1;
		mods.push({ name: m[1], start: open, end: braceClose(prod, open) });
	}
	const uses = [];
	for (const m of prod.matchAll(/(?<![\w:])use\s+([^;]*);/g)) {
		const base = m.index + m[0].indexOf(m[1], 3);
		const leaves = useLeaves(m[1], base).map((l) => ({ ...l, line: lineAt(l.offset) }));
		uses.push({ start: m.index, end: m.index + m[0].length, line: lineAt(m.index), leaves });
	}
	const innerRun = [];
	for (const l of [...docs.keys()].sort((a, b) => a - b)) {
		const d = docs.get(l);
		if (!d.inner) continue;
		if (innerRun.length && l !== innerRun.at(-1).l + 1) break;
		innerRun.push({ l, text: d.text });
	}
	const byLineName = (a, b) => a.line - b.line || cmp(a.name, b.name);
	const taken = new Set();
	const firstOf = (list) =>
		list.sort(byLineName).filter((x) => {
			if (taken.has(x.name)) return false;
			taken.add(x.name);
			return true;
		});
	const keptItems = firstOf(items);
	const keptLocals = firstOf(locals);
	return {
		file,
		text,
		code,
		prod,
		fileDoc: firstSentence(innerRun.map((d) => d.text).join('\n')),
		inlineTests: /#\s*\[\s*cfg\s*\(\s*test\s*\)\s*\]/.test(code),
		items: keptItems,
		locals: keptLocals,
		fns,
		impls,
		mods,
		uses,
		lineAt,
	};
}

/** The F12 fn enclosing an offset of a file's production text, or `(module)`. */
function enclosingAt(facts, offset) {
	for (const f of facts.fns) if (f.start <= offset && offset <= f.end) return f.name;
	return '(module)';
}

/** The inherent or trait impl type enclosing an offset, or null. */
function implAt(facts, offset) {
	for (const im of facts.impls) if (im.start <= offset && offset <= im.end) return im.type;
	return null;
}

/** The module path in force at an offset: the file's, plus the inline `mod`s around it. */
function modulePathAt(facts, offset) {
	const segs = modulePathOf(facts.file);
	for (const m of facts.mods) if (m.start < offset && offset < m.end) segs.push(m.name);
	return segs;
}

/**
 * The file and remaining segments a crate-absolute path names: the longest
 * prefix existing as `<SRC>/<a>/<b>.rs` or `<a>/<b>/mod.rs`, else `lib.rs`.
 */
function resolveModulePath(segs, exists) {
	for (let k = segs.length; k >= 1; k--) {
		const base = `${SRC}/${segs.slice(0, k).join('/')}`;
		for (const file of [`${base}.rs`, `${base}/mod.rs`]) if (exists(file)) return { file, rest: segs.slice(k) };
	}
	return exists(`${SRC}/lib.rs`) ? { file: `${SRC}/lib.rs`, rest: segs } : null;
}

/**
 * The crate-absolute segments of a path written in `facts.file` at `offset`,
 * or null for a path outside the crate: `crate::` dropped, `self::` and
 * `super::` resolved against the module path, `kokobrain_lib::` dropped in
 * integration tests, a bare top-level module kept in the crate root files.
 */
function absoluteSegs(segs, facts, offset, topModules) {
	const test = facts.file.startsWith(`${TESTS}/`);
	if (!segs.length) return null;
	if (segs[0] === 'kokobrain_lib') return test ? segs.slice(1) : null;
	if (test) return null;
	if (segs[0] === 'crate') return segs.slice(1);
	if (segs[0] === 'self') return [...modulePathAt(facts, offset), ...segs.slice(1)];
	if (segs[0] === 'super') {
		const mod = modulePathAt(facts, offset);
		let k = 0;
		while (segs[k] === 'super') {
			mod.pop();
			k++;
		}
		return [...mod, ...segs.slice(k)];
	}
	if (ROOTS.has(facts.file) && topModules.has(segs[0])) return segs;
	return null;
}

/** The `[` and `]` offsets of the `generate_handler![…]` list in a file's production text, or null. */
function handlerRange(prod) {
	const m = /generate_handler\s*!\s*\[/.exec(prod);
	if (!m) return null;
	const open = m.index + m[0].length - 1;
	return [open, bracketClose(prod, open)];
}

/** The production text of a file with its `use` statements blanked, so call scans skip them. */
function bodyText(facts) {
	const chars = facts.prod.split('');
	for (const u of facts.uses) blankRange(chars, u.start, u.end);
	return chars.join('');
}

/**
 * Inline paths outside `use`: `crate::a::b…` everywhere, `kokobrain_lib::…`
 * in integration tests, and in the crate root files a bare path whose first
 * segment is a top-level module.
 */
function inlinePaths(facts, body, topModules) {
	const heads = ['crate'];
	if (facts.file.startsWith(`${TESTS}/`)) heads.push('kokobrain_lib');
	if (ROOTS.has(facts.file)) heads.push(...[...topModules].sort(cmp));
	const re = new RegExp(`(?<![\\w:])(?:${heads.map(escapeRe).join('|')})(?:\\s*::\\s*[A-Za-z_]\\w*)+`, 'g');
	return [...body.matchAll(re)].map((m) => ({ segs: m[0].split(/\s*::\s*/), offset: m.index, end: m.index + m[0].length }));
}

/** Names of the items and local fns of a file, as IDs by name. */
function namesOf(facts) {
	const out = new Map();
	for (const x of [...facts.items, ...facts.locals]) out.set(x.name, `${facts.file}:${x.name}`);
	return out;
}

/**
 * F16 and F20 over every Rust file: `use` and inline-path file edges, call
 * rows, and the `by` users of each item.
 *
 * Edges: one per (file, `use` statement or inline-path line, target), names
 * in source order: the item after the file prefix, `*` for a glob of the
 * module, `self` for the module itself. Self edges and paths outside the
 * crate are dropped.
 *
 * Calls (production text, `use` statements and the `generate_handler!` list
 * of `lib.rs` left out, enclosing by F12; a handler entry is an edge only):
 * - `lexical`: in another file, an imported item's local name followed by
 *   `(` or `::`; `alias::X` through a module alias, followed by `(` or `::`; a
 *   full inline path naming an item; `Type::method(` of an imported type. A
 *   glob brings in the pub items of its module that the file does not define.
 * - `lexical-method`: `.name(` of a pub impl method whose name contains `_`,
 *   is defined once among all crate fn names and is not in
 *   RUST_STD_METHOD_NAMES.
 * - `call` (same file, F20): `self.name(` and `Self::name(` of the enclosing
 *   impl, `Type::name(` of a type of the file, a bare `name(` of a depth-0 fn.
 *
 * @param {Map<string, ReturnType<typeof extractRustFile>>} files facts by path, `src-tauri/src` and `src-tauri/tests`
 * @returns {{
 *   edges: {from: string, line: number, target: string, names: string[]}[],
 *   calls: {file: string, line: number, enclosing: string, target: string, kind: string}[],
 *   users: Map<string, {file: string, line: number, enclosing: string, kind: string, more: number}[]>,
 * }} edges by (from, line, target); calls by (file, line, target, kind);
 *   users keyed in code-unit order, by user file path, integration tests left out
 */
export function analyzeRust(files) {
	const paths = [...files.keys()].sort(cmp);
	const exists = (p) => p.startsWith(`${SRC}/`) && files.has(p);
	const topModules = new Set();
	for (const p of paths) {
		if (!p.startsWith(`${SRC}/`)) continue;
		const first = p.slice(SRC.length + 1).split('/')[0].replace(/\.rs$/, '');
		if (first !== 'lib' && first !== 'main') topModules.add(first);
	}
	const fnCounts = new Map();
	for (const p of paths) {
		if (!p.startsWith(`${SRC}/`)) continue;
		for (const m of files.get(p).prod.matchAll(/(?<![\w])fn\s+((?:r#)?[A-Za-z_]\w*)/g)) fnCounts.set(m[1], (fnCounts.get(m[1]) ?? 0) + 1);
	}
	const uniqueMethods = new Map();
	for (const p of paths) {
		for (const it of files.get(p).items) {
			if (!it.kind.startsWith('method')) continue;
			const name = it.name.slice(it.name.indexOf('::') + 2);
			if (name.includes('_') && fnCounts.get(name) === 1 && !RUST_STD_METHOD_NAMES.has(name)) uniqueMethods.set(name, `${p}:${it.name}`);
		}
	}
	const named = new Map(paths.map((p) => [p, namesOf(files.get(p))]));
	const edgeMap = new Map();
	const addEdge = (from, line, target, name) => {
		if (target === from) return;
		const key = `${from}\0${String(line).padStart(9, '0')}\0${target}`;
		if (!edgeMap.has(key)) edgeMap.set(key, { from, line, target, names: [] });
		const names = edgeMap.get(key).names;
		if (!names.includes(name)) names.push(name);
	};
	const calls = [];
	const leafUsers = [];
	for (const p of paths) {
		const facts = files.get(p);
		const own = named.get(p);
		const items = new Map();
		const modules = new Map();
		for (const u of facts.uses) {
			for (const leaf of u.leaves) {
				const abs = absoluteSegs(leaf.segs, facts, leaf.offset, topModules);
				const hit = abs && resolveModulePath(abs, exists);
				if (!hit) continue;
				addEdge(p, u.line, hit.file, hit.rest.length ? hit.rest[0] : leaf.glob ? '*' : 'self');
				if (hit.file === p) continue;
				const targetNames = named.get(hit.file);
				const local = leaf.alias ?? leaf.segs.at(-1);
				if (leaf.glob) {
					if (hit.rest.length) continue;
					for (const it of files.get(hit.file).items) if (!own.has(it.name) && !items.has(it.name)) items.set(it.name, targetNames.get(it.name));
					continue;
				}
				if (local === '_') continue;
				if (!hit.rest.length) modules.set(local, hit.file);
				else if (targetNames.has(hit.rest[0])) {
					items.set(local, targetNames.get(hit.rest[0]));
					leafUsers.push({ id: targetNames.get(hit.rest[0]), file: p, line: leaf.line });
				}
			}
		}
		const body = bodyText(facts);
		const handlers = p === `${SRC}/lib.rs` ? handlerRange(facts.prod) : null;
		const inHandlers = (offset) => handlers !== null && handlers[0] < offset && offset < handlers[1];
		let scan = body;
		if (handlers) {
			const chars = body.split('');
			blankRange(chars, handlers[0] + 1, handlers[1]);
			scan = chars.join('');
		}
		const seen = new Set();
		const claimed = new Set();
		const row = (offset, target, kind) => {
			const key = `${offset}\0${target}`;
			if (seen.has(key)) return;
			seen.add(key);
			calls.push({ file: p, line: facts.lineAt(offset), enclosing: enclosingAt(facts, offset), target, kind, offset });
		};
		const methodOf = (typeId, after, kind) => {
			const m = /^\s*::\s*([A-Za-z_]\w*)\s*\(/.exec(scan.slice(after));
			if (!m) return;
			const file = typeId.slice(0, typeId.indexOf(':'));
			const id = `${file}:${typeId.slice(file.length + 1)}::${m[1]}`;
			if (named.get(file)?.has(`${typeId.slice(file.length + 1)}::${m[1]}`)) row(after, id, file === p ? 'call' : kind);
		};
		for (const [local, id] of [...items].sort(([a], [b]) => cmp(a, b))) {
			const re = new RegExp(`(?<![\\w.])(?<!::\\s*)(?<!\\bfn\\s+)${escapeRe(local)}(?![\\w])(?=\\s*(?:\\(|::))`, 'g');
			for (const m of scan.matchAll(re)) {
				row(m.index, id, 'lexical');
				methodOf(id, m.index + local.length, 'lexical');
			}
		}
		for (const [alias, file] of [...modules].sort(([a], [b]) => cmp(a, b))) {
			const re = new RegExp(`(?<![\\w.])(?<!::\\s*)${escapeRe(alias)}\\s*::\\s*([A-Za-z_]\\w*)(?=\\s*(?:\\(|::))`, 'g');
			for (const m of scan.matchAll(re)) {
				const id = named.get(file)?.get(m[1]);
				if (!id) continue;
				const at = m.index + m[0].length - m[1].length;
				row(at, id, 'lexical');
				methodOf(id, m.index + m[0].length, 'lexical');
			}
		}
		for (const ip of inlinePaths(facts, body, topModules)) {
			const abs = absoluteSegs(ip.segs, facts, ip.offset, topModules);
			const hit = abs && resolveModulePath(abs, exists);
			if (!hit) continue;
			addEdge(p, facts.lineAt(ip.offset), hit.file, hit.rest.length ? hit.rest[0] : 'self');
			const targetNames = named.get(hit.file);
			if (inHandlers(ip.offset) || !hit.rest.length || !targetNames.has(hit.rest[0])) continue;
			const kind = hit.file === p ? 'call' : 'lexical';
			row(ip.offset, targetNames.get(hit.rest[0]), kind);
			const method = hit.rest.length > 1 ? `${hit.rest[0]}::${hit.rest[1]}` : null;
			if (method && targetNames.has(method) && /^\s*\(/.test(scan.slice(ip.end))) row(ip.offset, targetNames.get(method), kind);
		}
		for (const m of scan.matchAll(/(?<![\w.])self\s*\.\s*([A-Za-z_]\w*)\s*\(/g)) {
			const type = implAt(facts, m.index);
			const name = type && `${type}::${m[1]}`;
			if (!name || !own.has(name)) continue;
			const at = m.index + m[0].indexOf(m[1], 4);
			claimed.add(at);
			row(at, own.get(name), 'call');
		}
		for (const m of scan.matchAll(/(?<![\w.])(?<!::\s*)(Self|[A-Z]\w*)\s*::\s*([A-Za-z_]\w*)\s*\(/g)) {
			const type = m[1] === 'Self' ? implAt(facts, m.index) : m[1];
			const name = type && `${type}::${m[2]}`;
			if (name && own.has(name)) row(m.index, own.get(name), 'call');
		}
		const depth0 = facts.fns.filter((f) => !f.name.includes('::') && own.has(f.name)).map((f) => f.name);
		if (depth0.length) {
			const alt = [...new Set(depth0)].sort(cmp).map(escapeRe).join('|');
			const re = new RegExp(`(?<![\\w.])(?<!::\\s*)(?<!\\bfn\\s+)(?:${alt})(?![\\w])(?=\\s*\\()`, 'g');
			for (const m of scan.matchAll(re)) row(m.index, own.get(m[0]), 'call');
		}
		for (const m of scan.matchAll(/\.\s*([A-Za-z_]\w*)\s*\(/g)) {
			const id = uniqueMethods.get(m[1]);
			const at = m.index + m[0].indexOf(m[1]);
			if (id && !claimed.has(at)) row(at, id, 'lexical-method');
		}
	}
	calls.sort((x, y) => cmp(x.file, y.file) || x.line - y.line || cmp(x.target, y.target) || cmp(x.kind, y.kind) || x.offset - y.offset);
	const isTestFile = (f) => f.startsWith(`${TESTS}/`);
	const fileOfId = (id) => id.slice(0, id.indexOf(':'));
	const by = new Map();
	for (const c of calls) {
		if (fileOfId(c.target) === c.file || isTestFile(c.file)) continue;
		if (!by.has(c.target)) by.set(c.target, new Map());
		const per = by.get(c.target);
		const first = per.get(c.file);
		if (!first) per.set(c.file, { file: c.file, line: c.line, enclosing: c.enclosing, kind: c.kind, more: 0 });
		else if (first.enclosing === c.enclosing) first.more++;
	}
	for (const u of leafUsers) {
		if (isTestFile(u.file)) continue;
		if (!by.has(u.id)) by.set(u.id, new Map());
		const per = by.get(u.id);
		const first = per.get(u.file);
		if (!first || (first.kind === 'import' && u.line < first.line))
			per.set(u.file, { file: u.file, line: u.line, enclosing: '(module)', kind: 'import', more: 0 });
	}
	const users = new Map();
	for (const id of [...by.keys()].sort(cmp)) {
		const per = by.get(id);
		users.set(id, [...per.keys()].sort(cmp).map((f) => per.get(f)));
	}
	return {
		edges: [...edgeMap.keys()].sort(cmp).map((k) => edgeMap.get(k)),
		calls: calls.map(({ offset, ...c }) => c),
		users,
	};
}

/**
 * F15 Rust sites of one crate file, in production text: `std::fs` and
 * `tokio::fs` writes (written out, or through `use std::fs` / `use tokio::fs`
 * bound to `fs`), `File::create(` and `OpenOptions::new(`, `.execute(` and
 * `.execute_batch(` (`rust-db.execute`), `thread::sleep(` and
 * `tokio::time::sleep|interval|timeout(`, and `tauri::async_runtime::spawn(`,
 * `std::thread::spawn(` (or `thread::spawn(` with `std::thread` imported as
 * `thread`), `tokio::spawn(`.
 *
 * @param {ReturnType<typeof extractRustFile>} facts
 * @returns {{file: string, line: number, sink: string, class: string, enclosing: string}[]} by (line, sink)
 */
export function rustEffects(facts) {
	if (!facts.file.startsWith(`${SRC}/`)) return [];
	const body = bodyText(facts);
	let fsOrigin = null;
	let fileOrigin = 'rust-fs';
	let threadImported = false;
	for (const u of facts.uses) {
		for (const l of u.leaves) {
			const path = l.segs.join('::');
			const local = l.alias ?? l.segs.at(-1);
			if (!l.glob && local === 'fs' && (path === 'std::fs' || path === 'tokio::fs')) fsOrigin = path === 'std::fs' ? 'rust-fs' : 'rust-tokio-fs';
			else if (!l.glob && local === 'fs') fsOrigin = null;
			if (!l.glob && /^tokio::fs::(File|OpenOptions)$/.test(path)) fileOrigin = 'rust-tokio-fs';
			if (!l.glob && local === 'thread') threadImported = path === 'std::thread';
		}
	}
	const out = [];
	const add = (offset, sink, cls) =>
		out.push({ file: facts.file, line: facts.lineAt(offset), sink, class: cls, enclosing: enclosingAt(facts, offset), offset });
	for (const m of body.matchAll(new RegExp(`(?<![\\w:])(?:(std|tokio)\\s*::\\s*)?fs\\s*::\\s*(${FS_WRITES})\\s*\\(`, 'g'))) {
		const origin = m[1] ? (m[1] === 'std' ? 'rust-fs' : 'rust-tokio-fs') : fsOrigin;
		if (origin) add(m.index, `${origin}.${m[2]}`, 'disk-write');
	}
	for (const m of body.matchAll(/(?<![\w:])(?:(?:(std|tokio)\s*::\s*)?(fs)\s*::\s*)?(File\s*::\s*create|OpenOptions\s*::\s*new)\s*\(/g)) {
		const origin = m[1] ? (m[1] === 'std' ? 'rust-fs' : 'rust-tokio-fs') : m[2] ? fsOrigin : fileOrigin;
		if (origin) add(m.index, `${origin}.${m[3].replace(/\s+/g, '')}`, 'disk-write');
	}
	for (const m of body.matchAll(/\.\s*execute(?:_batch)?\s*\(/g)) add(m.index, 'rust-db.execute', 'db');
	for (const m of body.matchAll(/(?<![\w])thread\s*::\s*sleep\s*\(/g)) add(m.index, 'rust-timer.sleep', 'timer');
	for (const m of body.matchAll(/(?<![\w])tokio\s*::\s*time\s*::\s*(sleep|interval|timeout)\s*\(/g)) add(m.index, `rust-timer.${m[1]}`, 'timer');
	for (const m of body.matchAll(/(?<![\w])(?:tauri\s*::\s*async_runtime|tokio)\s*::\s*spawn\s*\(/g)) add(m.index, 'rust-spawn.spawn', 'spawn');
	for (const m of body.matchAll(/(?<![\w:])(std\s*::\s*)?thread\s*::\s*spawn\s*\(/g))
		if (m[1] || threadImported) add(m.index, 'rust-spawn.spawn', 'spawn');
	return out.sort((a, b) => a.line - b.line || cmp(a.sink, b.sink) || a.offset - b.offset).map(({ offset, ...s }) => s);
}

/**
 * The commands of `generate_handler![…]` in `lib.rs`, each with its path and
 * line, and the file its path names: the path minus its last segment as
 * `<SRC>/<a>/<b>.rs`, falling back to `<a>/<b>/mod.rs`.
 *
 * @param {ReturnType<typeof extractRustFile> | undefined} lib facts of `src-tauri/src/lib.rs`
 * @returns {{command: string, path: string, line: number, files: string[]}[]} in source order;
 *   `files` the candidate files in lookup order
 */
export function handlerEntries(lib) {
	if (!lib) return [];
	const range = handlerRange(lib.prod);
	if (!range) return [];
	const [open, close] = range;
	const out = [];
	for (const e of lib.prod.slice(open + 1, close).matchAll(/[A-Za-z_][\w]*(?:\s*::\s*[A-Za-z_]\w*)*/g)) {
		const segs = e[0].split(/\s*::\s*/);
		const dir = segs.slice(0, -1).join('/');
		const files = dir ? [`${SRC}/${dir}.rs`, `${SRC}/${dir}/mod.rs`] : [`${SRC}/lib.rs`];
		out.push({ command: segs.at(-1), path: segs.join('::'), line: lib.lineAt(open + 1 + e.index), files });
	}
	return out;
}

/**
 * The `pub const NAME_EVENT: &str = "wire-name";` consts of `events.rs`, with
 * line and doc.
 *
 * @param {ReturnType<typeof extractRustFile> | undefined} facts facts of `src-tauri/src/events.rs`
 * @returns {{constName: string, name: string, file: string, line: number, doc: string}[]} in line order
 */
export function eventConsts(facts) {
	if (!facts) return [];
	const out = [];
	for (const m of facts.text.matchAll(/pub\s+const\s+(\w+_EVENT)\s*:\s*&(?:'static\s+)?str\s*=\s*"([^"]*)"/g)) {
		if (facts.prod.slice(m.index, m.index + 9) !== m[0].slice(0, 9)) continue;
		const line = facts.lineAt(m.index);
		const item = facts.items.find((i) => i.name === m[1]);
		out.push({ constName: m[1], name: m[2], file: facts.file, line, doc: item?.doc ?? '' });
	}
	return out;
}

/**
 * F9 emit sites: in the production text of each crate file other than
 * `events.rs`, an occurrence of an event const whose nearest unclosed `(`
 * follows an identifier starting with `emit`, with its F12 enclosing fn.
 *
 * @param {Map<string, ReturnType<typeof extractRustFile>>} files
 * @param {ReturnType<typeof eventConsts>} consts
 * @returns {{file: string, line: number, enclosing: string, constName: string}[]} by (file, line, const)
 */
export function rustEmits(files, consts) {
	if (!consts.length) return [];
	const re = new RegExp(`(?<![\\w])(${consts.map((c) => escapeRe(c.constName)).join('|')})(?![\\w])`, 'g');
	const out = [];
	for (const p of [...files.keys()].sort(cmp)) {
		if (!p.startsWith(`${SRC}/`) || p === EVENTS_RS) continue;
		const facts = files.get(p);
		const code = facts.prod;
		for (const m of code.matchAll(re)) {
			let depth = 0;
			let k = m.index - 1;
			for (; k >= 0; k--) {
				const c = code[k];
				if (c === ')') depth++;
				else if (c === '(') {
					if (depth === 0) break;
					depth--;
				} else if (depth === 0 && (c === ';' || c === '{' || c === '}')) {
					k = -1;
					break;
				}
			}
			if (k < 0) continue;
			const ident = /([A-Za-z_]\w*)\s*$/.exec(code.slice(Math.max(0, k - 80), k));
			if (!ident || !ident[1].startsWith('emit')) continue;
			out.push({ file: p, line: facts.lineAt(m.index), enclosing: enclosingAt(facts, m.index), constName: m[1] });
		}
	}
	return out.sort((a, b) => cmp(a.file, b.file) || a.line - b.line || cmp(a.constName, b.constName));
}

/** A `{file, line}` location. */
const loc = (file, line) => ({ file, line });

/** Code-unit order of locations. */
const byLoc = (a, b) => cmp(a.file, b.file) || a.line - b.line;

/**
 * F8: one record per command in `generate_handler!` or `CommandMap`, with its
 * Rust `cmd` fn, handler entry, contract, key sites and TS callers.
 *
 * @param {ReturnType<typeof handlerEntries>} handlers
 * @param {Map<string, ReturnType<typeof extractRustFile>>} rustFiles
 * @param {{commands: {name: string, line: number, args: string, result: string, argsText: string, resultText: string, doc: string}[]}} contract from `extractContracts`
 * @param {{file: string, line: number, enclosing: string, command: string}[]} callers production `call` sites
 * @param {{name: string, file: string, line: number}[]} keys from `keySites`
 * @returns {{name: string, rust: {file: string, line: number} | null, reg: {file: string, line: number} | null,
 *   contract: object | null, keys: {file: string, line: number}[], callers: {file: string, line: number, enclosing: string}[]}[]}
 *   by name; `rust` null when no `cmd` fn is found (`!no-rust-fn`), `contract` null with no `CommandMap` member (`!no-contract`)
 */
export function joinCommands(handlers, rustFiles, contract, callers, keys) {
	const names = new Set([...handlers.map((h) => h.command), ...contract.commands.map((c) => c.name), ...callers.map((c) => c.command)]);
	return [...names].sort(cmp).map((name) => {
		const h = handlers.find((x) => x.command === name) ?? null;
		let rust = null;
		for (const f of h?.files ?? []) {
			const item = rustFiles.get(f)?.items.find((i) => i.name === name && i.kind.startsWith('cmd'));
			if (item) {
				rust = loc(f, item.line);
				break;
			}
			if (rustFiles.has(f)) break;
		}
		return {
			name,
			rust,
			reg: h ? loc(`${SRC}/lib.rs`, h.line) : null,
			contract: contract.commands.find((c) => c.name === name) ?? null,
			keys: keys.filter((k) => k.name === name).map((k) => loc(k.file, k.line)).sort(byLoc),
			callers: callers
				.filter((c) => c.command === name)
				.map((c) => ({ file: c.file, line: c.line, enclosing: c.enclosing }))
				.sort(byLoc),
		};
	});
}

/**
 * F9: one record per event wire name among the Rust consts and the
 * `EVENT_NAMES` values, with its const, TS key, payload, emits and listens.
 *
 * @param {ReturnType<typeof eventConsts>} consts
 * @param {{eventNames: {key: string, value: string, line: number}[], eventMap: Map<string, string>, eventsFile: string}} contract from `extractContracts`
 * @param {ReturnType<typeof rustEmits>} emits
 * @param {{file: string, line: number, enclosing: string, key: string | null, name: string | null}[]} listens production `on` sites
 * @returns {{name: string, const: {constName: string, file: string, line: number, doc: string} | null,
 *   ts: {key: string, file: string, line: number} | null, payload: string | null,
 *   emits: {file: string, line: number, enclosing: string}[], listens: {file: string, line: number, enclosing: string}[]}[]} by name
 */
export function joinEvents(consts, contract, emits, listens) {
	const keyValue = new Map(contract.eventNames.map((e) => [e.key, e.value]));
	const names = new Set([...consts.map((c) => c.name), ...contract.eventNames.map((e) => e.value)]);
	return [...names].sort(cmp).map((name) => {
		const c = consts.find((x) => x.name === name) ?? null;
		const key = contract.eventNames.find((e) => e.value === name) ?? null;
		return {
			name,
			const: c && { constName: c.constName, file: c.file, line: c.line, doc: c.doc },
			ts: key && { key: key.key, file: contract.eventsFile, line: key.line },
			payload: contract.eventMap.get(name) ?? null,
			emits: emits
				.filter((e) => c && e.constName === c.constName)
				.map((e) => ({ file: e.file, line: e.line, enclosing: e.enclosing }))
				.sort(byLoc),
			listens: listens
				.filter((l) => (l.key !== null ? keyValue.get(l.key) : l.name) === name)
				.map((l) => ({ file: l.file, line: l.line, enclosing: l.enclosing }))
				.sort(byLoc),
		};
	});
}

/**
 * F10: one record per `#[ts(export)]` Rust struct or enum.
 *
 * @param {Map<string, ReturnType<typeof extractRustFile>>} rustFiles
 * @param {string[]} tsPaths every TS file path (to find `contracts/generated/<Name>.ts`)
 * @param {{commands: {name: string, argsText: string, resultText: string}[]}} contract from `extractContracts`
 * @param {{from: string, id: string | null, specLine: number}[]} resolved F3 bindings
 * @param {{from: string, id: string}[]} reexports F3 re-exports from `resolveReexports`, counted in `used-by`
 * @param {(file: string) => boolean} isTest whether a file is a test or e2e file
 * @param {(file: string) => string | null} moduleOf the module of a file
 * @returns {{name: string, rust: {file: string, line: number}, ts: string | null, doc: string,
 *   returnedBy: string[], argOf: string[], contains: string[], in: string[],
 *   usedBy: {module: string, count: number}[], e2e: {file: string, line: number}[]}[]}
 *   by (name, file); `ts` null when the generated file is missing (`!no-ts`); `usedBy` by count desc, then module
 */
export function joinDtos(rustFiles, tsPaths, contract, resolved, reexports, isTest, moduleOf) {
	const tsSet = new Set(tsPaths);
	const contains = new Map();
	const within = new Map();
	const users = new Map();
	const e2e = new Map();
	const push = (map, key, value) => {
		if (!map.has(key)) map.set(key, new Set());
		map.get(key).add(value);
	};
	for (const r of resolved) {
		if (!r.id?.startsWith('dto:')) continue;
		const name = r.id.slice(4);
		const gen = GENERATED_RE.exec(r.from);
		if (gen) {
			if (gen[1] !== name) {
				push(contains, gen[1], name);
				push(within, name, gen[1]);
			}
			continue;
		}
		if (r.from.startsWith('src/lib/contracts/generated/')) continue;
		if (r.from.startsWith('e2e/')) push(e2e, name, `${r.from}\0${r.specLine}`);
		else if (!isTest(r.from)) push(users, name, r.from);
	}
	for (const r of reexports) {
		if (r.id.startsWith('dto:') && !r.from.startsWith('src/lib/contracts/generated/') && !isTest(r.from)) push(users, r.id.slice(4), r.from);
	}
	const word = (name) => new RegExp(`(?<![\\w$])${escapeRe(name)}(?![\\w$])`);
	const out = [];
	for (const p of [...rustFiles.keys()].sort(cmp)) {
		if (!p.startsWith(`${SRC}/`)) continue;
		for (const it of rustFiles.get(p).items) {
			if (!it.dto) continue;
			const name = it.name;
			const ts = `src/lib/contracts/generated/${name}.ts`;
			const re = word(name);
			const counts = new Map();
			for (const f of users.get(name) ?? []) {
				const m = moduleOf(f) ?? f;
				counts.set(m, (counts.get(m) ?? 0) + 1);
			}
			out.push({
				name,
				rust: loc(p, it.line),
				ts: tsSet.has(ts) ? ts : null,
				doc: it.doc,
				returnedBy: contract.commands.filter((c) => re.test(c.resultText)).map((c) => c.name).sort(cmp),
				argOf: contract.commands.filter((c) => re.test(c.argsText)).map((c) => c.name).sort(cmp),
				contains: [...(contains.get(name) ?? [])].sort(cmp),
				in: [...(within.get(name) ?? [])].sort(cmp),
				usedBy: [...counts.keys()]
					.sort(cmp)
					.sort((a, b) => counts.get(b) - counts.get(a))
					.map((module) => ({ module, count: counts.get(module) })),
				e2e: [...(e2e.get(name) ?? [])]
					.map((k) => {
						const [file, line] = k.split('\0');
						return loc(file, Number(line));
					})
					.sort(byLoc),
			});
		}
	}
	return out.sort((a, b) => cmp(a.name, b.name) || cmp(a.rust.file, b.rust.file));
}
