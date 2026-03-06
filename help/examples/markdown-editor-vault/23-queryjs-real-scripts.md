# Test: QueryJS — Scripts Reais

%%
COMO TESTAR:
- Copie todo o conteudo de queryjs-examples/ para a raiz do vault
- Isso inclui: daily notes, meeting notes, weekly note, project notes, e a pasta __system/
- Abra ESTE arquivo no vault
- Os blocos queryjs devem renderizar resultados inline
%%

---

## 1. Meeting List (inline) — Visao do daily-2026-02-13

%%
Este bloco simula o meeting-list.js rodando dentro da nota daily-2026-02-13.
Para testar de verdade, abra o daily-2026-02-13.md que contem [[meeting-standup-feb13]]
e [[meeting-retro-feb13]], e adicione o bloco queryjs la.

Aqui testamos o script inline para validar que a API funciona:
%%

```queryjs
// Versao simplificada do meeting-list usando whereTag()
const meetings = kb.pages().whereTag('type/meeting')

kb.header(3, `Todas as reunioes (${meetings.length})`)
kb.list(meetings.file.link)
```

%%
ESPERADO:
- Header h3 "Todas as reunioes (N)"
- Lista com links clicaveis para meeting-standup-feb13, meeting-retro-feb13, meeting-planning-feb10
- 3 meetings no total (se todos os exemplos estao no vault)
%%

## 2. Meeting List Completo (inline) — Filtro por data

```queryjs
const targetDate = kb.date("2026-02-13");

const resultado = kb.pages()
    .whereTag('type/meeting')
    .whereDate('created', targetDate, targetDate);

kb.header(3, `Reunioes de 13/02 (${resultado.length})`)
kb.list(resultado.file.link);
```

%%
ESPERADO:
- Header "Reunioes de 13/02 (2)"
- Apenas meeting-standup-feb13 e meeting-retro-feb13 (criados em 2026-02-13)
- meeting-planning-feb10 NAO aparece (criado em 2026-02-10)
%%

## 3. Meeting List via kb.view()

%%
Este teste carrega o script meeting-list.js do vault via kb.view().
So funciona se markdown-manual-test/queryjs-examples/__system/queryjs/meeting-list.js existir no vault.
Como este arquivo nao tem inlinks para meetings, o resultado sera vazio.
Para testar de verdade, abra o daily-2026-02-13.md.
%%

```queryjs
try {
    await kb.view("markdown-manual-test/queryjs-examples/__system/queryjs/meeting-list")
} catch (e) {
    kb.paragraph(`Erro ao carregar script: ${e.message}`)
    kb.paragraph("Certifique-se de que markdown-manual-test/queryjs-examples/__system/queryjs/meeting-list.js esta no vault")
}
```

%%
ESPERADO (neste arquivo):
- Lista vazia (pois este arquivo nao tem inlinks para meetings)
- OU erro se o arquivo .js nao existe no vault

ESPERADO (no daily-2026-02-13.md):
- Lista com 2 meetings: standup e retro
%%

## 4. Weekly Tracking — Tabela de Metricas

```queryjs
const weekStart = kb.date("2026-02-09");
const weekEnd = weekStart.plus({ days: 6 });

const fields = [
  { key: 'life_track_sleep_quality', label: 'Sleep' },
  { key: 'life_track_energy', label: 'Energy' },
  { key: 'life_track_mood', label: 'Mood' },
  { key: 'life_track_health_water', label: 'Water' },
  { key: 'life_track_health_meditation', label: 'Meditation' },
  { key: 'life_track_health_exercices', label: 'Exercise' },
];

// getDaysInRange replaces manual loop
const diasSemana = kb.getDaysInRange(weekStart, weekEnd);

const allDaily = kb.pages('#type/journal/daily');

kb.paragraph(`Encontrados ${allDaily.length} daily notes com tag type/journal/daily`)

// whereDate replaces manual date filtering
const dailyNotes = allDaily
  .whereDate('created', weekStart, weekEnd)
  .sort(p => kb.tryDate(p.created)?.ts ?? 0);

kb.paragraph(`${dailyNotes.length} notas encontradas na semana de ${weekStart.toISODate()}`)

// Tabela com dados brutos
const nomeDias = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
kb.table(
  ["Dia", ...fields.map(f => f.label)],
  dailyNotes.map((p, i) => {
    const dt = kb.tryDate(p.created);
    const dayIdx = dt ? diasSemana.findIndex(d => d.hasSame(dt, 'day')) : i;
    return [
      `${nomeDias[dayIdx >= 0 ? dayIdx : i]} ${dt ? dt.toISODate() : '?'}`,
      ...fields.map(f => kb.number(p[f.key]))
    ];
  })
);
```

