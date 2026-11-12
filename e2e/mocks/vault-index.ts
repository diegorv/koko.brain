/**
 * In-memory mirror of the Rust `VaultIndex` (src-tauri/src/vault/index.rs).
 *
 * The Rust side owns vault metadata in production. In E2E we don't link the
 * Rust binary, so the frontend's `*_v2` IPC calls are routed by `tauri-core.ts`
 * to this module, which reads files from `virtualFS`, parses them, and answers
 * in the wire shapes documented in `src/lib/types/vault-v2.types.ts`.
 *
 * Parsing reuses the pure TS logic the production code already trusts:
 *   - parseWikilinks/getNoteName/buildResolutionCache from wikilink-resolution.logic.ts
 *   - extractAllTags and findInlineTags from utils/tag-extraction.ts
 * Frontmatter uses the `yaml` package with post-processing to mirror the
 * Rust subset (nested maps recorded as null).
 *
 * Task parsing is minimal — Phase 7.6 deleted the TS-side `extractTasks` and
 * the Rust parser is now the source of truth. We only need status char +
 * checked + indent + lineNumber for golden-path E2E coverage.
 */

import { parse as yamlParse } from 'yaml';
import type {
	NoteEntryV2,
	WikiLinkV2,
	OutgoingLinkV2,
	OutgoingUnlinkedMentionV2,
	TaskV2,
	TaskHeadingV2,
	TaskStatusV2,
	TagAggregateV2,
	FileTaskGroupV2,
	ToggleTaskResultV2,
	UpdateResultV2,
	NoteRecordV2,
	FrontmatterValue,
} from '../../src/lib/types/vault-v2.types';
import type { TaskTextWriteResult } from '../../src/lib/contracts/index';
import {
	parseWikilinks,
	getNoteName,
	buildResolutionCache,
	resolveWikilinkCached,
} from '../../src/lib/core/filesystem/wikilink-resolution.logic';
import { extractAllTags, findInlineTags } from '../../src/lib/utils/tag-extraction';
import { virtualFS } from './virtual-fs';

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---/;
const TASK_LINE_RE = /^(\s*)[-*]\s+\[(.)\]\s+(.*)$/;
/** Rust `HEADING_RE`; `[^\n]` because Rust's `.` matches a trailing `\r` and JS's does not. */
const HEADING_LINE_RE = /^(#{1,6})\s+([^\n]*)$/;
const SNIPPET_BYTE_LIMIT = 280;

const STATUS_BY_CHAR: Record<string, TaskStatusV2> = {
	' ': 'todo',
	x: 'done',
	X: 'done',
	'-': 'cancelled',
	'/': 'in-progress',
	'?': 'question',
	'>': 'forwarded',
	'!': 'important',
};

/** The checkbox char Rust's `status_checkbox_char` writes for each status. */
const CHAR_BY_STATUS: Record<TaskStatusV2, string> = {
	todo: ' ',
	done: 'x',
	cancelled: '-',
	'in-progress': '/',
	question: '?',
	forwarded: '>',
	important: '!',
};

let monotonicVersion = 0;

function bumpVersion(): number {
	return ++monotonicVersion;
}

function nowSeconds(): number {
	return Math.floor(Date.now() / 1000);
}

function stripFrontmatter(content: string): string {
	const m = content.match(FRONTMATTER_RE);
	return m ? content.slice(m[0].length).replace(/^\r?\n/, '') : content;
}

function bodySnippet(body: string): string {
	const cleaned = body
		.replace(/```[\s\S]*?```/g, '')
		.replace(/\s+/g, ' ')
		.trim();
	if (cleaned.length === 0) return '';
	const buf = new TextEncoder().encode(cleaned);
	if (buf.length <= SNIPPET_BYTE_LIMIT) return cleaned;
	return new TextDecoder('utf-8', { fatal: false }).decode(buf.slice(0, SNIPPET_BYTE_LIMIT));
}

function wordCount(body: string): number {
	const trimmed = body.replace(/```[\s\S]*?```/g, '').trim();
	if (trimmed.length === 0) return 0;
	return trimmed.split(/\s+/).length;
}

/**
 * Parses YAML frontmatter into the Rust subset shape: scalars, arrays of
 * scalars, and nested maps reduced to `null`. Mirrors `parse_frontmatter` in
 * `src-tauri/src/vault/parsing.rs`.
 */
function parseFrontmatter(content: string): Record<string, FrontmatterValue> {
	const m = content.match(FRONTMATTER_RE);
	return m ? parseYamlBlock(m[1]) : {};
}

/**
 * Parses a whole `.view` file as YAML (no `---` delimiters), with the same
 * projection as `parseFrontmatter`. Mirrors `parse_frontmatter_raw_yaml` in
 * `src-tauri/src/vault/parsing.rs`.
 */
function parseFrontmatterRawYaml(content: string): Record<string, FrontmatterValue> {
	return parseYamlBlock(content);
}

function parseYamlBlock(yaml: string): Record<string, FrontmatterValue> {
	let parsed: unknown;
	try {
		parsed = yamlParse(yaml, { uniqueKeys: false });
	} catch {
		return {};
	}

	if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
		return {};
	}

	const result: Record<string, FrontmatterValue> = {};
	for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
		result[key] = coerceFrontmatterValue(value);
	}
	return result;
}

