import type { SnapshotInfo } from '#lib/contracts/index.js';

export type { SnapshotInfo, DiffLine } from '#lib/contracts/index.js';

/** A group of snapshots belonging to the same day */
export interface SnapshotGroup {
	/** Display label for the day: "Today", "Yesterday", or "Jan 15, 2026" */
	label: string;
	/** Snapshots in this group, sorted newest first */
	snapshots: SnapshotInfo[];
}
