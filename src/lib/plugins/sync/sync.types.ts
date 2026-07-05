/** Result summary returned by the sync_now command (mirrors Rust SyncSummary). */
export interface SyncSummary {
	/** Number of files downloaded from remote. */
	downloaded: number;
	/** Number of conflicts detected and resolved. */
	conflicts: number;
	/** Number of files skipped (up-to-date or untracked). */
	skipped: number;
	/** Folders that were skipped during sync (e.g., permissions, encoding issues). */
	skippedFolders: string[];
	/** Per-file or folder-level errors encountered during sync. */
	errors: string[];
}

/** Listener status returned by the sync_status command. */
export interface SyncListenerStatus {
	/** True when the Noise TCP listener is running and accepting connections. */
	listening: boolean;
	/** Port the listener is bound to; null when not listening. */
	port: number | null;
	/** Local IP address the listener is bound to; null when not listening. */
	localIp: string | null;
}
