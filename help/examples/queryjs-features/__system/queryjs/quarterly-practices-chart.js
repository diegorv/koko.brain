// Quarterly Practices Chart — monthly practices for the quarter
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
  tag: 'type/journal/monthly',
  periodType: 'quarter',
  colors: [
    'rgba(66,153,225,1)',   // M1
    'rgba(72,187,120,1)',   // M2
    'rgba(237,137,54,1)',   // M3
  ],
  header: 'Quarterly Averages',
  headerRow: 'Practice',
  emptyMessage: "*No practices data found for this quarter.*",
  labelFn: (note, i) => {
    const d = kb.tryDate(note.created);
    return d ? d.toFormat('MMMM') : `Month ${i + 1}`;
  },
});
