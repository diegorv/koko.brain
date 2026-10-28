// Shows the three outcomes of the period above the current note, so the
// day keeps the week in view, the week keeps the month, and so on.
//
//   kb.view('__system/queryjs/triada-parent-outcomes', {
//     unit: 'week',                      // period of the parent note
//     parentTag: 'type/journal/weekly',
//     parentLabel: 'Week',
//   })

await kb.view('__system/queryjs/_shared-triada');
const { outcomesOf, stripTag, periodOf, notesIn } = window.__triada;
const { unit, parentTag, parentLabel } = input;

const range = periodOf(kb.current(), unit);
if (!range) {
  kb.paragraph('*No `created` date on this note.*');
  return;
}

const parent = notesIn(parentTag, range[0], range[1]).first();
if (!parent) {
  kb.paragraph(`*No ${parentLabel.toLowerCase()} note yet. Create it and write its three outcomes.*`);
  return;
}

const outs = outcomesOf(parent);
kb.paragraph(`${parentLabel}: `);
kb.span(parent.file.link);
if (outs.length === 0) {
  kb.paragraph(`*The ${parentLabel.toLowerCase()} has no #outcome yet.*`);
} else {
  kb.taskList(outs.map(t => ({ text: stripTag(t.text), completed: t.completed })));
}
