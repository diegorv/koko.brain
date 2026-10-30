// Curated link list demonstrating kb.list with KBLink items, plus
// kb.fileLink for hand-built links and kb.page for fetching a specific
// note by path. kb.list renders KBLink entries as clickable wikilinks
// while keeping plain strings as plain bullets.

const items = [];

// 1. Hand-built link to a known path (custom display text).
items.push(kb.fileLink("Inbox/README.md", false, "📥 Inbox README"));

// 2. Link to the current note.
const current = kb.current();
items.push(current.file.link);

// 3. Pages in this note's folder matching a tag, top 5 most recently edited.
const recentMeetings = kb.pages(`"${current.file.folder}"`)
	.whereTag('meeting')
	.sort(p => -kb.number(p.file.mtime))
	.slice(0, 5);
for (const p of recentMeetings) items.push(p.file.link);

// 4. Plain strings still work — they render as non-clickable bullets.
items.push("(end of shortlist)");

kb.list(items);

// 5. Demonstrate kb.page directly: pull a single page by path and render
//    a header that links back to it. kb.page returns undefined if the
//    note doesn't exist.
const readme = kb.page("README.md");
if (readme) {
	kb.header(3, readme.file.link);
	kb.paragraph(`Last touched: ${readme.file.mtime ?? "(unknown)"}`);
}
