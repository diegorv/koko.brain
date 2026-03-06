# Test: QueryJS — Advanced Use Cases

%%
COMO TESTAR:
- Copie o conteudo de queryjs-examples/ para a raiz do vault
- Abra ESTE arquivo no vault
- Os blocos queryjs devem renderizar resultados inline
%%

---

## 1. Dashboard — Resumo do Vault (kb.ui.cards)

```queryjs
const all = kb.pages()
const withTags = all.where(p => p.file.tags.length > 0)
const withStatus = all.where(p => p.status !== undefined)

kb.ui.cards([
    { label: 'Total Notes', value: all.length, color: 'blue', icon: '📝' },
    { label: 'With Tags', value: withTags.length, color: 'green', icon: '🏷️' },
    { label: 'With Status', value: withStatus.length, color: 'orange', icon: '📊' },
], { columns: 3 })
```

%%
ESPERADO:
- Grid com 3 cards lado a lado
- Card 1: Total de notas (numero grande + label + icon)
- Card 2: Notas com tags
- Card 3: Notas com status
- Cores: azul, verde, laranja (semi-transparentes)
- Resultado identico ao Test 1 antigo, mas com ~5 linhas em vez de ~25
%%

## 2. Statistics — Aggregations (sum, avg, min, max, stats)

```queryjs
const dailies = kb.pages('#type/journal/daily')

if (dailies.length === 0) {
    kb.paragraph("Nenhum daily note encontrado com tag type/journal/daily")
} else {
    const sleepValues = dailies
        .where(p => p.life_track_sleep_quality !== undefined)
        .map(p => p.life_track_sleep_quality)

    kb.header(3, "Sleep Quality Stats")
    kb.table(
        ["Metric", "Value"],
        [
            ["Total entries", sleepValues.length],
            ["Sum", sleepValues.sum()],
            ["Average", sleepValues.avg().toFixed(1)],
            ["Min", sleepValues.min()],
            ["Max", sleepValues.max()],
        ]
    )

    // Alternatively, get everything at once with stats()
    const s = sleepValues.stats()
    kb.paragraph(`stats() → sum: ${s.sum}, avg: ${s.avg.toFixed(1)}, min: ${s.min}, max: ${s.max}, count: ${s.count}`)
}
```

%%
ESPERADO:
- Tabela com 5 linhas: Total entries (7), Sum, Average, Min, Max
- Valores calculados a partir de life_track_sleep_quality dos daily notes
- Linha extra mostrando stats() com todos os valores de uma vez
%%

## 3. Progress Bars — kb.ui.table + kb.ui.progressBar

```queryjs
const dailies = kb.pages('#type/journal/daily')
    .where(p => p.life_track_sleep_quality !== undefined)
    .sort(p => p.file.basename)

const s = dailies.map(p => kb.number(p.life_track_sleep_quality)).stats()

kb.header(3, "Daily Metrics Overview")
kb.ui.table(
    ["Day", "Sleep", "Energy", "Mood"],
    dailies.map(p => {
        const sleep = kb.number(p.life_track_sleep_quality)
        const energy = kb.number(p.life_track_energy)
        const mood = kb.number(p.life_track_mood)
        return [
            p.file.basename.replace('daily-2026-02-', '02/'),
            kb.ui.progressBar(sleep, 5),
            kb.ui.progressBar(energy, 5),
            kb.ui.progressBar(mood, 5),
        ]
    }),
    {
        striped: true,
        align: ['left', 'center', 'center', 'center'],
        footer: ['Average', s.avg.toFixed(1), '', ''],
    }
)
```

%%
ESPERADO:
- Tabela com 7 linhas (daily notes) + footer com media
- Linhas alternadas com fundo levemente diferente (striped)
- Colunas Sleep, Energy, Mood centralizadas com barras unicode
- Footer com "Average" e o valor medio de sleep
%%

## 4. Status Cards — kb.ui.statusCards

