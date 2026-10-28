// "Why not" row rollup: how many days in the current week had movement,
// compared with the previous week. Reads the `moved` property written by
// the daily template's meta-bind select ("none" or empty = no movement).

await kb.view('__system/queryjs/_shared-triada');
const { periodOf, notesIn } = window.__triada;

const range = periodOf(kb.current(), 'week');
if (!range) {
  kb.paragraph('*No `created` date on this note.*');
  return;
}

const movedDays = (start, end) =>
  notesIn('type/journal/daily', start, end)
    .where(p => p.moved && p.moved !== 'none').length;

const thisWeek = movedDays(range[0], range[1]);
const lastWeek = movedDays(range[0].minus({ days: 7 }), range[1].minus({ days: 7 }));
const delta = thisWeek - lastWeek;

kb.ui.cards([
  { label: 'Days moved', value: `${thisWeek}/7`, color: 'green', icon: '🏃' },
  { label: 'Last week', value: `${lastWeek}/7`, color: 'gray', icon: '↩️' },
  { label: 'Change', value: delta > 0 ? `+${delta}` : `${delta}`, color: delta >= 0 ? 'green' : 'orange', icon: '📈' },
], { columns: 3 });
