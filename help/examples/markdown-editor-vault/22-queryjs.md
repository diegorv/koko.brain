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
kb.list(kb.pages().file.link)
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
kb.list(kb.pages().limit(3).file.link)
```

%%
ESPERADO:
- Apenas 3 primeiros links aparecem
- Verifica que .limit() funciona no DataArray
%%

## 3. Filtro por Tag

```queryjs
const pages = kb.pages("#projeto")
kb.header(3, `Projetos (${pages.length})`)
kb.list(pages.file.link)
```

%%
ESPERADO:
- Header h3 com contagem de notas com tag #projeto
- Lista de links apenas das notas que tem tag "projeto" (frontmatter ou inline)
- Se nenhuma nota tem essa tag, mostra "Projetos (0)" e lista vazia
%%

## 4. Filtro por Pasta

```queryjs
kb.list(kb.pages('"collection-examples"').file.link)
```

%%
ESPERADO:
- Apenas notas dentro da pasta collection-examples (ou subpastas)
%%

## 5. Pagina Atual (kb.current)

```queryjs
const current = kb.current()
if (current) {
    kb.paragraph(`Arquivo: ${current.file.basename}`)
    kb.paragraph(`Pasta: ${current.file.folder}`)
    kb.paragraph(`Tamanho: ${current.file.size} bytes`)
} else {
    kb.paragraph("Nao foi possivel encontrar a pagina atual")
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
const pages = kb.pages().limit(5)
kb.table(
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
const pages = kb.pages()
    .where(p => p.status !== undefined)
kb.table(
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
const result = kb.pages()
    .where(p => p.file.tags.length > 0)
    .sort(p => p.file.basename)
    .limit(5)

kb.header(3, `Notas com tags (top 5 por nome)`)
kb.list(result.map(p => `${p.file.basename} — ${p.file.tags.join(", ")}`))
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
const hoje = kb.date()
const ontem = hoje.minus({ days: 1 })
const semana = hoje.startOf('week')

kb.paragraph(`Hoje: ${hoje.toISODate()}`)
kb.paragraph(`Ontem: ${ontem.toISODate()}`)
kb.paragraph(`Inicio da semana (segunda): ${semana.toISODate()}`)
kb.paragraph(`Ano: ${hoje.year}, Mes: ${hoje.month}, Dia: ${hoje.day}`)
```

%%
ESPERADO:
- Mostra data de hoje no formato YYYY-MM-DD
- Ontem = hoje - 1 dia
- Inicio da semana = segunda-feira mais recente
- Ano, mes (1-12), dia corretos
%%

## 10. kb.el() — Elemento Customizado

```queryjs
kb.el('div', 'Conteudo customizado', {
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
kb.taskList([
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
const pages = kb.pages()
    .where(p => p.file.tasks.length > 0)

kb.header(3, `Notas com tasks (${pages.length})`)
for (const p of pages) {
    kb.header(4, p.file.link)
    kb.taskList(p.file.tasks)
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
const allTasks = kb.pages().file.tasks
    .where(t => !t.completed)

kb.header(3, `Pendentes (${allTasks.length})`)
kb.taskList(allTasks)
```

%%
ESPERADO:
- Lista flat de TODAS as tasks nao completadas do vault
- Header h3 com contagem total de pendentes
- Nenhuma task marcada como completed deve aparecer
%%

## 11d. Tasks por Projeto

```queryjs
const projetos = kb.pages("#type/project")
    .where(p => p.file.tasks.length > 0)

for (const p of projetos) {
    const total = p.file.tasks.length
    const done = p.file.tasks.filter(t => t.completed).length
    kb.header(4, `${p.file.basename} (${done}/${total})`)
    kb.taskList(p.file.tasks)
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
const pages = kb.pages()
    .where(p => p.file.tasks.length > 0)
    .sort(p => p.file.tasks.filter(t => !t.completed).length, 'desc')

kb.table(
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
kb.header(1, "Titulo Principal")
kb.header(2, "Subtitulo")
kb.paragraph("Este e um paragrafo normal com texto.")
kb.span("E este e um span inline.")
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
const link1 = kb.fileLink("/vault/test.md", false, "Nota de Teste")
const link2 = kb.fileLink("/vault/other.md")

kb.list([link1, link2])
kb.paragraph(`compare(1, 2) = ${kb.compare(1, 2)}`)
kb.paragraph(`compare(2, 2) = ${kb.compare(2, 2)}`)
kb.paragraph(`equal(1, 1) = ${kb.equal(1, 1)}`)
kb.paragraph(`isArray([1,2]) = ${kb.isArray([1,2])}`)
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
const grouped = kb.pages()
    .where(p => p.status !== undefined)
    .groupBy(p => p.status)

for (const group of grouped) {
    kb.header(4, `Status: ${group.key} (${group.rows.length})`)
    kb.list(group.rows.file.link)
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
kb.paragraph("Carregou apos 100ms de delay!")
```

%%
ESPERADO:
- Apos 100ms, mostra "Carregou apos 100ms de delay!"
- O await e detectado e o script e wrappado em async IIFE automaticamente
%%

## 19. Acesso ao DOM (Sem Sandbox)

```queryjs
const div = kb.el('div', '', { attr: { style: 'padding: 8px;' } })
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
kb.paragraph("Canvas renderizado acima com barras aleatorias")
```

%%
ESPERADO:
- Canvas com 10 barras roxas de altura aleatoria
- Demonstra que document.createElement funciona (sem sandbox)
- Texto abaixo confirmando
%%

## 20. Proxy Deep Access Complexo

```queryjs
const pages = kb.pages()
const basenames = pages.file.basename
const tags = pages.file.tags

kb.paragraph(`Total de paginas: ${pages.length}`)
kb.paragraph(`Basenames: ${basenames.join(", ")}`)
kb.paragraph(`Todas as tags (flat): ${tags.distinct().join(", ")}`)
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
const current = kb.current()
if (current) {
    kb.header(3, "Inlinks")
    if (current.file.inlinks.length > 0) {
        kb.list(current.file.inlinks)
    } else {
        kb.paragraph("Nenhuma nota aponta para este arquivo")
    }

    kb.header(3, "Outlinks")
    if (current.file.outlinks.length > 0) {
        kb.list(current.file.outlinks)
    } else {
        kb.paragraph("Este arquivo nao possui links para outras notas")
    }
}
```

%%
ESPERADO:
- Mostra inlinks (notas que linkam para esta) como lista de links clicaveis
- Mostra outlinks (notas que esta linka) como lista de links clicaveis
- Se nenhum, mostra mensagem informativa
%%
