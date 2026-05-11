/**
 * In-memory mirror of the Rust `VaultIndex` (src-tauri/src/vault/index.rs).
 *
 * The Rust side owns vault metadata in production. In E2E we don't link the
 * Rust binary, so the frontend's `*_v2` IPC calls are routed by `tauri-core.ts`
 * to this module, which reads files from `virtualFS`, parses them, and answers
 * in the wire shapes documented in `src/lib/types/vault-v2.types.ts`.
 *
 * Parsing reuses the pure TS logic the production code already trusts:
 *   - parseWikilinks/getNoteName/buildResolutionCache from backlinks.logic.ts
 *   - extractAllTags from tags.logic.ts
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
	TaskStatusV2,
	TagAggregateV2,
	FileTaskGroupV2,
	ToggleTaskResultV2,
	UpdateResultV2,
	NoteRecordV2,
	FrontmatterValue,
} from '../../src/lib/types/vault-v2.types';
import {
	parseWikilinks,
	getNoteName,
	buildResolutionCache,
	resolveWikilinkCached,
} from '../../src/lib/features/backlinks/backlinks.logic';
import { extractAllTags } from '../../src/lib/features/tags/tags.logic';
import { virtualFS } from './virtual-fs';

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---/;
const TASK_LINE_RE = /^(\s*)[-*]\s+\[(.)\]\s+(.*)$/;
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
	if (!m) return {};

	let parsed: unknown;
	try {
		parsed = yamlParse(m[1], { uniqueKeys: false });
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

/**
 * Minimal task parser. The Rust source of truth lives in
 * `src-tauri/src/vault/parsing.rs::extract_tasks`; this covers checkbox
 * char, indent, and lineNumber — enough for golden-path tests.
 */
