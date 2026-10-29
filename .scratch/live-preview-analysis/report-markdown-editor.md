# Análise de src/lib/core/markdown-editor (live preview)

Esta análise foi feita só lendo o código. Eu não rodei o app. Conferi de novo o `check-update-action.ts` inteiro, e o resto vem dos achados verificados e da revisão do crítico.

## 1) Causa provável do glitch bullet <-> H1

Três mecanismos se somam:

1. **Uma seta que também rola a tela é tratada como scroll puro.** Isso está em `extensions/live-preview/core/check-update-action.ts:21`.
   - `if (update.viewportChanged) return 'none'` roda antes do ramo `selectionSet` (:31).
   - O `block-decorator.ts:72` e o `inline-formatting-plugin.ts:160` deixam passar as atualizações que têm seleção e viewport juntas. Só que depois o `checkUpdateAction` descarta essas atualizações.
   - Como o `lastCursorLine` também não é atualizado, a linha antiga continua revelada e a nova continua escondida. Isso dura até o `scrollDebouncePlugin` disparar `forceDecorationRebuild`, uns 150 ms depois.
   - Para reproduzir: use ArrowUp/Down a partir de um bullet na borda do viewport, indo para um H1.
   - Correção: retornar `'none'` no caso de viewport só quando `!update.selectionSet`, e avaliar `reconfigured` e `forceDecorationRebuild` antes do retorno do viewport. Precisa de um teste para viewport + seleção.
   - Não confirmei que o CodeMirror marca `viewportChanged` no mesmo update de uma seta que rola a tela.
2. **A geometria muda quando a linha se revela.** Isso acontece mesmo sem scroll.
   - **No H1:** o prefixo `# ` vai de 0.01em para 1em (`styles.ts:47-56`), com `transition: font-size 0.2s`. O texto do H1 (2.058em) desliza para a direita durante 200 ms.
   - **No bullet:** o widget de 1.5em + 6px (`simple-widget-handlers.ts:64,94`) troca pelo `- ` cru.
   - O CodeMirror calcula a coluna-alvo da ArrowUp/Down com o layout antigo, então o cursor cai uma ou duas colunas fora do lugar.
   - Tirar a transition (`styles.ts:37` e `:50`) deixa a troca instantânea, mas o deslocamento continua. Para resolver de vez, o prefixo precisa manter a largura, por exemplo com `color: transparent` ou `visibility` em vez de colapsar.
3. **O flag de arrasto do mouse pode ficar preso.** Isso está em `core/mouse-selecting.ts:19-25`.
   - O `mouseup` só é ouvido no contentDOM. Se você soltar o mouse fora dele (margem, outro painel, fora da janela), `check-update-action.ts:29` passa a retornar `'skip'` para toda mudança de seleção.
   - A partir daí, nenhuma seta reconstrói as decorações até o próximo clique dentro do editor.
   - Correção: registrar, no `mousedown`, um listener `mouseup` único no `ownerDocument`.

O tamanho do heading pode estar sendo aplicado duas vezes. O `highlight-styles.ts:15-17` aplica `fontSize var(--heading-h1-font-size, 1.6em)` no span do token, e esse span fica dentro da linha `.cm-lp-h1` (`styles.ts`, 2.058em). Como o em é relativo ao pai, o tamanho pode se multiplicar. Falta checar o font-size computado no DevTools.

## 2) Bugs e conflitos confirmados (por gravidade)

1. **Callout aninhado quebra todas as decorações de callout.**
   - Onde: `plugins/callout-field.ts:171/213` e `parsers/callout.ts:72-95`.
   - Cenário: com `> [!warning]` / `> > [!note]`, o `findAllCallouts` coleta o Blockquote externo e o interno. O header interno é adicionado numa posição menor que a anterior, o `RangeSetBuilder` lança exceção e o plugin é desativado.
   - Correção: `return false` no `enter()` depois de registrar um callout, ou usar `Decoration.set(ranges, true)`.
2. **A checagem de "mesma linha" quebra a revelação por elemento.**
   - Onde: `core/check-update-action.ts:34-36`.
   - Cenário: os handlers inline (`**`, links, escapes, `%%`), os embeds, as imagens, os footnotes e o meta-bind INPUT usam `isTouched` por intervalo de elemento. Na linha `**one** and **two**`, um ArrowRight de "one" para "two" não reconstrói nada. O mesmo vale para entrar num `![[embed]]` ou num `INPUT[...]` sem trocar de linha.
   - O JSDoc (:11-14) está errado ao dizer que a visibilidade só muda por linha.
   - Correção: não passar `lastCursorLine` para os plugins que revelam por elemento. A checagem de linha fica só nos blocos, headings e bullets, que revelam por linha.
3. **`%%` dentro de fenced code esconde código.**
   - Onde: `plugins/block-comment-field.ts:11-36`.
   - Cenário: o campo varre as linhas cruas sem olhar a árvore de sintaxe. Duas linhas `%%` num bloco de código (por exemplo, células do MATLAB) escondem tudo o que está entre elas.
   - Correção: pular a linha quando `isInsideBlockContext` indicar FencedCode.
