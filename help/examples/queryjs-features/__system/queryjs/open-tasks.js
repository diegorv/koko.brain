// Open Tasks — incomplete tasks from #to-list pages, grouped by file
const pages = dv.pages("#to-list")
	.where(p => p.file.tasks.some(t => !t.completed && t.text.trim() !== ""))
	.sort(p => p.file.ctime, "asc");

if (pages.length === 0) {
	dv.paragraph("No open tasks found.");
} else {
	for (const p of pages) {
		const cdate = dv.date(p.file.ctime).toFormat("dd/MM");
		const mdate = dv.date(p.file.mtime).toFormat("dd/MM/yyyy HH:mm");
		dv.header(4, p.file.link);
		dv.span(`(${cdate} → ${mdate})`, {
			cls: "cm-lp-dvjs-subtitle",
			attr: { style: "font-size: 11px; opacity: 0.6; margin-bottom: 6px; display: block;" }
		});
		dv.taskList(
			p.file.tasks.filter(t => !t.completed && t.text.trim() !== "")
		);
	}
}
