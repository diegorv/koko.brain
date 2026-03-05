interface E2eFS {
	populate(entries: Record<string, string>): void;
	reset(): void;
	readFile(path: string): string;
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

interface E2eEvents {
	emit(event: string, payload?: unknown): void;
}

interface E2eAPI {
	fs: E2eFS;
	dialog: E2eDialog;
	events: E2eEvents;
}

declare global {
	interface Window {
		__e2e: E2eAPI;
	}
}

export {};
