// Open Tasks — incomplete tasks from #to-list pages, grouped by file
const pages = kb.pages("#to-list")
	.where(p => p.file.tasks.some(t => !t.completed && t.text.trim() !== ""))
	.sort(p => p.file.ctime, "asc");

if (pages.length === 0) {
	kb.paragraph("No open tasks found.");
} else {
	for (const p of pages) {
		const cdate = kb.date(p.file.ctime).toFormat("dd/MM");
		const mdate = kb.date(p.file.mtime).toFormat("dd/MM/yyyy HH:mm");
		kb.header(4, p.file.link);
		kb.span(`(${cdate} → ${mdate})`, {
			cls: "cm-lp-dvjs-subtitle",
			attr: { style: "font-size: 11px; opacity: 0.6; margin-bottom: 6px; display: block;" }
		});
		kb.taskList(
			p.file.tasks.filter(t => !t.completed && t.text.trim() !== "")
		);
	}
}
