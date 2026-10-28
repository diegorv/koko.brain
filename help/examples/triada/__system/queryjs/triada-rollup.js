// TRIADA reflection rollup: lists the child period notes inside the current
// note's period and how many of their three outcomes were shipped.
//
// Used by the weekly (FR), monthly (MR) and quarterly (YR) templates:
//   kb.view('__system/queryjs/triada-rollup', {
//     unit: 'week',                     // period of the current note
//     childTag: 'type/journal/daily',   // child notes to roll up
//     childLabel: 'Day',
//   })

await kb.view('__system/queryjs/_shared-triada');
const { outcomesOf, stripTag, periodOf, notesIn } = window.__triada;
const { unit, childTag, childLabel } = input;

const me = kb.current();
const range = periodOf(me, unit);
if (!range) {
  kb.paragraph('*No `created` date on this note.*');
  return;
}

const children = notesIn(childTag, range[0], range[1]);
if (children.length === 0) {
  kb.paragraph(`No ${childLabel.toLowerCase()} notes in this period yet.`);
} else {
  let shipped = 0;
  let planned = 0;
  let fullHits = 0;
  const rows = children.map(p => {
    const outs = outcomesOf(p);
    const done = outs.filter(t => t.completed).length;
    shipped += done;
    planned += outs.length;
    if (outs.length > 0 && done === outs.length) fullHits++;
    return [p.file.link, `${done}/${outs.length}`, kb.ui.progressBar(done, Math.max(outs.length, 3))];
  });

  kb.ui.cards([
    { label: `${childLabel}s with notes`, value: children.length, color: 'blue', icon: '🗓️' },
    { label: 'Outcomes shipped', value: `${shipped}/${planned}`, color: 'green', icon: '✅' },
    { label: `${childLabel}s with all three`, value: fullHits, color: 'purple', icon: '🎯' },
  ], { columns: 3 });

  kb.ui.table([childLabel, 'Shipped', 'Progress'], rows, {
    align: ['left', 'center', 'left'],
    striped: true,
  });

  const open = children.flatMap(p => outcomesOf(p).filter(t => !t.completed));
  if (open.length > 0) {
    kb.header(4, `Not shipped (${open.length}) — carry, rewrite or drop`);
    kb.list(open.map(t => stripTag(t.text)));
  }
}

// The current note's own three outcomes.
const mine = outcomesOf(me);
kb.header(4, `This ${unit}'s outcomes: ${mine.filter(t => t.completed).length}/${mine.length}`);
if (mine.length > 0) kb.taskList(mine.map(t => ({ text: stripTag(t.text), completed: t.completed })));
