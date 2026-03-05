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

/** All tasks belonging to a single file */
export interface FileTaskGroup {
	/** Absolute file path */
	filePath: string;
	/** Display name of the file (without extension) */
	fileName: string;
	/** File's last-modified timestamp in ms */
	modifiedAt: number;
	/** List of tasks extracted from this file, in document order */
	tasks: TaskItem[];
}

/** Available date filter periods */
export type TaskDateFilter = 'all' | 'last7days' | 'last30days';
