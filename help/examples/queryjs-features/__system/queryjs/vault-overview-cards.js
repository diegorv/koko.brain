// Overview dashboard for the notes in this note's folder.
// Demonstrates kb.ui.cards for at-a-glance metrics with mixed icons and
// preset color names.

const allPages = kb.pages(`"${kb.current().file.folder}"`);
const totalNotes = allPages.length;
const projects = allPages.whereTag('project').length;
const meetings = allPages.whereTag('meeting').length;
const openTasks = allPages.flatMap(p => p.file.tasks.filter(t => !t.completed)).length;
const distinctTags = allPages.flatMap(p => p.file.tags).distinct().length;

kb.ui.cards([
	{ label: "Notes", value: totalNotes, icon: "📒", color: "blue" },
	{ label: "Projects", value: projects, icon: "🚀", color: "purple" },
	{ label: "Meetings", value: meetings, icon: "🤝", color: "orange" },
	{ label: "Open tasks", value: openTasks, icon: "🛠️", color: openTasks > 20 ? "red" : "green" },
	{ label: "Tags", value: distinctTags, icon: "🏷️", color: "gray" },
], { columns: 5 });
