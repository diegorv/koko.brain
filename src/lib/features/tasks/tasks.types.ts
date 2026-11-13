import type { TaskMetadata, TaskStatus } from './task-metadata.types';

/** Represents a single task extracted from a markdown file */
export interface TaskItem {
	/** The raw text of the task (without the `- [ ] ` prefix) */
	text: string;
	/** Whether the task checkbox is checked */
	checked: boolean;
	/** Indentation level (0 = top-level, 1 = one indent, etc.) */
	indent: number;
	/** 1-based line number within the file */
	lineNumber: number;
	/** Parsed status from the checkbox character */
	status: TaskStatus;
	/** Structured metadata parsed from emoji signifiers in the text */
	metadata: TaskMetadata;
}

/** A task row in the Tasks view, identified by its note and line. */
export interface TaskRowRef {
	/** Absolute path of the task's note */
	filePath: string;
	/** 1-based line number of the task within the note */
	lineNumber: number;
}
