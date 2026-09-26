@AGENTS.md

# beepollen

Online shop for bee products — Пчелни продукти Д & Н Димитрови.
Next.js App Router, TypeScript, Tailwind v4.

## Language

**Site content is Bulgarian. Everything else is English** — code, identifiers,
comments, documentation, commit messages, PR descriptions. A Bulgarian string in
the codebase should be user-facing copy and nothing else.

Route segments follow that rule — `/products`, not `/produkti`. A product slug is
the exception: it is the Bulgarian name transliterated into latin letters
(`pchelen-prashets-500g`), because the slug is the keyword a Bulgarian buyer
searches for, and Cyrillic in a URL percent-encodes into garbage when shared.

## UI conventions

One light theme: no dark mode, and no extra light shades invented alongside it.

Lorem ipsum stands in for undecided copy, and an explicit `TODO:` string stands
in for a fact the owner still owes — a price, a variety, a food-information field.
The seed and the product pages render them on purpose: they are page content, not
unfinished code. Never replace one with plausible Bulgarian filler, and never
invent an origin, certificate or review — plausible text survives to launch
unnoticed, and Lorem ipsum and `TODO:` cannot.

Prices are the single exception, added because checkout cannot be tested against
a catalogue that costs nothing. They live in the seed's `TODO_PRICE` object,
never inline, so every one is deletable in a single edit, and they are deleted at
launch rather than corrected into real ones. The unpublished draft row keeps a
zero price so the `TODO: цена` branch still has a row that reaches it. Ask before
inventing a number anywhere else.

The catalogue is pollen only. Honey and comb were seeded early against borrowed
free-licensed photographs and removed once the catalogue settled on pollen alone
— which also retired the Wikimedia attribution and share-alike obligation those
two carried. Every photograph now in `public/` is the owner's own, so a new
product needs a real photograph before it can be seeded, not a stand-in.

Error boundaries take `retry`, not the `reset` most training data reaches for.
Anything the root layout renders — the header included — fails past `error.tsx`
into `global-error.tsx`.

`--color-wood` is the hive's timber and stays its own token, apart from the
`--color-nav*` header and `--color-footer*` footer surfaces — while one token
served both, recolouring the surfaces repainted the hive's roof.

The `Bee` draws its linework in `currentColor`, so every instance sets a text
colour — `text-bee-dark` on light grounds. `outline` strokes the silhouette in
`--color-halo` before the linework is drawn; the header bees pass it. On a dark
ground it is the only correct option: recolouring the linework light instead
produces a bee with white stripes, which reads as a different insect.

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

The cart lives in `localStorage` alone, under one versioned key parsed with Zod;
anything unreadable or of another version is discarded rather than migrated.
`/cart` is a server component that hands its client half the whole published
catalogue — at this catalogue size that is cheaper than an API route and it keeps
the page prerendered, so a fetch added there would cost the prerender for nothing.
Quantities come from the visitor's own browser and nothing prices an order yet:
the server-side recalculation is owed by the checkout phase, not skipped.

The cart glyph is a modified Material Symbols path. Its attribution comment is a
condition of the Apache 2.0 licence, not a note.

Preflight strips the marker from every `ul`, and Safari and VoiceOver drop the
implicit `list` and `listitem` roles once a list has none, so a list used as a
grouping sets `role="list"` explicitly. Chromium keeps the roles either way,
which is why both Playwright projects pass whether or not the attribute is
there — `e2e/accessibility.spec.ts` asserts no rendered list is left without an
explicit role instead. A list that is only a layout wrapper says so with
`role="presentation"` rather than going bare.

A product's photo morphs from its card into the product page through React's
`ViewTransition`, imported from `react` with no `types` entry in `tsconfig.json`:
`next-env.d.ts` references Next's types, which pull in React's canary
declarations. A back navigation never starts a view transition, so the return to
the grid is deliberately unanimated — animating it means pushing `/`, which
breaks the back button that follows.

## Git process

