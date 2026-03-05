/** Information about a `<video>` HTML block */
export interface VideoBlockInfo {
	/** Start of the opening `<video` line */
	openFrom: number;
	/** End of the opening `<video` line */
	openTo: number;
	/** Start of the closing `</video>` line (same as openFrom for single-line) */
	closeFrom: number;
	/** End of the closing `</video>` line (same as openTo for single-line) */
	closeTo: number;
	/** The video source URL */
	src: string;
}

/** Extracts the value of a `src="..."` or `src='...'` attribute from an HTML tag string */
function extractSrcAttr(text: string): string | null {
	const match = text.match(/\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)')/);
	return match ? (match[1] ?? match[2] ?? null) : null;
}

/**
 * Finds a `<video>` HTML block starting at the given index in the lines array.
 * Supports single-line (`<video src="..."></video>`) and multi-line blocks
 * (with `<source>` children). Returns the block info and the index of the
 * closing line, or null if not found.
 */
export function findVideoBlock(
	lines: { text: string; from: number; to: number }[],
	startIdx: number,
): { block: VideoBlockInfo; endIdx: number } | null {
	const firstLine = lines[startIdx];
	const trimmed = firstLine.text.trimStart();

	// Must start with <video (case-insensitive)
	if (!/^<video[\s>\/]/i.test(trimmed)) return null;

	// Try to extract src from the opening tag
	let src = extractSrcAttr(firstLine.text);

	// Single-line: self-closing or contains </video>
	if (/\/>\s*$/.test(trimmed) || /<\/video>/i.test(firstLine.text)) {
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

	// Multi-line: scan forward for </video>
	for (let i = startIdx + 1; i < lines.length; i++) {
		const line = lines[i];

		// Extract src from <source> if we don't have one yet
		if (!src && /^\s*<source[\s>]/i.test(line.text)) {
			src = extractSrcAttr(line.text);
		}

		if (/<\/video>/i.test(line.text)) {
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
