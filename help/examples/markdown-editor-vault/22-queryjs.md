# Test: QueryJS

%%
COMO TESTAR:
- Abra a vault "collection-examples/" junto com este arquivo para ter notas com frontmatter
- Cada bloco ```queryjs deve renderizar resultado inline quando cursor esta fora
- Cursor DENTRO do bloco: mostra JavaScript raw
- Cursor FORA do bloco: mostra output renderizado
- Erros de script devem aparecer inline (nunca crashar o editor)
%%

## 1. Lista Simples de Todas as Notas

```queryjs
dv.list(dv.pages().file.link)
```

%%
ESPERADO:
- Lista <ul> com links clicaveis para cada nota no vault
- Links em cor de wikilink, com underline
- Click no link abre a nota no editor
- Proxy property access: .file.link mapeia automaticamente
%%

## 2. Lista com Limite

```queryjs
dv.list(dv.pages().limit(3).file.link)
```

%%
ESPERADO:
- Apenas 3 primeiros links aparecem
- Verifica que .limit() funciona no DataArray
%%

## 3. Filtro por Tag

```queryjs
const pages = dv.pages("#projeto")
dv.header(3, `Projetos (${pages.length})`)
dv.list(pages.file.link)
```

%%
ESPERADO:
- Header h3 com contagem de notas com tag #projeto
- Lista de links apenas das notas que tem tag "projeto" (frontmatter ou inline)
- Se nenhuma nota tem essa tag, mostra "Projetos (0)" e lista vazia
%%

## 4. Filtro por Pasta

```queryjs
dv.list(dv.pages('"collection-examples"').file.link)
```

%%
ESPERADO:
- Apenas notas dentro da pasta collection-examples (ou subpastas)
%%

## 5. Pagina Atual (dv.current)

```queryjs
const current = dv.current()
if (current) {
    dv.paragraph(`Arquivo: ${current.file.basename}`)
    dv.paragraph(`Pasta: ${current.file.folder}`)
    dv.paragraph(`Tamanho: ${current.file.size} bytes`)
} else {
    dv.paragraph("Nao foi possivel encontrar a pagina atual")
}
```

%%
ESPERADO:
- Mostra basename do arquivo atual (ex: "22-queryjs")
- Mostra pasta do arquivo
- Mostra tamanho em bytes
%%

## 6. Tabela com Headers e Rows

```queryjs
const pages = dv.pages().limit(5)
dv.table(
    ["Nome", "Pasta", "Tags"],
    pages.map(p => [
        p.file.link,
        p.file.folder,
        p.file.tags.join(", ")
    ])
)
```

%%
ESPERADO:
- Tabela com 3 colunas: Nome, Pasta, Tags
- Coluna "Nome" mostra links clicaveis (DVLink renderizado como <a>)
- Coluna "Tags" mostra tags separadas por virgula
- Maximo 5 linhas
%%

## 7. Propriedades do Frontmatter

```queryjs
const pages = dv.pages()
    .where(p => p.status !== undefined)
dv.table(
    ["Nota", "Status", "Priority"],
    pages.map(p => [p.file.link, p.status, p.priority ?? "—"])
)
```

%%
ESPERADO:
- Apenas notas que tem propriedade "status" no frontmatter
- Coluna status mostra o valor (ex: "active", "done")
- Coluna priority mostra o valor ou "—" se nao existe
%%

## 8. DataArray Chaining (where + sort + limit)

```queryjs
const result = dv.pages()
    .where(p => p.file.tags.length > 0)
    .sort(p => p.file.basename)
    .limit(5)

dv.header(3, `Notas com tags (top 5 por nome)`)
dv.list(result.map(p => `${p.file.basename} — ${p.file.tags.join(", ")}`))
```

%%
ESPERADO:
- Filtra notas que tem pelo menos 1 tag
- Ordena por basename alfabeticamente
- Pega apenas as 5 primeiras
- Mostra como lista: "nome — tag1, tag2"
%%

## 9. Datas (DVDateTime)

```queryjs
const hoje = dv.date()
const ontem = hoje.minus({ days: 1 })
const semana = hoje.startOf('week')

