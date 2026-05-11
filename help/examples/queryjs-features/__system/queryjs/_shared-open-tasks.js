// Shared renderer for "open tasks from #to-list pages" queries.
// Applies the common task filter + groups-by-file rendering; the caller
// decides which additional predicate (e.g. recency) to combine.
//
// Called via: kb.view('_system/queryjs/_shared-open-tasks', { ... })
//
// Expected `input`:
//   extraFilter:  (page) => boolean — optional, applied in addition to
//                 "has at least one open, non-empty task". Use it for
//                 recency or folder/tag narrowing.
//   emptyMessage: Shown when no page survives the filters.

const { extraFilter, emptyMessage } = input;

const hasOpenTasks = p =>
  p.file.tasks.some(t => !t.completed && t.text.trim() !== "");

let query = kb.pages("#to-list").where(hasOpenTasks);
if (typeof extraFilter === 'function') {
  query = query.where(extraFilter);
}
const pages = query.sort(p => p.file.ctime, "asc");

if (pages.length === 0) {
  kb.paragraph(emptyMessage);
  return;
}

const subtitleStyle = "font-size: 11px; opacity: 0.6; margin-bottom: 6px; display: block;";

for (const p of pages) {
  const cdate = kb.date(p.file.ctime).toFormat("dd/MM");
  const mdate = kb.date(p.file.mtime).toFormat("dd/MM/yyyy HH:mm");
  kb.header(4, p.file.link);
  kb.span(`(${cdate} → ${mdate})`, {
    cls: "cm-lp-dvjs-subtitle",
    attr: { style: subtitleStyle },
  });
  kb.taskList(
    p.file.tasks.filter(t => !t.completed && t.text.trim() !== "")
  );
}