Branches are `<type>/<lowercase-kebab-summary>`, where the type says what the
branch changes: `feature/` (new user-facing capability), `fix/` (a bug in
existing behaviour), `chore/` (tooling, config, dependencies, CI, docs — nothing
the app does changes), `refactor/` (structure changes, behaviour identical).

`develop` is the default branch and the base for every PR. `main` is promoted
from `develop` once a meaningful chunk of work is finished, and is never the
target of a feature PR.

Every PR runs `.github/workflows/ci.yml`. The `ci` job installs, then runs the
`format:check`, `lint`, `typecheck`, `test:unit`, `db:setup` and `build` npm
scripts; `npm run ci` runs the same six locally. An `e2e` job and a `lighthouse` job both
need `ci`, so browser tests never delay that fast feedback — `npm run test:e2e`
and `npm run test:perf` are their local equivalents, kept out of `npm run ci` so
a local check stays quick. All three together are what a green PR means. `typecheck` regenerates route types before `tsc` because
`LayoutProps` and friends live in `.next/types`, which a clean checkout does not
have.

Prettier is a pinned devDependency rather than an `npx` fetch, and `format:check`
runs in CI. Prettier 3 reads `.gitignore` by default, so generated output needs
no `.prettierignore`.

All three checks are required on `develop` and `main`, so a failing run blocks the
merge. The workflow file says what is checked; the branch ruleset is what makes passing
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
a demo for owner feedback, not the production host. `vercel.json` sets the Build
Command to `npm run build:demo` so each deploy prerenders from a database it
seeds itself; keeping it in the repo rather than the dashboard is what lets a
reader see it. Nothing at runtime opens that file.

`next.config.ts` sets `X-Robots-Tag: noindex, nofollow` on every route, because
Vercel noindexes preview deployments but not production ones. **Remove it when
the real production host and domain go live.**

`SITE_URL` in `src/lib/site.ts` is that same demo origin and `metadataBase`
resolves every canonical and Open Graph URL against it, so **it changes with the
domain, in the same pass as the header above.**

## Metadata

Metadata inheritance is shallow and per top-level key: a page that omits
`alternates` inherits its parent's canonical and so declares itself a duplicate
of it. Every page-level `generateMetadata` sets its own.

The product page's JSON-LD carries no `offers` on purpose. Every price is a
placeholder until the owner supplies real ones, and a structured price is one
search engines will publish — which was true of the €0.00 that came before these
and is worse now that the numbers look real.

## Orders

`placeOrder` in `src/lib/orders.ts` is the trust boundary. Only a slug and a
quantity survive validation; the name, price and availability of every line are
read back from the database, and Zod strips anything else the caller sends. A
product that is unpublished, out of stock or priced at zero is refused rather
than sold.

The idempotency key is a check-then-act: the pre-read cannot stop a concurrent
submission, so the unique index is what does, and the P2002 it raises is caught
and answered with the committed order. On `@prisma/adapter-libsql` that error
leaves the documented `meta.target` undefined and reports the violated fields at
`meta.driverAdapterError.cause.constraint.fields` — code matching only on
`target` silently treats the conflict as an unrelated failure and rethrows.

An order's `reference` is `BP`, the day and month in `Europe/Sofia`, then its
number within that day — `BP24091`. It is stored rather than derived, because a
per-day counter cannot be recomputed from a row id, and the lookup that finds
the day's last one orders by `id`, never by `reference`: `BP240910` sorts before
`BP24099`. A number lost to a concurrent order is retried five times and then
refused, since a throw would reach the error boundary and take the buyer's
filled-in form with it.

The chosen office is read back from `DeliveryOffice` by carrier and code rather
than trusted, and a code the table does not hold is answered with
`UNKNOWN_OFFICE` — the page is prerendered, so the snapshot can move after the
build that shipped it. Its carrier, code, name, city and street are then
snapshotted onto the order rather than referenced, because `econt:sync` can drop
an office.

The email is trimmed and lowercased before it keys `Customer`, and the phone is
accepted only as a Bulgarian number and stored as `+359…`, because Econt
delivers only in Bulgaria.

