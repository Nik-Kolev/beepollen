@AGENTS.md

# beepollen

Online shop for bee products — Пчелни продукти Д & Н Димитрови.
Next.js App Router, TypeScript, Tailwind v4.

## Language

**Site content is Bulgarian. Everything else is English** — code, identifiers,
comments, documentation, commit messages, PR descriptions. A Bulgarian string in
the codebase should be user-facing copy and nothing else.

## UI conventions

One light theme: no dark mode, and no extra light shades invented alongside it.

Lorem ipsum stands in for undecided copy.

## Git process

Branches are `<type>/<lowercase-kebab-summary>`, where the type says what the
branch changes: `feature/` (new user-facing capability), `fix/` (a bug in
existing behaviour), `chore/` (tooling, config, dependencies, CI, docs — nothing
the app does changes), `refactor/` (structure changes, behaviour identical).

`develop` is the default branch and the base for every PR. `main` is promoted
from `develop` once a meaningful chunk of work is finished, and is never the
target of a feature PR.

Every PR runs `.github/workflows/ci.yml` — install, then the `lint`, `typecheck` and
`build` npm scripts. `npm run ci` runs the same three locally, so a local pass and a
CI pass mean the same thing. `typecheck` regenerates route types before `tsc`
because `LayoutProps` and friends live in `.next/types`, which a clean checkout
does not have.

The check is required on `develop` and `main`, so a failing run blocks the merge.
The workflow file says what is checked; the branch ruleset is what makes passing
mandatory, and it lives in GitHub's settings so a PR cannot remove the rule
judging it.

PRs land by **rebase merge**, the only method the ruleset allows. Commits are
replayed onto `develop` with new hashes, so each one stays independently
revertable and no merge commits appear. A branch is dead once its PR merges — its
commits no longer exist under those hashes, so pull `develop` and branch again
rather than reusing it.

**Installing a package is not a unit of work.** A dependency carries no
revertable meaning on its own, so it belongs in the branch and commit of whatever
needed it — the same goes for a config change that exists only to make a feature
run. A commit is something that can be reverted on its own without breaking
anything else.

## Preview deployment

Vercel serves `develop` at a permanent demo URL and each PR at a temporary one —
a demo for owner feedback, not the production host.

`next.config.ts` sets `X-Robots-Tag: noindex, nofollow` on every route, because
Vercel noindexes preview deployments but not production ones. **Remove it when
the real production host and domain go live.**

## Docker

`compose.yaml` syncs source into the container rather than bind-mounting it. A
bind mount never delivers an edit on Windows — file events do not cross the
Windows→WSL2→container boundary, and `WATCHPACK_POLLING` cannot rescue it,
because `next dev` runs Turbopack, whose watcher never reads that variable.

`output: "standalone"` is set only when `BUILD_STANDALONE` is, which the builder
stage exports. Setting it unconditionally breaks the Vercel build: standalone
mode folds the top-level `next-server.js.nft.json` trace into `.next/standalone`,
and Vercel's `onBuildComplete` adapter opens that trace and fails with `ENOENT`.
The compile succeeds first, so the failure looks unrelated to the config.

The standalone `server.js` does **not** serve `public/` or `.next/static`. The
Dockerfile copies both in explicitly — drop either and the site still returns
200, with no styling.

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

CI installs with `npm ci --strict-allow-scripts`, which fails the run when a
package's install script is not covered by `allowScripts`. Without it npm skips
the script and the run stays green.

Dependabot watches the `github-actions` ecosystem only. npm version updates stay
off until the lint and test tooling is settled, so the bot cannot reopen a
version decision that was postponed on purpose.
