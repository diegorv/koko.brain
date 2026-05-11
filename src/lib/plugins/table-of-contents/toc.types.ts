/** One heading entry in the document outline */
export interface TocHeading {
	/** Heading level 1-6 */
	level: number;
	/** Heading text, trimmed (no leading hashes) */
	text: string;
	/** Zero-based line number in the document */
	line: number;
	/** Character offset of the start of the heading line in the document */
	pos: number;
}
