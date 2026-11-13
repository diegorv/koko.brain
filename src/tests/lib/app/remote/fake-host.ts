import type { FileTreeNode } from '#lib/core/filesystem/fs.types.js';
import type { NoteEntryV2 } from '#lib/types/vault-v2.types.js';
import { FakeSocket } from './fake-socket';

/** The vault a fake host serves. */
export interface FakeVault {
	/** Absolute vault root, as the welcome sends it. */
	root: string;
	/** Absolute path -> file text. Folders are implied by the paths. */
	files: Record<string, string>;
	/** What `get_all_vault_entries_v2` returns (the Mac's index). */
	entries?: NoteEntryV2[];
}

/** One call the fake host answered. */
export interface HostCall {
	cmd: string;
	args: Record<string, unknown> | null;
	headers?: Record<string, unknown> | null;
}

/** The host's refusal of a stale note write (`remote::write`), with its JSON-RPC code. */
export const CONFLICT_CODE = -32001;

/** The host's error for a file that is not there, worded as plugin-fs words it. */
export const missingFileMessage = (path: string) =>
	`failed to read file at path: ${path}: No such file or directory (os error 2)`;

/** The host's refusal of a Denied command (`dispatch.rs`). */
export const deniedMessage = (cmd: string) => `Command is not available in the browser: ${cmd}`;

