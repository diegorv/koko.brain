import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';

const ZOOM_LEVELS = [0.5, 0.67, 0.75, 0.8, 0.9, 1.0, 1.1, 1.25, 1.5, 1.75, 2.0];
const DEFAULT_ZOOM = 1.0;

let currentZoom = DEFAULT_ZOOM;

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

async function applyZoom(factor: number): Promise<void> {
	currentZoom = factor;
	await getCurrentWebviewWindow().setZoom(factor);
}