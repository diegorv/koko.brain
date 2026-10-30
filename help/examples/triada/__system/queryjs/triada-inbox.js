// TRIADA inbox: open tasks tagged #inbox across the vault, grouped by note.
// Pull ONE item into today; the three outcomes stay in view.
// Vault-wide on purpose: items are captured into any note. Capped at
// MAX_NOTES notes so a large vault stays readable.

const MAX_NOTES = 20;
const isInbox = t =>
  !t.completed && /(^|\s)#inbox\b/i.test(t.text) && t.text.replace(/#inbox\b/gi, '').trim() !== '';
// One extra note tells whether the cap was hit.
const found = kb.pages().where(p => p.file.tasks.some(isInbox)).limit(MAX_NOTES + 1);
const capped = found.length > MAX_NOTES;
const pages = found.limit(MAX_NOTES);

const total = pages.reduce((n, p) => n + p.file.tasks.filter(isInbox).length, 0);
kb.header(4, `Inbox (${total}${capped ? '+' : ''})`);

if (total === 0) {
  kb.paragraph('Inbox zero.');
  return;
}

if (capped) {
  kb.paragraph(`*Showing the first ${MAX_NOTES} notes with inbox items. Process these to see the rest.*`);
}

for (const p of pages) {
  kb.paragraph('');
  kb.span(p.file.link);
  kb.taskList(p.file.tasks.filter(isInbox).map(t => ({
    text: t.text.replace(/\s*#inbox\b/gi, '').trim(),
    completed: false,
  })));
}
