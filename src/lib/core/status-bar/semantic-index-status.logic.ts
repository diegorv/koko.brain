/** Per-file semantic index status returned by the `get_semantic_file_status` Tauri command. */
export interface SemanticFileStatus {
	/** Number of indexed chunks stored for this source file (0 = not indexed). */
	chunkCount: number;
	/** Most recent `embedded_at` Unix-ms timestamp, or null when the file has no chunks. */
	lastEmbeddedAt: number | null;
	/** Whether the ONNX embedder is currently loaded in memory. */
	modelLoaded: boolean;
}

/** Resolved label kind shown in the status bar for the current markdown tab. */
export type IndexStatusLabelKind =
	/** Embedder not loaded yet — semantic search enabled but model still loading. */
	| 'loading'
	/** File has at least one chunk in the index. */
	| 'indexed'
	/** Embedder loaded but the file has zero chunks. */
	| 'not-indexed';

/** Visible label data resolved from a file status snapshot. */
export interface IndexStatusLabel {
	kind: IndexStatusLabelKind;
	text: string;
}

/**
 * Converts an absolute tab path into the vault-relative path expected by
 * `get_semantic_file_status`. Returns null when the path cannot be expressed
 * relative to the given vault (tab is virtual, file lives outside the vault,
 * or no vault is open). Mirrors the prefix-stripping logic used by
 * `registerSearchIndexHook` in `search.service.ts`.
 */
export function toVaultRelativePath(absPath: string | null | undefined, vaultPath: string | null | undefined): string | null {
	if (!absPath || !vaultPath) return null;
	if (absPath.startsWith('__virtual__/')) return null;
	if (!absPath.startsWith(vaultPath)) return null;
	return absPath.substring(vaultPath.length).replace(/^\//, '');
}

/** Returns true when the path points at a markdown file. */
export function isMarkdownPath(path: string | null | undefined): boolean {
	if (!path) return false;
	return path.endsWith('.md') || path.endsWith('.markdown');
}

/**
 * Maps a status snapshot to the label shown in the status bar.
 * Pure — no DOM, no store access; safe to unit-test in isolation.
 */
export function resolveStatusLabel(status: SemanticFileStatus | null): IndexStatusLabel | null {
	if (!status) return null;
	if (!status.modelLoaded) return { kind: 'loading', text: 'Loading model...' };
	if (status.chunkCount > 0) {
		const chunkWord = status.chunkCount === 1 ? 'chunk' : 'chunks';
		return { kind: 'indexed', text: `Indexed (${status.chunkCount} ${chunkWord})` };
	}
	return { kind: 'not-indexed', text: 'Not indexed' };
}