%%
ESPERADO:
- Texto "Encontrados 7 daily notes com tag type/journal/daily"
- Texto "7 notas encontradas na semana de 2026-02-09"
- Tabela com 7 linhas (Mon-Sun) e 7 colunas (Dia + 6 metricas)
- Valores variam de 0 a 5
- Wednesday (11/02) tem valores mais baixos
- Thursday (12/02) tem valores mais altos
%%

## 5. Weekly Tracking Chart via kb.view()

%%
Este teste carrega o script completo com Chart.js.
Requer conexao com internet para carregar Chart.js do CDN.
%%

```queryjs
try {
    await kb.view("markdown-manual-test/queryjs-examples/__system/queryjs/weekly-wellness-chart")
} catch (e) {
    kb.paragraph(`Erro ao carregar script: ${e.message}`)
    kb.paragraph("Certifique-se de que markdown-manual-test/queryjs-examples/__system/queryjs/weekly-wellness-chart.js esta no vault")
}
```

%%
ESPERADO:
- Se carregado de dentro do weekly-2026-W07.md (que tem created: 2026-02-09):
  - Radar chart com 7 datasets (um por dia)
  - Cores diferentes para cada dia (azul, verde, laranja, roxo, rosa, teal, amarelo)
  - Tabela "Weekly Averages" com barras visuais (blocos unicode)
- Se carregado de ESTE arquivo (sem frontmatter created):
  - Erro ou "Nenhum diario preenchido esta semana"
%%

## 6. DVDateTime — Operacoes de Data

```queryjs
const hoje = kb.date("2026-02-13")

kb.header(3, "Operacoes com DVDateTime")

kb.paragraph(`Data: ${hoje.toISODate()}`)
kb.paragraph(`Ano: ${hoje.year}, Mes: ${hoje.month}, Dia: ${hoje.day}`)
kb.paragraph(`Timestamp: ${hoje.ts}`)

const amanha = hoje.plus({ days: 1 })
kb.paragraph(`Amanha: ${amanha.toISODate()}`)

const semanaPassada = hoje.minus({ days: 7 })
kb.paragraph(`Semana passada: ${semanaPassada.toISODate()}`)

const inicioSemana = hoje.startOf('week')
kb.paragraph(`Inicio da semana (segunda): ${inicioSemana.toISODate()}`)

const inicioMes = hoje.startOf('month')
kb.paragraph(`Inicio do mes: ${inicioMes.toISODate()}`)

// Comparacao
const d1 = kb.date("2026-02-13")
const d2 = kb.date("2026-02-13")
const d3 = kb.date("2026-02-14")
kb.paragraph(`Mesmo dia (13 vs 13): ${d1.hasSame(d2, 'day')}`)
kb.paragraph(`Mesmo dia (13 vs 14): ${d1.hasSame(d3, 'day')}`)
kb.paragraph(`d1 < d3: ${d1 < d3}`)
```

%%
ESPERADO:
- Data: 2026-02-13
- Ano: 2026, Mes: 2, Dia: 13
- Timestamp: numero em ms
- Amanha: 2026-02-14
- Semana passada: 2026-02-06
- Inicio da semana: 2026-02-09 (segunda-feira)
- Inicio do mes: 2026-02-01
- Mesmo dia (13 vs 13): true
- Mesmo dia (13 vs 14): false
- d1 < d3: true
%%

## 7. DataArray — Proxy e Chaining

