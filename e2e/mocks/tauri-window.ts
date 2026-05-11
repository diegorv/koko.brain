/**
 * E2E mock for `@tauri-apps/api/window`. Covers the methods the frontend
 * calls on the current window during boot and during normal use. New
 * methods get added here as the app starts using them.
 */

const noopUnlisten = (): (() => void) => () => {};

const windowMock = {
	async onCloseRequested(_handler: (event: unknown) => void): Promise<() => void> {
		return noopUnlisten();
	},
	async onFocusChanged(_handler: (event: { payload: boolean }) => void): Promise<() => void> {
		return noopUnlisten();
	},
	async onResized(_handler: (event: unknown) => void): Promise<() => void> {
		return noopUnlisten();
	},
	async onMoved(_handler: (event: unknown) => void): Promise<() => void> {
		return noopUnlisten();
	},
	async onScaleChanged(_handler: (event: unknown) => void): Promise<() => void> {
		return noopUnlisten();
	},
	async setTitle(_title: string): Promise<void> {
		/* no-op */
	},
	async destroy(): Promise<void> {
		/* no-op */
	},
	async show(): Promise<void> {
		/* no-op */
	},
	async hide(): Promise<void> {
		/* no-op */
	},
	async setFocus(): Promise<void> {
		/* no-op */
	},
	async isFocused(): Promise<boolean> {
		return true;
	},
	async isVisible(): Promise<boolean> {
		return true;
	},
};

export function getCurrentWindow() {
	return windowMock;
}
