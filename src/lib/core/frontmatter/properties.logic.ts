import {
	parseDocument,
	stringify,
	visit,
	isAlias,
	isCollection,
	isMap,
	isScalar,
	isSeq,
	Document,
	type Node,
	Scalar,
	type ScalarTag,
	type YAMLSeq,
} from 'yaml';
import { canonicalizeKey } from '#lib/utils/frontmatter-aliases.js';
import type { Property, PropertyType } from './properties.types';

/** Where this module's diagnostics go; set by the app shell. */
export interface PropertiesDiagnostics {
	/** Writes one tagged line to the session log. */
	log: (tag: string, message: string) => void;
}

/**
 * The diagnostics sink. A no-op until the app configures it, so this logic
 * stays pure (ADR-0004) and tests opt in.
 */
let diagnostics: PropertiesDiagnostics = { log: () => {} };

/**
 * Sets the diagnostics sink. Called once, synchronously, at the top of the
 * `(app)/+layout.svelte` script with `appendLog`.
 */
export function configurePropertiesDiagnostics(sink: PropertiesDiagnostics): void {
	diagnostics = sink;
}

const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---/;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?$/;

/**
 * Extracts the raw YAML string from frontmatter delimiters.
 * Returns null if no frontmatter is found.
 */
export function extractRawFrontmatter(content: string): string | null {
	const match = content.match(FRONTMATTER_REGEX);
	return match ? match[1] : null;
}

/**
 * Returns the body content after the frontmatter block.
 * If no frontmatter exists, returns the full content.
 */
export function extractBody(content: string): string {
	const match = content.match(FRONTMATTER_REGEX);
	if (!match) return content;
	return content.slice(match[0].length).replace(/^\r?\n/, '');
}

/**
 * The node count of a scalar chain: a scalar, or a one-item list holding a scalar
 * chain (`X`, `[X]`, `[[X]]`, ...). 0 for any other node. A chain holds no alias
 * and no map, so a copy of one costs exactly its node count.
 */
function scalarChainSize(node: unknown): number {
	aliasPassSteps++;
	if (isScalar(node)) return 1;
	if (!isSeq(node) || node.items.length !== 1) return 0;
	const inner = scalarChainSize(node.items[0]);
	return inner === 0 ? 0 : inner + 1;
}

/**
 * Most nodes the alias pass may copy into one document. yaml's `maxAliasCount`
 * does not see these copies, and copies can still grow quadratically: each line
 * of `l1: &l1 [*l0]`, `l2: &l2 [*l1]`, ... copies a chain one node longer than
 * the line before. Past the budget the parse throws, so the note reads as
 * unparseable, as yaml's own alias limit made it before the alias pass.
 */
const ALIAS_COPY_BUDGET = 10_000;

/**
 * Nodes the alias pass of the latest uncached parse touched: one per node of its
 * alias walk, one per node it sized, one per node it copied, one per list of its
 * fold walk. Lets tests pin the pass as linear in its input by counting work
 * instead of timing it. Reset when that parse starts, so it stays 0 when the parse
 * fails before the pass. yaml's own work (`parseDocument`, `createNode`, `toJS`)
 * is not counted.
 */
let aliasPassSteps = 0;

/** Test-only: the step count of the latest alias pass (see `aliasPassSteps`). */
export function _lastAliasPassSteps(): number {
	return aliasPassSteps;
}

/**
 * YAML reads an unquoted wikilink `[[X]]` as a list holding a list holding `X`.
 * Replaces that shape with the string `"[[X]]"` built from X's source text, the
 * same rule as Rust `project_value` (src-tauri/src/vault/parsing.rs), so the
 * Properties panel and the edit-path PropertyIndexRecord see the string the Rust index
 * stores: `[[007]]` and `[[~]]` stay as written instead of resolving to 7 or null.
 *
 * Rust resolves aliases before it projects, so aliases that can take part in the
 * shape are first replaced by copies of their targets: an alias inside `[[*x]]`
 * then folds, and an alias to a replaced node (`a: &x [[X]]`, `a: [[&x X]]`)
 * cannot be left unresolved, which would make `toJS` throw and empty the whole
 * frontmatter.
 *
 * Throws when the copies would pass `ALIAS_COPY_BUDGET` nodes.
 */
