# Inventário de Classes CSS — Live Preview Inline Plugins

Gerado na Fase 0 do refactor Híbrido D. Usado como contrato para o novo `markdown-highlight-style.ts` + `inlineFormattingPlugin` preservarem os nomes exatos de classe durante a migração (temas externos podem referenciá-los).

**Fonte dos estilos:** `src/lib/core/markdown-editor/extensions/live-preview/styles.ts` (`livePreviewStyles` via `EditorView.baseTheme`).

## Por plugin

### markdownStylePlugin
Usa decorações pré-definidas importadas de `styles.ts`:

| Classe | Tipo | Origem | Alvo Lezer |
|---|---|---|---|
| `cm-lp-bold` | `Decoration.mark` | `boldTextDeco` (styles.ts:4) | `StrongEmphasis` |
| `cm-lp-italic` | `Decoration.mark` | `italicTextDeco` (styles.ts:5) | `Emphasis` |
| `cm-lp-strikethrough` | `Decoration.mark` | `strikethroughTextDeco` (styles.ts:7) | `Strikethrough` |
| `cm-lp-code` | `Decoration.mark` | `inlineCodeTextDeco` (styles.ts:8) | `InlineCode` |
| `cm-lp-highlight` | `Decoration.mark` | `highlightTextDeco` (styles.ts:10) | `==text==` (parser custom) |

### headingPlugin
| Classe | Tipo | Origem | Observação |
|---|---|---|---|
| `cm-lp-h1` … `cm-lp-h6` | `Decoration.line` | `headingLineDeco[1..6]` (styles.ts:24–31) | Por depth de `ATXHeading1..6` |
| `cm-formatting-block` | `Decoration.mark` | inline | Marca `#` fora do cursor |
| `cm-formatting-block-visible` | `Decoration.mark` | inline | Marca `#` com cursor próximo |

### blockquotePlugin
| Classe | Tipo | Origem | Observação |
|---|---|---|---|
| `cm-lp-blockquote` | `Decoration.line` | `blockquoteLineDeco` (styles.ts:6) | depth 1 |
| `cm-lp-blockquote-2` | `Decoration.line` | inline (blockquote-plugin:21) | depth 2 |
| `cm-lp-blockquote-3` | `Decoration.line` | inline (blockquote-plugin:22) | depth 3 |
| `cm-formatting-block` / `-visible` | `Decoration.mark` | inline | Marca `>` |

### linkPlugin
| Classe | Tipo | Observação |
|---|---|---|
| `cm-formatting-inline` | `Decoration.mark` | Brackets `[` `]` `(` `)` |
| `cm-formatting-inline-visible` | `Decoration.mark` | Brackets com cursor |
| `cm-lp-link` | `Decoration.mark` (via `linkTextDeco`, styles.ts:3) | Body do link markdown |
| `cm-lp-wikilink` | `Decoration.mark` (via `wikilinkTextDeco`, styles.ts:9) | Body do wikilink |
| `cm-lp-link-ref-def` | `Decoration.mark` | Link reference definition `[ref]: url` |

### simpleWidgetPlugin
| Classe | Tipo | Observação |
|---|---|---|
| `cm-formatting-hr` | `Decoration.mark` | Texto `---` / `***` / `___` |
| `cm-lp-hr-line` | `Decoration.line` | Linha inteira do HR, recebe border-bottom |
| `cm-formatting-task-marker` | `Decoration.mark` | `- ` antes de `[ ]`/`[x]` |
| `cm-formatting-ul-marker` | `Decoration.mark` | `-`/`*`/`+` de lista não-ordenada |
| `cm-formatting-hard-break` | `Decoration.mark` | `\` ou 2+ espaços antes de newline |

Widgets `replace`:
- `OrderedListMarkerWidget` (renderiza `N.` com classe `.cm-lp-ol-marker`)
- `InlineMathWidget` (math inline)

### inlineMarksPlugin
| Classe | Tipo | Observação |
|---|---|---|
| `cm-formatting-inline` | `Decoration.mark` | Marcas `**`, `*`, `` ` ``, `~~`, `==` fora do cursor |
| `cm-formatting-inline-visible` | `Decoration.mark` | Marcas com cursor próximo (cursor-reveal) |

### inlineCommentPlugin
| Classe | Tipo | Observação |
|---|---|---|
| `cm-lp-inline-comment` | `Decoration.mark` | HTML comment fora do cursor (opacity 0.5) |
| `cm-lp-inline-comment cm-lp-inline-comment-hidden` | `Decoration.mark` | HTML comment oculto (display: none) |

### blockReferencePlugin
| Classe | Tipo | Observação |
|---|---|---|
| `cm-lp-block-ref` | `Decoration.mark` | `^abc123` fora do cursor (opacity 0.5) |
| `cm-lp-block-ref cm-lp-block-ref-hidden` | `Decoration.mark` | Oculto com display: none |

