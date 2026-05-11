// Recent Open Tasks — incomplete tasks from #to-list pages created in the last 7 days
const sevenDaysAgo = kb.date().minus({ days: 7 }).ts;

await kb.view('_system/queryjs/_shared-open-tasks', {
  extraFilter: p => p.file.ctime >= sevenDaysAgo,
  emptyMessage: "No open tasks from the last 7 days.",
});
