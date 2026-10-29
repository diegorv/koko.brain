# Inline formatting on one line

Move with ArrowLeft/ArrowRight inside each line. Expect: all syntax on the line stays visible while the cursor is anywhere on it; leaving the line hides it.

**one** and **two** and *three* and ~~four~~ and ==five== and `six`

A [markdown link](https://example.com) next to a [[01-arrows-bullet-heading|wikilink alias]] and <https://autolink.example>

Escapes: \*not italic\* and \# not a heading

Inline comment %%hidden note%% then text after it.

Inline math $a^2 + b^2 = c^2$ inside a sentence.

Footnote reference[^1] in a sentence.

[^1]: The footnote text.

Mixed: **bold with [link](https://example.com) inside** and *italic with `code` inside*
