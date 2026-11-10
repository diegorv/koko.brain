/**
 * An in-memory open vault behind the `@tauri-apps/api/core` `invoke` mock,
 * for Todoist sync engine tests. It answers the Rust commands the engine
 * calls: the task and property-record reads, `write_task_lines` (through
 * the real `applyTaskLineEdits`, the TS port of the Rust batch), `create_note`
 * and `create_folder`, and the five `todoist_*` state commands (`todoist_read_log`
 * lists `log` newest first, ids from 1 in append order). Like Rust, it
 * refuses a `vaultRoot` / `vaultPath` that is not its root. Any other command
 * resolves to `[]` for a `get_*` read and `undefined` otherwise.
 *
 * ```ts
 * vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
 * vi.mocked(invoke).mockImplementation((cmd, args) => vault.invoke(cmd, args as Record<string, unknown>));
 * ```
 *
 * Its task parser is a small stand-in for Rust `extract_tasks` (bullet and
 * ordered tasks, code fences skipped).
 */

import type {
	FileTaskGroup,
	NoteRecord,
	TaskLineEdits,
	TaskLinesWriteResult,
	TodoistKvEntry,
	TodoistStateCommit,
	TodoistSyncLogEntry,
	TodoistSyncLogInput,
	TodoistTaskLink,
} from '#lib/contracts/index.js';
import { applyTaskLineEdits } from '#lib/features/todoist-sync/task-line-edits.logic.js';

/** The fake vault. */
export interface FakeVault {
	/** Absolute root. */
	readonly root: string;
	/** Vault-relative path -> content. */
	readonly files: Map<string, string>;
	readonly kv: Map<string, string>;
	readonly links: Map<string, TodoistTaskLink>;
	/** Every appended sync log entry. */
	readonly log: TodoistSyncLogInput[];
	/** Every `todoist_commit_state` commit received. */
	readonly commits: TodoistStateCommit[];
	/** Vault-relative paths of every note created or written, in order. */
	readonly writes: string[];
	/** The `invoke` implementation. */
	invoke(cmd: string, args?: Record<string, unknown>): Promise<unknown>;
}

const NO_CHANGE = { changed: false, affected: [], version: 1, upserted: [], removed: [], fullRescan: false };

const TASK_RE = /^\s*(?:[-*+]|\d+\.)\s\[([xX \-/?!>])\]\s([^\n]*)$/u;

/** Creates a vault at `root` holding `files` (vault-relative path -> content). */
export function createFakeVault(root: string, files: Record<string, string> = {}): FakeVault {
	const logTimes: number[] = [];
	const vault: FakeVault = {
		root,
		files: new Map(Object.entries(files)),
		kv: new Map(),
		links: new Map(),
		log: [],
		commits: [],
		writes: [],
		async invoke(cmd, args = {}) {
			const vaultArg = args.vaultRoot ?? args.vaultPath;
			if (vaultArg !== undefined && vaultArg !== root) throw new Error(`${String(vaultArg)} is not the open vault`);
			switch (cmd) {
				case 'get_all_tasks_v2':
					return taskGroups();
				case 'get_all_property_records':
					return records();
				case 'write_task_lines':
					return writeTaskLines(String(args.relPath), args.edits as TaskLineEdits);
				case 'create_folder':
					return undefined;
				case 'create_note': {
					const rel = relative(String(args.path));
					if (vault.files.has(rel)) throw new Error(`File already exists: ${String(args.path)}`);
					vault.files.set(rel, String(args.content));
					vault.writes.push(rel);
					return NO_CHANGE;
				}
				case 'todoist_read_kv':
					return [...vault.kv].sort(([a], [b]) => a.localeCompare(b)).map(([key, value]): TodoistKvEntry => ({ key, value }));
				case 'todoist_read_links':
					return [...vault.links.values()].sort((a, b) => a.anchor.localeCompare(b.anchor)).map((l) => ({ ...l }));
				case 'todoist_commit_state': {
					const commit = structuredClone(args.commit as TodoistStateCommit);
					vault.commits.push(commit);
					for (const { key, value } of commit.kv) vault.kv.set(key, value);
					for (const link of commit.upsertLinks) vault.links.set(link.anchor, link);
					for (const anchor of commit.deleteAnchors) vault.links.delete(anchor);
					return null;
				}
				case 'todoist_append_log':
					for (const entry of args.entries as TodoistSyncLogInput[]) {
						vault.log.push(entry);
						logTimes.push(Date.now());
					}
					return null;
				case 'todoist_read_log': {
					const rows = vault.log.map(
						(entry, i): TodoistSyncLogEntry => ({ id: i + 1, createdAt: logTimes[i] ?? 0, ...entry }),
					);
					return rows.reverse().slice(0, (args.limit as number | undefined) ?? rows.length);
				}
				default:
					return cmd.startsWith('get_') ? [] : undefined;
			}
		},
	};

	function relative(path: string): string {
		if (!path.startsWith(`${root}/`)) throw new Error(`${path} is outside the vault`);
		return path.slice(root.length + 1);
	}

	function taskGroups(): FileTaskGroup[] {
		const groups: FileTaskGroup[] = [];
		for (const [rel, content] of vault.files) {
			const tasks: FileTaskGroup['tasks'] = [];
			let fence: string | null = null;
			content.split('\n').forEach((line, i) => {
				const marker = /^[ \t]*(```|~~~)/u.exec(line)?.[1] ?? null;
				if (marker) {
					fence = fence === null ? marker : fence === marker ? null : fence;
					return;
				}
				const m = fence === null ? TASK_RE.exec(line) : null;
				if (!m) return;
				tasks.push({
					text: m[2],
					checked: m[1] !== ' ',
					indent: 0,
					lineNumber: i + 1,
					status: m[1] === ' ' ? 'todo' : 'done',
					metadata: { description: m[2], tags: [] },
				});
			});
			if (tasks.length > 0) groups.push({ filePath: `${root}/${rel}`, fileName: rel, modifiedAt: 0, tasks });
		}
		return groups;
	}

	function records(): NoteRecord[] {
		return [...vault.files.keys()]
			.filter((rel) => rel.endsWith('.md'))
			.sort()
			.map((rel) => {
				const properties: NoteRecord['properties'] = {};
				const fm = /^---\n([\s\S]*?)\n---/u.exec(vault.files.get(rel)!);
				for (const line of fm?.[1].split('\n') ?? []) {
					const kv = /^([\w-]+):\s*(.*)$/u.exec(line);
					if (kv) properties[kv[1]] = kv[2].replace(/^"(.*)"$/u, '$1');
				}
				const name = rel.split('/').pop()!;
				return {
					path: `${root}/${rel}`,
					name,
					basename: name.replace(/\.md$/u, ''),
					folder: rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/')) : '',
					ext: 'md',
					mtime: 0,
					ctime: 0,
					size: 0,
					properties,
				};
			});
	}

	function writeTaskLines(rel: string, edits: TaskLineEdits): TaskLinesWriteResult {
		const current = vault.files.get(rel);
		const out = applyTaskLineEdits(current ?? '', edits);
		if (out.kind === 'stale') return { outcome: 'stale', content: null, stale: out.stale, updateResult: NO_CHANGE };
		if (current === undefined) return { outcome: 'missing', content: null, stale: null, updateResult: NO_CHANGE };
		if (out.content === current) return { outcome: 'unchanged', content: current, stale: null, updateResult: NO_CHANGE };
		vault.files.set(rel, out.content);
		vault.writes.push(rel);
		return { outcome: 'written', content: out.content, stale: null, updateResult: NO_CHANGE };
	}

	return vault;
}