```queryjs
const pages = kb.pages()
    .where(p => p.status !== undefined)

kb.header(3, `All Items by Status (${pages.length})`)

kb.ui.statusCards(
    pages.map(p => ({
        title: p.file.basename,
        status: p.status,
        subtitle: p.file.tags.length > 0 ? p.file.tags.join(' ') : undefined,
    })).array()
)
```

%%
ESPERADO:
- Cards para cada nota com status
- project-kokobrain: verde (active), project-garden: azul (planning)
- Badge colorido do lado direito com nome do status
- Tags em texto menor abaixo do nome
%%

## 5. DataArray Advanced Methods

```queryjs
const pages = kb.pages()

kb.header(3, "DataArray Method Tests")

// .some() / .every() / .none()
const hasTags = pages.some(p => p.file.tags.length > 0)
const allHaveTags = pages.every(p => p.file.tags.length > 0)
const noneEmpty = pages.none(p => p.file.basename === '')

kb.paragraph(`some() have tags: ${hasTags}`)
kb.paragraph(`every() have tags: ${allHaveTags}`)
kb.paragraph(`none() have empty name: ${noneEmpty}`)

// .find() / .findIndex()
const found = pages.find(p => p.file.basename.includes('project'))
kb.paragraph(`find('project'): ${found ? found.file.basename : 'not found'}`)

const idx = pages.findIndex(p => p.file.basename.includes('project'))
kb.paragraph(`findIndex('project'): ${idx}`)

// .flatMap()
const allTagsFlat = pages.flatMap(p => p.file.tags)
kb.paragraph(`flatMap tags count: ${allTagsFlat.length}`)
kb.paragraph(`distinct tags: ${allTagsFlat.distinct().join(', ')}`)

// .slice()
const sliced = pages.slice(0, 3)
kb.paragraph(`slice(0,3) length: ${sliced.length}`)

// .includes()
const firstPage = pages.first()
kb.paragraph(`includes(first page): ${pages.includes(firstPage)}`)
```

%%
ESPERADO:
- some() have tags: true (pelo menos uma nota tem tags)
- every() have tags: depende do vault
- none() have empty name: true
- find/findIndex: encontra uma nota com "project" no nome
- flatMap: conta total de tags de todas as notas
- distinct: lista tags unicas
- slice: retorna 3 elementos
- includes: true
%%

## 6. DVDateTime — Formatting and Comparison

```queryjs
const d1 = kb.date("2026-02-13")
const d2 = kb.date("2026-02-15")

kb.header(3, "Date Formatting")
kb.paragraph(`toISODate: ${d1.toISODate()}`)
kb.paragraph(`toFormat('yyyy/MM/dd'): ${d1.toFormat('yyyy/MM/dd')}`)
kb.paragraph(`toFormat('dd-MM-yyyy'): ${d1.toFormat('dd-MM-yyyy')}`)

kb.header(3, "Date Comparison")
kb.paragraph(`d1 < d2: ${d1 < d2}`)
kb.paragraph(`d1 > d2: ${d1 > d2}`)
kb.paragraph(`d1 == d2: ${d1.valueOf() === d2.valueOf()}`)
kb.paragraph(`hasSame day: ${d1.hasSame(d2, 'day')}`)
kb.paragraph(`hasSame month: ${d1.hasSame(d2, 'month')}`)
kb.paragraph(`hasSame year: ${d1.hasSame(d2, 'year')}`)

kb.header(3, "Date Arithmetic")
const nextWeek = d1.plus({ days: 7 })
const lastMonth = d1.minus({ months: 1 })
kb.paragraph(`+7 days: ${nextWeek.toISODate()}`)
kb.paragraph(`-1 month: ${lastMonth.toISODate()}`)
kb.paragraph(`Start of week: ${d1.startOf('week').toISODate()}`)
kb.paragraph(`Start of month: ${d1.startOf('month').toISODate()}`)
kb.paragraph(`Start of year: ${d1.startOf('year').toISODate()}`)
```

