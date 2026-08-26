@AGENTS.md

# beepollen

Online shop for bee products — Пчелни продукти Д & Н Димитрови.
Next.js App Router, TypeScript, Tailwind v4.

## Language

**Site content is Bulgarian. Everything else is English** — code, identifiers,
comments, documentation, commit messages, PR descriptions. A Bulgarian string in
the codebase should be user-facing copy and nothing else.

## Git process

Branches are `<type>/<lowercase-kebab-summary>`, where the type says what the
branch changes: `feature/` (new user-facing capability), `fix/` (a bug in
existing behaviour), `chore/` (tooling, config, dependencies, CI, docs — nothing
the app does changes), `refactor/` (structure changes, behaviour identical).

`develop` is the default branch and the base for every PR. `main` is promoted
from `develop` once a meaningful chunk of work is finished, and is never the
target of a feature PR.

**Installing a package is not a unit of work.** A dependency carries no
revertable meaning on its own, so it belongs in the branch and commit of whatever
needed it — the same goes for a config change that exists only to make a feature
run. A commit is something that can be reverted on its own without breaking
anything else.

## Agent files

`AGENTS.md` is owned by Next.js tooling, not by this project. `next dev` rewrites
the `nextjs-agent-rules` block on every run, so edits inside those markers are
reverted, and deleting the block only re-creates it as an uncommitted change.
Commit it as-is and put project conventions here instead. `CLAUDE.md` imports
`AGENTS.md` on its first line, so both load.

Next 16 differs from most training data. Read `node_modules/next/dist/docs/`
before writing App Router code rather than relying on remembered APIs.

## Dependencies

npm's `allowScripts` gate is enabled. A package's `preinstall`/`postinstall`
script stays blocked until approved by name (`npm approve-scripts <pkg>`), which
writes a **version-pinned** entry into `package.json` — a version bump
deliberately re-triggers the review. Never approve with a blanket flag, and
re-run `npm install` afterwards so the approved script actually executes.
