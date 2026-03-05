/** E2E mock for @tauri-apps/api/window */

const windowMock = {
	async onCloseRequested(_handler: (event: unknown) => void): Promise<() => void> {
		// No-op in E2E tests — no native window close events
		return () => {};
	},
	async destroy(): Promise<void> {
		// No-op
	},
};

export function getCurrentWindow() {
	return windowMock;
}