%%
ESPERADO:
- toISODate: 2026-02-13
- toFormat yyyy/MM/dd: 2026/02/13
- toFormat dd-MM-yyyy: 13-02-2026
- d1 < d2: true
- d1 > d2: false
- hasSame day: false, month: true, year: true
- +7 days: 2026-02-20
- -1 month: 2026-01-13
- Start of week: 2026-02-09
- Start of month: 2026-02-01
- Start of year: 2026-01-01
%%

## 7. Timeline — kb.ui.timeline

```queryjs
const pages = kb.pages()
    .where(p => p.created !== undefined)
    .sort(p => {
        const c = p.created
        return typeof c.ts !== 'undefined' ? c.ts : 0
    }, 'desc')

kb.header(3, `Timeline (${pages.length} notes)`)

kb.ui.timeline(
    pages.map(p => {
        const c = p.created
        const dateStr = typeof c.toISODate === 'function'
            ? c.toISODate()
            : String(c).split(/[T ]/)[0]
        return {
            date: dateStr,
            title: p.file.basename,
            subtitle: p.file.tags.length > 0
                ? p.file.tags.slice(0, 2).join(' ')
                : undefined,
        }
    }).array()
)
```

%%
ESPERADO:
- Lista cronologica reversa agrupada por data
- Cada data como header com borda inferior
- Cada nota como item com dot roxo + nome + tags
- Datas: 2026-02-13 (meetings + daily), 2026-02-10 (meeting + daily), etc.
%%

## 8. Heatmap — kb.ui.heatmap

```queryjs
const dailies = kb.pages('#type/journal/daily')
    .where(p => p.created !== undefined)
    .sort(p => p.created)

if (dailies.length === 0) {
    kb.paragraph("No daily notes found")
} else {
    kb.header(3, "Sleep Quality Heatmap")

    kb.ui.heatmap(dailies, {
        value: p => kb.number(p.life_track_sleep_quality),
        label: p => {
            const c = p.created
            return typeof c.toISODate === 'function' ? c.toISODate().slice(5) : ''
        },
        tooltip: p => `${p.file.basename}: ${kb.number(p.life_track_sleep_quality)}/5`,
        max: 5,
    })
}
```

%%
ESPERADO:
- Grid horizontal de quadrados coloridos (7 quadrados, 1 por dia)
- Cor varia de cinza (0) a verde (5) baseado em sleep_quality
- Cada quadrado mostra o valor numerico e a data
- Tooltip com nome do arquivo e valor
- Legenda abaixo: Low [cinza...verde] High
- Resultado identico ao Test 8 antigo, mas com ~10 linhas em vez de ~45
%%

## 9. Cross-Reference — Related Notes

```queryjs
const current = kb.current()
if (!current) {
    kb.paragraph("Current page not found in index")
} else {
    const myTags = current.file.tags
    if (myTags.length === 0) {
        kb.paragraph("This file has no tags — cannot find related notes")
    } else {
        const related = kb.pages()
            .where(p => p.file.path !== current.file.path)
            .where(p => p.file.tags.some(t => myTags.includes(t)))
            .sort(p => {
                const shared = p.file.tags.filter(t => myTags.includes(t)).length
                return -shared
            })
            .limit(10)

        kb.header(3, `Related Notes (${related.length})`)

        if (related.length === 0) {
            kb.paragraph("No related notes found")
        } else {
            kb.table(
                ["Note", "Shared Tags", "Count"],
                related.map(p => {
                    const shared = p.file.tags.filter(t => myTags.includes(t))
                    return [p.file.link, shared.join(', '), shared.length]
                })
            )
        }
    }
}
```

%%
ESPERADO:
- Se este arquivo tem tags: tabela com notas que compartilham tags
- Ordenado por quantidade de tags em comum (mais em comum primeiro)
- Colunas: Note (link), Shared Tags (quais tags em comum), Count
- Se nao tem tags: mensagem informativa
%%

## 10. Multi-Sort and Reverse