function foldUnquotedWikilinks(doc: Document): void {
	// `Alias.resolve` walks the whole document per call; one walk with an anchor map
	// gives the same target, the latest anchor of that name before the alias,
	// because it visits nodes in the same order.
	const anchors = new Map<string, Node>();
	// A target's size per node, so N aliases to one deep target walk it once. Safe to
	// reuse: a target's subtree is fully visited before any alias that follows it, and
	// an alias inside its own target sees itself on the chain, so 0 both times.
	const sizes = new Map<Node, number>();
	let copied = 0;
	visit(doc, {
		Node(_, node) {
			aliasPassSteps++;
			if (!isAlias(node)) {
				if (node.anchor) anchors.set(node.anchor, node);
				return;
			}
			const target = anchors.get(node.source);
			if (target === undefined) return;
			let size = sizes.get(target);
			if (size === undefined) {
				size = scalarChainSize(target);
				sizes.set(target, size);
			}
			if (size === 0) return;
			copied += size;
			if (copied > ALIAS_COPY_BUDGET) {
				throw new RangeError(`Alias copies exceed ${ALIAS_COPY_BUDGET} nodes`);
			}
			// yaml types `clone()` as the base class; it copies the node's own class.
			const copy = target.clone() as Scalar | YAMLSeq;
			// A copy keeps its nested anchors, which would re-define a name a later
			// anchor in the document already took (`a: &l [&y X]`, `d: &y Z`, `b: *l`,
			// `c: *y` must give c = Z): clear every anchor inside the copy.
			copy.anchor = undefined;
			visit(copy, {
				Node(_, node) {
					aliasPassSteps++;
					if ('anchor' in node) node.anchor = undefined;
				},
			});
			return copy;
		},
	});
	visit(doc, {
		Seq(_, seq) {
			aliasPassSteps++;
			const inner = seq.items.length === 1 ? seq.items[0] : null;
			if (!isSeq(inner) || inner.items.length !== 1) return;
			const target = inner.items[0];
			if (!isScalar(target)) return;
			return doc.createNode(`[[${target.source ?? String(target.value)}]]`);
		},
	});
}

/**
 * Converts a parsed YAML value into a Property object with the appropriate type.
 * Handles arrays, booleans, numbers, dates, null, and text.
 */
function convertToProperty(key: string, value: unknown): Property {
	if (Array.isArray(value)) {
		return {
			key,
			value: value.map((item) => {
				if (item === null || item === undefined) return '';
				if (typeof item === 'object') return JSON.stringify(item);
				return String(item);
			}),
			type: 'list',
		};
	}

	if (typeof value === 'boolean') {
		return { key, value, type: 'boolean' };
	}

	if (typeof value === 'number') {
		return { key, value, type: 'number' };
	}

	if (value === null || value === undefined) {
		return { key, value: '', type: 'text' };
	}

	const str = String(value);
	if (ISO_DATE_REGEX.test(str)) {
		return { key, value: str, type: 'date' };
	}

	return { key, value: str, type: 'text' };
}

/**
 * LRU cache for `parseFrontmatterProperties`. Phase 8.12 — meta-bind's
 * input plugin calls this on every CodeMirror update during typing,
 * which means the full document text is parsed at least once per
 * keystroke. The frontmatter usually doesn't change between calls
 * (you're editing the body), so caching by raw frontmatter text
 * eliminates the repeat YAML parse cost.
 *
 * Capacity is intentionally small (16): the same notebook holds a few
 * "current" frontmatter shapes at once (active tab + nearby tabs +
 * meta-bind input rebuilds). LRU eviction handles tab churn.
 *
 * Cache key: the raw frontmatter substring (between `---` delimiters).
 * Cache value: a frozen `Property[]` clone so callers can't accidentally
 * mutate the cached entry. (`Property[]` is otherwise treated as
 * immutable by every consumer; the freeze is defence-in-depth.)
 */
