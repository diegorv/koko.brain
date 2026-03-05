/** Metadata about a single snapshot returned from Rust */
export interface SnapshotInfo {
	/** Unique snapshot ID (database primary key) */
	id: number;
	/** Unix timestamp in milliseconds when the snapshot was created */
	timestamp: number;
	/** Size of the snapshot content in bytes */
	size: number;
}

/** A single line in a structured diff */
export interface DiffLine {
	/** The type of change: equal (unchanged), insert (added), delete (removed) */
	type: 'equal' | 'insert' | 'delete';
	/** The text content of this line */
	content: string;
	/** Line number in the old (snapshot) version, 1-based. Absent for inserts. */
	oldLineNum?: number;
	/** Line number in the new (current) version, 1-based. Absent for deletes. */
	newLineNum?: number;
}

/** A group of snapshots belonging to the same day */
export interface SnapshotGroup {
	/** Display label for the day: "Today", "Yesterday", or "Jan 15, 2026" */
	label: string;
	/** Snapshots in this group, sorted newest first */
	snapshots: SnapshotInfo[];
}
