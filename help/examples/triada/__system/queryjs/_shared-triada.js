// Shared helpers for the TRIADA scripts. A view's return value is not
// passed back to the caller, so the helpers are exposed on `window.__triada`:
//   await kb.view('__system/queryjs/_shared-triada');
//   const { outcomesOf, periodOf } = window.__triada;
//
// Conventions:
//   - An outcome is a task tagged #outcome, written in the past tense
//     ("I have shipped X #outcome").
//   - Period notes are tagged type/journal/{daily,weekly,monthly,quarterly}
//     and carry a `created` date inside their period.

const outcomesOf = page =>
  (page?.file?.tasks ?? []).filter(t => /(^|\s)#outcome\b/i.test(t.text));

const stripTag = text => text.replace(/\s*#outcome\b/gi, '').trim();

// Returns [start, end] of the period that contains the current note.
const periodOf = (page, unit) => {
  const created = kb.tryDate(page?.created);
  if (!created) return null;
  return [created.startOf(unit), created.endOf(unit)];
};

// Notes of a given period type whose `created` falls inside [start, end].
// Not scoped to a folder: Periodic Notes files each period type under its
// own date subfolders (a week's days span months), and a script cannot read
// that setting. The tag and date keep it to one period; the cap bounds a
// vault whose other notes reuse the tags (a quarter holds at most 92 days).
const notesIn = (tag, start, end) =>
  kb.pages()
    .whereTag(tag)
    .whereDate('created', start, end)
    .sort(p => kb.tryDate(p.created)?.ts ?? 0)
    .limit(100);

window.__triada = { outcomesOf, stripTag, periodOf, notesIn };
