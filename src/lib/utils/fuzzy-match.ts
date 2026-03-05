/** Result of a fuzzy match operation — indicates whether the query matched and a quality score. */
export interface FuzzyMatchResult {
	match: boolean;
	score: number;
}

/** Performs a fuzzy match of query against target. Lower score = better match. */
export function fuzzyMatch(query: string, target: string): FuzzyMatchResult {
	if (query.length === 0) return { match: true, score: 0 };

	const queryLower = query.toLowerCase();
	const targetLower = target.toLowerCase();

	let queryIndex = 0;
	let score = 0;
	let lastMatchIndex = -1;

	for (let i = 0; i < targetLower.length && queryIndex < queryLower.length; i++) {
		if (targetLower[i] === queryLower[queryIndex]) {
			if (lastMatchIndex >= 0) {
				score += i - lastMatchIndex - 1;
			}
			lastMatchIndex = i;
			queryIndex++;
		}
	}

	if (queryIndex < queryLower.length) {
		return { match: false, score: Infinity };
	}

	// Bonus for exact prefix match
	if (targetLower.startsWith(queryLower)) {
		score -= query.length * 2;
	}

	// Penalty for longer targets (prefer shorter names)
	score += target.length - query.length;

	return { match: true, score };
}
