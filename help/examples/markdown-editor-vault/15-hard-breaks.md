# Teste: Hard Line Breaks

%%
COMO TESTAR:
- Verifique que indicador de quebra de linha aparece
- Dois metodos: 2+ espacos no final ou \ no final
%%

## 1. Trailing Spaces (2+ espacos)

Esta linha tem dois espacos no final.
E esta e a proxima linha (deve ser quebra de linha, nao paragrafo novo).

Esta tem tres espacos.
Proxima linha.

%%
ESPERADO:
- Cursor fora: espacos substituidos por indicador visual (simbolo de seta para baixo)
- Widget HardBreakWidget mostra simbolo de quebra de linha
- A quebra e <br>, nao um novo paragrafo
%%

## 2. Backslash no Final da Linha

Esta linha termina com barra invertida.\
E esta e a proxima linha.

%%
ESPERADO:
- Cursor fora: \ substituido pelo mesmo indicador visual de quebra
- CommonMark 6.7 spec compliance
%%

## 3. Comparacao: Hard Break vs Paragrafo

Linha com hard break (2 espacos)
Proxima linha (mesmo paragrafo, so quebra de linha).

Linha com paragrafo novo.

Proxima linha (novo paragrafo, com espaco vertical entre eles).

%%
ESPERADO:
- Hard break: linhas juntas, sem espaco vertical extra
- Novo paragrafo: espaco vertical entre paragrafos
%%

## 4. Multiplos Hard Breaks Consecutivos

Primeira linha
Segunda linha
Terceira linha
Quarta linha

%%
ESPERADO:
- Cada quebra tem seu indicador
- Todas as linhas em sequencia sem espaco extra
%%

## 5. Edge Cases

Um espaco no final (NAO e hard break).
Proxima linha.

Linha normal sem espacos extras.
Proxima linha (soft wrap, sem quebra forcada).

%%
ESPERADO:
- 1 espaco: NAO deve gerar hard break (precisa de 2+)
- Sem espacos: soft wrap normal do editor
%%