`Order` snapshots `contactName` and `contactPhone` the same way `OrderItem`
snapshots a product: `Customer` is the latest-known contact, never the record of
what an order was placed with. A `Consent` row stores the wording exactly as it
was shown, so editing `CONSENT_WORDING` never rewrites what someone agreed to.

The honeypot field is named `website` and is checked after parsing rather than in
the schema, so its rejection is byte-identical to the rate limiter's — a
validation error naming the field would tell a bot which check caught it. The
rate limiter is in-process and resets on deploy, which suits one Node process on
one host and would count per instance on any other.

`deliveryCents` is always zero until the courier choice exists; the column is
there so adding it costs no migration.

## Checkout

`/checkout` is one page — contact fields, the office picker, consents and the
line summary. The total is goods only until a tariff exists, so `deliveryCents`
stays zero.

The form submits from `onSubmit` inside `startTransition`, never through the
`action` prop. React resets a form once its action returns, wiping the fields a
buyer got right; controlling the inputs rescues the text values but not a
checkbox, because the reset changes the DOM while the state React diffs against
is unchanged. Calling the action outside a transition logs that `isPending` will
not update.

The answers, and the set of fields corrected since the last refusal, live in
`CheckoutForm`, which never unmounts — `FilledCheckout` is swapped out whenever
the cart empties, and state kept there dies with it.

The form is in the prerendered HTML inside a `fieldset` that stays disabled
until the cart has been read; only the lines and the total wait for the browser.
Rendered after the read instead, the page stayed empty until hydration and the
form's arrival shoved the footer down, which fails the Lighthouse layout-shift
budget. The cost moves to an empty cart, whose form collapses into the empty
state. The idempotency key is minted on the first submit and held in a ref,
never rendered, since markup on a static page is identical for every visitor.

`FormData` becomes the order payload in `src/lib/checkout-payload.ts`, not in the
action. A `"use server"` module can export only async functions, so a mapper left
there is unreachable from a unit test, and driving the action over HTTP needs the
build-generated action id.

The rate limiter is keyed on `x-real-ip`, falling back to the **last**
`x-forwarded-for` hop. The first hop is whatever the caller wrote, and a fresh
value per request would hand itself a fresh bucket.

The catalogue the page hands the browser is the one the build saw, since the
route is prerendered. A product unpublished, sold out or zeroed after that build
still looks buyable, so `UNAVAILABLE_ITEMS` from the order service is an expected
answer rather than a race — the page's own withdrawn and missing-price guards
only catch what the build already knew.

## Delivery

The office picker is a section of `/checkout`, between the contact fields and
the consents. Its choice reaches the action as a hidden `officeCode` and is held
in `CheckoutForm`, which never unmounts, so a refused submission keeps it like
every other answer.

City then office: a city with three or fewer offices lists them outright, and
from four up a search narrows the list instead. The map draws pins for whatever
the list currently shows rather than for the whole city, because София's 110
overlap into one blob; pins outside that set are dimmed and ignore clicks. It
fits to the middle 80% of the points, since a handful of far-flung offices
otherwise drag Бургас's view out to Поморие.

The city field is a combobox: its suggestions are `li role="option"` rather than
buttons, since a button inside an option is not valid, and the active one is
tracked with `aria-activedescendant` so the keyboard never tabs through 590
entries. Where a step replaces the control that opened it, focus is moved by
hand — to the office search or the first office after a city, back to the city
field when it is cleared — through a ref read in an effect keyed on the choices,
because setting state in an effect is what `react-hooks/set-state-in-effect`
refuses. Choosing an office moves nothing: that radio stays mounted, and taking
focus off it would break the arrow keys that walk the list. The `aria-live` line
names the chosen office instead of emptying.

The picker sits inside the order form, so every one of its text fields swallows
Enter. Without that, a search term and a press of Enter submit the order and
spend one of the five attempts the rate limiter allows. Asserting that the
refusal never appeared does not catch it — the assertion passes while the answer
is still in flight, so `e2e/delivery.spec.ts` counts the page's POSTs instead.

