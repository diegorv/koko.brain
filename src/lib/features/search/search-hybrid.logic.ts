import type { FtsSearchResult, SemanticSearchResult, HybridSearchResult } from './search.types';

/**
 * RRF constant (k=60 is the standard from the original paper).
 * Higher k dampens rank differences; 60 is widely used in practice.
 */
const RRF_K = 60;

/**
 * Merges FTS5 text results and semantic results using Reciprocal Rank Fusion (RRF).
 *
 * RRF is rank-based (not score-based), making it robust to different score distributions
 * between BM25 and cosine similarity. Each document's score is:
 *   RRF(d) = Σ 1/(k + rank_i(d))
 * where rank_i is the 0-indexed position in each result list.
 */
export function mergeResults(
	textResults: FtsSearchResult[],
	semanticResults: SemanticSearchResult[],
): HybridSearchResult[] {
	const resultMap = new Map<string, HybridSearchResult>();

	// Build RRF scores from text results (ranked by BM25)
	for (let rank = 0; rank < textResults.length; rank++) {
		const r = textResults[rank];
		const rrfScore = 1 / (RRF_K + rank);

		resultMap.set(r.path, {
			path: r.path,
			title: r.title,
			combinedScore: rrfScore,
			textScore: r.score,
			snippet: r.snippet,
			source: 'text',
		});
	}

	// Add RRF scores from semantic results (ranked by cosine similarity)
	for (let rank = 0; rank < semanticResults.length; rank++) {
		const r = semanticResults[rank];
		const rrfScore = 1 / (RRF_K + rank);
		const existing = resultMap.get(r.sourcePath);

		if (existing) {
			// Document appears in both — sum RRF scores
			existing.combinedScore += rrfScore;
			existing.source = 'both';
			// Only apply metadata from the first (best-scoring) semantic match
			if (existing.semanticScore === undefined) {
				existing.semanticScore = r.score;
				existing.heading = r.heading ?? undefined;
				existing.lineStart = r.lineStart;
			}
		} else {
			resultMap.set(r.sourcePath, {
				path: r.sourcePath,
				title: r.sourcePath.split('/').pop()?.replace(/\.md$/, '') ?? r.sourcePath,
				combinedScore: rrfScore,
				semanticScore: r.score,
				snippet: r.content.substring(0, 200),
				heading: r.heading ?? undefined,
				lineStart: r.lineStart,
				source: 'semantic',
			});
		}
	}

	// Sort by combined RRF score descending
	const merged = Array.from(resultMap.values());
	merged.sort((a, b) => b.combinedScore - a.combinedScore);

	return merged;
}
