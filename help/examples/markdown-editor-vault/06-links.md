# Teste: Links

%%
COMO TESTAR:
- Verifique que partes da sintaxe sao ocultas quando cursor fora
- Verifique cor azul e sublinhado
- Teste Cmd+Click para abrir URLs no browser
%%

## 1. Link Markdown Basico

Texto com [link para Google](https://www.google.com) no meio.

[Link no inicio](https://example.com) da linha.

Fim da linha com [link](https://example.com).

%%
ESPERADO:
- Cursor fora: "[" e "](url)" ocultos, apenas texto do link visivel em azul com sublinhado
- Cursor dentro: sintaxe completa visivel [texto](url)
- Cmd+Click: deve abrir URL no browser (verificar isSafeUrl)
%%

## 2. Link com Titulo

[Link com titulo](https://example.com "Titulo do Link")

%%
ESPERADO:
- Titulo deve ser incluido na parte oculta
- Mesmo comportamento visual que link basico
%%

## 3. Links de Referencia

Este e um [link de referencia][ref1] e outro [link][ref2].

[ref1]: https://example.com
[ref2]: https://example.org "Titulo"

%%
ESPERADO:
- Links de referencia estilizados como links normais
- Linhas de definicao ([ref]: url) devem ficar dimmed (classe .cm-lp-link-ref-def)
- Cursor fora: referencia oculta, texto visivel
%%

## 4. Autolinks

Link automatico: <https://www.google.com>

Email automatico: <user@example.com>

%%
ESPERADO:
- Cursor fora: < e > ocultos, URL/email estilizado como link
- Cursor dentro: < e > visiveis
%%

## 5. URLs Bare (Deteccao Automatica)

URL automatica: https://www.google.com

Outra URL: https://github.com/anthropics/claude-code

URL com path: https://example.com/path/to/page?query=value&other=123

%%
ESPERADO:
- URLs devem ser automaticamente detectadas e estilizadas como links (azul + sublinhado)
- Deteccao via regex (findExtendedAutolinkRanges)
- URLs dentro de Link/Autolink/Image nodes NAO devem ser re-decoradas
%%

## 6. Multiplos Links na Mesma Linha

Texto com [primeiro](https://a.com) e [segundo](https://b.com) e [terceiro](https://c.com) links.

%%
ESPERADO:
- Cada link independente
- Mover cursor sobre um link revela apenas os marcadores DAQUELE link
%%

## 7. Link com Formatacao Inline

[**Link em negrito**](https://example.com)

[*Link em italico*](https://example.com)

[`Link em codigo`](https://example.com)

[~~Link tachado~~](https://example.com)

%%
ESPERADO:
- Formatacao inline dentro do texto do link deve funcionar
- Ambos os estilos (link + formatacao) devem ser aplicados
%%

## 8. Links Quebrados / Invalidos

[Link sem URL]()

[Link com URL invalida](nao-e-url)

[Link com javascript](javascript:alert('xss'))

%%
ESPERADO:
- Link sem URL: pode ou nao ser estilizado
- URL invalida: verificar comportamento
- javascript: URLs: isSafeUrl() deve BLOQUEAR (seguranca XSS)
%%

## 9. Edge Cases

[](https://example.com) (texto vazio)

Colchetes [nao fechados

[Link com [colchetes] dentro](https://example.com)

Texto com URL nua sem protocolo: example.com (nao deve ser link)

%%
ESPERADO:
- Texto vazio: verificar se renderiza como link
- Colchetes nao fechados: NAO deve ser tratado como link
- URL sem protocolo: NAO deve ser auto-detectada
%%