An office's `name` is not its heading. 159 of the 590 are named after their own
city, so the heading strips a repeated city prefix, and Econt reports no
settlement type — there is no way to write `гр.` or `с.` correctly, and the list
holds villages. The directions link omits `origin` so Google Maps starts from the
visitor's own location.

`preferCanvas` is deliberate: 590 SVG nodes stall a phone at country zoom. Its
cost is that Leaflet throws `clearRect` on teardown under React Strict Mode —
once per load in `next dev`, never against `npm start`. Check the production
build before treating it as a regression, and note that Playwright cannot select
canvas pins, so `e2e/delivery.spec.ts` covers the list and leaves the map alone.

Econt's office nomenclature is the one service of theirs that takes no
credentials — `Nomenclatures/NomenclaturesService.getOffices.json` answers an
unauthenticated POST on `ee.econt.com`, and sending the published demo account's
credentials is what makes that call fail. Everything else, prices included,
needs a shop registered at `delivery.econt.com`. Speedy has no equivalent open
endpoint: `api.speedy.bg/v1/location/office` refuses without a login.

Automated stations — Еконтомат, Speedymat, BoxNow — are filtered out of the
office list, because an order is paid at a counter and a locker takes card only.
The filter is on `isAPS` and applies to every carrier.

Nothing in the running app calls Econt. `prisma/data/econt-offices.json` is a
committed snapshot of 590 offices, the seed fills `DeliveryOffice` from it, and
`listEcontOffices` reads that table. `npm run econt:sync` is the only caller of
`src/lib/econt-nomenclature.ts`: it refetches, rewrites the snapshot and reports
what was added, removed and changed, so a refresh arrives as a reviewable diff.
Running it on a schedule waits for a host with cron. The 2.45 MB response is
over Next's 2 MB data-cache limit, which is why fetching it during a build was
never cached and made every build depend on Econt being up.

`src/lib/econt.ts` is client-safe — the type, the label and the sort, nothing
more — because the picker's client components import from it. The remote call,
its Zod schema and its mapping live in `econt-nomenclature.ts`, and the Prisma
read in `delivery-offices.ts`.

The map draws on free OpenStreetMap tiles. Their usage policy, re-read on
24 Sep 2026, permits normal interactive viewing by a human on three conditions:
visible attribution on the map, a clear User-Agent naming the caller, and no
preloading of regions or zoom stacks. The tile layer carries the attribution and
the sync script sets the User-Agent; a browser sends its own. The service is
best-effort and can be withdrawn without notice.

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

## Testing

Two layers. `npm run test:unit` runs `node:test` through tsx over `tests/**`,
for logic reachable without a browser — the order service above all, where the
rules being tested are the ones that stop a crafted request. It has no mocking
library on purpose: `scripts/test-unit.mjs` points `DATABASE_URL` at its own
`data/test.db`, deletes it, migrates and seeds it on every run, so the real
constraints fire and nothing can touch `data/dev.db`. Files run one at a time,
since they share that database.

Playwright is the other layer. It starts the app with
`npm run build:demo && npm start`, not `next dev` — but `reuseExistingServer` is
on outside CI, so a local run silently attaches to whatever already holds the
port. With `npm run dev` up, the whole suite tests Turbopack dev instead of the
build and can fail on differences that do not exist in what ships. Stop the dev
server before a local suite run, or read the result as provisional.
Dev runs Turbopack and is not what ships, so a smoke test against it proves less
than the seconds it saves. The suite runs twice, mobile project first, because
mobile is the priority everything else here is built around.

`@axe-core/playwright` scans each page against WCAG A and AA and fails on any
violation. It runs inside the existing suite rather than as its own job, because
the suite already builds the app and drives a browser. Add a scan for every new
page — the gate only covers routes a spec actually visits.

