/** Information about a ```mermaid fenced code block */
export interface MermaidBlockInfo {
	/** Start of the opening ```mermaid line */
	openFenceFrom: number;
	/** End of the opening ```mermaid line */
	openFenceTo: number;
	/** Start of the closing ``` line */
	closeFenceFrom: number;
	/** End of the closing ``` line */
	closeFenceTo: number;
	/** The Mermaid diagram definition between the fences */
	diagramSource: string;
}

/**
 * Finds a ```mermaid code block starting at the given index in the lines array.
 * Returns the block info and the index of the closing fence, or null if not found.
 */
export function findMermaidBlock(
	lines: { text: string; from: number; to: number }[],
	startIdx: number,
): { block: MermaidBlockInfo; endIdx: number } | null {
	const firstLine = lines[startIdx];
	const openMatch = firstLine.text.match(/^(`{3,}|~{3,})\s*mermaid\s*$/);
	if (!openMatch) return null;

	const fenceChar = openMatch[1][0];
	const fenceLen = openMatch[1].length;
	const contentLines: string[] = [];

	for (let i = startIdx + 1; i < lines.length; i++) {
		const line = lines[i];
		const closeRe = fenceChar === '`' ? /^(`{3,})\s*$/ : /^(~{3,})\s*$/;
		const closeMatch = line.text.match(closeRe);
		if (closeMatch && closeMatch[1].length >= fenceLen) {
			return {
				block: {
					openFenceFrom: firstLine.from,
					openFenceTo: firstLine.to,
					closeFenceFrom: line.from,
					closeFenceTo: line.to,
					diagramSource: contentLines.join('\n'),
				},
				endIdx: i,
			};
		}
		contentLines.push(line.text);
	}

	return null;
}