4. **Um queryjs dentro de um fence maior é renderizado e executado.**
   - Onde: `plugins/queryjs-block-field.ts:18-45` e `parsers/queryjs-block.ts:24`.
   - Cenário: um bloco ` ```queryjs ` dentro de um ` ````md ` vira widget e roda o JS.
   - Correção: usar os nós FencedCode do Lezer (`findAllFencedCodeBlocks`).
5. **Espaços no fim do header do callout cortam o começo do título.**
   - Onde: `parsers/callout.ts:48-52`.
   - Cenário: o `markerEnd` é calculado com o título já trimado, então em `> [!note] Title   ` os 3 primeiros caracteres do título ficam escondidos.
   - Correção: calcular com `match[3]` sem trim.
6. **O blockquote marca a partir de `line.from` e engole o bullet.**
   - Onde: `inline/handlers/blockquote-handler.ts:48`.
   - Cenário: em `- > quote`, o widget do bullet fica dentro de `.cm-formatting-block` (0.01em, opacity 0) e some.
   - Correção: começar a marca no primeiro QuoteMark.
7. **Unclosed `<video>`/`<audio>` esconde linhas até um fechamento distante.**
   - Onde: `parsers/media.ts:66-88` e `plugins/video-plugin.ts:34`.
   - Correção: parar a varredura numa linha em branco ou numa nova tag de abertura.
8. **Botão direito num wikilink navega ou cria a nota.**
   - Onde: `MarkdownEditor.svelte:57`.
   - Correção: `if (e.button !== 0) return;`.
9. **Botão do meta-bind com `action` e `actions` juntos executa entradas não validadas.**
   - Onde: `meta-bind-button.logic.ts:94`.
   - Cenário: um `action` válido aprova a config, mas `getButtonActions` executa o `actions`, que não foi validado.
10. **O fold do callout é remapeado errado.**
    - Onde: `core/effects.ts:19-24`.
    - Cenário 1: ao apagar uma linha inteira, o fold passa para a linha seguinte.
    - Cenário 2: num replace do documento inteiro (troca de aba), o fold vai para a última linha, e nada reseta esse estado.
    - Correção: usar `MapMode.TrackDel` e limpar o estado num replace total.
11. **O `wikilinkDecoration` legado fica sempre ativo junto com o live preview.**
    - Onde: `editor-extensions.ts:84` e `wikilink/decoration.ts:66`.
    - Cenário: ele ignora o cursor, reconstrói em cada scroll e o regex atravessa quebras de linha (:22-23).
    - Correção: instalar só no modo source.
12. **O `calloutDecoration` legado fica sempre ativo.**
    - Onde: `editor-extensions.ts:85` e `callout/callout.ts:24,45`.
    - Cenário: estiliza `> [!note]` dentro de code fence, aplica estilo duplo no header em live preview e reconstrói em cada scroll.
    - Correção: restringir ao modo source. Ele é a única estilização de callout no modo source, então não dá para remover.
13. **O `forceDecorationRebuild` se perde quando vem junto com uma mudança de viewport.**
    - Onde: `block-decorator.ts:72` e `check-update-action.ts:21-23`.
    - Corrigido junto com o item 1 da seção 1.
14. **Menores:**
    - `widgets.ts:108`: `decodeURIComponent` fora do try lança erro com `%` cru.
    - `embed-resolver.logic.ts:13`: o heading ignora fences.
    - `embed-resolver.logic.ts:45`: o block-id é buscado por substring.
    - `paste-html-link.logic.ts:90`: `)` no href não é escapado.
    - `code-block-widget.ts:176`: ternário com os dois ramos iguais.
    - `code-block-widget.ts:94` e `widgets.ts:306`: promises sem catch.
    - `meta-bind-button-widget.ts:29`: falta try/catch e há um `vaultStore.path!`.
    - `wikilink/completion.ts:24`: `[[EstaNota#` lê do disco em vez do buffer.
    - `comment.ts:10` e `autolink-handlers.ts:34`: `%%`, URL e wikilink são decorados dentro de inline code.
    - `MarkdownEditor.svelte:239`: o comentário não bate com o código.
    - `MarkdownEditor.svelte:412`: mudar o kill-switch não reconfigura o editor.

## 3) Simplificações (por retorno)

1. **Uma porta única de rebuild.** Criar um helper `shouldRebuild(update, lastCursorLine?, extraEffects?)` e:
   - apagar os guards duplicados em `inline-formatting-plugin.ts:160` e `block-decorator.ts:72`, depois de corrigir a ordem;
   - centralizar o boilerplate de `lastCursorLine` copiado em `image-plugin.ts:55`, `footnote-plugin.ts:35`, `meta-bind-input-plugin.ts:33` e `wikilink-embed-plugin.ts:37`, numa fábrica `inlineDecorator`.
2. **Um único dono para cada coisa duplicada:**
   - o tamanho do heading (`highlight-styles.ts:15` contra `.cm-lp-hN`);
   - os estilos inline duplicados nas duas HighlightStyles (`editor-extensions.ts:110`);
   - o callout (legado contra `callout-field`);
   - o wikilink (legado contra o handler).
3. **Um único matcher de callout.** Hoje são três regexes divergentes (`callout.logic.ts`, `CALLOUT_HEADER_RE` e `parsers/blockquote.ts:12`, que não reconhece `> > [!`). Isso também resolve a dupla estilização blockquote + callout nas linhas de conteúdo.
4. **Um helper `hideLines(builder, from, to)`** para o loop `hiddenLineDeco` + `replace({})` copiado em block-comment, block-math, code-block, collection, mermaid, meta-bind-button, queryjs, table e video.
5. **Usar os nós FencedCode do Lezer** em mermaid, queryjs e collection, no lugar dos scanners de regex. Isso também resolve os bugs dos itens 3 e 4 da seção 2. Antes, é preciso escrever testes que fixem o comportamento atual.
6. **Código morto no `callout-field.ts`:** a constante `isFoldable = true` (:152) e o `hiddenLineDeco` duplicado (:219).
7. **Código morto em geral:**
   - o YAML parse descartado em `parsers/frontmatter.ts:115`;
   - `CommentBlock` e `Frontmatter` em `is-inside-block-context.ts:4`, que nenhum nó gera;
   - o `fenceChar` que sempre dá true em meta-bind-button, collection e queryjs;
   - o skip inalcançável em `parsers/footnote.ts:52`;
   - o re-export `widgets.ts:273` e o `export` do `createMetaBindSelect`;
   - o `highlightSelectionMatches`, que nunca casa nada (`editor-extensions.ts:90`);
   - o `getChild('TaskMarker')`;
   - o campo `to` em `date-shortcut/completion.logic.ts:28`;
   - o `HighlightResult.language`.
8. **Trocar RangeSetBuilder + sort manual por `Decoration.set(..., true)`** em `composition-aware-bracket-matching.ts:119`, `wikilink/decoration.ts:50` e `code-block-field.ts:16`.
9. **CSS:**
   - juntar as sete regras `activeLine:has` (`styles.ts:260...`) num seletor só;
   - remover o comentário órfão do marcador de lista (o crítico o localizou na :54);
   - corrigir o comentário que fala em `::before` em `simple-widget-handlers.ts:52`;
   - criar um helper `blockFormattingClass(touched)`.
10. **Pequenos:**
    - o comentário que narra o debugging em `composition-aware-bracket-matching.ts:60`;
    - o `_rebuildStart` sem tipo em `scroll-debounce-plugin.ts:25`;
    - o `getLanguageForFile` chamado duas vezes em `highlight-styles.ts:107`;
    - o duplo parse em `paste-tsv.logic.ts:147`;
    - o corpo de dispatch duplicado nos dois handlers de paste.

## 4) Plausíveis, não confirmados

- Um parse tree parcial não dispara rebuild, porque um update só com effects devolve `'none'` (`check-update-action.ts:41`).
- Um `$$` sem fechamento engole os nós abaixo (`lezer/math-extension.ts:76`).
- Uma query lenta pode rodar duas vezes, porque não há rastreio do que está em execução (`queryjs-block-widget.ts:97`).
- Mousedown sem `stopPropagation` em `collection-block-widget.ts:342` e no popover do callout (`callout-field.ts:127`).
- O keydown do select de linguagem chega ao keymap do CodeMirror (`code-block-widget.ts:141`).
- O mousedown de wikilink numa célula de tabela é interceptado pelo handler de captura do `MarkdownEditor.svelte:216`.
- O `applyLanguageForTab` assíncrono não verifica se o resultado já ficou velho (`MarkdownEditor.svelte:51`).
- O paste TSV transforma texto indentado com tab em tabela (`paste-tsv.logic.ts:19`).
- Um mermaid indentado fica sem decoração nenhuma (`mermaid-field.ts:18`).
- A transição de cada linha da linha de embeds, meta-bind e dentro de tabelas não foi verificada, porque `Table` não está em `BLOCK_CONTEXT_TYPES`.
- O mermaid assíncrono muda a altura sem chamar `requestMeasure` (`mermaid-widget.ts:94`).
- O `mathCache` não tem limite (`math-widget.ts:10`), mas o impacto é pequeno.

**O que não verifiquei, e onde está o risco:** não testei no app. Faltam o font-size computado do H1, se o CodeMirror marca `viewportChanged` junto com a seta, e o deslocamento real em pixels. O próximo passo mais barato é abrir o DevTools, desligar a `transition` de `.cm-formatting-block` e repetir a seta de um bullet para um H1, com e sem scroll.

Stats: {"raw": 280, "deduped": 227, "verified": 196, "kept": 191}
