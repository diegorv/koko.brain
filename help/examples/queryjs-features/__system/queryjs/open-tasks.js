// Open Tasks — incomplete tasks from #to-list pages, grouped by file
await kb.view('_system/queryjs/_shared-open-tasks', {
  emptyMessage: "No open tasks found.",
});
