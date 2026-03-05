/**
 * Shared helpers for mocking @tauri-apps/plugin-fs in service tests.
 * These configure the vi.mocked() responses for common file operations.
 *
 * Prerequisite: the test file must have:
 *   vi.mock('@tauri-apps/plugin-fs');
 * before importing this fixture.
 */
import { vi } from 'vitest';
import { exists, readTextFile } from '@tauri-apps/plugin-fs';

/**
 * Mocks a JSON file at the given path.
 * - exists(path) → true
 * - readTextFile(path) → JSON.stringify(data)
 */
export function mockJsonFile(path: string, data: unknown): void {
	vi.mocked(exists).mockImplementation(async (p) => (p === path ? true : false));
	vi.mocked(readTextFile).mockImplementation(async (p) => {
		if (p === path) return JSON.stringify(data);
		throw new Error(`File not found: ${p}`);
	});
}

/**
 * Mocks a text file at the given path.
 * - exists(path) → true
 * - readTextFile(path) → content
 */
export function mockTextFile(path: string, content: string): void {
	vi.mocked(exists).mockImplementation(async (p) => (p === path ? true : false));
	vi.mocked(readTextFile).mockImplementation(async (p) => {
		if (p === path) return content;
		throw new Error(`File not found: ${p}`);
	});
}

/**
 * Mocks multiple files at once.
 * - exists(path) → true for any path in the record
 * - readTextFile(path) → corresponding content
 */
export function mockMultipleFiles(files: Record<string, string>): void {
	vi.mocked(exists).mockImplementation(async (p) => String(p) in files);
	vi.mocked(readTextFile).mockImplementation(async (p) => {
		const key = String(p);
		if (key in files) return files[key];
		throw new Error(`File not found: ${key}`);
	});
}

/**
 * Mocks a file that does not exist.
 * - exists() → false
 */
export function mockMissingFile(): void {
	vi.mocked(exists).mockResolvedValue(false);
}

/**
 * Mocks a file that exists but contains invalid JSON.
 * Useful for testing parse error handling.
 */
export function mockParseError(path: string): void {
	vi.mocked(exists).mockResolvedValue(true);
	vi.mocked(readTextFile).mockResolvedValue('{{invalid json not parseable}}');
}