const PARSE_CACHE_CAPACITY = 16;
const parseCache = new Map<string, ReadonlyArray<Property>>();

function cloneProperty(p: Property): Property {
	return Array.isArray(p.value)
		? { key: p.key, value: [...p.value], type: p.type }
		: { key: p.key, value: p.value, type: p.type };
}

function cachedParse(rawFrontmatter: string): Property[] {
	const cached = parseCache.get(rawFrontmatter);
	if (cached !== undefined) {
		// Touch ordering: re-insert to mark as most recently used.
		parseCache.delete(rawFrontmatter);
		parseCache.set(rawFrontmatter, cached);
		return cached.map(cloneProperty);
	}
	return computeAndCache(rawFrontmatter);
}

/**
 * The plain JS value of a parsed frontmatter document, unquoted wikilinks folded.
 * Throws on a YAML error, past the alias copy budget, and from `toJS` on an alias
 * it cannot resolve.
 */
function toFrontmatterValue(doc: Document): unknown {
	if (doc.errors.length > 0) throw doc.errors[0];
	foldUnquotedWikilinks(doc);
	return doc.toJS();
}

function computeAndCache(rawFrontmatter: string): Property[] {
	aliasPassSteps = 0;
	let parsed: unknown;
	try {
		const doc = parseDocument(rawFrontmatter, { uniqueKeys: false });
		// `yaml.parse` logs warnings (an unknown `!foo` tag, a collection key)
		// through console.warn in the browser; `parseDocument` only collects them.
		for (const warning of doc.warnings) console.warn(warning);
		parsed = toFrontmatterValue(doc);
	} catch {
		// Cache the failure too — repeated parses of malformed YAML are
		// the most expensive case (full parse + throw + catch).
		parseCache.set(rawFrontmatter, Object.freeze([]));
		evictLru();
		return [];
	}

	if (parsed === null) {
		parseCache.set(rawFrontmatter, Object.freeze([]));
		evictLru();
		return [];
	}

	if (typeof parsed !== 'object' || Array.isArray(parsed)) {
		parseCache.set(rawFrontmatter, Object.freeze([]));
		evictLru();
		return [];
	}

	const properties: Property[] = [];
	try {
		for (const [rawKey, value] of Object.entries(parsed as Record<string, unknown>)) {
			if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
				// Nested mappings are not representable in the Properties panel and
				// would be silently lost on round-trip. Surface the data loss in the
				// session log so a developer investigating "where did my nested key
				// go?" can see what happened.
				diagnostics.log(
					'PROPERTIES',
					`dropped nested mapping value for key=${JSON.stringify(rawKey)} during frontmatter parse (round-trip would lose it)`,
				);
				continue;
			}
			properties.push(convertToProperty(canonicalizeKey(rawKey), value));
		}
	} catch {
		// `JSON.stringify` in convertToProperty throws on a circular list item, from a
		// self-referencing alias (`a: &x [*x]`).
		parseCache.set(rawFrontmatter, Object.freeze([]));
		evictLru();
		return [];
	}
	// Collapse alias/canonical twins (e.g. `color` + `_color`) into one entry per
	// canonical key. Two entries with the same canonical key would otherwise reach
	// the store and crash PropertiesView's keyed {#each} (each_key_duplicate).
	const deduped = dedupeCanonicalKeys(properties);
	parseCache.set(rawFrontmatter, Object.freeze(deduped.map(cloneProperty)));
	evictLru();
	return deduped;
}

function evictLru(): void {
	while (parseCache.size > PARSE_CACHE_CAPACITY) {
		// Map iteration order is insertion order; the FIRST entry is the
		// least-recently used (oldest cache miss / oldest access).
		const oldest = parseCache.keys().next().value;
		if (oldest === undefined) return;
		parseCache.delete(oldest);
	}
}

/** Test-only: clears the cache so module-level state doesn't leak between tests. */
export function _resetParseFrontmatterCache(): void {
	parseCache.clear();
}