### imagePlugin / wikilinkEmbedPlugin / footnotePlugin
| Classe | Tipo | Observação |
|---|---|---|
| `cm-lp-image-wrapper` / `cm-lp-image` | via widget | Imagem renderizada |
| `cm-lp-embed` + filhos (`cm-lp-embed-header`, etc.) | via widget | Wikilink embed |
| `cm-lp-footnote-ref` | `Decoration.mark` (styles.ts:12) | Ref `[^1]` |
| `cm-lp-footnote-def-marker` | `Decoration.mark` (styles.ts:13) | Def marker `[^1]:` |

## Classes compartilhadas (preservar nomes exatos)

Estas classes têm estilos em `livePreviewStyles` (baseTheme) e são provavelmente referenciadas por temas externos. **Nomes NÃO podem mudar** no caminho novo.

### Esconder/mostrar marcações (cursor-reveal)
- `cm-formatting-inline` / `cm-formatting-inline-visible`
- `cm-formatting-block` / `cm-formatting-block-visible`

### Marcadores CSS-only (Decoration.mark + ::before/::after)
- `cm-formatting-hr` / `cm-lp-hr-line`
- `cm-formatting-task-marker`
- `cm-formatting-ul-marker` / `cm-formatting-ul-marker::before`
- `cm-formatting-hard-break` / `cm-formatting-hard-break::after`

### Conteúdo estilizado (HighlightStyle target na Fase 2)
- `cm-lp-bold`, `cm-lp-italic`, `cm-lp-strikethrough`, `cm-lp-code`, `cm-lp-highlight`
- `cm-lp-h1`..`cm-lp-h6`
- `cm-lp-blockquote`, `cm-lp-blockquote-2`, `cm-lp-blockquote-3`
- `cm-lp-link`, `cm-lp-wikilink`, `cm-lp-link-ref-def`
- `cm-lp-footnote-ref`, `cm-lp-footnote-def-marker`
- `cm-lp-block-ref`, `cm-lp-block-ref-hidden`
- `cm-lp-inline-comment`, `cm-lp-inline-comment-hidden`
- `cm-lp-ol-marker`, `cm-lp-ul-marker`
- `cm-lp-hidden-line`, `cm-lp-hard-break`

## Mapa HighlightStyle ↔ Lezer tags (Fase 2)

Tabela que vai alimentar o `HighlightStyle.define([...])`:

| Lezer tag (`@lezer/highlight`) | Classe preservada | Nó markdown |
|---|---|---|
| `t.strong` | `cm-lp-bold` | `StrongEmphasis` |
| `t.emphasis` | `cm-lp-italic` | `Emphasis` |
| `t.strikethrough` | `cm-lp-strikethrough` | `Strikethrough` |
| `t.monospace` | `cm-lp-code` | `InlineCode` |
| `t.heading1` | `cm-lp-h1` | `ATXHeading1` |
| `t.heading2` | `cm-lp-h2` | `ATXHeading2` |
| `t.heading3` | `cm-lp-h3` | `ATXHeading3` |
| `t.heading4` | `cm-lp-h4` | `ATXHeading4` |
| `t.heading5` | `cm-lp-h5` | `ATXHeading5` |
| `t.heading6` | `cm-lp-h6` | `ATXHeading6` |
| `t.link` | `cm-lp-link` | `Link` |
| `t.quote` | `cm-lp-blockquote` | `Blockquote` (nível 1) |
| `t.processingInstruction` | `cm-formatting-block` / `-inline` | Marks (HeaderMark, EmphasisMark, etc.) |

### Casos que **não** vão para HighlightStyle (precisam do handler registry)

- `cm-lp-highlight` — `==text==` **não tem nó Lezer** (é parser custom em `parsers/highlight`).
- `cm-lp-blockquote-2` / `-3` — depth > 1 precisa lógica, não atributo de nó.
- `cm-lp-wikilink`, `cm-lp-link-ref-def` — podem ter tag própria mas provavelmente exigem lógica extra.
- Marcas `cm-formatting-*` com estado `-visible` — cursor-reveal é state-dependent, fica no `inlineFormattingPlugin`.
- `cm-lp-inline-comment`, `cm-lp-block-ref` — HTML comments + block refs, parsers custom.
- `cm-formatting-hr`, `cm-lp-hr-line`, `cm-formatting-task-marker`, `cm-formatting-ul-marker`, `cm-formatting-hard-break` — envolvem `Decoration.replace` ou `Decoration.line` por contexto de linha.

## Contrato de migração

1. **Preservar 100% dos nomes** listados na seção "Classes compartilhadas" acima.
2. **Preservar o baseTheme `livePreviewStyles`** inteiro (staticamente) — ele continua sendo a fonte dos estilos, só muda quem aplica as classes.
3. **Validar via snapshot** no final da Fase 2 que `pnpm vitest run` + teste manual renderiza as mesmas classes nos mesmos nodes.
