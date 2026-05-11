// Monthly Practices Chart — weekly practices for the month
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
  tag: 'type/journal/weekly',
  periodType: 'month',
  colors: [
    'rgba(66,153,225,1)',   // W1
    'rgba(72,187,120,1)',   // W2
    'rgba(237,137,54,1)',   // W3
    'rgba(139,108,239,1)',  // W4
    'rgba(237,100,166,1)',  // W5
  ],
  header: 'Monthly Averages',
  headerRow: 'Practice',
  emptyMessage: "*No practices data found for this month.*",
  labelFn: (note, i) => {
    const d = kb.tryDate(note.created);
    return d ? `W${d.weekNumber} (${d.toFormat('dd/MM')})` : `Week ${i + 1}`;
  },
});
