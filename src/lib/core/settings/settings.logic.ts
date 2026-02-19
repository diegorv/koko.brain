import type { SettingsSection } from './settings.types';

/** Clamps a font size to the valid range (8–32 px) */
export function clampFontSize(size: number): number {
	return Math.max(8, Math.min(32, size));
}

/** Clamps a line height to the valid range (1.0–3.0) */
export function clampLineHeight(height: number): number {
	return Math.max(1.0, Math.min(3.0, height));
}

/** Clamps a content width to the valid range (0 = no limit, or 400–2000 px) */
export function clampContentWidth(width: number): number {
	if (width <= 0) return 0;
	return Math.max(400, Math.min(2000, width));
}

/** Clamps a paragraph spacing to the valid range (0–2.0 em) */
export function clampParagraphSpacing(spacing: number): number {
	return Math.max(0, Math.min(2.0, spacing));
}

/** Clamps a heading font size to the valid range (0.5–5.0 em) */
export function clampHeadingFontSize(size: number): number {
	return Math.max(0.5, Math.min(5.0, size));
}

/** Clamps a heading line height to the valid range (1.0–3.0) */
export function clampHeadingLineHeight(height: number): number {
	return Math.max(1.0, Math.min(3.0, height));
}

/** Clamps a heading letter spacing to the valid range (-0.1 to 0.1 em) */
export function clampHeadingLetterSpacing(spacing: number): number {
	return Math.max(-0.1, Math.min(0.1, spacing));
}

/** Clamps a terminal font size to the valid range (8–24 px) */
export function clampTerminalFontSize(size: number): number {
	return Math.max(8, Math.min(24, size));
}

/** Clamps a terminal line height to the valid range (1.0–2.0) */
export function clampTerminalLineHeight(height: number): number {
	return Math.max(1.0, Math.min(2.0, height));
}

/** Validates that a folder name is a reasonable vault-relative path */
export function isValidFolderName(name: string): boolean {
	if (!name.trim()) return false;
	if (name.startsWith('/')) return false;
	// Block path traversal (../ or /.. or standalone ..) but allow names like "my..folder"
	if (/(?:^|\/)\.\.(?:\/|$)/.test(name)) return false;
	return true;
}

/** A single navigation item in the settings sidebar */
export interface SettingsSectionItem {
	id: SettingsSection;
	label: string;
}

/** A group of settings sections with an optional header */
export interface SettingsSectionGroup {
	group: string;
	sections: SettingsSectionItem[];
}

/** Navigation items for the settings sidebar, organized by group */
export const SETTINGS_SECTION_GROUPS: readonly SettingsSectionGroup[] = [
	{
		group: 'General',
		sections: [
			{ id: 'appearance', label: 'Appearance' },
			{ id: 'editor', label: 'Editor' },
			{ id: 'sidebar', label: 'Sidebar' },
		],
	},
	{
		group: 'Notes',
		sections: [
			{ id: 'periodic-notes', label: 'Periodic Notes' },
			{ id: 'quick-note', label: 'Quick Note' },
			{ id: 'one-on-one', label: '1:1 Notes' },
			{ id: 'templates', label: 'Templates' },
		],
	},
	{
		group: 'Tools',
		sections: [
			{ id: 'search', label: 'Search' },
			{ id: 'file-history', label: 'File History' },
			{ id: 'auto-move', label: 'Auto Move' },
			{ id: 'trash', label: 'Trash' },
			{ id: 'terminal', label: 'Terminal' },
		],
	},
	{
		group: 'Sync',
		sections: [
			{ id: 'sync', label: 'Sync' },
		],
	},
	{
		group: 'Integrations',
		sections: [
			{ id: 'todoist', label: 'Todoist' },
		],
	},
	{
		group: 'Advanced',
		sections: [
			{ id: 'security', label: 'Security' },
			{ id: 'troubleshooting', label: 'Troubleshooting' },
		],
	},
] as const;

/** Flat list of all settings sections (for lookups and iteration) */
export const SETTINGS_SECTIONS: readonly SettingsSectionItem[] =
	SETTINGS_SECTION_GROUPS.flatMap((g) => g.sections);