/**
 * Parses frontmatter YAML into an array of Property objects.
 * Uses the `yaml` library for spec-compliant parsing. Handles all YAML features
 * including block scalars, quoted strings, inline/block arrays, and special characters.
 * Nested objects are skipped (not supported in the Properties panel).
 *
 * Phase 8.12: results are cached by raw frontmatter substring so
 * meta-bind's per-keystroke rebuild path doesn't re-parse identical
 * YAML. See `cachedParse` for the cache contract.
 */
export function parseFrontmatterProperties(content: string): Property[] {
	const raw = extractRawFrontmatter(content);
	if (!raw) return [];
	return cachedParse(raw);
}

/**
 * Why a parse + re-serialize of a note's frontmatter would lose data:
 * - `unparseable`: YAML errors or warnings (e.g. an unresolved custom tag), a root
 *   that is not a mapping, or an integer beyond `Number.MAX_SAFE_INTEGER` (the
 *   parse rounds it).
 * - `nested`: a mapping below the root, a collection inside a list, or a collection key.
 * - `comments`: any comment; the serializer drops them.
 * - `duplicate-keys`: one key twice in the root mapping; the parse is last-wins.
 * - `alias-collision`: two keys with one canonical name, both non-empty; one is discarded.
 * - `anchors`: an anchor or alias node; the rewrite would expand it.
 */
export type LossyFrontmatterReason =
	| 'unparseable'
	| 'nested'
	| 'comments'
	| 'duplicate-keys'
	| 'alias-collision'
	| 'anchors';

/** Precedence when a block has several problems: the first listed is reported. */
const LOSSY_REASON_ORDER: readonly LossyFrontmatterReason[] = [
	'unparseable',
	'nested',
	'comments',
	'duplicate-keys',
	'alias-collision',
	'anchors',
];

/**
 * Error text per `LossyFrontmatterReason`, shared by every writer that refuses
 * a lossy rewrite, so the Properties panel, meta-bind and `updateNoteFrontmatter`
 * tell the user the same thing.
 */
export const LOSSY_FRONTMATTER_MESSAGES: Readonly<Record<LossyFrontmatterReason, string>> = {
	unparseable: "The note's frontmatter could not be parsed; fix it in the note",
	nested: "The note's frontmatter has nested values; it cannot be rewritten without losing them",
	comments: "The note's frontmatter has comments; it cannot be rewritten without losing them",
	'duplicate-keys': "The note's frontmatter repeats a key; it cannot be rewritten without losing one",
	'alias-collision': "The note's frontmatter has two keys for one property; it cannot be rewritten without losing one",
	anchors: "The note's frontmatter uses YAML anchors; it cannot be rewritten without expanding them",
};

/** True when a YAML value node carries no data: missing, null, `''` or `[]`. */
function isEmptyYamlNode(node: unknown): boolean {
	if (node === null || node === undefined) return true;
	if (isScalar(node)) return node.value === null || node.value === '';
	if (isSeq(node)) return node.items.length === 0;
	return false;
}

/**
 * Tells a caller, before it rewrites a note, whether the
 * `parseFrontmatterProperties` -> `serializeProperties` round trip would lose
 * data, and why. Returns null when the rewrite is safe: no frontmatter, an empty
 * block, or only the coercions ADR-0029 defines as canonical (`key:` / `key: null`
 * to `""`, scalar list items to strings, alias keys to canonical, quote style).
 * Pure; reads no store.
 */