function tree(vault: FakeVault, dir: string): FileTreeNode[] {
	const children = new Map<string, FileTreeNode>();
	for (const path of Object.keys(vault.files)) {
		if (!path.startsWith(`${dir}/`)) continue;
		const [name, ...rest] = path.slice(dir.length + 1).split('/');
		// The desktop's `scan_vault` skips dot-prefixed entries.
		if (name.startsWith('.')) continue;
		const childPath = `${dir}/${name}`;
		if (children.has(name)) continue;
		children.set(
			name,
			rest.length === 0
				? { name, path: childPath, isDirectory: false }
				: { name, path: childPath, isDirectory: true, children: tree(vault, childPath) },
		);
	}
	return [...children.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** A note write the fake host refused or applied. */
export interface HostWrite {
	path: string;
	text: string;
	base: string | undefined;
	/** Whether it changed `files` (or was an accepted retry). */
	accepted: boolean;
}

/** A running fake host. */
export interface FakeHost {
	/** Every note write (`plugin:fs|write_text_file` outside `.kokobrain/`). */
	writes: HostWrite[];
	/** The first connection's socket. */
	socket: FakeSocket;
	/** Every call answered, across connections. */
	calls: HostCall[];
	/** Commands refused as Denied. */
	refused: string[];
	/** Opens another connection (a reconnect); pass it as the session's `open`. */
	connect(): FakeSocket;
	/** Sends a forwarded Rust event on the latest connection. */
	emit(event: string, payload: unknown): void;
	/** The socket of the latest connection. */
	latest(): FakeSocket;
}

/**
 * An in-process stand-in for the Mac's `/ws` host over an in-memory vault:
 * every `invoke` is answered on the next microtask, as the real host answers
 * it (reads from `files` and `entries`, the Virtual commands the boot sends
 * acknowledged, a missing file is an error). Note writes are checked as
 * `remote::write` checks them: they land only when the file still holds the
 * `base` header (or already holds the text), a stale one is refused with
 * `CONFLICT_CODE`, and `.kokobrain/` writes are dropped. Any other
 * command is refused as the host refuses a Denied one, so a read path that
 * reaches one fails here too. Call `welcome()` on the returned socket to open
 * the session. `vault.files` may be changed in place to stand for an edit on
 * the Mac.
 */
export function createFakeHost(vault: FakeVault): FakeHost {
	const calls: HostCall[] = [];
	const writes: HostWrite[] = [];
	const refused: string[] = [];
	const conflict = (path: string) =>
		Object.assign(new Error(`Conflict: the note changed on the Mac: ${path}`), { code: CONFLICT_CODE });
	let nextListener = 1;
	const answer = (cmd: string, args: Record<string, unknown> | null, headers: Record<string, unknown> | null): unknown => {
		const path = typeof args?.path === 'string' ? args.path : '';
		switch (cmd) {
			case 'plugin:fs|write_text_file': {
				const target = decodeURIComponent(String(headers?.path ?? ''));
				if (target.startsWith(`${vault.root}/.kokobrain/`)) return null;
				const text = String(args?.text ?? '');
				const base = typeof headers?.base === 'string' ? headers.base : undefined;
				const disk = vault.files[target];
				const write = { path: target, text, base, accepted: false };
				writes.push(write);
				if (disk === undefined) {
					if (base !== undefined) throw conflict(target);
				} else if (base === undefined) {
					throw new Error(`Refusing to overwrite a note the browser has not loaded: ${target}`);
				} else if (disk !== text && disk !== base) {
					throw conflict(target);
				}
				vault.files[target] = text;
				write.accepted = true;
				return null;
			}
			case 'create_note':
				if (path in vault.files) throw new Error(`File already exists: ${path}`);
				vault.files[path] = String(args?.content ?? '');
				return { changed: false, affected: [], version: 0, upserted: [], removed: [], fullRescan: false };
			case 'create_folder':
			case 'plugin:fs|mkdir':
				return null;
			case 'save_snapshot':
				return true;
			case 'plugin:fs|read_text_file':
			case 'plugin:fs|read_file':
				if (!(path in vault.files)) throw new Error(missingFileMessage(path));
				return [...new TextEncoder().encode(vault.files[path])];
			case 'plugin:fs|exists':
				return path in vault.files || Object.keys(vault.files).some((f) => f.startsWith(`${path}/`));
			case 'scan_vault':
				return tree(vault, path.replace(/\/$/, ''));
			case 'get_all_vault_entries_v2':
				return vault.entries ?? [];
			case 'read_files_batch':
				return (args?.paths as string[]).map((p) => ({ path: p, content: vault.files[p] ?? null, error: null }));
			case 'update_note_in_index':
			case 'remove_note_from_index':
				return { changed: false, affected: [], version: 0, upserted: [], removed: [], fullRescan: false };
			case 'scan_vault_v2_cached':
				return { source: 'cache', entryCount: vault.entries?.length ?? 0, loadMs: 0, filesReread: 0 };
			case 'plugin:event|listen':
				return nextListener++;
			case 'cleanup_history':
			case 'get_process_memory':
				return 0;
			case 'plugin:fs|read_dir':
			case 'get_all_tags_v2':
			case 'get_all_tasks_v2':
			case 'get_all_property_records':
			case 'get_backlinks_v2':
			case 'get_relationship_backlinks_v2':
			case 'get_outgoing_links_v2':
			case 'get_outgoing_unlinked_mentions_v2':
			case 'get_unlinked_mentions_v2':
				return [];
			case 'build_search_index':
				return { totalDocuments: 0, added: 0, updated: 0, removed: 0, unchanged: 0 };
			case 'plugin:event|unlisten':
			case 'open_vault_db':
			case 'close_vault_db':
			case 'save_vault_cache':
			case 'start_vault_watcher':
			case 'stop_vault_watcher':
			case 'configure_sentry':
			case 'shutdown_semantic':
			case 'update_search_index_file':
			case 'remove_from_search_index':
			case 'update_semantic_file':
			case 'remove_semantic_file':
				return null;
			default:
				refused.push(cmd);
				throw new Error(deniedMessage(cmd));
		}
	};
	let latest: FakeSocket;
	const connect = () => {
		const socket = new FakeSocket();
		const send = socket.send.bind(socket);
		socket.send = (data: string) => {
			send(data);
			const message = JSON.parse(data);
			if (message.method !== 'invoke') return;
			const { cmd, args, headers } = message.params as {
				cmd: string;
				args: Record<string, unknown> | null;
				headers: Record<string, unknown> | null;
			};
			calls.push({ cmd, args, headers });
			queueMicrotask(() => {
				if (socket.closed) return;
				try {
					socket.receive({ jsonrpc: '2.0', id: message.id, result: answer(cmd, args, headers) });
				} catch (err) {
					const code = (err as { code?: number }).code ?? -32000;
					socket.receive({ jsonrpc: '2.0', id: message.id, error: { code, message: (err as Error).message } });
				}
			});
		};
		latest = socket;
		return socket;
	};
	const socket = connect();
	const emit = (event: string, payload: unknown) => {
		latest.receive({ jsonrpc: '2.0', method: 'event', params: { event, payload } });
	};
	return { socket, calls, writes, refused, connect, emit, latest: () => latest };
}
