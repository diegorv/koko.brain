import { describe, it, expect, vi } from 'vitest';

const { mockCreateTauriFetchAdapter } = vi.hoisted(() => ({
	mockCreateTauriFetchAdapter: vi.fn(),
}));

vi.mock('$lib/features/tasks/tauri-fetch-adapter', () => ({
	createTauriFetchAdapter: mockCreateTauriFetchAdapter,
}));

import { createTodoistClient } from '$lib/features/tasks/todoist-client';
import { TodoistApi } from '@doist/todoist-api-typescript';

describe('createTodoistClient', () => {
	it('returns a TodoistApi instance', () => {
		const mockAdapter = vi.fn();
		mockCreateTauriFetchAdapter.mockReturnValue(mockAdapter);

		const client = createTodoistClient('test-token-123');

		expect(client).toBeInstanceOf(TodoistApi);
	});

	it('creates the adapter via createTauriFetchAdapter', () => {
		const mockAdapter = vi.fn();
		mockCreateTauriFetchAdapter.mockReturnValue(mockAdapter);

		createTodoistClient('test-token-123');

		expect(mockCreateTauriFetchAdapter).toHaveBeenCalled();
	});
});