export function detectLossyFrontmatter(content: string): LossyFrontmatterReason | null {
	const raw = extractRawFrontmatter(content);
	if (raw === null || raw.trim() === '') return null;

	const doc = parseDocument(raw, { uniqueKeys: false });
	const root = doc.contents;
	if (doc.errors.length > 0 || doc.warnings.length > 0 || (root !== null && !isMap(root))) {
		return 'unparseable';
	}

	const found = new Set<LossyFrontmatterReason>();
	if (doc.commentBefore || doc.comment) found.add('comments');

	visit(doc, {
		Node(key, node, path) {
			if (
				isScalar(node) &&
				typeof node.value === 'number' &&
				Number.isInteger(node.value) &&
				!Number.isSafeInteger(node.value)
			) {
				found.add('unparseable');
			}
			if (node.commentBefore || node.comment) found.add('comments');
			if (isAlias(node) || node.anchor) found.add('anchors');
			if (!isCollection(node)) return;
			if (key === 'key' || (isMap(node) && node !== root)) {
				found.add('nested');
				return;
			}
			for (let i = path.length - 1; i >= 0; i--) {
				const ancestor = path[i];
				if (!isCollection(ancestor)) continue;
				if (isSeq(ancestor)) found.add('nested');
				break;
			}
		},
	});

	if (isMap(root)) {
		const rawKeys = new Set<string>();
		const populatedCanonical = new Set<string>();
		for (const pair of root.items) {
			if (!isScalar(pair.key)) continue;
			// The parse maps a null key (`~`) to "", so "" and `~` are one key.
			const rawKey = pair.key.value === null ? '' : String(pair.key.value);
			if (rawKeys.has(rawKey)) found.add('duplicate-keys');
			rawKeys.add(rawKey);
			if (isEmptyYamlNode(pair.value)) continue;
			const canonical = canonicalizeKey(rawKey);
			if (populatedCanonical.has(canonical)) found.add('alias-collision');
			populatedCanonical.add(canonical);
		}
	}

	return LOSSY_REASON_ORDER.find((reason) => found.has(reason)) ?? null;
}

/** True when a property value carries no data (empty string, null, or empty list). */
function isEmptyPropertyValue(value: Property['value']): boolean {
	if (value === '' || value === null || value === undefined) return true;
	if (Array.isArray(value) && value.length === 0) return true;
	return false;
}

/**
 * Collapses properties whose keys canonicalize to the same name into a single
 * entry per canonical key, returning a new array with canonical keys.
 *
 * `yaml`'s `doc.set` is last-wins: if an alias and its canonical twin (e.g.
 * `color` + `_color`) both reach serialization, the earlier value is silently
 * destroyed. This resolves collisions deterministically instead: a populated
 * value always beats an empty placeholder, and when two populated values
 * collide the first is kept and the discarded one is logged (never silent).
 * Order follows the first appearance of each canonical key.
 */
function dedupeCanonicalKeys(properties: Property[]): Property[] {
	const byKey = new Map<string, Property>();
	for (const p of properties) {
		const key = canonicalizeKey(p.key);
		const prev = byKey.get(key);
		if (!prev) {
			byKey.set(key, { ...p, key });
			continue;
		}
		if (isEmptyPropertyValue(prev.value) && !isEmptyPropertyValue(p.value)) {
			// Existing entry was a placeholder; the populated twin wins (Map.set
			// keeps the original insertion position, so order is preserved).
			byKey.set(key, { ...p, key });
		} else if (!isEmptyPropertyValue(prev.value) && !isEmptyPropertyValue(p.value)) {
			diagnostics.log(
				'PROPERTIES',
				`canonical key collision on ${JSON.stringify(key)}: kept ${JSON.stringify(prev.value)}, discarded ${JSON.stringify(p.value)}`,
			);
		}
		// else: prev already populated, or both empty -> keep prev.
	}
	return [...byKey.values()];
}

/**
 * Returns `content` with frontmatter `key` linking `[[target]]`, for notes
 * that must carry a relationship whatever their template writes.
 *
 * - Already linked (case-insensitive; a folder prefix, `.md`, `|alias` and
 *   `#heading` ignored): unchanged.
 * - Key absent (or an empty `---`/`---` block): the line goes right after the
 *   opening `---` with that line's ending, so the template's own frontmatter
 *   is kept byte for byte (comments included).
 * - Key present without the link: the link is added to its value through a
 *   full rewrite, which throws when that rewrite would lose data. A plain
 *   non-link value is kept next to the link in a list.
 * - No frontmatter: a block holding only the key is prepended.
 */