dv.paragraph(`Hoje: ${hoje.toISODate()}`)
dv.paragraph(`Ontem: ${ontem.toISODate()}`)
dv.paragraph(`Inicio da semana (segunda): ${semana.toISODate()}`)
dv.paragraph(`Ano: ${hoje.year}, Mes: ${hoje.month}, Dia: ${hoje.day}`)
```

%%
ESPERADO:
- Mostra data de hoje no formato YYYY-MM-DD
- Ontem = hoje - 1 dia
- Inicio da semana = segunda-feira mais recente
- Ano, mes (1-12), dia corretos
%%

## 10. dv.el() — Elemento Customizado

```queryjs
dv.el('div', 'Conteudo customizado', {
    attr: { style: 'padding: 12px; background: rgba(100,100,255,0.1); border-radius: 8px; border: 1px solid rgba(100,100,255,0.3);' },
    cls: 'my-custom-class'
})
```

%%
ESPERADO:
- Div com fundo azulado semi-transparente
- Bordas arredondadas
- Texto "Conteudo customizado"
%%

## 11. Task List

```queryjs
dv.taskList([
    { text: "Implementar QueryJS parser", completed: true },
    { text: "Implementar QueryJS widget", completed: true },
    { text: "Implementar QueryJS API", completed: true },
    { text: "Testar manualmente", completed: false },
    { text: "Testar com scripts reais", completed: false },
])
```

%%
ESPERADO:
- Lista com checkboxes
- 3 primeiros marcados como done (checked)
- 2 ultimos nao marcados
- Checkboxes sao desabilitados (readonly)
%%

## 11b. Tasks de Paginas (file.tasks)

```queryjs
const pages = dv.pages()
    .where(p => p.file.tasks.length > 0)

dv.header(3, `Notas com tasks (${pages.length})`)
for (const p of pages) {
    dv.header(4, p.file.link)
    dv.taskList(p.file.tasks)
}
```

%%
ESPERADO:
- Header h3 com contagem de notas que possuem tasks
- Para cada nota: header h4 com link + lista de tasks com checkboxes
- Tasks checked aparecem marcadas, unchecked aparecem desmarcadas
- Notas sem tasks NAO aparecem
%%

## 11c. Tasks Pendentes de Todo o Vault

```queryjs
const allTasks = dv.pages().file.tasks
    .where(t => !t.completed)

dv.header(3, `Pendentes (${allTasks.length})`)
dv.taskList(allTasks)
```

%%
ESPERADO:
- Lista flat de TODAS as tasks nao completadas do vault
- Header h3 com contagem total de pendentes
- Nenhuma task marcada como completed deve aparecer
%%

## 11d. Tasks por Projeto

```queryjs
const projetos = dv.pages("#type/project")
    .where(p => p.file.tasks.length > 0)

for (const p of projetos) {
    const total = p.file.tasks.length
    const done = p.file.tasks.filter(t => t.completed).length
    dv.header(4, `${p.file.basename} (${done}/${total})`)
    dv.taskList(p.file.tasks)
}
```

%%
ESPERADO:
- Apenas notas com tag #type/project que possuem tasks
- Cada projeto mostra header com link e contagem done/total
- Tasks renderizadas com checkboxes corretos
%%

## 11e. Resumo de Tasks em Tabela

```queryjs
const pages = dv.pages()
    .where(p => p.file.tasks.length > 0)
    .sort(p => p.file.tasks.filter(t => !t.completed).length, 'desc')

dv.table(
    ["Nota", "Total", "Feitas", "Pendentes"],
    pages.map(p => {
        const total = p.file.tasks.length
        const done = p.file.tasks.filter(t => t.completed).length
        return [p.file.link, total, done, total - done]
    })
)
```

%%
ESPERADO:
- Tabela com 4 colunas: Nota (link), Total, Feitas, Pendentes
- Ordenada por pendentes decrescente (notas com mais pendentes primeiro)
- Apenas notas que tem tasks
%%

## 12. Paragrafos e Headers

```queryjs
dv.header(1, "Titulo Principal")
dv.header(2, "Subtitulo")
dv.paragraph("Este e um paragrafo normal com texto.")
dv.span("E este e um span inline.")
```

%%
ESPERADO:
- h1 grande e bold
- h2 medio e bold
- Paragrafo como <p>
- Span como <span> (inline, mesma linha)
%%

## 13. fileLink e compare

```queryjs
const link1 = dv.fileLink("/vault/test.md", false, "Nota de Teste")
const link2 = dv.fileLink("/vault/other.md")