`error.tsx` and `global-error.tsx` are outside it because nothing currently
reaches them in a browser: every route is prerendered, so nothing renders at
request time to fail; the cart discards unreadable stored data rather than
throwing; a failed RSC payload fetch falls back to a full-page navigation, not
the error boundary; and the root layout is static. That is today's shape, not a
permanent exemption — revisit it when a route first renders at request time, as
the order submission will.

Lighthouse CI runs as its own `lighthouse` job and cannot run on Windows.
Lighthouse's CLI never passes Chrome a profile directory, so `chrome-launcher`
creates a temporary one and fails with `EPERM` deleting it after every run — no
config setting reaches it. The `filesystem` upload target is what writes the
reports the job attaches; `temporary-public-storage` publishes them at a public
URL.

It throttles with `devtools`, not Lighthouse's default simulation. The simulation
estimated the home page's LCP unchanged when its first photo started loading
eagerly, while a real throttled load fell from 3.8 s to 2.7 s — a limit on
simulated LCP cannot see that kind of regression.

`/checkout` is measured with a filled cart: `scripts/lighthouse-seed-cart.cjs`
writes one into `localStorage` first and throws if the form never renders, so a
changed cart format fails the job instead of quietly measuring the empty page.
OpenStreetMap tiles are blocked in every run, so the gate measures this app and
not a best-effort third-party server. `puppeteer-core` is a direct devDependency
because lhci resolves it from the project root, which a transitive copy reaches
only by chance. The job sets `CHROME_PATH` because, with a script configured,
lhci asks `puppeteer-core` for a browser it never downloaded, and that throws.

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

The home page queries the catalogue during `next build`, so every path that
builds the app seeds first — CI as its own step, Playwright's `webServer`, the
Dockerfile's builder stage and Vercel's Build Command all reach `db:setup`. It
generates the client itself rather than trusting an earlier step to have done
it, because the generated client is gitignored and only CI's `ci` job happens to
run `typecheck` beforehand. A migrated but unseeded database is the dangerous
case: the query returns no rows, the empty state renders and the build goes
green with an empty shop.

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

`db:studio` passes `--url file://./data/dev.db`: Studio reads the protocol as
`url.split("://")[0]`, so a normal SQLite URL is taken whole as the protocol name
and rejected, while that doubled slash fails the migration engine with `P1003`.
The path is duplicated on purpose. Studio also cannot run in the container — it
binds loopback there with no flag to change it, so `compose.yaml` publishes only
3000 and Studio stays on the host.

The seed runs through `tsx`, not `node`. Node strips the types fine, but the
generated client imports `./enums` and `./internal/class` without extensions and
Node’s ESM resolver cannot follow those. `db:fresh` chains `prisma db seed`
explicitly because `migrate reset` does not run the seed on Prisma 7 — Prisma 6
did, and most documentation still reads that way.

Each pack size is its own `Product` row rather than a variant of one — at this
catalogue size a variant table buys nothing, and net quantity is a per-size legal
label field anyway. `variety` is free text because a batch is a blend, "40%
акация, 60% липа", not a category.

The food-information fields are nullable so a product can be drafted. All six are
required before `isPublished`, and nothing enforces that yet — not the database
and not the application, so the seed publishes rows whose fields hold `TODO:`
text.

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

`allowScripts` in `package.json` lists the dependencies whose
`preinstall`/`postinstall` scripts have been reviewed. Approve one by name
(`npm approve-scripts <pkg>`), which writes a **version-pinned** entry — a
version bump deliberately re-triggers the review. Never approve with a blanket
flag. Approving runs nothing, and a second `npm install` finds the tree up to
date and runs nothing either: `npm rebuild <pkg>` is what executes the approved
script.

CI and the Dockerfile's `deps` stage install with
`npm ci --strict-allow-scripts`, which fails the install when a package's
install script is not covered by `allowScripts`. Without the flag npm runs the
unreviewed script anyway and only prints a notice, so the run stays green.

Dependabot watches the `github-actions` ecosystem only. npm version updates stay
off until the lint and test tooling is settled, so the bot cannot reopen a
version decision that was postponed on purpose.