export function ensureFrontmatterLink(content: string, key: string, target: string): string {
	const link = `[[${target}]]`;
	const entry: Property = { key, value: link, type: 'text' };
	const insertAfterOpen = () =>
		content.replace(/^---(\r?\n)/, (open, eol: string) => `${open}${serializeProperties([entry])}${eol}`);
	// FRONTMATTER_REGEX needs at least one line between the delimiters.
	if (/^---\r?\n---(?:\r?\n|$)/.test(content)) return insertAfterOpen();
	if (extractRawFrontmatter(content) === null) return rebuildContent([entry], content);

	const lossy = detectLossyFrontmatter(content);
	if (lossy === 'unparseable') throw new Error(`Cannot add ${key}: frontmatter ${lossy}`);

	const props = parseFrontmatterProperties(content);
	const existing = props.find((p) => p.key === key);
	if (!existing) return insertAfterOpen();

	const wanted = target.toLowerCase();
	const linkStem = (t: string) => t.split(/[|#]/)[0].trim().replace(/\.md$/i, '').split('/').pop()!.toLowerCase();
	const linked = extractWikilinks(existing.value).some((t) => linkStem(t) === wanted);
	if (linked) return content;
	if (lossy !== null) throw new Error(`Cannot add ${key}: frontmatter ${lossy}`);

	const plain = existing.value;
	const keepsPlain = !Array.isArray(plain) && plain !== '' && !String(plain).includes('[[');
	const value = keepsPlain ? [String(plain), link] : computeAddRelationshipValue(plain, target).value;
	const next = props.map((p) =>
		p === existing ? { key, value, type: Array.isArray(value) ? ('list' as const) : ('text' as const) } : p,
	);
	return rebuildContent(next, extractBody(content), content);
}

/** A scalar's source text, written out verbatim by `SOURCE_TOKEN_TAG`. */
class SourceToken {
	constructor(readonly text: string) {}
}

/**
 * Stringifies a `SourceToken` as its text, with no tag. yaml has no option to
 * keep a number's source spelling: even an in-place `doc.set` rewrites `0042`
 * as `42`, `0x1F` as `0x1f` and `1e3` as `1e+3`.
 */
const SOURCE_TOKEN_TAG: ScalarTag = {
	tag: 'tag:kokobrain,source-token',
	default: true,
	identify: (value) => value instanceof SourceToken,
	resolve: (value) => value,
	stringify: (item) => (item.value as SourceToken).text,
};

/**
 * The unquoted number and boolean scalars of a raw frontmatter block, by
 * canonical key. Empty when the block does not parse to a mapping.
 */
function plainScalarsByKey(originalRaw: string): Map<string, Scalar> {
	const byKey = new Map<string, Scalar>();
	const doc = parseDocument(originalRaw, { uniqueKeys: false });
	if (doc.errors.length > 0 || !isMap(doc.contents)) return byKey;
	for (const pair of doc.contents.items) {
		const { key, value } = pair;
		if (!isScalar(key) || !isScalar(value)) continue;
		if (value.type !== 'PLAIN' || typeof value.source !== 'string') continue;
		if (typeof value.value !== 'number' && typeof value.value !== 'boolean') continue;
		byKey.set(canonicalizeKey(key.value === null ? '' : String(key.value)), value);
	}
	return byKey;
}

/**
 * Serializes an array of properties into a YAML frontmatter string (without delimiters).
 * Uses the `yaml` Document API for spec-compliant output with inline arrays.
 *
 * Keys are canonicalized (via `dedupeCanonicalKeys`) before emission so that
 * Property[] values constructed outside `parseFrontmatterProperties` (e.g. by
 * lifecycle.service, frontmatter-icon.service, deep-link.logic, or external
 * producers) cannot accidentally write a non-canonical
 * alias. When an alias and its canonical twin coexist they are merged rather
 * than silently last-won (see `dedupeCanonicalKeys`). Idempotent for
 * already-canonical, collision-free input.
 *
 * @param originalRaw - the raw frontmatter the properties were parsed from, when
 *   rewriting an existing note. A number or boolean whose value is unchanged is
 *   written with its original spelling (`0042`, `9.90`, `0x1F`, `1e3`, `True`);
 *   a changed value is written in canonical form.
 */
export function serializeProperties(properties: Property[], originalRaw?: string): string {
	if (properties.length === 0) return '';

	const doc = new Document({}, { customTags: [SOURCE_TOKEN_TAG] });
	const original = originalRaw ? plainScalarsByKey(originalRaw) : null;

	for (const p of dedupeCanonicalKeys(properties)) {
		if (p.type === 'list') {
			const seq = doc.createNode(p.value as string[]);
			(seq as YAMLSeq).flow = true;
			doc.set(p.key, seq);
			continue;
		}
		const source = original?.get(p.key);
		if (source && Object.is(source.value, p.value)) {
			doc.set(p.key, new Scalar(new SourceToken(source.source!)));
		} else {
			doc.set(p.key, p.value);
		}
	}

	return doc.toString({ lineWidth: 0, flowCollectionPadding: false }).trimEnd();
}

/**
 * The one-line YAML scalar for `value`, for pasting after `key: ` or `- ` in a
 * frontmatter block: plain when a plain scalar reads back as the same string,
 * quoted and escaped otherwise (`: `, ` #`, a leading `[` or quote, a string
 * that would read as a number, boolean or null, a line break). The quoting
 * rules are the ones `serializeProperties` writes with.
 */
export function yamlScalar(value: string): string {
	return stringify(value, { lineWidth: 0, blockQuote: false }).trimEnd();
}

/**
 * Sets a property value addressed by a (possibly aliased) meta-bind bind target,
 * matching on the canonical key. Updates the existing canonical property in
 * place when present, otherwise appends a new property. Returns a new array.
 * A number or boolean value sets the `number` / `boolean` type, so it is
 * written as a YAML number or boolean; a string value keeps the existing
 * property's type (`text` when appended).
 *
 * Meta-bind bind targets are authored as raw keys (`INPUT[toggle():favorite]`),
 * but `parseFrontmatterProperties` already canonicalizes parsed keys. Matching
 * the raw target literally would miss the canonical twin, append a duplicate,
 * and collide on serialize. Canonicalizing the match here keeps a single entry.
 */
export function setPropertyByBindTarget(
	properties: Property[],
	bindTarget: string,
	value: string | number | boolean,
): Property[] {
	const key = canonicalizeKey(bindTarget);
	const typed: PropertyType | null =
		typeof value === 'number' ? 'number' : typeof value === 'boolean' ? 'boolean' : null;
	if (properties.some((p) => canonicalizeKey(p.key) === key)) {
		return properties.map((p) =>
			canonicalizeKey(p.key) === key ? { ...p, key, value, type: typed ?? p.type } : p,
		);
	}
	return [...properties, { key, value, type: typed ?? 'text' }];
}

/**
 * The value a meta-bind select writes for an option string. Exactly `true` /
 * `false` become booleans and a plain decimal that round-trips
 * (`String(Number(s)) === s`: `1`, `-2`, `1.5`) becomes a number; anything
 * else stays the string (`yes`, `007`, `1.50`, `1e3`, `""`), so an option is
 * never written with a different spelling than it was authored with.
 */
export function typedOptionValue(option: string): string | number | boolean {
	if (option === 'true') return true;
	if (option === 'false') return false;
	const n = Number(option);
	if (option !== '' && Number.isFinite(n) && String(n) === option) return n;
	return option;
}

/**
 * Rebuilds the full file content with updated frontmatter properties.
 * Preserves the body content after the frontmatter block.
 * @param original - the note content the properties were parsed from, when
 *   rewriting an existing note, so unchanged number and boolean values keep
 *   their spelling (see `serializeProperties`)
 */
export function rebuildContent(properties: Property[], body: string, original?: string): string {
	if (properties.length === 0 && body === '') return '';

	if (properties.length === 0) return body;

	const originalRaw = original === undefined ? null : extractRawFrontmatter(original);
	const yaml = serializeProperties(properties, originalRaw ?? undefined);
	return `---\n${yaml}\n---\n${body}`;
}

/**
 * Adds a new empty text property with the given key.
 * Returns a new array without mutating the original.
 */
export function addProperty(properties: Property[], key: string): Property[] {
	return [...properties, { key, value: '', type: 'text' }];
}

/**
 * Removes a property by key.
 * Returns a new array without mutating the original.
 */
export function removeProperty(properties: Property[], key: string): Property[] {
	return properties.filter((p) => p.key !== key);
}

/**
 * Updates a property's value and optionally its type.
 * Returns a new array without mutating the original.
 */
export function updatePropertyValue(
	properties: Property[],
	key: string,
	value: string | number | boolean | string[],
	type?: PropertyType
): Property[] {
	return properties.map((p) => {
		if (p.key !== key) return p;
		return { ...p, value, type: type ?? p.type };
	});
}

/**
 * Renames a property key.
 * Returns a new array without mutating the original.
 */
export function renamePropertyKey(
	properties: Property[],
	oldKey: string,
	newKey: string
): Property[] {
	if (oldKey === newKey) return properties;
	return properties.map((p) => {
		if (p.key !== oldKey) return p;
		return { ...p, key: newKey };
	});
}

// --- Relationship helpers ---

/** Extracts wikilink targets from a property value (string, array, or unknown) */
export function extractWikilinks(value: unknown): string[] {
	const text = Array.isArray(value) ? value.join(' ') : String(value ?? '');
	const targets: string[] = [];
	const re = /\[\[([^\]]+)\]\]/g;
	for (const m of text.matchAll(re)) targets.push(m[1]);
	return targets;
}

export interface ResolvedLink {
	raw: string;
	display: string;
	resolvedPath: string | null;
}

/** Resolves wikilink targets from a property value against a list of file paths; `vaultRoot` is handed to `resolveWikilink`. */
export function resolveRelationshipLinks(
	value: unknown,
	allPaths: string[],
	resolveWikilink: (target: string, paths: string[], vaultRoot?: string | null) => string | null,
	vaultRoot?: string | null,
): ResolvedLink[] {
	return extractWikilinks(value).map((t) => {
		const display = t.includes('|') ? t.split('|')[1] : t;
		const target = t.includes('|') ? t.split('|')[0] : t;
		return { raw: t, display, resolvedPath: resolveWikilink(target, allPaths, vaultRoot) };
	});
}

/** Computes the new property value after adding a wikilink to a relationship */
export function computeAddRelationshipValue(
	currentValue: string | number | boolean | string[] | undefined,
	fileName: string,
): { value: string | string[]; isNew: boolean } {
	const wikilink = `[[${fileName}]]`;
	if (currentValue === undefined) {
		return { value: wikilink, isNew: true };
	}
	if (Array.isArray(currentValue)) {
		return { value: [...currentValue, wikilink], isNew: false };
	}
	const existing = String(currentValue);
	if (existing.includes('[[')) {
		return { value: [existing, wikilink], isNew: false };
	}
	return { value: wikilink, isNew: false };
}

/** Computes the new property value after removing a wikilink, or null if the property should be deleted */
export function computeRemoveRelationshipValue(
	currentValue: string | number | boolean | string[] | undefined,
	raw: string,
): { value: string[]; shouldDelete: boolean } {
	if (currentValue === undefined) return { value: [], shouldDelete: true };
	const wikilink = `[[${raw}]]`;
	if (Array.isArray(currentValue)) {
		const filtered = currentValue.filter((v) => String(v) !== wikilink);
		return { value: filtered, shouldDelete: filtered.length === 0 };
	}
	return { value: [], shouldDelete: true };
}

/** First letter uppercase, rest preserved — the casing rule Rust applies to `_type` values when deriving `is_a` (entry.rs::extract_is_a). */
export function normalizeTypeCasing(s: string): string {
	return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}