dv.list([link1, link2])
dv.paragraph(`compare(1, 2) = ${dv.compare(1, 2)}`)
dv.paragraph(`compare(2, 2) = ${dv.compare(2, 2)}`)
dv.paragraph(`equal(1, 1) = ${dv.equal(1, 1)}`)
dv.paragraph(`isArray([1,2]) = ${dv.isArray([1,2])}`)
```

%%
ESPERADO:
- Lista com 2 links: "Nota de Teste" e "other"
- compare(1,2) = -1 (ou negativo)
- compare(2,2) = 0
- equal(1,1) = true
- isArray([1,2]) = true
%%

## 14. Erro no Script (Tratamento Gracioso)

```queryjs
isso_nao_existe.metodo_inexistente()
```

%%
ESPERADO:
- Mensagem de erro inline: "QueryJS Error: isso_nao_existe is not defined"
- Texto vermelho/italic
- Editor NAO crasha — o resto da pagina continua normal
%%

## 15. Erro de Sintaxe

```queryjs
const x = {{{
```

%%
ESPERADO:
- Mensagem de erro de sintaxe inline
- Editor continua funcionando normalmente
%%

## 16. GroupBy

```queryjs
const grouped = dv.pages()
    .where(p => p.status !== undefined)
    .groupBy(p => p.status)

for (const group of grouped) {
    dv.header(4, `Status: ${group.key} (${group.rows.length})`)
    dv.list(group.rows.file.link)
}
```

%%
ESPERADO:
- Notas agrupadas por status
- Cada grupo tem header h4 com nome do status e contagem
- Lista de links dentro de cada grupo
- Proxy .file.link funciona em group.rows (que e DataArray)
%%

## 17. Bloco Vazio

```queryjs
```

%%
ESPERADO:
- Bloco renderizado vazio (sem erro, sem conteudo)
- Widget aparece como container vazio
%%

## 18. Async/Await

```queryjs
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))
await delay(100)
dv.paragraph("Carregou apos 100ms de delay!")
```

%%
ESPERADO:
- Apos 100ms, mostra "Carregou apos 100ms de delay!"
- O await e detectado e o script e wrappado em async IIFE automaticamente
%%

## 19. Acesso ao DOM (Sem Sandbox)

```queryjs
const div = dv.el('div', '', { attr: { style: 'padding: 8px;' } })
const canvas = document.createElement('canvas')
canvas.width = 200
canvas.height = 50
canvas.style.border = '1px solid rgba(150,150,150,0.3)'
canvas.style.borderRadius = '4px'
div.appendChild(canvas)

const ctx = canvas.getContext('2d')
if (ctx) {
    ctx.fillStyle = '#7c3aed'
    for (let i = 0; i < 10; i++) {
        const h = Math.random() * 40 + 5
        ctx.fillRect(i * 20 + 2, 50 - h, 16, h)
    }
}
dv.paragraph("Canvas renderizado acima com barras aleatorias")
```

%%
ESPERADO:
- Canvas com 10 barras roxas de altura aleatoria
- Demonstra que document.createElement funciona (sem sandbox)
- Texto abaixo confirmando
%%

## 20. Proxy Deep Access Complexo

```queryjs
const pages = dv.pages()
const basenames = pages.file.basename
const tags = pages.file.tags

dv.paragraph(`Total de paginas: ${pages.length}`)
dv.paragraph(`Basenames: ${basenames.join(", ")}`)
dv.paragraph(`Todas as tags (flat): ${tags.distinct().join(", ")}`)
```

%%
ESPERADO:
- pages.file.basename → DataArray<string> via Proxy
- pages.file.tags → DataArray (flattenado, tags de todas as notas)
- .distinct() remove duplicatas
- .join() serializa como string separada por virgula
%%

## 21. Inlinks e Outlinks

```queryjs
const current = dv.current()
if (current) {
    dv.header(3, "Inlinks")
    if (current.file.inlinks.length > 0) {
        dv.list(current.file.inlinks)
    } else {
        dv.paragraph("Nenhuma nota aponta para este arquivo")
    }

    dv.header(3, "Outlinks")
    if (current.file.outlinks.length > 0) {
        dv.list(current.file.outlinks)
    } else {
        dv.paragraph("Este arquivo nao possui links para outras notas")
    }
}
```

%%
ESPERADO:
- Mostra inlinks (notas que linkam para esta) como lista de links clicaveis
- Mostra outlinks (notas que esta linka) como lista de links clicaveis
- Se nenhum, mostra mensagem informativa
%%
