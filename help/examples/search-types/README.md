# Search examples

Twenty-eight short notes on unrelated topics (standups, recipes, travel,
therapy, Rust, Docker), in English and Portuguese. They give the three
search modes something to rank: text search finds exact words, semantic
search finds paraphrases and the other language, and hybrid mixes both.
There are no queries in these files; type them in the search panel.

## Inside a large vault

Search covers the whole vault, so results from your own notes appear next
to these. In **text** mode, add `path:search-types` to keep only this
folder:

- `carbonara path:search-types` finds `06-recipe-carbonara.md`.
- `sprint tag:retro path:search-types` combines a tag and the folder.

**Semantic** and **hybrid** modes ignore `path:` (and `tag:`) and always
rank the whole vault. Results from this folder are the ones whose path
contains `search-types/`; try `how to avoid burning out at work` or
`receita brasileira com feijão` and look for `17-burnout-prevention.md` or
`23-receita-feijoada.md` among your own notes. Semantic search returns at
most 20 results, so they show up only if they rank in the top 20.

See [Search and navigation](../../documentation/06-search-and-navigation.md)
for the operators and how each mode works.
