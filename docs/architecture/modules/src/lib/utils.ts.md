---
summary: "cn(), the class-name merge helper used by every component, and shadcn prop helper types."
---

## Responsibility

A single file next to the `src/lib/utils/` folder, kept at this path because `components.json` sets the shadcn-svelte `utils` alias to `#lib/utils`, so generated primitives import `cn` from `#lib/utils.js`. It exports cn() (clsx plus tailwind-merge) and the prop helper types the generated primitives use.

## Key files

- `src/lib/utils.ts`: cn() (clsx plus tailwind-merge extended with the app text roles) and shadcn prop helper types.

## Collaborators

- `src/lib/utils`: text-roles.ts provides TEXT_ROLES, which cn() registers with tailwind-merge.
- `src/lib/components`: The primitives call cn().

## Gotchas

- cn() extends tailwind-merge with TEXT_ROLES from src/lib/utils/text-roles.ts; without that, a custom text-role class is treated as a color class and cn() drops the real color class next to it.
