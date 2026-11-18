import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { zoomStore } from '#lib/core/zoom/zoom.store.svelte.js';

const ZOOM_LEVELS = [0.5, 0.67, 0.75, 0.8, 0.9, 1.0, 1.1, 1.25, 1.5, 1.75, 2.0];
const DEFAULT_ZOOM = 1.0;

/**
 * Per-machine zoom factor. Kept in localStorage, not the vault's settings.json,
 * so it applies on the vault picker before any vault opens and never syncs.
 */
export const ZOOM_STORAGE_KEY = 'kokobrain:zoom';

/** How long the zoom chip stays after the last change. */
const CHIP_HIDE_MS = 1500;

let currentZoom = DEFAULT_ZOOM;
let chipTimer: ReturnType<typeof setTimeout> | undefined;

/** Increases zoom to the next predefined level. */
export async function zoomIn(): Promise<void> {
	const idx = ZOOM_LEVELS.findLastIndex((l) => l <= currentZoom);
	const next = Math.min(idx + 1, ZOOM_LEVELS.length - 1);
	await applyZoom(ZOOM_LEVELS[next]);
}

/** Decreases zoom to the previous predefined level. */
export async function zoomOut(): Promise<void> {
	const idx = ZOOM_LEVELS.findIndex((l) => l >= currentZoom);
	const prev = Math.max(idx - 1, 0);
	await applyZoom(ZOOM_LEVELS[prev]);
}

/** Resets zoom to 100%. */
export async function resetZoom(): Promise<void> {
	await applyZoom(DEFAULT_ZOOM);
}

/**
 * Applies the zoom level remembered on this machine, without showing the chip.
 * Does nothing when the stored value is missing, unreadable, 1.0 or not one of
 * the predefined levels. A rejected `setZoom` propagates.
 */
export async function restoreZoom(): Promise<void> {
	let stored: number;
	try {
		stored = Number(localStorage.getItem(ZOOM_STORAGE_KEY));
	} catch {
		return;
	}
	if (stored === DEFAULT_ZOOM || !ZOOM_LEVELS.includes(stored)) return;
	currentZoom = stored;
	await getCurrentWebviewWindow().setZoom(stored);
	zoomStore.setLevel(stored);
}

async function applyZoom(factor: number): Promise<void> {
	// Assigned before the await: held Cmd+= fires keydowns faster than setZoom
	// resolves, and each press must step from the previous press's level.
	currentZoom = factor;
	await getCurrentWebviewWindow().setZoom(factor);
	if (factor === DEFAULT_ZOOM) localStorage.removeItem(ZOOM_STORAGE_KEY);
	else localStorage.setItem(ZOOM_STORAGE_KEY, String(factor));
	zoomStore.setLevel(factor);
	zoomStore.showChip();
	clearTimeout(chipTimer);
	chipTimer = setTimeout(() => zoomStore.hideChip(), CHIP_HIDE_MS);
}
