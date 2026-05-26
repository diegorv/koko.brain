import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { emit } from '@tauri-apps/api/event';
import { error } from '$lib/utils/debug';
import type { SettingsSection } from './settings.types';

const SETTINGS_WINDOW_LABEL = 'settings';

/** Opens the settings window, or focuses it if already open */
export async function openSettingsWindow(vaultPath: string, section?: SettingsSection): Promise<void> {
	const existing = await WebviewWindow.getByLabel(SETTINGS_WINDOW_LABEL);
	if (existing) {
		await existing.setFocus();
		if (section) {
			await emit('settings-navigate', section);
		}
		return;
	}

	const sectionParam = section ? `&section=${section}` : '';
	const url = `/settings?vault=${encodeURIComponent(vaultPath)}${sectionParam}`;

	const webview = new WebviewWindow(SETTINGS_WINDOW_LABEL, {
		url,
		title: 'Settings',
		width: 820,
		height: 600,
		minWidth: 700,
		minHeight: 400,
		center: true,
	});

	webview.once('tauri://error', (e) => {
		error('SETTINGS', 'Failed to create settings window:', e.payload);
	});
}

/** Closes the settings window if it exists */
export async function closeSettingsWindow(): Promise<void> {
	const existing = await WebviewWindow.getByLabel(SETTINGS_WINDOW_LABEL);
	if (existing) {
		await existing.close();
	}
}

/** Emits a cross-window event notifying that settings changed on disk */
export async function emitSettingsChanged(): Promise<void> {
	await emit('settings-changed');
}
