import type { AppCommand } from './command-palette.types';
import { fuzzyMatch } from '#lib/utils/fuzzy-match.js';

export function filterAndRankCommands(
	query: string,
	commands: AppCommand[],
	recentIds: string[],
): AppCommand[] {
	if (query.length === 0) {
		const recentSet = new Set(recentIds);
		const recent = recentIds
			.map((id) => commands.find((c) => c.id === id))
			.filter((c): c is AppCommand => c !== undefined);
		const rest = commands
			.filter((c) => !recentSet.has(c.id))
			.sort((a, b) => a.label.localeCompare(b.label));
		return [...recent, ...rest];
	}

	const recentIndexMap = new Map(recentIds.map((id, i) => [id, i]));

	const scored = commands
		.map((cmd) => {
			const result = fuzzyMatch(query, cmd.label);
			return { cmd, ...result };
		})
		.filter((entry) => entry.match);

	scored.sort((a, b) => {
		const aRecent = recentIndexMap.get(a.cmd.id);
		const bRecent = recentIndexMap.get(b.cmd.id);
		const aIsRecent = aRecent !== undefined;
		const bIsRecent = bRecent !== undefined;

		if (aIsRecent && bIsRecent) return aRecent - bRecent;
		if (aIsRecent && !bIsRecent && a.score <= b.score + 5) return -1;
		if (!aIsRecent && bIsRecent && b.score <= a.score + 5) return 1;

		if (a.score !== b.score) return a.score - b.score;
		return a.cmd.label.localeCompare(b.cmd.label);
	});

	return scored.map((entry) => entry.cmd);
}