```queryjs
const pages = kb.pages()
    .where(p => p.created !== undefined)

// Sort ascending by created date
const ascending = pages.sort(p => {
    const c = p.created
    return typeof c.ts !== 'undefined' ? c.ts : 0
})

kb.header(4, "Oldest First")
kb.table(
    ["Note", "Created"],
    ascending.limit(5).map(p => [
        p.file.link,
        typeof p.created.toISODate === 'function' ? p.created.toISODate() : String(p.created)
    ])
)

// Sort descending
const descending = pages.sort(p => {
    const c = p.created
    return typeof c.ts !== 'undefined' ? c.ts : 0
}, 'desc')

kb.header(4, "Newest First")
kb.table(
    ["Note", "Created"],
    descending.limit(5).map(p => [
        p.file.link,
        typeof p.created.toISODate === 'function' ? p.created.toISODate() : String(p.created)
    ])
)
```

%%
ESPERADO:
- Primeira tabela: notas mais antigas primeiro (2026-01-15, 2026-02-01, etc.)
- Segunda tabela: notas mais recentes primeiro (2026-02-15, 2026-02-14, etc.)
- Ambas limitadas a 5 resultados
%%

## 11. Tag Cloud — kb.ui.tagCloud

```queryjs
const allTags = kb.pages().file.tags.array().flat()

kb.header(3, `Tag Cloud (${kb.array(allTags).distinct().length} unique tags)`)
kb.ui.tagCloud(allTags)
```

%%
ESPERADO:
- Tags como chips com tamanho proporcional a frequencia
- Tags mais frequentes: maiores e mais opacas
- Tags menos frequentes: menores e mais transparentes
- Cada chip mostra "tag (count)"
- Resultado identico ao Test 11 antigo, mas com 2 linhas em vez de ~25
%%

## 12. Multiple Blocks Interacting via DOM

```queryjs
kb.header(3, "Block A: File Count")
const count = kb.pages().length
kb.paragraph(`There are ${count} files in this vault.`)
```

```queryjs
kb.header(3, "Block B: Tag Summary")
const tags = kb.pages().file.tags.distinct()
kb.paragraph(`There are ${tags.length} unique tags: ${tags.sort(t => t).join(', ')}`)
```

```queryjs
kb.header(3, "Block C: Status Summary")
const statuses = kb.pages()
    .where(p => p.status !== undefined)
    .groupBy(p => p.status)

for (const group of statuses) {
    kb.paragraph(`${group.key}: ${group.rows.length} note(s)`)
}
```

%%
ESPERADO:
- 3 blocos independentes, cada um renderiza seu conteudo
- Block A: contagem total de arquivos
- Block B: lista de tags unicas ordenadas
- Block C: contagem por status (active: 1, planning: 1)
- Cada bloco e independente — cursor em um nao afeta os outros
%%

## 13. kb.array() Wrapping and Chaining

```queryjs
// Wrap raw array
const raw = [5, 3, 8, 1, 9, 2, 7]
const da = kb.array(raw)

kb.header(3, "kb.array() Tests")
kb.paragraph(`Original: ${da.join(', ')}`)
kb.paragraph(`Sorted asc: ${da.sort(x => x).join(', ')}`)
kb.paragraph(`Sorted desc: ${da.sort(x => x, 'desc').join(', ')}`)
kb.paragraph(`Where > 4: ${da.where(x => x > 4).join(', ')}`)
kb.paragraph(`First: ${da.sort(x => x).first()}`)
kb.paragraph(`Last: ${da.sort(x => x).last()}`)
kb.paragraph(`Length: ${da.length}`)
kb.paragraph(`isArray: ${kb.isArray(da)}`)

// Chaining
const result = kb.array([10, 20, 30, 40, 50])
    .where(x => x > 15)
    .map(x => x * 2)
    .limit(2)
kb.paragraph(`Chain (>15, *2, limit 2): ${result.join(', ')}`)
```

%%
ESPERADO:
- Original: 5, 3, 8, 1, 9, 2, 7
- Sorted asc: 1, 2, 3, 5, 7, 8, 9
- Sorted desc: 9, 8, 7, 5, 3, 2, 1
- Where > 4: 5, 8, 9, 7
- First: 1
- Last: 9
- Length: 7
- isArray: true
- Chain: 40, 60
%%

