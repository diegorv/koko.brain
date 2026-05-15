import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const realTauriCore = {
	invoke: vi.fn(),
};
const realTauriEvent = {
	listen: vi.fn(),
};
const realPluginFs = {
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(),
	readFile: vi.fn(),
	exists: vi.fn(),
	mkdir: vi.fn(),
	remove: vi.fn(),
	rename: vi.fn(),
	copyFile: vi.fn(),
	readDir: vi.fn(),
};
const realPluginDialog = {
	open: vi.fn(),
	ask: vi.fn(),
};

vi.mock('@tauri-apps/api/core', () => realTauriCore);
vi.mock('@tauri-apps/api/event', () => realTauriEvent);
vi.mock('@tauri-apps/plugin-fs', () => realPluginFs);
vi.mock('@tauri-apps/plugin-dialog', () => realPluginDialog);

const ORIGINAL_FETCH = globalThis.fetch;
const ORIGINAL_TAURI = (globalThis as unknown as { window?: unknown }).window;

function setTauri(present: boolean) {
	if (present) {
		(globalThis as unknown as { window: object }).window = {
			__TAURI_INTERNALS__: {},
		};
	} else {
		(globalThis as unknown as { window: object }).window = {};
	}
}

function mockFetch(handler: (req: { cmd: string; args: unknown }) => unknown) {
	globalThis.fetch = vi.fn(async (_url, init) => {
		const body = JSON.parse(String(init?.body ?? '{}')) as { cmd: string; args: unknown };
		const result = handler(body);
		return new Response(JSON.stringify(result), { status: 200 });
	}) as unknown as typeof fetch;
}

beforeEach(() => {
	for (const fn of [
		...Object.values(realTauriCore),
		...Object.values(realTauriEvent),
		...Object.values(realPluginFs),
		...Object.values(realPluginDialog),
	]) {
		(fn as ReturnType<typeof vi.fn>).mockReset();
	}
	globalThis.fetch = ORIGINAL_FETCH;
});

afterEach(() => {
	globalThis.fetch = ORIGINAL_FETCH;
	(globalThis as unknown as { window: unknown }).window = ORIGINAL_TAURI;
});

describe('$lib/api — invoke', () => {
	it('routes to native plugin when __TAURI_INTERNALS__ is present', async () => {
		setTauri(true);
		realTauriCore.invoke.mockResolvedValue('ok');
		const api = await import('$lib/api');
		const out = await api.invoke('any_cmd', { x: 1 });
		expect(out).toBe('ok');
		expect(realTauriCore.invoke).toHaveBeenCalledWith('any_cmd', { x: 1 });
	});

	it('POSTs to /api/invoke when running in plain browser', async () => {
		setTauri(false);
		mockFetch(() => ({ ok: true }));
		const api = await import('$lib/api');
		const out = await api.invoke<{ ok: boolean }>('any_cmd', { y: 2 });
		expect(out).toEqual({ ok: true });
		expect(globalThis.fetch).toHaveBeenCalledTimes(1);
		const init = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1];
		expect(JSON.parse(init.body)).toEqual({ cmd: 'any_cmd', args: { y: 2 } });
	});
});

