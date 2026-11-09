import type { TaskStatus } from './task-metadata.types';

/**
 * The status a Tasks-list click writes for a task now in `status`: done and
 * cancelled reopen to `todo`, every other status completes to `done`.
 */
export function toggleTarget(status: TaskStatus): TaskStatus {
	return status === 'done' || status === 'cancelled' ? 'todo' : 'done';
}