## 14. Frontmatter Date Auto-Conversion

```queryjs
const pages = kb.pages()
    .where(p => p.created !== undefined)
    .limit(5)

kb.header(3, "Date Type Detection")
kb.table(
    ["Note", "Created Type", "Year", "Month", "Day", "ISO"],
    pages.map(p => {
        const c = p.created
        const type = c && typeof c.year !== 'undefined' ? 'DVDateTime' : typeof c
        return [
            p.file.link,
            type,
            c && c.year ? c.year : '?',
            c && c.month ? c.month : '?',
            c && c.day ? c.day : '?',
            c && typeof c.toISODate === 'function' ? c.toISODate() : String(c),
        ]
    })
)
```

%%
ESPERADO:
- Todas as datas do frontmatter (created: YYYY-MM-DD) sao auto-convertidas para DVDateTime
- Coluna "Created Type" mostra "DVDateTime"
- Year, Month, Day mostram valores corretos
- ISO mostra YYYY-MM-DD
- Demonstra que maybeParseDate() funciona na buildDVPage()
%%

## 15. Error Recovery — Partial Render

```queryjs
kb.header(3, "Before Error")
kb.paragraph("This paragraph renders before the error")
kb.list(["Item 1", "Item 2", "Item 3"])

// Force an error
const x = undefined
x.crash()

kb.paragraph("This will NOT render (after error)")
```

%%
ESPERADO:
- Header "Before Error" renderiza
- Paragrafo renderiza
- Lista com 3 items renderiza
- Depois: mensagem de erro inline "QueryJS Error: ..."
- O conteudo renderizado ANTES do erro e preservado
- Nao: o widget inteiro some — depende de como o catch funciona
  (na implementacao atual, o container ja tem o conteudo parcial + erro)
%%

## 16. Aggregate Methods — countBy, reduce, stats

```queryjs
const pages = kb.pages()

kb.header(3, "countBy — Tag Frequency")
const allTags = pages.flatMap(p => p.file.tags)
const tagCounts = allTags.countBy()
kb.table(
    ["Tag", "Count"],
    Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).map(([tag, count]) => [tag, count])
)

kb.header(3, "countBy — Status Distribution")
const statusCounts = pages.where(p => p.status !== undefined).countBy(p => p.status)
kb.table(
    ["Status", "Count"],
    Object.entries(statusCounts).map(([status, count]) => [status, count])
)

kb.header(3, "reduce — Total File Size")
const totalSize = pages.reduce((acc, p) => acc + p.file.size, 0)
kb.paragraph(`Total vault size: ${(totalSize / 1024).toFixed(1)} KB across ${pages.length} files`)

kb.header(3, "Aggregate with key function")
const avgSize = pages.avg(p => p.file.size)
const minSize = pages.min(p => p.file.size)
const maxSize = pages.max(p => p.file.size)
kb.paragraph(`File sizes → avg: ${avgSize.toFixed(0)} bytes, min: ${minSize}, max: ${maxSize}`)
```

%%
ESPERADO:
- Tabela de tags com contagem (journal: N, type/journal/daily: N, etc.)
- Tabela de status (active: 1, planning: 1)
- Total vault size em KB
- Avg/min/max file sizes
- Demonstra countBy(), reduce(), avg(), min(), max() com key functions
%%

## 17. Enhanced Tables — kb.ui.table (align, striped, footer, rowStyle)