```queryjs
const pages = kb.pages()

kb.header(3, "DataArray Proxy e Chaining")
kb.paragraph(`Total de paginas: ${pages.length}`)

// Proxy deep access
const basenames = pages.file.basename
kb.paragraph(`Basenames: ${basenames.join(", ")}`)

// Tags (flatten via to())
const allTags = pages.file.tags.distinct()
kb.paragraph(`Tags unicas: ${allTags.join(", ")}`)

// Chaining complexo
const projectPages = kb.pages('#type/project')
    .sort(p => p.priority)
    .limit(5)

kb.header(4, `Projetos por prioridade (${projectPages.length})`)
kb.table(
    ["Projeto", "Status", "Prioridade"],
    projectPages.map(p => [p.file.link, p.status, p.priority])
)
```

%%
ESPERADO:
- Total de paginas: numero com todas as notas no vault
- Basenames: lista separada por virgula com todos os nomes
- Tags unicas: lista sem duplicatas de todas as tags do vault
- Tabela de projetos ordenada por prioridade
  - project-kokobrain (priority: 1, status: active)
  - project-garden (priority: 3, status: planning)
%%

## 8. Projetos Ativos — Filtro por Frontmatter

```queryjs
const ativos = kb.pages()
    .where(p => p.status === "active")

kb.header(3, `Projetos Ativos (${ativos.length})`)

for (const p of ativos) {
    const el = kb.el('div', '', {
        attr: {
            style: 'padding: 8px 12px; margin: 4px 0; border-radius: 6px; border: 1px solid rgba(100,200,100,0.3); background: rgba(100,200,100,0.05);'
        }
    })
    const title = document.createElement('strong')
    title.textContent = p.file.basename
    el.appendChild(title)

    if (p.priority) {
        const badge = document.createElement('span')
        badge.textContent = ` P${p.priority}`
        badge.style.cssText = 'margin-left: 8px; padding: 1px 6px; border-radius: 10px; font-size: 11px; background: rgba(100,200,100,0.2);'
        el.appendChild(badge)
    }
}
```

%%
ESPERADO:
- Header "Projetos Ativos (1)" (apenas project-kokobrain tem status: active)
- Card estilizado com borda verde e badge "P1"
- Demonstra kb.el() + DOM manipulation direta
%%

## 9. GroupBy — Notas Agrupadas por Tag

```queryjs
const meetings = kb.pages('#type/meeting')
const grouped = meetings.groupBy(p => {
    const teamTag = p.file.tags.find(t => t.startsWith('team/'))
    return teamTag ? teamTag.replace('team/', '') : 'sem-time'
})

for (const group of grouped) {
    kb.header(4, `Time: ${group.key} (${group.rows.length})`)
    kb.list(group.rows.file.link)
}
```

%%
ESPERADO:
- "Time: engineering (2)" com standup e retro
- "Time: product (1)" com planning
- Proxy .file.link funciona dentro de group.rows (DataArray)
%%

## 10. Inlinks e Outlinks

```queryjs
// Busca o daily de 13/02 que tem links para meetings
const daily13 = kb.pages()
    .where(p => p.file.basename === "daily-2026-02-13")
    .first()

if (daily13) {
    kb.header(3, `Links de ${daily13.file.basename}`)

    kb.header(4, `Outlinks (${daily13.file.outlinks.length})`)
    if (daily13.file.outlinks.length > 0) {
        kb.list(daily13.file.outlinks)
    } else {
        kb.paragraph("Nenhum outlink encontrado")
    }

    kb.header(4, `Inlinks (${daily13.file.inlinks.length})`)
    if (daily13.file.inlinks.length > 0) {
        kb.list(daily13.file.inlinks)
    } else {
        kb.paragraph("Nenhum inlink encontrado")
    }
} else {
    kb.paragraph("daily-2026-02-13 nao encontrado no vault")
}
```

%%
ESPERADO:
- Outlinks de daily-2026-02-13: meeting-standup-feb13, meeting-retro-feb13
- Os outlinks dependem do backlinksStore ter indexado os [[wikilinks]] no conteudo
%%
