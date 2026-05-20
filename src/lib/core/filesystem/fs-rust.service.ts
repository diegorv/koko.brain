import { invoke } from '@tauri-apps/api/core';

/**
 * Single directory entry returned by the `read_dir` Rust command.
 * Mirrors the `FsDirEntry` struct in `src-tauri/src/commands/fs_primitives.rs`.
 */
export interface FsDirEntry {
	/** File or directory name (no path) */
	name: string;
	/** Absolute path of the entry */
	path: string;
	/** True when the entry is a directory; symlinks are filtered out Rust-side per ADR 0020 */
	isDirectory: boolean;
}

/**
 * Typed wrappers around the Rust FS primitive commands (Task 3 of the plugin-fs
 * migration; see ADR 0026). Every wrapper:
 *
 * - Takes the absolute vault path first (validated Rust-side via
 *   `vault_fs::validate_vault_path` per ADR 0020).
 * - Takes the operation's target path(s) as absolute paths sourced from the
 *   file tree (`FileTreeNode.path`, editor tabs, etc).
 * - Returns a Promise that resolves on success or rejects with the Rust
 *   command's error string. Errors are propagated up; the wrapper never
 *   swallows them.
 *
 * Callers that need wrappers higher up the stack (e.g. `fs.service.ts`,
 * `editor.service.ts`) compose these into their existing API surface. This
 * module deliberately stays thin - no logging, no store mutations, no toast
 * notifications. Side-effect orchestration is the caller's job.
 */

/**
 * Returns true if `path` exists inside the vault, false otherwise.
 * Rejects with "Path is outside vault directory" when the path resolves
 * outside `vaultPath` (the Rust side uses canonicalize + starts_with).
 */
export function pathExists(vaultPath: string, path: string): Promise<boolean> {
	return invoke<boolean>('path_exists', { vaultPath, path });
}

/**
 * Returns true if `path` exists on disk, false otherwise. Bypasses the
 * vault-scoping check that every other wrapper enforces. Use ONLY for probes
 * that cannot have a valid vault context yet, e.g. detecting whether a
 * previously opened vault directory still exists before the user reopens it.
 * Day-to-day code should use `pathExists(vaultPath, path)` instead.
 */
export function pathExistsRaw(path: string): Promise<boolean> {
	return invoke<boolean>('path_exists_raw', { path });
}

/**
 * Reads a UTF-8 text file inside the vault. Rejects if the file does not
 * exist, lives outside the vault, or contains invalid UTF-8.
 */
export function readText(vaultPath: string, path: string): Promise<string> {
	return invoke<string>('read_text', { vaultPath, path });
}

/**
 * Writes `content` to a file inside the vault, creating or overwriting it.
 * The parent directory must exist; callers needing recursive creation invoke
 * `create_folder` first.
 */
export function writeText(vaultPath: string, path: string, content: string): Promise<void> {
	return invoke<void>('write_text', { vaultPath, path, content });
}

/**
 * Renames or moves a path inside the vault. Rejects if `from` does not exist,
 * `to` already exists, or either path resolves outside the vault.
 */
export function renamePath(vaultPath: string, from: string, to: string): Promise<void> {
	return invoke<void>('rename_path', { vaultPath, from, to });
}

/**
 * Copies a file inside the vault. Rejects on directory sources, missing
 * sources, existing destinations, and any path outside the vault.
 */
export function copyPath(vaultPath: string, from: string, to: string): Promise<void> {
	return invoke<void>('copy_path', { vaultPath, from, to });
}

/**
 * Hard-deletes a path inside the vault. With `recursive: true`, directories
 * are removed with all contents; without it, only an empty directory or a
 * single file is removed. Callers that want the trash flow should keep using
 * `core/trash/trash.service.ts` - this primitive does NOT move to trash.
 */
export function deletePath(
	vaultPath: string,
	path: string,
	recursive: boolean,
): Promise<void> {
	return invoke<void>('delete_path', { vaultPath, path, recursive });
}

/**
 * Lists the immediate children of a directory inside the vault. Symlinks are
 * filtered out Rust-side (ADR 0020); hidden entries are returned (callers
 * apply their own filter when needed).
 */
export function readDir(vaultPath: string, path: string): Promise<FsDirEntry[]> {
	return invoke<FsDirEntry[]>('read_dir', { vaultPath, path });
}

/**
 * Creates a directory (recursive - equivalent to TS `mkdir(path, { recursive:
 * true })`). No-op when the directory already exists. Does NOT take a vault
 * path argument: the underlying Rust `create_folder` command predates the
 * Phase 8.6 vault-scoped primitives and does not run `validate_vault_path`.
 * Callers are responsible for passing an absolute path they trust.
 */
export function createFolder(path: string): Promise<void> {
	return invoke<void>('create_folder', { path });
}
