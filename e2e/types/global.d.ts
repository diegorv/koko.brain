import type { vaultIndex } from '../mocks/vault-index';
import type { E2eDeepLink } from '../mocks/tauri-deep-link';
import type { E2eEventBus } from '../mocks/tauri-event';

interface E2eFS {
	populate(entries: Record<string, string>): void;
	reset(): void;
	readFile(path: string): string;
	readFileSafe(path: string): string | null;
	writeFile(path: string, content: string): void;
	mkdir(path: string): void;
	remove(path: string): void;
	rename(oldPath: string, newPath: string): void;
	exists(path: string): boolean;
	readDir(path: string): Array<{ name: string; isDirectory: boolean; isFile: boolean; isSymlink: boolean }>;
	copyFile(src: string, dest: string): void;
	dump(): Record<string, string>;
}

interface E2eDialog {
	setOpenResponse(value: string | null): void;
	setAskResponse(value: boolean): void;
}

interface E2eOpener {
	/** URLs passed to `openUrl`, in call order */
	urls: string[];
}

interface E2eAPI {
	fs: E2eFS;
	dialog: E2eDialog;
	events: E2eEventBus;
	deepLink: E2eDeepLink;
	vaultIndex: typeof vaultIndex;
	webviewWindows: Map<string, { label: string; url: string }>;
	opener: E2eOpener;
}

declare global {
	interface Window {
		__e2e: E2eAPI;
	}
}

export {};
