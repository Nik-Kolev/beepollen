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

Product photographs are free-licensed stand-ins. **Every one must be replaced
with the owner's own before launch** — a noindexed demo tolerates borrowed
images, a live shop does not.

Error boundaries take `retry`, not the `reset` most training data reaches for.
Anything the root layout renders — the header included — fails past `error.tsx`
into `global-error.tsx`.

`--color-wood` is the hive's timber; `--color-chrome-*` are the header and
footer surfaces. They were one token until the palette went teal and the hive's
roof went with it.

The `Bee` draws its linework in `currentColor`, so every instance sets a text
colour — `text-bee-dark` on light grounds. On a dark ground pass `outline`,
which traces the silhouette in the page colour first. Recolouring the linework
light instead produces a bee with white stripes, which reads as a different
insect. `outline` strokes that halo in `--color-ground`, so no palette may take
the ground below roughly `oklch(0.94)` or every footer bee loses its edge.

The footer's hive offset and the grid's `pr-*` reserve are one setting in two
places. The hive is absolute against the footer while the text is inset inside a
container that stops growing at `max-w-6xl`, so past that width the page margin
is the only thing absorbing the difference — size both for the narrowest width in
each tier, where that margin is zero, or the artwork lands on the last column.

Every font family must ship a `cyrillic` subset, checked in
`node_modules/next/dist/compiled/@next/font/dist/google/font-data.json` before
use — a family without one renders the whole site in a substituted system font
with no warning. Lato, Poppins, DM Sans, Plus Jakarta Sans, Figtree and Outfit
all fail this, which rules out much of any "best web fonts" list.

## Git process

Branches are `<type>/<lowercase-kebab-summary>`, where the type says what the
branch changes: `feature/` (new user-facing capability), `fix/` (a bug in
existing behaviour), `chore/` (tooling, config, dependencies, CI, docs — nothing
the app does changes), `refactor/` (structure changes, behaviour identical).

`develop` is the default branch and the base for every PR. `main` is promoted
from `develop` once a meaningful chunk of work is finished, and is never the
target of a feature PR.

Every PR runs `.github/workflows/ci.yml` — install, then the `format:check`,
`lint`, `typecheck` and `build` npm scripts. `npm run ci` runs the same four
locally, so a local pass and a CI pass mean the same thing. `typecheck`
regenerates route types before `tsc` because `LayoutProps` and friends live in
`.next/types`, which a clean checkout does not have.

Prettier is a pinned devDependency rather than an `npx` fetch, and `format:check`
runs in CI — a local pre-commit hook is personal config that no clone inherits,
so it cannot be the only thing enforcing format. Prettier 3 reads `.gitignore`
by default, so generated output needs no `.prettierignore`.

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

## Database

SQLite through Prisma 7 and `@prisma/adapter-libsql`. `DATABASE_URL` is the only
environment variable.

**Migrations are authored on the host and applied in the container.** Compose
syncs one way, host→container, so a migration created inside the container writes
its SQL to a filesystem that dies with the container and never reaches git. Run
`prisma migrate dev` on the host, then
`docker compose exec web npx prisma migrate deploy`. The two dev databases are
separate — host `data/dev.db`, container `/app/data/dev.db` on a named volume that
`docker compose down` keeps and `down -v` destroys.

`prisma.config.ts` reads `.env` only when `DATABASE_URL` is unset, because compose
injects it into a container that has no `.env` file and `loadEnvFile` throws rather
than no-opping when one is absent.

The generator is `prisma-client`, not the `prisma-client-js` most training data
reaches for. It emits `.ts` with no `index.ts`, so the import is
`@/generated/prisma/client`. That output is gitignored, which is why `prisma
generate` runs explicitly in `dev`, `build` and `typecheck` rather than from a
postinstall hook — a hook would fire in the Dockerfile's `deps` stage, which copies
only the manifests and has no schema to generate from. The Dockerfile passes
`DATABASE_URL` as `ARG`, so the build-time placeholder cannot survive as a runtime
default.

`db:studio` passes `--url` with a doubled slash — `file://./data/dev.db` —
because Studio reads the protocol as `url.split("://")[0]`, and a normal SQLite
URL has no `://`, so the entire string is taken as the protocol name and
rejected. That spelling fails the migration engine with `P1003`, so it cannot
become `DATABASE_URL` — the path is duplicated on purpose.

The seed runs through `tsx`, not `node`. Node strips the types fine, but the
generated client imports `./enums` and `./internal/class` without extensions and
Node’s ESM resolver cannot follow those. `db:fresh` chains `prisma db seed`
explicitly because `migrate reset` does not run the seed on Prisma 7 — Prisma 6
did, and most documentation still reads that way.

`Sprocket` and `Cog` are throwaway models that exist to exercise the tooling.
**They and their migrations are deleted when the real schema arrives.**

## Agent files

`AGENTS.md` is owned by Next.js tooling, not by this project. `next dev` rewrites
the `nextjs-agent-rules` block on every run, so edits inside those markers are
reverted, and deleting the block only re-creates it as an uncommitted change.
Commit it as-is and put project conventions here instead. `CLAUDE.md` imports
`AGENTS.md` on its first line, so both load.

Next 16 differs from most training data. Read `node_modules/next/dist/docs/`
before writing App Router code rather than relying on remembered APIs.

A plain value exported from a `"use client"` module is `undefined` when a server
component reads it at module scope — it type-checks, lints and builds, then ships
a wrong value. Constants shared across that boundary belong in a plain module
neither side marks.

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
