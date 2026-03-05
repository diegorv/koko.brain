# Teste: Formatacao Inline

%%
COMO TESTAR:
- Mova o cursor para FORA de cada elemento e verifique que os marcadores estao ocultos
- Mova o cursor para DENTRO de cada elemento e verifique que os marcadores aparecem
- As transicoes devem ser suaves (animacao CSS), sem pop-in/pop-out
- Nenhuma decoracao deve aparecer dentro de blocos de codigo
%%

## 1. Negrito

Texto normal **texto em negrito** texto normal.

Texto normal __negrito com underline__ texto normal.

**Negrito no inicio** da linha.

Fim da linha em **negrito**.

%%
ESPERADO:
- Cursor fora: ** ocultos, texto aparece em negrito (font-weight bold)
- Cursor dentro: ** visiveis com animacao suave, texto continua em negrito
- Ambas sintaxes (** e __) devem funcionar identicamente
%%

## 2. Italico

Texto normal *texto em italico* texto normal.

Texto normal _italico com underline_ texto normal.

*Italico no inicio* da linha.

Fim da linha em *italico*.

%%
ESPERADO:
- Cursor fora: * ocultos, texto aparece em italico (font-style italic)
- Cursor dentro: * visiveis com animacao suave
%%

## 3. Negrito + Italico

Texto ***negrito e italico*** texto normal.

Texto **_negrito e italico_** texto normal.

Texto *__negrito e italico__* texto normal.

%%
ESPERADO:
- Cursor fora: marcadores ocultos, texto aparece negrito E italico simultaneamente
- Cursor dentro: todos os marcadores visiveis
%%

## 4. Tachado (Strikethrough)

Texto normal ~~texto tachado~~ texto normal.

~~Tachado no inicio~~ da linha.

%%
ESPERADO:
- Cursor fora: ~~ ocultos, texto com line-through
- Cursor dentro: ~~ visiveis com animacao suave
%%

## 5. Codigo Inline

Texto normal `codigo inline` texto normal.

`Codigo no inicio` da linha.

Fim da linha em `codigo`.

Codigo com backtick duplo ``codigo com ` backtick`` dentro.

%%
ESPERADO:
- Cursor fora: backticks ocultos, texto em monospace com background colorido e border-radius
- Cursor dentro: backticks visiveis com animacao suave
- Backtick duplo deve funcionar para codigo contendo backtick
%%

## 6. Highlight

Texto normal ==texto destacado== texto normal.

==Highlight no inicio== da linha.

Fim da linha em ==highlight==.

%%
ESPERADO:
- Cursor fora: == ocultos, texto com background amarelo
- Cursor dentro: == visiveis com animacao suave
- Implementado via regex (nao via Lezer), verificar que funciona consistentemente
%%

## 7. Sequencias de Escape

Asteriscos escapados: \*nao e italico\*

Hashtag escapada: \# nao e heading

Underline escapado: \_nao e italico\_

Til escapado: \~\~nao e tachado\~\~

Barra escapada: \\ (barra invertida literal)

%%
ESPERADO:
- Cursor fora: \ (barra invertida) oculta, caractere escapado visivel como texto normal
- Cursor dentro: \ visivel
- O texto NAO deve ser formatado (nao deve ficar italico, negrito, etc.)
%%

## 8. Combinacoes na Mesma Linha

Este texto tem **negrito**, *italico*, ~~tachado~~, `codigo` e ==highlight== tudo junto.

**Negrito com *italico dentro* e mais negrito**.

~~Tachado com **negrito dentro** e mais tachado~~.

%%
ESPERADO:
- Cada elemento deve funcionar independentemente
- Mover o cursor sobre um elemento deve revelar apenas os marcadores DAQUELE elemento
- Os outros elementos na mesma linha devem permanecer em modo preview
%%

## 9. Formatacao Inline Dentro de Bloco de Codigo (Nao Deve Decorar)

```
**isto nao deve ficar negrito**
*isto nao deve ficar italico*
~~isto nao deve ficar tachado~~
`isto nao deve ter estilo de codigo inline`
==isto nao deve ficar highlighted==
```

%%
ESPERADO:
- NENHUMA formatacao inline deve ser aplicada dentro do bloco de codigo
- O bloco de codigo deve ser renderizado como widget com syntax highlighting
- isInsideBlockContext() deve impedir qualquer decoracao inline
%%

## 10. Edge Cases

Asterisco sozinho * no meio do texto.

Dois asteriscos ** sem fechar.

Marcadores vazios: **** e ~~~~ e ```` e ====.

Negrito com espacos: ** texto ** (nao deve formatar).

Formatacao em uma unica palavra: p**ar**cial e i*ta*lico parcial.

%%
ESPERADO:
- Marcadores nao fechados ou mal formados NAO devem ser formatados
- Marcadores vazios NAO devem criar formatacao
- Formatacao parcial de palavra DEVE funcionar (par em negrito dentro de "parcial")
%%