function coerceFrontmatterValue(value: unknown): FrontmatterValue {
	if (value === null || value === undefined) return null;
	if (typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') {
		return value;
	}
	if (Array.isArray(value)) {
		return value.map(coerceFrontmatterValue);
	}
	// Rust subset records nested maps as null.
	return null;
}

/** `📅 YYYY-MM-DD`, the due-date signifier (`DATE_EMOJIS` in `parsing.rs`). */
const DUE_DATE_RE = /\u{1F4C5}\u{FE0F}?\s*(\d{4}-\d{2}-\d{2})/u;

/**
 * The tags and description Rust `parse_task_metadata` gives a task text that
 * holds no signifier but the 📅 date: tags by the note tag rule
 * (`findInlineTags`, the TS mirror of `scan_inline_tags`), their spans cut
 * from the description, then whitespace runs of two or more collapsed to one
 * space (`MULTI_SPACE_RE`) and the result trimmed.
 */
function taskDescriptionAndTags(text: string): { description: string; tags: string[] } {
	const found = findInlineTags(text);
	let description = '';
	let keptFrom = 0;
	for (const tag of found) {
		description += text.slice(keptFrom, tag.from);
		keptFrom = tag.to;
	}
	description += text.slice(keptFrom);
	return { description: description.replace(/\s{2,}/g, ' ').trim(), tags: found.map((t) => t.tag) };
}

/**
 * Minimal task parser. The Rust source of truth lives in
 * `src-tauri/src/vault/parsing.rs::extract_tasks_and_headings`; this covers
 * checkbox char, indent, lineNumber, the 📅 due date and tags — enough for
 * golden-path tests — plus the note's headings and each task's `heading`
 * with Rust's rules: no headings in fences or in the frontmatter block
 * (skipped by line count, so lines stay whole-file lines), text trimmed,
 * none for a note without tasks. `src/tests/e2e/task-headings-parity.test.ts`
 * holds it to the fixture the Rust indexer is pinned to.
 */
