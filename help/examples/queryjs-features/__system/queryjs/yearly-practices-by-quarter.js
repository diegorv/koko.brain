// Yearly Practices by Quarter — quarterly practices for the year
const quarterNames = ['Q1', 'Q2', 'Q3', 'Q4'];

await kb.view('_system/queryjs/_shared-period-radar', {
  fields: [
    { key: 'practice_exercise', label: 'Exercise' },
    { key: 'practice_eating', label: 'Eating' },
    { key: 'practice_sleep', label: 'Sleep' },
    { key: 'practice_journaling', label: 'Journaling' },
    { key: 'practice_inputs', label: 'Inputs' },
    { key: 'practice_focus', label: 'Focus' },
    { key: 'practice_presence', label: 'Presence' },
    { key: 'practice_relationships', label: 'Relationships' },
    { key: 'practice_projects', label: 'Projects' },
    { key: 'practice_outdoors', label: 'Outdoors' },
  ],
  tag: 'type/journal/quarterly',
  periodType: 'year',
  colors: [
    'rgba(66,153,225,1)',   // Q1
    'rgba(72,187,120,1)',   // Q2
    'rgba(237,137,54,1)',   // Q3
    'rgba(139,108,239,1)',  // Q4
  ],
  header: 'Yearly Averages',
  headerRow: 'Practice',
  emptyMessage: "*No practices data found for this year.*",
  labelFn: (note, i) => {
    const d = kb.tryDate(note.created);
    return d ? `${quarterNames[d.quarter - 1]} ${d.year}` : `Q${i + 1}`;
  },
});
