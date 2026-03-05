import type { SnapshotInfo, SnapshotGroup } from './file-history.types';

/**
 * Formats a snapshot timestamp as a human-readable relative time string.
 * Returns "Just now" for <1 min, "X min ago" for <1 hour,
 * "Xh ago" for <24 hours, or "HH:MM" time for older snapshots.
 */
export function formatSnapshotTime(timestamp: number): string {
	const now = Date.now();
	const diffMs = now - timestamp;
	const diffMin = Math.floor(diffMs / 60_000);
	const diffHours = Math.floor(diffMs / 3_600_000);

	if (diffMin < 1) return 'Just now';
	if (diffMin < 60) return `${diffMin} min ago`;
	if (diffHours < 24) return `${diffHours}h ago`;

	const date = new Date(timestamp);
	return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

/**
 * Formats a snapshot timestamp as an absolute date/time string.
 * Returns "HH:MM" for today, or "MMM D, HH:MM" for older snapshots.
 */
export function formatSnapshotDateTime(timestamp: number): string {
	const date = new Date(timestamp);
	const time = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
	const today = new Date();
	if (
		date.getFullYear() === today.getFullYear() &&
		date.getMonth() === today.getMonth() &&
		date.getDate() === today.getDate()
	) {
		return time;
	}
	const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
	return `${dateStr}, ${time}`;
}

/**
 * Returns a version label for a snapshot based on its position in the list.
 * Index 0 (most recent) → "Current", index 1 → "1 version before current", etc.
 */
export function formatSnapshotLabel(index: number): string {
	if (index === 0) return 'Current';
	if (index === 1) return '1 version before current';
	return `${index} versions before current`;
}

/**
 * Formats a byte count as a human-readable file size.
 * e.g., 512 → "512 B", 1536 → "1.5 KB", 1048576 → "1.0 MB"
 */
export function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Groups snapshots by calendar day for display in the snapshot list.
 * Returns groups labeled "Today", "Yesterday", or locale date string.
 * Each group's snapshots are sorted newest first.
 */
export function groupSnapshotsByDay(snapshots: SnapshotInfo[]): SnapshotGroup[] {
	if (snapshots.length === 0) return [];

	const groups = new Map<string, SnapshotInfo[]>();
	const today = new Date();
	const todayStr = toDateKey(today);
	const yesterday = new Date(today);
	yesterday.setDate(yesterday.getDate() - 1);
	const yesterdayStr = toDateKey(yesterday);

	for (const snapshot of snapshots) {
		const dateKey = toDateKey(new Date(snapshot.timestamp));
		if (!groups.has(dateKey)) {
			groups.set(dateKey, []);
		}
		groups.get(dateKey)!.push(snapshot);
	}

	const result: SnapshotGroup[] = [];
	for (const [dateKey, items] of groups) {
		let label: string;
		if (dateKey === todayStr) {
			label = 'Today';
		} else if (dateKey === yesterdayStr) {
			label = 'Yesterday';
		} else {
			const [year, month, day] = dateKey.split('-').map(Number);
			const date = new Date(year, month - 1, day);
			label = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
		}
		items.sort((a, b) => b.timestamp - a.timestamp);
		result.push({ label, snapshots: items });
	}

	result.sort((a, b) => b.snapshots[0].timestamp - a.snapshots[0].timestamp);
	return result;
}

/**
 * Computes the relative path of a file within the vault.
 * e.g., ("/Users/me/vault", "/Users/me/vault/notes/file.md") → "notes/file.md"
 */
export function getRelativePath(vaultPath: string, absolutePath: string): string {
	if (!absolutePath.startsWith(vaultPath)) {
		return absolutePath;
	}
	let relative = absolutePath.slice(vaultPath.length);
	if (relative.startsWith('/')) {
		relative = relative.slice(1);
	}
	return relative;
}

/** Base directory for snapshot backups within the vault */
const SNAPSHOT_BACKUP_DIR = '.kokobrain/snapshots-backup';

/**
 * Computes the backup directory path for a file's snapshots.
 * e.g., ("/Users/me/vault", "/Users/me/vault/notes/meeting.md")
 * → "/Users/me/vault/.kokobrain/snapshots-backup/notes/meeting.md"
 */
export function getSnapshotBackupDir(vaultPath: string, absoluteFilePath: string): string {
	const relativePath = getRelativePath(vaultPath, absoluteFilePath);
	return `${vaultPath}/${SNAPSHOT_BACKUP_DIR}/${relativePath}`;
}

/**
 * Computes the full path for a single snapshot backup file.
 * e.g., ("/Users/me/vault", "/Users/me/vault/notes/meeting.md", 1708185600000)
 * → "/Users/me/vault/.kokobrain/snapshots-backup/notes/meeting.md/1708185600000.md"
 */
export function getSnapshotBackupPath(
	vaultPath: string,
	absoluteFilePath: string,
	timestamp: number,
): string {
	const dir = getSnapshotBackupDir(vaultPath, absoluteFilePath);
	return `${dir}/${timestamp}.md`;
}

/**
 * Checks if a snapshot timestamp has a corresponding backup within a tolerance window.
 * Accounts for minor differences between JS and Rust timestamp generation.
 */
export function hasBackupForTimestamp(
	snapshotTimestamp: number,
	backedUpTimestamps: Set<number>,
	toleranceMs: number = 10_000,
): boolean {
	return findBackupTimestamp(snapshotTimestamp, backedUpTimestamps, toleranceMs) !== null;
}

/**
 * Finds the actual backup timestamp that matches a snapshot timestamp within tolerance.
 * Returns the matching backup timestamp or null if none found.
 */
export function findBackupTimestamp(
	snapshotTimestamp: number,
	backedUpTimestamps: Set<number>,
	toleranceMs: number = 10_000,
): number | null {
	if (backedUpTimestamps.has(snapshotTimestamp)) return snapshotTimestamp;
	for (const backupTs of backedUpTimestamps) {
		if (Math.abs(backupTs - snapshotTimestamp) <= toleranceMs) return backupTs;
	}
	return null;
}

/** Converts a Date to a "YYYY-MM-DD" string for grouping */
function toDateKey(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, '0');
	const d = String(date.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}
