import type dayjs from 'dayjs';

/**
 * The folder a quick note (Cmd+N) lands in:
 * vaultPath / baseFolder / folderFormat(date). Empty parts are left out.
 * Lives in `utils/` so the rail shell's "+ New here" (in `features/`, which
 * must not import `plugins/`) shares the rule with the quick-capture plugin.
 */
export function buildCaptureFolder(vaultPath: string, baseFolder: string, folderFormat: string, date: dayjs.Dayjs): string {
	const parts = [vaultPath];
	if (baseFolder) parts.push(baseFolder);
	if (folderFormat) parts.push(date.format(folderFormat));
	return parts.join('/');
}