```queryjs
const pages = kb.pages()
    .where(p => p.status !== undefined || p.file.tags.length > 0)

kb.header(3, "Styled Table — Alignment + Striping + Footer")
kb.ui.table(
    ["Note", "Status", "Tags", "Size"],
    pages.map(p => [
        p.file.link,
        p.status || '—',
        p.file.tags.length,
        p.file.size,
    ]),
    {
        align: ['left', 'center', 'right', 'right'],
        striped: true,
        footer: [
            `${pages.length} notes`,
            '',
            pages.sum(p => p.file.tags.length),
            `${(pages.sum(p => p.file.size) / 1024).toFixed(1)} KB`,
        ],
    }
)

kb.header(3, "Conditional Row Styling")
kb.ui.table(
    ["Note", "Status"],
    pages.map(p => [p.file.basename, p.status || 'none']),
    {
        rowStyle: (row) => {
            if (row[1] === 'active') return 'rgba(72,187,120,0.08)'
            if (row[1] === 'planning') return 'rgba(66,153,225,0.08)'
            return null
        },
    }
)
```

%%
ESPERADO:
- Primeira tabela:
  - Note alinhado a esquerda, Status centralizado, Tags e Size a direita
  - Linhas alternadas com fundo levemente diferente
  - Footer com total de notas, total de tags, total de tamanho em KB
  - Footer com borda superior mais grossa e texto bold
- Segunda tabela:
  - Linhas com status "active" tem fundo verde claro
  - Linhas com status "planning" tem fundo azul claro
  - Demais sem fundo especial
%%

## 18. Dashboard Completo — Combinando kb.ui + Aggregates

```queryjs
const all = kb.pages()
const dailies = all.where(p => p.file.tags.some(t => t === 'type/journal/daily'))
const withStatus = all.where(p => p.status !== undefined)

// Cards com aggregates
kb.ui.cards([
    { label: 'Total Notes', value: all.length, color: 'blue', icon: '📝' },
    { label: 'Daily Notes', value: dailies.length, color: 'green', icon: '📅' },
    { label: 'Avg Sleep', value: dailies.avg(p => kb.number(p.life_track_sleep_quality)).toFixed(1), color: 'purple', icon: '😴' },
    { label: 'Best Sleep', value: dailies.max(p => kb.number(p.life_track_sleep_quality)), color: 'yellow', icon: '⭐' },
], { columns: 4 })

// Status cards com badge
kb.header(3, "Projects")
kb.ui.statusCards(
    withStatus.map(p => ({
        title: p.file.basename,
        status: p.status,
        subtitle: `${p.file.tags.length} tags`,
    })).array()
)

// Sleep heatmap
kb.header(3, "Sleep This Week")
kb.ui.heatmap(dailies, {
    value: p => kb.number(p.life_track_sleep_quality),
    label: p => p.file.basename.replace('daily-2026-02-', ''),
    max: 5,
})

// Metrics table with progress bars, striping, and footer
kb.header(3, "Daily Breakdown")
kb.ui.table(
    ["Day", "Sleep", "Energy", "Mood"],
    dailies.sort(p => p.file.basename).map(p => [
        p.file.basename.replace('daily-2026-02-', '02/'),
        kb.ui.progressBar(kb.number(p.life_track_sleep_quality), 5),
        kb.ui.progressBar(kb.number(p.life_track_energy), 5),
        kb.ui.progressBar(kb.number(p.life_track_mood), 5),
    ]),
    {
        striped: true,
        align: ['left', 'center', 'center', 'center'],
        footer: [
            `${dailies.length} days`,
            `avg ${dailies.avg(p => kb.number(p.life_track_sleep_quality)).toFixed(1)}`,
            `avg ${dailies.avg(p => kb.number(p.life_track_energy)).toFixed(1)}`,
            `avg ${dailies.avg(p => kb.number(p.life_track_mood)).toFixed(1)}`,
        ],
    }
)

// Tag cloud
kb.header(3, "Tags")
kb.ui.tagCloud(all.flatMap(p => p.file.tags).array())
```

%%
ESPERADO:
- Dashboard completo com:
  1. 4 cards (Total, Dailies, Avg Sleep, Best Sleep) com icones e cores
  2. Status cards com badges (active, planning)
  3. Heatmap de sleep quality (7 quadrados coloridos + legenda)
  4. Tabela com progress bars para sleep/energy/mood
  5. Tag cloud com todas as tags do vault
- Tudo em um unico bloco, mostrando o poder da API combinada
- Nenhum document.createElement() necessario!
%%
