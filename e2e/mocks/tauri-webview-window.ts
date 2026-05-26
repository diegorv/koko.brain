/**
 * E2E mock for `@tauri-apps/api/webviewWindow`. Tracks window creation
 * so tests can assert that `openSettingsWindow()` was triggered without
 * needing a real Tauri runtime.
 */

interface WindowEntry {
	label: string;
	url: string;
}

const windows = new Map<string, WindowEntry>();

function syncToE2e(): void {
	if (typeof window !== 'undefined') {
		(window as any).__e2e = (window as any).__e2e || {};
		(window as any).__e2e.webviewWindows = windows;
	}
}

export class WebviewWindow {
	label: string;

	constructor(label: string, options?: Record<string, unknown>) {
		this.label = label;
		windows.set(label, { label, url: (options?.url as string) ?? '' });
		syncToE2e();
	}

	static async getByLabel(label: string): Promise<WebviewWindow | null> {
		if (!windows.has(label)) return null;
		const instance = Object.create(WebviewWindow.prototype) as WebviewWindow;
		instance.label = label;
		return instance;
	}

	async setFocus(): Promise<void> {}
	async setZoom(_factor: number): Promise<void> {}

	async close(): Promise<void> {
		windows.delete(this.label);
		syncToE2e();
	}

	once(_event: string, _handler: (e: { payload: unknown }) => void): void {}
}

export function getCurrentWebviewWindow(): WebviewWindow {
	const instance = Object.create(WebviewWindow.prototype) as WebviewWindow;
	instance.label = 'main';
	return instance;
}

syncToE2e();