describe('$lib/api — fs', () => {
	it('readTextFile (native) delegates to plugin-fs', async () => {
		setTauri(true);
		realPluginFs.readTextFile.mockResolvedValue('native');
		const api = await import('$lib/api');
		const out = await api.readTextFile('/abs/path.md');
		expect(out).toBe('native');
		expect(realPluginFs.readTextFile).toHaveBeenCalledWith('/abs/path.md');
	});

	it('readTextFile (browser) hits fs_read_text_file over HTTP', async () => {
		setTauri(false);
		mockFetch((b) => {
			expect(b.cmd).toBe('fs_read_text_file');
			expect(b.args).toEqual({ path: '/abs/path.md' });
			return 'http';
		});
		const api = await import('$lib/api');
		expect(await api.readTextFile('/abs/path.md')).toBe('http');
	});

	it('writeTextFile (browser) forwards path + contents', async () => {
		setTauri(false);
		const seen: { cmd: string; args: unknown }[] = [];
		mockFetch((b) => {
			seen.push(b);
			return null;
		});
		const api = await import('$lib/api');
		await api.writeTextFile('/abs/x.md', 'body');
		expect(seen[0]).toEqual({
			cmd: 'fs_write_text_file',
			args: { path: '/abs/x.md', contents: 'body', options: { append: false } },
		});
	});

	it('writeTextFile (browser) forwards append option', async () => {
		setTauri(false);
		const seen: { cmd: string; args: unknown }[] = [];
		mockFetch((b) => {
			seen.push(b);
			return null;
		});
		const api = await import('$lib/api');
		await api.writeTextFile('/abs/x.md', 'body', { append: true });
		expect(seen[0]).toEqual({
			cmd: 'fs_write_text_file',
			args: { path: '/abs/x.md', contents: 'body', options: { append: true } },
		});
	});

	it('readFile (browser) base64-decodes the wire payload', async () => {
		setTauri(false);
		const bytes = new Uint8Array([0, 1, 2, 254, 255]);
		const b64 = btoa(String.fromCharCode(...bytes));
		mockFetch(() => b64);
		const api = await import('$lib/api');
		const out = await api.readFile('/abs/bin');
		expect(Array.from(out)).toEqual(Array.from(bytes));
	});

	it('exists (browser) returns the boolean as-is', async () => {
		setTauri(false);
		mockFetch(() => true);
		const api = await import('$lib/api');
		expect(await api.exists('/abs/maybe')).toBe(true);
	});

	it('mkdir (browser) forwards recursive option', async () => {
		setTauri(false);
		const seen: { cmd: string; args: unknown }[] = [];
		mockFetch((b) => {
			seen.push(b);
			return null;
		});
		const api = await import('$lib/api');
		await api.mkdir('/abs/d', { recursive: true });
		expect(seen[0]).toEqual({ cmd: 'fs_mkdir', args: { path: '/abs/d', options: { recursive: true } } });
	});

	it('mkdir (browser, no options) defaults recursive to false', async () => {
		setTauri(false);
		const seen: { cmd: string; args: unknown }[] = [];
		mockFetch((b) => {
			seen.push(b);
			return null;
		});
		const api = await import('$lib/api');
		await api.mkdir('/abs/d');
		expect(seen[0]).toEqual({ cmd: 'fs_mkdir', args: { path: '/abs/d', options: { recursive: false } } });
	});

	it('remove (browser) forwards recursive option', async () => {
		setTauri(false);
		const seen: { cmd: string; args: unknown }[] = [];
		mockFetch((b) => {
			seen.push(b);
			return null;
		});
		const api = await import('$lib/api');
		await api.remove('/abs/d', { recursive: true });
		expect(seen[0]).toEqual({ cmd: 'fs_remove', args: { path: '/abs/d', options: { recursive: true } } });
	});

	it('rename (browser) uses camelCase oldPath/newPath', async () => {
		setTauri(false);
		const seen: { cmd: string; args: unknown }[] = [];
		mockFetch((b) => {
			seen.push(b);
			return null;
		});
		const api = await import('$lib/api');
		await api.rename('/abs/a', '/abs/b');
		expect(seen[0]).toEqual({ cmd: 'fs_rename', args: { oldPath: '/abs/a', newPath: '/abs/b' } });
	});

	it('copyFile (browser) uses fromPath/toPath', async () => {
		setTauri(false);
		const seen: { cmd: string; args: unknown }[] = [];
		mockFetch((b) => {
			seen.push(b);
			return null;
		});
		const api = await import('$lib/api');
		await api.copyFile('/abs/a', '/abs/b');
		expect(seen[0]).toEqual({ cmd: 'fs_copy_file', args: { fromPath: '/abs/a', toPath: '/abs/b' } });
	});

	it('readDir (browser) returns DirEntry[] passthrough', async () => {
		setTauri(false);
		const entries = [
			{ name: 'a.md', isDirectory: false, isFile: true, isSymlink: false },
			{ name: 'sub', isDirectory: true, isFile: false, isSymlink: false },
		];
		mockFetch(() => entries);
		const api = await import('$lib/api');
		expect(await api.readDir('/abs/dir')).toEqual(entries);
	});
});

describe('$lib/api — dialog', () => {
	it('open (native) delegates to plugin-dialog', async () => {
		setTauri(true);
		realPluginDialog.open.mockResolvedValue('/picked');
		const api = await import('$lib/api');
		expect(await api.open({ directory: true })).toBe('/picked');
		expect(realPluginDialog.open).toHaveBeenCalledWith({ directory: true });
	});

	it('open (browser) routes through dialog_open with options', async () => {
		setTauri(false);
		const seen: { cmd: string; args: unknown }[] = [];
		mockFetch((b) => {
			seen.push(b);
			return '/picked';
		});
		const api = await import('$lib/api');
		const out = await api.open({ directory: true, multiple: false });
		expect(out).toBe('/picked');
		expect(seen[0]).toEqual({
			cmd: 'dialog_open',
			args: { options: { directory: true, multiple: false } },
		});
	});

	it('open (browser, cancelled) propagates null', async () => {
		setTauri(false);
		mockFetch(() => null);
		const api = await import('$lib/api');
		expect(await api.open({ directory: true })).toBeNull();
	});

	it('ask (native) delegates to plugin-dialog with options', async () => {
		setTauri(true);
		realPluginDialog.ask.mockResolvedValue(true);
		const api = await import('$lib/api');
		expect(await api.ask('Sure?', { title: 't', kind: 'warning' })).toBe(true);
		expect(realPluginDialog.ask).toHaveBeenCalledWith('Sure?', { title: 't', kind: 'warning' });
	});

	it('ask (browser) routes through dialog_ask', async () => {
		setTauri(false);
		const seen: { cmd: string; args: unknown }[] = [];
		mockFetch((b) => {
			seen.push(b);
			return true;
		});
		const api = await import('$lib/api');
		expect(await api.ask('Sure?', { kind: 'warning' })).toBe(true);
		expect(seen[0]).toEqual({
			cmd: 'dialog_ask',
			args: { message: 'Sure?', options: { kind: 'warning' } },
		});
	});
});
