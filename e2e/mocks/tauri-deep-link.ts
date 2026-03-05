/** E2E mock for @tauri-apps/plugin-deep-link */

export async function onOpenUrl(_handler: (urls: string[]) => void): Promise<() => void> {
	return () => {};
}

export async function getCurrent(): Promise<string[] | null> {
	return null;
}