function parseTasks(content: string): { tasks: TaskV2[]; taskHeadings: TaskHeadingV2[] } {
	const tasks: TaskV2[] = [];
	const taskHeadings: TaskHeadingV2[] = [];
	const lines = content.split('\n');
	const frontmatter = content.match(FRONTMATTER_RE);
	const bodyStartLine = frontmatter ? frontmatter[0].split('\n').length : 0;
	// Mirrors `detect_code_fence`: ``` or ~~~ after spaces/tabs; a fence closes only on its own marker.
	let fence: string | null = null;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const marker = line.match(/^[ \t]*(```|~~~)/)?.[1];
		if (marker) {
			if (fence === null) fence = marker;
			else if (marker === fence) fence = null;
			continue;
		}
		if (fence !== null) continue;

		const h = i >= bodyStartLine ? line.match(HEADING_LINE_RE) : null;
		if (h) {
			taskHeadings.push({ level: h[1].length, text: h[2].trim(), line: i + 1 });
			continue;
		}

		const m = line.match(TASK_LINE_RE);
		if (!m) continue;

		const [, indentStr, statusChar, text] = m;
		const due = text.match(DUE_DATE_RE);
		const { description, tags } = taskDescriptionAndTags(due ? text.replace(due[0], '') : text);
		tasks.push({
			text,
			checked: statusChar !== ' ',
			indent: Math.floor(indentStr.length / 2),
			lineNumber: i + 1,
			status: STATUS_BY_CHAR[statusChar] ?? 'todo',
			metadata: {
				description,
				...(due ? { dueDate: due[1] } : {}),
				tags,
			},
			...(taskHeadings.length > 0 ? { heading: taskHeadings.length - 1 } : {}),
		});
	}

	return { tasks, taskHeadings: tasks.length > 0 ? taskHeadings : [] };
}

/**
 * Mirrors `extract_is_a` (`src-tauri/src/vault/entry.rs`). Rust reads the
 * alias-resolved `_type`; this mock does not canonicalize keys, so it reads
 * `_type` or bare `type`, taking the first non-empty string. The first code
 * point is uppercased and the rest preserved (`normalize_type_casing`).
 */
function extractIsA(fm: Record<string, FrontmatterValue>): string | null {
	for (const key of ['_type', 'type']) {
		const value = fm[key];
		if (typeof value !== 'string' || value.length === 0) continue;
		const first = String.fromCodePoint(value.codePointAt(0) as number);
		return first.toUpperCase() + value.slice(first.length);
	}
	return null;
}

/** Mirrors `extract_wikilinks_from_str` (`src-tauri/src/vault/entry.rs`): the non-empty wikilink targets in a string. */
function wikilinkTargets(value: FrontmatterValue | undefined): string[] {
	const strings = typeof value === 'string' ? [value] : Array.isArray(value) ? value.filter((v) => typeof v === 'string') : [];
	return strings.flatMap((s) => parseWikilinks(s).map((l) => l.target)).filter((t) => t.length > 0);
}

/** The frontmatter keys `extract_all_relationships` skips (`src-tauri/src/vault/entry.rs`). */
const RELATIONSHIP_SYSTEM_KEYS = new Set([
	'_type', '_belongs_to', '_related_to', '_has_many',
	'_organized', '_archived', '_favorite',
	'_order', '_sort', '_icon', '_sidebar_label',
	'_color', '_title_color', '_template', '_view', '_visible',
	'_list_properties_display',
	'tags', 'aliases',
]);

/** Mirrors `extract_all_relationships`: every other field whose value holds wikilinks, in key order. */
function extractRelationships(fm: Record<string, FrontmatterValue>): Record<string, string[]> {
	const result: Record<string, string[]> = {};
	for (const key of Object.keys(fm).sort()) {
		if (RELATIONSHIP_SYSTEM_KEYS.has(key)) continue;
		const targets = wikilinkTargets(fm[key]);
		if (targets.length > 0) result[key] = targets;
	}
	return result;
}

/** The files the index holds: `.md`, `.markdown` and `.view` (Rust `is_markdown_filename`). */
function isIndexedFile(path: string): boolean {
	return path.endsWith('.md') || path.endsWith('.markdown') || isViewPath(path);
}

/** Rust `is_view_filename`: matched in any case. */
function isViewPath(path: string): boolean {
	return path.toLowerCase().endsWith('.view');
}

/**
 * Mirrors `NoteEntry::from_view_frontmatter` (`src-tauri/src/vault/entry.rs`):
 * the whole file parsed as YAML, the lifecycle flags read from it, and no
 * links, tags, tasks, relationships, type, word count or snippet.
 */
function buildViewEntry(path: string, content: string): NoteEntryV2 {
	const fm = parseFrontmatterRawYaml(content);
	const fsEntry = virtualFS.statRaw(path);
	return {
		path,
		title: getNoteName(path),
		frontmatter: fm,
		outgoingLinks: [],
		tags: [],
		modifiedAt: fsEntry?.modifiedAt ?? nowSeconds(),
		createdAt: fsEntry?.createdAt ?? nowSeconds(),
		size: new TextEncoder().encode(content).length,
		wordCount: 0,
		snippet: '',
		tasks: [],
		isA: null,
		organized: typeof fm['_organized'] === 'boolean' ? fm['_organized'] : true,
		archived: fm['_archived'] === true,
		favorite: fm['_favorite'] === true,
		belongsTo: [],
		relatedTo: [],
		hasMany: [],
		relationships: {},
	};
}

function buildEntry(path: string, content: string): NoteEntryV2 {
	if (isViewPath(path)) return buildViewEntry(path, content);
	const body = stripFrontmatter(content);
	const wikilinks = parseWikilinks(content).map<WikiLinkV2>((wl) => ({
		target: wl.target,
		alias: wl.alias,
		heading: wl.heading,
		position: wl.position,
	}));
	const tags = extractAllTags(content);
	const { tasks, taskHeadings } = parseTasks(content);
	const fm = parseFrontmatter(content);
	const fsEntry = virtualFS.statRaw(path);

	return {
		path,
		title: getNoteName(path),
		frontmatter: fm,
		outgoingLinks: wikilinks,
		tags,
		modifiedAt: fsEntry?.modifiedAt ?? nowSeconds(),
		createdAt: fsEntry?.createdAt ?? nowSeconds(),
		size: new TextEncoder().encode(content).length,
		wordCount: wordCount(body),
		snippet: bodySnippet(body),
		tasks,
		// Rust omits an empty `taskHeadings` on the wire.
		...(taskHeadings.length > 0 ? { taskHeadings } : {}),
		isA: extractIsA(fm),
		// Rust: a YAML boolean `_organized` wins, anything else defaults to `true`.
		organized: typeof fm['_organized'] === 'boolean' ? fm['_organized'] : true,
		// Rust `extract_bool_flag`: only a YAML boolean `true` sets the flag.
		archived: fm['_archived'] === true,
		favorite: fm['_favorite'] === true,
		belongsTo: wikilinkTargets(fm['_belongs_to']),
		relatedTo: wikilinkTargets(fm['_related_to']),
		hasMany: wikilinkTargets(fm['_has_many']),
		relationships: extractRelationships(fm),
	};
}

class VaultIndexImpl {
	private entries = new Map<string, NoteEntryV2>();

	/** Rebuilds every entry from the virtual FS and returns the new index version. */
	rebuildAll(): number {
		this.entries.clear();
		const dump = virtualFS.dump();
		for (const [path, content] of Object.entries(dump)) {
			if (!isIndexedFile(path)) continue;
			if (this.isHidden(path)) continue;
			this.entries.set(path, buildEntry(path, content));
		}
		return bumpVersion();
	}

	/**
	 * The `vault-index-updated` payload Rust emits after a whole-index rebuild
	 * (`scan_vault_v2*`), at the current version. `virtualFS.populate` runs
	 * `rebuildAll`, so a spec that populates files announces them with this.
	 */
	rescanResult(): UpdateResultV2 {
		return { changed: true, affected: [], version: monotonicVersion, upserted: [], removed: [], fullRescan: true };
	}

	private isHidden(path: string): boolean {
		return path.split('/').some((seg) => seg.startsWith('.'));
	}

	update(path: string, content: string): UpdateResultV2 {
		if (this.isHidden(path) || !isIndexedFile(path)) {
			return { changed: false, affected: [], version: monotonicVersion, upserted: [], removed: [], fullRescan: false };
		}
		const previous = this.entries.get(path);
		const next = buildEntry(path, content);
		this.entries.set(path, next);

		const affected = new Set<string>();
		if (previous) {
			for (const link of previous.outgoingLinks) affected.add(link.target);
		}
		for (const link of next.outgoingLinks) affected.add(link.target);

		// Rust compares the whole `NoteEntry` (`index.rs::update_entry`), so a
		// same-size edit (`- [ ]` -> `- [x]`) still counts as a change.
		const changed = !previous || JSON.stringify(previous) !== JSON.stringify(next);

		return { changed, affected: [...affected], version: bumpVersion(), upserted: [path], removed: [], fullRescan: false };
	}

	remove(path: string): UpdateResultV2 {
		const previous = this.entries.get(path);
		if (!previous) {
			return { changed: false, affected: [], version: monotonicVersion, upserted: [], removed: [], fullRescan: false };
		}
		this.entries.delete(path);
		const affected = previous.outgoingLinks.map((l) => l.target);
		return { changed: true, affected, version: bumpVersion(), upserted: [], removed: [path], fullRescan: false };
	}

	getEntry(path: string): NoteEntryV2 | null {
		return this.entries.get(path) ?? null;
	}

	getAll(): NoteEntryV2[] {
		return [...this.entries.values()];
	}

	getBacklinks(targetPath: string): NoteEntryV2[] {
		// Rust `is_link_target`: a view is never linked to.
		if (isViewPath(targetPath)) return [];
		const targetName = getNoteName(targetPath).toLowerCase();
		const cache = buildResolutionCache([...this.entries.keys()]);
		const sources: NoteEntryV2[] = [];
		for (const entry of this.entries.values()) {
			if (entry.path === targetPath) continue;
			const linksTo = entry.outgoingLinks.some((link) => {
				if (link.target.toLowerCase() === targetName) return true;
				const resolved = resolveWikilinkCached(link.target, cache, '/test-vault');
				return resolved === targetPath;
			});
			if (linksTo) sources.push(entry);
		}
		return sources;
	}

	getOutgoingLinks(path: string): OutgoingLinkV2[] {
		const entry = this.entries.get(path);
		if (!entry) return [];
		const cache = buildResolutionCache([...this.entries.keys()]);
		return entry.outgoingLinks.map((link) => ({
			target: link.target,
			alias: link.alias,
			heading: link.heading,
			resolvedPath: resolveWikilinkCached(link.target, cache, '/test-vault'),
			position: link.position,
		}));
	}

	getOutgoingUnlinkedMentions(activePath: string, content: string): OutgoingUnlinkedMentionV2[] {
		const stripped = stripFrontmatter(content)
			.replace(/```[\s\S]*?```/g, '')
			.replace(/\[\[[^\]]+?\]\]/g, '');
		const result: OutgoingUnlinkedMentionV2[] = [];
		for (const entry of this.entries.values()) {
			// Rust `is_link_target`: a view is never mentioned.
			if (entry.path === activePath || isViewPath(entry.path)) continue;
			const name = entry.title;
			if (!name) continue;
			const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			const re = new RegExp(`\\b${escaped}\\b`, 'g');
			const matches = stripped.match(re);
			if (matches && matches.length > 0) {
				result.push({ noteName: name, notePath: entry.path, count: matches.length });
			}
		}
		return result;
	}

	getUnlinkedMentions(targetPath: string): NoteEntryV2[] {
		const target = this.entries.get(targetPath);
		if (!target) return [];
		const name = target.title;
		const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		const re = new RegExp(`\\b${escaped}\\b`);
		const sources: NoteEntryV2[] = [];
		for (const entry of this.entries.values()) {
			// Rust `unlinked_mentions_candidates` keeps link targets only, so no view is a source.
			if (entry.path === targetPath || isViewPath(entry.path)) continue;
			const content = virtualFS.readFileSafe(entry.path) ?? '';
			const stripped = stripFrontmatter(content)
				.replace(/```[\s\S]*?```/g, '')
				.replace(/\[\[[^\]]+?\]\]/g, '');
			if (re.test(stripped)) sources.push(entry);
		}
		return sources;
	}

	getAllTags(): TagAggregateV2[] {
		const acc = new Map<string, { name: string; paths: Set<string> }>();
		for (const entry of this.entries.values()) {
			for (const tag of entry.tags) {
				const key = tag.toLowerCase();
				const slot = acc.get(key) ?? { name: tag, paths: new Set() };
				slot.paths.add(entry.path);
				acc.set(key, slot);
			}
		}
		return [...acc.values()]
			.map((slot) => ({
				name: slot.name,
				count: slot.paths.size,
				filePaths: [...slot.paths].sort(),
			}))
			.sort((a, b) => a.name.localeCompare(b.name));
	}

	getAllTasks(): FileTaskGroupV2[] {
		const groups: FileTaskGroupV2[] = [];
		for (const entry of this.entries.values()) {
			if (entry.tasks.length === 0) continue;
			groups.push({
				filePath: entry.path,
				fileName: entry.title,
				modifiedAt: entry.modifiedAt,
				tasks: entry.tasks,
			});
		}
		return groups.sort((a, b) => b.modifiedAt - a.modifiedAt);
	}

	/**
	 * Rust `get_tasks_in_section_v2` (`parsing.rs::extract_tasks_from_sections`):
	 * keeps the tasks under a heading whose text contains any of `sectionTags`
	 * (case-sensitive substring, `#` added when missing), one state per tag.
	 * Blank tags and a lone `#` are dropped; with none left every task is
	 * listed. Fences toggle as in `parseTasks`.
	 */
	getTasksInSection(sectionTags: string[]): FileTaskGroupV2[] {
		const sections = sectionTags
			.filter((t) => t.trim() && t.trim() !== '#')
			.map((t) => ({ tag: t.startsWith('#') ? t : `#${t}`, active: false, level: 0 }));
		if (sections.length === 0) return this.getAllTasks();

		const groups: FileTaskGroupV2[] = [];
		for (const group of this.getAllTasks()) {
			const lines = (virtualFS.readFileSafe(group.filePath) ?? '').split('\n');
			const listed = new Set<number>();
			let inFence = false;
			for (const s of sections) s.active = false;
			for (let i = 0; i < lines.length; i++) {
				if (/^\s*```/.test(lines[i])) {
					inFence = !inFence;
					continue;
				}
				if (inFence) continue;
				const heading = lines[i].match(/^(#{1,6})\s+(.*)$/);
				if (heading) {
					const level = heading[1].length;
					for (const s of sections) {
						if (s.active && level <= s.level) s.active = false;
						if (heading[2].includes(s.tag)) {
							s.active = true;
							s.level = level;
						}
					}
				} else if (sections.some((s) => s.active)) {
					listed.add(i + 1);
				}
			}
			const tasks = group.tasks.filter((t) => listed.has(t.lineNumber));
			if (tasks.length > 0) groups.push({ ...group, tasks });
		}
		return groups;
	}

	/**
	 * Rust `toggle_task_status`: writes `target`'s char into the task at
	 * `lineNumber` only while that line still holds `expectedText` with
	 * `expectedStatus`; otherwise nothing is written and the result is `stale`.
	 */
	toggleTaskStatus(
		path: string,
		lineNumber: number,
		expectedText: string,
		expectedStatus: TaskStatusV2,
		target: TaskStatusV2,
	): ToggleTaskResultV2 {
		const noop = (updatedContent: string, stale: boolean): ToggleTaskResultV2 => ({
			updatedContent,
			updateResult: { changed: false, affected: [], version: monotonicVersion, upserted: [], removed: [], fullRescan: false },
			stale,
		});
		const content = virtualFS.readFileSafe(path);
		if (content === null) return noop('', false);
		const lines = content.split('\n');
		const idx = lineNumber - 1;
		const m = idx >= 0 && idx < lines.length ? lines[idx].match(TASK_LINE_RE) : null;
		if (!m || m[3] !== expectedText || (STATUS_BY_CHAR[m[2]] ?? 'todo') !== expectedStatus) {
			return noop(content, true);
		}
		const next = CHAR_BY_STATUS[target];
		if (m[2] === next) return noop(content, false);
		lines[idx] = lines[idx].replace(TASK_LINE_RE, `$1- [${next}] $3`);
		const updated = lines.join('\n');
		virtualFS.writeFile(path, updated);
		const result = this.update(path, updated);
		return { updatedContent: updated, updateResult: result, stale: false };
	}

	/**
	 * Rust `write_task_text`: replaces the text of the task at `lineNumber` of
	 * `vaultRoot/relPath` (`TASK_LINE_RE` group 3), keeping the prefix, only
	 * while that line still holds `expectedText` with `expectedStatus`;
	 * otherwise nothing is written and the result is `stale`. Throws on a
	 * `newText` with a line break or blank, as Rust does. The mock does not
	 * check the root or confine the path.
	 */
	writeTaskText(
		vaultRoot: string,
		relPath: string,
		lineNumber: number,
		expectedText: string,
		expectedStatus: TaskStatusV2,
		newText: string,
	): TaskTextWriteResult {
		if (/[\r\n]/.test(newText)) throw new Error('Refusing task text holding a line break');
		if (newText.trim() === '') throw new Error('Refusing blank task text');
		const path = `${vaultRoot}/${relPath}`;
		const noop = (updatedContent: string, stale: boolean): TaskTextWriteResult => ({
			updatedContent,
			updateResult: { changed: false, affected: [], version: monotonicVersion, upserted: [], removed: [], fullRescan: false },
			stale,
			task: null,
		});
		const content = virtualFS.readFileSafe(path);
		if (content === null) throw new Error(`read failed for ${path}`);
		const lines = content.split('\n');
		const idx = lineNumber - 1;
		const m = idx >= 0 && idx < lines.length ? lines[idx].match(TASK_LINE_RE) : null;
		if (!m || m[3] !== expectedText || (STATUS_BY_CHAR[m[2]] ?? 'todo') !== expectedStatus) {
			return noop(content, true);
		}
		if (newText === expectedText) return noop(content, false);
		lines[idx] = lines[idx].slice(0, lines[idx].length - m[3].length) + newText;
		const updated = lines.join('\n');
		virtualFS.writeFile(path, updated);
		// The write hook already indexed the note; a second `update` would report `changed: false`.
		const result = lastHookResult.get(path) ?? this.update(path, updated);
		lastHookResult.delete(path);
		// One line alone has no heading, as Rust `parse_task_line` gives none.
		const [task] = parseTasks(lines[idx]).tasks;
		return { updatedContent: updated, updateResult: result, stale: false, task: task ? { ...task, lineNumber } : null };
	}

	/** Rust `get_index_delta`: the entries and records of `paths` still indexed, sorted by path. */
	getIndexDelta(paths: string[]): { entries: NoteEntryV2[]; records: NoteRecordV2[] } {
		const entries = [...new Set(paths)]
			.sort()
			.map((p) => this.entries.get(p))
			.filter((e): e is NoteEntryV2 => e !== undefined);
		return { entries, records: entries.map((e) => this.toNoteRecord(e)) };
	}

	getNoteRecords(): NoteRecordV2[] {
		const records: NoteRecordV2[] = [];
		for (const entry of this.entries.values()) {
			records.push(this.toNoteRecord(entry));
		}
		return records;
	}

	getNoteProperties(path: string): Record<string, FrontmatterValue> {
		return this.entries.get(path)?.frontmatter ?? {};
	}

	private toNoteRecord(entry: NoteEntryV2): NoteRecordV2 {
		const lastSlash = entry.path.lastIndexOf('/');
		const name = lastSlash >= 0 ? entry.path.slice(lastSlash + 1) : entry.path;
		const folder = lastSlash >= 0 ? entry.path.slice(0, lastSlash) : '';
		const dotIdx = name.lastIndexOf('.');
		return {
			path: entry.path,
			name,
			basename: dotIdx > 0 ? name.slice(0, dotIdx) : name,
			folder,
			ext: dotIdx > 0 ? name.slice(dotIdx + 1) : '',
			mtime: entry.modifiedAt * 1000,
			ctime: entry.createdAt * 1000,
			size: entry.size,
			properties: entry.frontmatter,
		};
	}

	get version(): number {
		return monotonicVersion;
	}

	reset(): void {
		this.entries.clear();
		monotonicVersion = 0;
	}
}

export const vaultIndex = new VaultIndexImpl();

/**
 * The `UpdateResultV2` each `virtualFS` hook below computed, keyed by path.
 * The hooks index a file the moment it is written, so by the time the app
 * calls `update_note_in_index` / `remove_note_from_index` / `rename_note`,
 * re-running the index would report `changed: false`. `tauri-core.ts` reads
 * (and deletes) the hook's result instead, to emit `vault-index-updated`
 * under the same conditions as the Rust commands.
 */
export const lastHookResult = new Map<string, UpdateResultV2>();

virtualFS.subscribe({
	onPopulate: () => {
		lastHookResult.clear();
		vaultIndex.rebuildAll();
	},
	onWrite: (path, content) => {
		lastHookResult.set(path, vaultIndex.update(path, content));
	},
	onRemove: (path) => {
		lastHookResult.set(path, vaultIndex.remove(path));
	},
	onRename: (oldPath, newPath) => {
		lastHookResult.set(oldPath, vaultIndex.remove(oldPath));
		const next = virtualFS.readFileSafe(newPath);
		if (next !== null) lastHookResult.set(newPath, vaultIndex.update(newPath, next));
	},
});

if (typeof window !== 'undefined') {
	const w = window as unknown as { __e2e?: Record<string, unknown> };
	w.__e2e = w.__e2e ?? {};
	w.__e2e.vaultIndex = vaultIndex;
}
