/** Information about an `<audio>` HTML block */
export interface AudioBlockInfo {
	/** Start of the opening `<audio` line */
	openFrom: number;
	/** End of the opening `<audio` line */
	openTo: number;
	/** Start of the closing `</audio>` line (same as openFrom for single-line) */
	closeFrom: number;
	/** End of the closing `</audio>` line (same as openTo for single-line) */
	closeTo: number;
	/** The audio source URL */
	src: string;
}

/** Extracts the value of a `src="..."` or `src='...'` attribute from an HTML tag string */
function extractSrcAttr(text: string): string | null {
	const match = text.match(/\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)')/);
	return match ? (match[1] ?? match[2] ?? null) : null;
}

/**
 * Finds an `<audio>` HTML block starting at the given index in the lines array.
 * Supports single-line (`<audio src="..."></audio>`) and multi-line blocks
 * (with `<source>` children). Returns the block info and the index of the
 * closing line, or null if not found.
 */
export function findAudioBlock(
	lines: { text: string; from: number; to: number }[],
	startIdx: number,
): { block: AudioBlockInfo; endIdx: number } | null {
	const firstLine = lines[startIdx];
	const trimmed = firstLine.text.trimStart();

	// Must start with <audio (case-insensitive)
	if (!/^<audio[\s>\/]/i.test(trimmed)) return null;

	// Try to extract src from the opening tag
	let src = extractSrcAttr(firstLine.text);

	// Single-line: self-closing or contains </audio>
	if (/\/>\s*$/.test(trimmed) || /<\/audio>/i.test(firstLine.text)) {
		if (!src) return null;
		return {
			block: {
				openFrom: firstLine.from,
				openTo: firstLine.to,
				closeFrom: firstLine.from,
				closeTo: firstLine.to,
				src,
			},
			endIdx: startIdx,
		};
	}

	// Multi-line: scan forward for </audio>
	for (let i = startIdx + 1; i < lines.length; i++) {
		const line = lines[i];

		// Extract src from <source> if we don't have one yet
		if (!src && /^\s*<source[\s>]/i.test(line.text)) {
			src = extractSrcAttr(line.text);
		}

		if (/<\/audio>/i.test(line.text)) {
			if (!src) return null;
			return {
				block: {
					openFrom: firstLine.from,
					openTo: firstLine.to,
					closeFrom: line.from,
					closeTo: line.to,
					src,
				},
				endIdx: i,
			};
		}
	}

	// No closing tag found
	return null;
}
