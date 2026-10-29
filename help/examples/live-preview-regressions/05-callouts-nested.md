# Nested callouts

Expect: every callout renders, none disappears, titles are complete.

> [!warning] Outer callout
> Outer body
> > [!note] Inner callout
> > Inner body

> [!note] Title with trailing spaces   
> Body

> [!tip]- Folded callout
> Hidden until expanded

> [!info]+ Expanded foldable
> Visible body

> [!note] Callout with a plain quote inside
> > just a quote, styled as a quote

> > [!tip] Inner-only callout
> > body
>
> tail of the outer plain quote

> [!a] Level A
> > [!b] Level B
> > > a quote three levels deep

> plain quote first line
> [!note] not a callout, it is on line two

- > [!note] callout inside a list item (known: not recognised, renders as a quote)
