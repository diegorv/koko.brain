import { virtualFS } from './virtual-fs';

export async function invoke(cmd: string, args?: Record<string, unknown>): Promise<unknown> {
	switch (cmd) {
		case 'scan_vault':
			return virtualFS.scanVault(args!.path as string, args!.sortBy as string);
		case 'read_files_batch':
			return virtualFS.readFilesBatch(args!.paths as string[]);
		case 'search_vault':
			return virtualFS.searchVault(
				args!.path as string,
				args!.query as string,
				args!.caseSensitive as boolean,
				args!.wholeWord as boolean,
				args!.useRegex as boolean,
			);
		default:
			console.warn(`[e2e mock] Unknown invoke command: ${cmd}`, args);
			return null;
	}
}