function parseTasks(content: string): TaskV2[] {
	const tasks: TaskV2[] = [];
	const lines = content.split('\n');
	let inFence = false;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		if (/^\s*```/.test(line)) {
			inFence = !inFence;
			continue;
		}
		if (inFence) continue;

		const m = line.match(TASK_LINE_RE);
		if (!m) continue;

		const [, indentStr, statusChar, text] = m;
		tasks.push({
			text,
			checked: statusChar !== ' ',
			indent: Math.floor(indentStr.length / 2),
			lineNumber: i + 1,
			status: STATUS_BY_CHAR[statusChar] ?? 'todo',
			metadata: {
				description: text,
				tags: [],
			},
		});
	}

	return tasks;
}

function buildEntry(path: string, content: string): NoteEntryV2 {
	const body = stripFrontmatter(content);
	const wikilinks = parseWikilinks(content).map<WikiLinkV2>((wl) => ({
		target: wl.target,
		alias: wl.alias,
		heading: wl.heading,
		position: wl.position,
	}));
	const tags = extractAllTags(content);
	const tasks = parseTasks(content);
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
	};
}

class VaultIndexImpl {
	private entries = new Map<string, NoteEntryV2>();

	rebuildAll(): void {
		this.entries.clear();
		const dump = virtualFS.dump();
		for (const [path, content] of Object.entries(dump)) {
			if (!path.endsWith('.md') && !path.endsWith('.markdown')) continue;
			if (this.isHidden(path)) continue;
			this.entries.set(path, buildEntry(path, content));
		}
		bumpVersion();
	}

	private isHidden(path: string): boolean {
		return path.split('/').some((seg) => seg.startsWith('.'));
	}

	update(path: string, content: string): UpdateResultV2 {
		if (this.isHidden(path) || (!path.endsWith('.md') && !path.endsWith('.markdown'))) {
			return { changed: false, affected: [], version: monotonicVersion };
		}
		const previous = this.entries.get(path);
		const next = buildEntry(path, content);
		this.entries.set(path, next);

		const affected = new Set<string>();
		if (previous) {
			for (const link of previous.outgoingLinks) affected.add(link.target);
		}
		for (const link of next.outgoingLinks) affected.add(link.target);

		const changed =
			!previous ||
			previous.size !== next.size ||
			JSON.stringify(previous.outgoingLinks) !== JSON.stringify(next.outgoingLinks) ||
			JSON.stringify(previous.tags) !== JSON.stringify(next.tags) ||
			JSON.stringify(previous.frontmatter) !== JSON.stringify(next.frontmatter);

		return { changed, affected: [...affected], version: bumpVersion() };
	}

	remove(path: string): UpdateResultV2 {
		const previous = this.entries.get(path);
		if (!previous) {
			return { changed: false, affected: [], version: monotonicVersion };
		}
		this.entries.delete(path);
		const affected = previous.outgoingLinks.map((l) => l.target);
		return { changed: true, affected, version: bumpVersion() };
	}

	getEntry(path: string): NoteEntryV2 | null {
		return this.entries.get(path) ?? null;
	}

	getAll(): NoteEntryV2[] {
		return [...this.entries.values()];
	}

	getBacklinks(targetPath: string): NoteEntryV2[] {
		const targetName = getNoteName(targetPath).toLowerCase();
		const cache = buildResolutionCache([...this.entries.keys()]);
		const sources: NoteEntryV2[] = [];
		for (const entry of this.entries.values()) {
			if (entry.path === targetPath) continue;
			const linksTo = entry.outgoingLinks.some((link) => {
				if (link.target.toLowerCase() === targetName) return true;
				const resolved = resolveWikilinkCached(link.target, cache);
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
			resolvedPath: resolveWikilinkCached(link.target, cache),
			position: link.position,
		}));
	}

	getOutgoingUnlinkedMentions(activePath: string, content: string): OutgoingUnlinkedMentionV2[] {
		const stripped = stripFrontmatter(content)
			.replace(/```[\s\S]*?```/g, '')
			.replace(/\[\[[^\]]+?\]\]/g, '');
		const result: OutgoingUnlinkedMentionV2[] = [];
		for (const entry of this.entries.values()) {
			if (entry.path === activePath) continue;
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
			if (entry.path === targetPath) continue;
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

	getNotesWithTag(tag: string): NoteEntryV2[] {
		const target = tag.toLowerCase();
		return [...this.entries.values()].filter((entry) =>
			entry.tags.some((t) => t.toLowerCase() === target),
		);
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

	getTasksInSection(sectionTag: string): FileTaskGroupV2[] {
		const target = sectionTag.toLowerCase();
		return this.getAllTasks().filter((g) => {
			const entry = this.entries.get(g.filePath);
			return entry?.tags.some((t) => t.toLowerCase() === target) ?? false;
		});
	}

	toggleTaskStatus(path: string, lineNumber: number): ToggleTaskResultV2 {
		const content = virtualFS.readFileSafe(path);
		if (content === null) {
			return {
				updatedContent: '',
				updateResult: { changed: false, affected: [], version: monotonicVersion },
			};
		}
		const lines = content.split('\n');
		const idx = lineNumber - 1;
		if (idx < 0 || idx >= lines.length) {
			return {
				updatedContent: content,
				updateResult: { changed: false, affected: [], version: monotonicVersion },
			};
		}
		const m = lines[idx].match(TASK_LINE_RE);
		if (!m) {
			return {
				updatedContent: content,
				updateResult: { changed: false, affected: [], version: monotonicVersion },
			};
		}
		const next = m[2] === ' ' ? 'x' : ' ';
		lines[idx] = lines[idx].replace(TASK_LINE_RE, `$1- [${next}] $3`);
		const updated = lines.join('\n');
		virtualFS.writeFile(path, updated);
		const result = this.update(path, updated);
		return { updatedContent: updated, updateResult: result };
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

virtualFS.subscribe({
	onPopulate: () => vaultIndex.rebuildAll(),
	onWrite: (path, content) => {
		vaultIndex.update(path, content);
	},
	onRemove: (path) => {
		vaultIndex.remove(path);
	},
	onRename: (oldPath, newPath) => {
		vaultIndex.remove(oldPath);
		const next = virtualFS.readFileSafe(newPath);
		if (next !== null) vaultIndex.update(newPath, next);
	},
});

if (typeof window !== 'undefined') {
	const w = window as unknown as { __e2e?: Record<string, unknown> };
	w.__e2e = w.__e2e ?? {};
	w.__e2e.vaultIndex = vaultIndex;
}
