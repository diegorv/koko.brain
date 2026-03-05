# Teste: Notas de Rodape

%%
COMO TESTAR:
- Verifique estilo superscript e cor azul nas referencias
- Verifique que definicoes tem marcador em bold azul
- Teste inline footnotes
%%

## 1. Referencia de Footnote

Este texto tem uma nota de rodape[^1] e outra aqui[^segunda].

[^1]: Esta e a definicao da primeira nota.
[^segunda]: Esta e a definicao da segunda nota.

%%
ESPERADO:
- [^1] e [^segunda]: superscript, cor azul, clicavel
- Definicoes: marcador [^1]: em bold azul
- Click na referencia: pode navegar para definicao
%%

## 2. Footnote Multi-Linha

Este texto tem uma nota complexa[^longa].

[^longa]: Esta e a primeira linha da nota.
    Esta e a segunda linha (indentada com 4 espacos).
    E a terceira linha.

%%
ESPERADO:
- Multiplas linhas indentadas fazem parte da mesma definicao
- Todas as linhas devem ser estilizadas como parte da footnote
%%

## 3. Inline Footnote

Este texto tem uma nota inline^[esta e a nota inline diretamente no texto] no meio.

Outra nota inline aqui^[com **formatacao** dentro].

%%
ESPERADO:
- Cursor fora: ^[ e ] ocultos, texto visivel como superscript
- Cursor dentro: sintaxe completa visivel
- Formatacao dentro da inline footnote deve funcionar
%%

## 4. Multiplas References

Texto com[^a] varias[^b] notas[^c] de rodape.

[^a]: Definicao A.
[^b]: Definicao B.
[^c]: Definicao C.

%%
ESPERADO:
- Cada referencia independente com superscript
- Cada definicao com marcador estilizado
%%

## 5. Edge Cases

Referencia sem definicao[^inexistente].

[^orphan]: Definicao sem referencia no texto.

%%
ESPERADO:
- Referencia sem definicao: verificar se ainda e estilizada
- Definicao orfã: verificar se ainda aparece estilizada
%%
