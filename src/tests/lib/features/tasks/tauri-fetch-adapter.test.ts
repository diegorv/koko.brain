import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockFetch } = vi.hoisted(() => ({
	mockFetch: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-http', () => ({
	fetch: mockFetch,
}));

import { createTauriFetchAdapter } from '$lib/features/tasks/tauri-fetch-adapter';

describe('createTauriFetchAdapter', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns a function', () => {
		const adapter = createTauriFetchAdapter();
		expect(typeof adapter).toBe('function');
	});

	it('calls tauri fetch with url and options', async () => {
		const headers = new Headers({ 'content-type': 'application/json' });
		mockFetch.mockResolvedValue({
			ok: true,
			status: 200,
			statusText: 'OK',
			headers,
			text: () => Promise.resolve('body'),
			json: () => Promise.resolve({ data: 1 }),
		});

		const adapter = createTauriFetchAdapter();
		await adapter('https://api.todoist.com/rest/v2/tasks', { method: 'GET' });

		expect(mockFetch).toHaveBeenCalledWith('https://api.todoist.com/rest/v2/tasks', { method: 'GET' });
	});

	it('maps response to CustomFetchResponse shape', async () => {
		const headers = new Headers({ 'content-type': 'application/json', 'x-request-id': 'abc' });
		mockFetch.mockResolvedValue({
			ok: true,
			status: 200,
			statusText: 'OK',
			headers,
			text: () => Promise.resolve('{"id":"1"}'),
			json: () => Promise.resolve({ id: '1' }),
		});

		const adapter = createTauriFetchAdapter();
		const result = await adapter('https://api.todoist.com/rest/v2/tasks');

		expect(result.ok).toBe(true);
		expect(result.status).toBe(200);
		expect(result.statusText).toBe('OK');
		expect(result.headers['content-type']).toBe('application/json');
		expect(result.headers['x-request-id']).toBe('abc');
		expect(await result.text()).toBe('{"id":"1"}');
		expect(await result.json()).toEqual({ id: '1' });
	});

	it('maps error responses correctly', async () => {
		const headers = new Headers();
		mockFetch.mockResolvedValue({
			ok: false,
			status: 401,
			statusText: 'Unauthorized',
			headers,
			text: () => Promise.resolve('Unauthorized'),
			json: () => Promise.reject(new Error('not json')),
		});

		const adapter = createTauriFetchAdapter();
		const result = await adapter('https://api.todoist.com/rest/v2/tasks');

		expect(result.ok).toBe(false);
		expect(result.status).toBe(401);
		expect(result.statusText).toBe('Unauthorized');
	});

	it('propagates network errors from tauri fetch', async () => {
		mockFetch.mockRejectedValue(new Error('Network error'));

		const adapter = createTauriFetchAdapter();

		await expect(adapter('https://api.todoist.com/rest/v2/tasks')).rejects.toThrow('Network error');
	});
});
