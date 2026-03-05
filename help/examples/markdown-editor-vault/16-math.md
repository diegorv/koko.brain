# Teste: Formulas Matematicas (KaTeX)

%%
COMO TESTAR:
- Verifique que formulas sao renderizadas por KaTeX
- Inline: renderizado inline no texto
- Block: renderizado centralizado
- Mova cursor para dentro e verifique que source aparece
%%

## 1. Math Inline Basica

A formula $E = mc^2$ e famosa.

O teorema de Pitagoras: $a^2 + b^2 = c^2$.

Area do circulo: $A = \pi r^2$.

%%
ESPERADO:
- Cursor fora: $ ocultos, formula renderizada por KaTeX inline
- Cursor dentro: $ visiveis, formula em texto puro
- Renderizado no fluxo do texto (inline)
%%

## 2. Math Inline com Operacoes

Soma: $\sum_{i=1}^{n} x_i$

Integral: $\int_{0}^{\infty} e^{-x} dx$

Fracao: $\frac{a}{b}$

Raiz quadrada: $\sqrt{x^2 + y^2}$

%%
ESPERADO:
- Cada formula renderizada corretamente com simbolos matematicos
- Subscripts e superscripts posicionados corretamente
%%

## 3. Math Inline com Matrizes e Vetores

Vetor: $\vec{v} = \begin{pmatrix} x \\ y \\ z \end{pmatrix}$

Produto escalar: $\vec{a} \cdot \vec{b} = \sum_{i} a_i b_i$

%%
ESPERADO:
- Vetores e matrizes renderizados corretamente
%%

## 4. Math Block Basico

$$
E = mc^2
$$

%%
ESPERADO:
- Cursor fora: $$ linhas ocultas, formula renderizada centralizada
- Cursor dentro: $$ e formula em texto puro
- Formula em display mode (maior, centralizada)
%%

## 5. Math Block Complexo

$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$

%%
ESPERADO:
- Integral grande renderizada com limites em cima e embaixo
%%

## 6. Math Block com Alinhamento

$$
\begin{aligned}
f(x) &= x^2 + 2x + 1 \\
&= (x + 1)^2
\end{aligned}
$$

%%
ESPERADO:
- Multiplas linhas alinhadas pelo &
- Cada linha da equacao posicionada corretamente
%%

## 7. Math Block - Matriz

$$
A = \begin{bmatrix}
a_{11} & a_{12} & a_{13} \\
a_{21} & a_{22} & a_{23} \\
a_{31} & a_{32} & a_{33}
\end{bmatrix}
$$

%%
ESPERADO:
- Matriz com colchetes renderizada corretamente
- Elementos alinhados em grid
%%

## 8. Math Block - Sistema de Equacoes

$$
\begin{cases}
x + y = 10 \\
2x - y = 5
\end{cases}
$$

%%
ESPERADO:
- Chave grande a esquerda
- Equacoes empilhadas
%%

## 9. Simbolos Gregos e Especiais

Letras gregas: $\alpha, \beta, \gamma, \delta, \epsilon, \theta, \lambda, \mu, \sigma, \omega$

Maiusculas: $\Gamma, \Delta, \Theta, \Lambda, \Sigma, \Omega$

Operadores: $\pm, \times, \div, \neq, \leq, \geq, \approx, \equiv, \sim$

Setas: $\rightarrow, \leftarrow, \Rightarrow, \Leftarrow, \leftrightarrow$

%%
ESPERADO:
- Todos os simbolos renderizados corretamente
%%

## 10. Math com Erro de Sintaxe

$\frac{1}{$ (fracao nao fechada)

$$
\begin{matrix}
sem fechar
$$

%%
ESPERADO:
- Erro KaTeX: texto vermelho de erro deve aparecer em vez da formula
- NAO deve crashar o editor
%%

## 11. Math Inline vs Cifrao Normal

O preco e $100 e o desconto e $50.

Texto com $ sozinho no meio.

%%
ESPERADO:
- $ seguido de numero SEM $ de fechamento: NAO deve ser interpretado como math
- $ sozinho: NAO deve criar bloco math
- Verificar heuristica de deteccao de math vs texto normal
%%

## 12. Edge Cases

$$$$

$$ formula na mesma linha $$

Math inline vazio: $$

%%
ESPERADO:
- $$ vazio: verificar comportamento
- $$ na mesma linha: verificar se e tratado como block ou inline
%%
