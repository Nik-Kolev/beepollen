@AGENTS.md

# beepollen

Online shop for bee products — Пчелни продукти Д & Н Димитрови.
Next.js App Router, TypeScript, Tailwind v4.

## Language

**Site content is Bulgarian. Everything else is English** — code, identifiers,
comments, documentation, commit messages, PR descriptions. A Bulgarian string in
the codebase should be user-facing copy and nothing else.

Code carries no comments. The exceptions are the cart glyph's licence
attribution and an `eslint-disable` line's stated reason; a reason worth keeping
goes in this file instead.

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

The owner's phone is a real fact he supplied and lives once, as `OWNER_PHONE` in
`src/lib/site.ts`; every page that shows it reads it from there.

Prices are the single exception, added because checkout cannot be tested against
a catalogue that costs nothing. They live in the seed's `TODO_PRICE` object,
never inline, so every one is deletable in a single edit, and they are deleted at
launch rather than corrected into real ones. Deleting them changes only a database
seeded afterwards, since the seed never updates an existing row's price. They differ from one another on
purpose, since equal prices hide a quantity or subtotal bug. The unpublished
zero-price draft the tests need is not in the seed:
`scripts/seed-test-fixtures.ts` adds it to the unit and e2e databases after
seeding, so it never reaches a database anyone reviews. The Econt
tariff, `TODO_ECONT_TARIFF_CENTS` in `src/lib/econt.ts`, is another invented
number, for the same reason; it is replaced by calculated Econt prices rather than
corrected. `TODO_VISITORS` in `src/lib/analytics.ts` is the third: the admin's
visitor and traffic-source counts until GA4 is wired, announced as sample numbers
on the page, and deleted when the GA4 read replaces it. Ask before inventing a
number anywhere else.

`/admin/todo` lists everything the owner still owes. Product fields are read
from the database; the rest is `OWNER_TODOS` in `src/lib/owner-todos.ts`, each
item naming its files and the exact `TODO` text it stands for.
`tests/owner-todos.test.ts` fails when a `TODO` under `src/` or in
`prisma/seed.ts` is covered by no item, or when an item's text is gone from its
files — so a new `TODO:` joins that list in the same change, and a filled one
leaves it. Markers are whole phrases compared for equality: a `TODO:` in page
prose must be wrapped in `<Todo>` — the test refuses one outside it — and its
phrase ends at `</Todo>`; one in a string ends at the closing quote; a `TODO_*`
name is matched as a whole word.

The catalogue is pollen only. Honey and comb were seeded early against borrowed
free-licensed photographs and removed once the catalogue settled on pollen alone
— which also retired the Wikimedia attribution and share-alike obligation those
two carried. Every photograph now in `public/` is the owner's own, so a new
product needs a real photograph before it can be seeded, not a stand-in.

Error boundaries take `retry`, not the `reset` most training data reaches for.
An `error.tsx` never covers the layout of its own segment, so a throw in the
header — rendered by `(shop)/layout.tsx` — fails past `(shop)/error.tsx` into
`global-error.tsx`.

The root layout renders no chrome: the header, `<main>` and footer are
`ShopFrame`, rendered by `(shop)/layout.tsx`, and the admin has its own bare
layout. `not-found.tsx` stays at the root as the one 404 for every unknown URL,
`/admin/*` included, and draws `ShopFrame` itself, because it renders under the
root layout alone. Two root layouts would need the experimental `globalNotFound`
flag for that 404. A `notFound()` thrown inside a `(shop)` page renders
`(shop)/not-found.tsx` instead, which is bare: resolving to the root one there
drew the frame a second time inside the group's own.

`--color-wood` is the hive's timber and stays its own token, apart from the
`--color-nav*` header and `--color-footer*` footer surfaces — while one token
served both, recolouring the surfaces repainted the hive's roof.

The `Bee` draws its linework in `currentColor`, so every instance sets a text
colour — `text-bee-dark` on light grounds. `outline` strokes the silhouette in
`--color-halo` before the linework is drawn; the header bees pass it. On a dark
ground it is the only correct option: recolouring the linework light instead
produces a bee with white stripes, which reads as a different insect.

`OwnerEmblem` is the owner's own mark, redrawn from his business card and bag
label. The header shows variant `b`; the others are kept on purpose for
comparing at small sizes. Its link is `tabIndex={-1}` and `aria-hidden`, so the
wordmark stays the one home link keyboard and screen-reader users meet — a single
link spanning both put the mobile focus ring over the cart's bee.

The footer's hive offset and the grid's `pr-*` reserve are one setting in two
places. The hive is absolute against the footer while the text is inset inside a
container that stops growing at `max-w-6xl`, so past that width the page margin
is the only thing absorbing the difference — size both for the narrowest width in
each tier, where that margin is zero, or the artwork lands on the last column.

The sticky header's height is written into three other places: `scroll-pt-24
sm:scroll-pt-20` on `<html>`, which keeps anchor targets and focused fields out
from under it, and the checkout summary's `lg:top-20`. A taller header needs all
three raised with it, or a focused field hides beneath it with no warning.

Every font family must ship a `cyrillic` subset, checked in
`node_modules/next/dist/compiled/@next/font/dist/google/font-data.json` before
use — a family without one renders the whole site in a substituted system font
with no warning. Lato, Poppins, DM Sans, Plus Jakarta Sans, Figtree and Outfit
all fail this, which rules out much of any "best web fonts" list.

Roboto is the default face; Alegreya is opt-in through `font-head`, never a
global heading rule. The font calls live in `src/app/fonts.ts` because
`global-error.tsx` renders its own `<html>` and needs the same variables. Any
element rule in `globals.css` goes inside `@layer base`: unlayered CSS beats every
utility regardless of specificity, which is how a field's `focus-visible:outline-1`
and a heading's `font-sans` once silently lost.

A button that switches from disabled to enabled on hydration carries no
`transition-colors` — axe catches the checkout submit mid-transition at 1.06:1.

The cart lives in `localStorage` alone, under one versioned key parsed with Zod;
anything unreadable or of another version is discarded rather than migrated.
`/cart` is a server component that hands its client half the whole published
catalogue — at this catalogue size that is cheaper than an API route and it keeps
the page prerendered, so a fetch added there would cost the prerender for nothing.
Quantities come from the visitor's browser and prices from the catalogue the
build saw; the order service reprices every line from the database regardless.
Each line also stores the product's name, only so a withdrawn product can still
be named: the catalogue's name wins while the product exists, and the checkout
sends the order service slug and quantity alone.

Until the cart is read, `/cart` shows a placeholder whose inline script counts
the stored lines into `--cart-lines`, and the placeholder's row heights turn that
into the height the read cart will take. Those heights are measured, not
derived: a change to a cart row or to the empty state moves them, and the
reserve tests in `e2e/cart.spec.ts` are what notice. The script writes a
`<style>` into `<head>` because an attribute it set would be a hydration
mismatch, and it sits inside the placeholder so React never creates it on a
client navigation, where the cart is already read. A withdrawn line or one at
the 99 limit is shorter or taller than the reserve and still shifts a little.

Google Analytics is mounted by `Analytics` in `ShopFrame` only once the stored
choice is „Приемам“ and `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set — not merely
hidden, never loaded before. The ID is inlined at build time, so a host without
it sends nothing. „Отказвам“ on a page where the tag already runs sets GA's
`ga-disable-<ID>` flag and sends `consent update` with `analytics_storage`
denied, then deletes the `_ga*` cookies on the host and each parent domain; a
returning visitor who refused has strays deleted on load. The e2e build sets a
fake ID and the consent spec aborts the tag's script, so no hit is ever sent —
which also means the real tag's reaction to a refusal is untested until a real
property exists. Turning on Google Signals or ads features in that property makes
the tag send to `*.g.doubleclick.net` and `www.google.com` as well, which the
Content Security Policy blocks until they join `img-src` and `connect-src`.

`/cookies` lists every key the shop writes to a visitor's browser, cookies and
`localStorage` alike, and says nothing else is stored without consent. That
claim holds only while the list is complete, so a new key joins the page in the
same change. `/privacy` is held to the same rule for personal data: a new field
collected or stored, a new recipient, or a changed retention is written into it
in the same change.

The header bee buzzes on a counter only `add` bumps, so a stepper change or
another tab's write never sets it off. The add button's green window is locked by
its timer ref rather than its state, which clicks landing in one tick read stale,
and marked `aria-disabled` rather than `disabled`, which would grey it and drop
focus. The same holds at the 99 limit, for that button and the cart's „+“.
Such a control dims its border and glyph, never the whole button: `opacity` dims
the focus ring with it, which measured 2.42:1 on the ground.

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

The `e2e` job runs inside Playwright's own image, so Chromium and its system
packages come preinstalled. The image tag names the Playwright version and
`@playwright/test` is pinned exactly to match it, so **bump both together**: a
mismatched browser build fails every spec at launch. `--user 1001` matches the
runner user that owns the mounted workspace and HOME, so nothing the job writes
there ends up owned by root.

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

## Showcase

`next.config.ts` sets `X-Robots-Tag: noindex, nofollow` on every route, because
the site is a showcase until launch. **Remove it at launch, with the banner
below.**

The same `headers()` sets the security headers, a Content Security Policy
among them. It allows `'unsafe-inline'` scripts: every prerendered page carries
Next's own inline payload scripts, different per page, so no hash list can
cover them, and nonces would render every page on request and lose the
prerendering. A new external host — a script, an image, a fetch — is added to
the policy in the same change, or the browser blocks it;
`e2e/security-headers.spec.ts` walks the pages and fails on any violation. The
browser's Zod modules import `z` from `src/lib/zod.ts`, which sets `jitless`:
otherwise Zod probes `new Function` on its first parse, and the policy reports
that as a blocked `eval`.

Until ordering opens, the site is a showcase: `ShowcaseBanner` sits above the
header of every shop page, and `placeOrder` refuses everything unless
`ORDERING_OPEN` is exactly `"true"`, before validation and before the rate
limiter. Only the tests and `db:sample-orders` set it — Playwright's
`webServer.env`, the e2e helper that places orders, `scripts/test-unit.mjs`
and the sample-order script itself — so every host starts
closed, and a reused local server started without it fails every checkout spec.
The checkout reads it at build time to swap its submit button for a notice, and
the order service at request time. **Delete the banner, the variable and both
checks together at launch**; they are not a switch to keep.

`SITE_URL` in `src/lib/site.ts` is `https://beepollen.bg`, the production
host, and `metadataBase` resolves every canonical and Open Graph URL against it.

## Metadata

Metadata inheritance is shallow and per top-level key: a page that omits
`alternates` inherits its parent's canonical and so declares itself a duplicate
of it. Every page-level `generateMetadata` sets its own.

`app/sitemap.ts` lists `/`, every published product, `/terms`, `/privacy` and `/cookies`,
and `app/robots.ts` keeps crawlers out of `/admin` only. `/cart` and `/checkout`
stay crawlable on purpose: their `noindex` meta is what keeps them out of search,
and a crawler barred by `robots.txt` never reads it. Both
build their URLs from `SITE_URL`. A new public page joins the sitemap's list in
the same change. The home page's `OnlineStore` JSON-LD carries only facts the
owner has confirmed — the name, `OWNER_PHONE` and Попово — and gains a field
only when its value stops being `TODO:`.

The product page's JSON-LD carries no `offers` on purpose. Every price is a
placeholder until the owner supplies real ones, and a structured price is one
search engines will publish — which was true of the €0.00 that came before these
and is worse now that the numbers look real.

## Email

The order emails are HTML strings built in `src/lib/email/` — tables and
inline styles, because mail clients drop stylesheets — with a plain-text twin
for each. Every value that came from a buyer goes through `escapeHtml`, and an
email to the buyer never repeats the name they typed: the address is
unverified, so a name like „влезте на evil.example“ would reach a stranger
under the shop's domain. The
palette is the site's tokens converted to hex, since mail clients do not read
`oklch`, so a token change is copied by hand into `EMAIL_COLOR`. The bee is
`public/email/bee.png` loaded from `SITE_URL`, since Gmail drops SVG: an email
sent before a deploy shows no bee.

`sendEmail` answers `SENT`, `FAILED` or `SKIPPED` and never throws. With no
`RESEND_API_KEY` it skips, so dev and the tests send nothing; with a key it
refuses to send without `EMAIL_REPLY_TO`. Resend reports a rejected email as
`{ error }` rather than a throw, which is why the result is checked.
Without a verified domain, the default test sender delivers only to the Resend
account's own address.

Sending runs in `after()` from the checkout, withdrawal and admin step actions,
so a slow or failed send never delays or fails what the buyer or owner did, and
the outcome is written onto that step's `OrderEvent`. `src/lib/order-emails.ts`
swallows and logs every error, since nothing awaits it. A replayed order
resends the buyer's confirmation under the same idempotency key, so Resend
delivers it only if the first attempt never went through; a step email is
keyed on its event, so sending again after an undo is a new email. The owner
hears only about new orders and withdrawals, at `OWNER_EMAIL`. „Изпратена“ and „Откажи“ always
open the dialog, whose email box starts ticked; only a withdrawal warning in it
passes `confirmed`, so an ordinary send can never wave a withdrawal through.
The email after an order edit shows the order as it now stands rather than
the changes, so a misspelled address it replaced is never mailed to the new
one. A corrected address also gets the restarted offers confirmation, as an
email of its own.

The offers list is double opt-in. A ticked box writes an `OFFERS` consent with
no `confirmedAt`; only a consent with a `confirmedAt` and no `withdrawnAt` makes
a buyer a subscriber, which is what `countSubscribers` counts. A buyer who is not
yet subscribed gets a confirmation email keyed on that consent; one who is gets
no second confirmation, and their order email says „Абонирани сте“ with an
unsubscribe link and the RFC 8058 `List-Unsubscribe` headers. Unsubscribing
withdraws every offers consent of that customer, and a withdrawn consent can
never be confirmed again. The checkout answers the same whatever address is
typed, so no page reveals whether an address is subscribed. The links carry an
HMAC token signed with `EMAIL_TOKEN_SECRET`, naming its purpose so a
confirmation token cannot unsubscribe. Every host links to `SITE_URL`, so a
token minted on any other host reaches beepollen.bg naming that host's row ids:
no other host may share production's secret. Opening `/subscription/confirm` or
`/subscription/unsubscribe` changes nothing: mail scanners fetch every link, so
only the page's button, a form post, acts. The one-click header points at
`POST /api/unsubscribe`, which mail clients call themselves.

`/admin/emails` shows each email in two designs side by side for choosing
between them; the shop sends design A. **Delete the page and the losing design
once one is chosen.** The previews themselves stay: `src/lib/email/previews.ts`
also feeds `/admin/todo`, which shows each email in the sent design beside the
action that sends it, so a new email joins that list in the same change.

## Orders

`placeOrder` in `src/lib/orders.ts` is the trust boundary. Only a slug and a
quantity survive validation; the name, price and availability of every line are
read back from the database, and Zod strips anything else the caller sends. A
product that is unpublished, out of stock or priced at zero is refused rather
than sold. A slug sent twice is summed, as the cart does, rather than refused.

`OrderItem`'s product relation is `SetNull`, not `Cascade`: the seed deletes a
product dropped from its list, and a past order has to survive that.

The idempotency key is a check-then-act: the pre-read cannot stop a concurrent
submission, so the unique index is what does, and the P2002 it raises is caught
and answered with the committed order. On `@prisma/adapter-libsql` that error
leaves the documented `meta.target` undefined and reports the violated fields at
`meta.driverAdapterError.cause.constraint.fields` — code matching only on
`target` silently treats the conflict as an unrelated failure and rethrows.

An order's `reference` is `BP`, the day, month and two-digit year in
`Europe/Sofia`, then its number within that day — `BP2409261`. The year is what
keeps the prefix lookup from continuing the same day's numbering a year later.
It is stored rather than derived, because a per-day counter cannot be recomputed
from a row id, and the lookup that finds the day's last one orders by `id`, never
by `reference`: `BP24092610` sorts before `BP2409269`. A number lost to a concurrent order is retried five times and then
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

`deliveryCents` is priced by `placeOrder` from the delivery method alone and never
read from the caller — the tariff for an Econt office, zero for `LOCAL`.

## Checkout

`/checkout` is one page — contact fields, the office picker, consents and the
line summary.

The submit button must name the obligation to pay (ЗЗП чл. 49 ал. 2): with a
label such as „Завърши поръчката“ the buyer is not bound by the order. The terms
checkbox only accepts the terms; the privacy policy is linked beside it, never
accepted. Its label is written by hand around a link, so `e2e/checkout.spec.ts`
asserts its accessible name equals `CONSENT_WORDING.TERMS`, the text `Consent`
stores.

The form submits from `onSubmit` inside `startTransition`, never through the
`action` prop. React resets a form once its action returns, wiping the fields a
buyer got right; controlling the inputs rescues the text values but not a
checkbox, because the reset changes the DOM while the state React diffs against
is unchanged. Calling the action outside a transition logs that `isPending` will
not update.

The answers, and the set of fields corrected since the last refusal, live in
`CheckoutForm`, which never unmounts — `FilledCheckout` is swapped out whenever
the cart empties, and state kept there dies with it.

The contact fields, the Попово box, the city and the office are also kept in
`sessionStorage` under `beepollen.checkout`, so leaving for the cart and coming
back loses nothing. The consents are never kept: each order is agreed to afresh.
The draft is restored during the first render after the cart is read, never in
an effect, which `react-hooks/set-state-in-effect` refuses, and the office
picker is keyed on that restore, since its city and office are its own state
seeded from props. Only an accepted order clears it.

A reload must not let the browser restore the scroll position itself: it
restores as soon as the prerendered page is tall enough, and the restored draft
then grows the office panel above the visitor's view (CLS 0.4). `pagehide`
sets `history.scrollRestoration` to `manual` and keeps the position under
`beepollen.checkout-scroll` with its URL; after the restore the form scrolls
back two frames later — in the same frame, the growth itself counts as the
shift — unless the visitor has scrolled already, and hands restoration back to
the browser a task after `load`, since releasing it inside `load` lets the
browser restore over it. The position is used once per document, only when the
document itself was loaded at that URL by a reload or Back/Forward; a back-forward-cache restore keeps
its own scroll, so `pageshow` drops the position and releases the mode.

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

An order for Попово is delivered by hand and arranged by phone: its checkbox
folds the picker away and the order is stored as `LOCAL` with every office column
null. The picker stays mounted, hidden and `inert`, so the fold can animate; it
is keyed on a counter bumped on untick, because the checkbox clears the city and
office the picker otherwise still holds. The dispatch note sits below the
checkbox so that folding it never moves the box under the visitor's finger.
Попово's own Econt offices are left out of the list and refused by `placeOrder`,
since a parcel cannot be sent from the town to itself. The match is the exact
city string, so the villages around it, each under its own name, stay listed.

City then office: a city with three or fewer offices lists them outright, and
from four up a search narrows the list instead. The map draws pins for whatever
the list currently shows rather than for the whole city, because София's 110
overlap into one blob; pins outside that set are dimmed and ignore clicks. It
fits to the middle 80% of the points, since a handful of far-flung offices
otherwise drag Бургас's view out to Поморие.

The map is not mounted, and Leaflet's chunk not loaded, until a city is chosen.
Drawing all 590 pins at country zoom on load cost the checkout about 130 ms of
Total Blocking Time and failed the Lighthouse performance gate, for pins that
were all dimmed and unclickable anyway.

The city field is a combobox: its suggestions are `li role="option"` rather than
buttons, since a button inside an option is not valid, and the active one is
tracked with `aria-activedescendant` so the keyboard never tabs through 590
entries. Where a step replaces the control that opened it, focus is moved by
hand — to the office search or the first office after a city, back to the city
field when it is cleared — through a ref read in an effect keyed on the choices,
because setting state in an effect is what `react-hooks/set-state-in-effect`
refuses. Choosing an office moves nothing: that radio stays mounted, and taking
focus off it would break the arrow keys that walk the list. The `aria-live` line
names the chosen office instead of emptying. That line and the add-to-cart
status are rendered while still empty, because a polite region mounted together
with its text is not reliably announced; the checkout's `role="alert"` summary
mounts with its text, which an alert is announced on.

The picker sits inside the order form, so every one of its text fields swallows
Enter. Without that, a search term and a press of Enter submit the order and
spend one of the attempts the rate limiter allows. Asserting that the
refusal never appeared does not catch it — the assertion passes while the answer
is still in flight, so `e2e/delivery.spec.ts` counts the page's POSTs instead.

An office's `name` is not its heading. 159 of the 590 are named after their own
city, so the heading strips a repeated city prefix, and Econt reports no
settlement type — there is no way to write `гр.` or `с.` correctly, and the list
holds villages. The directions link omits `origin` so Google Maps starts from the
visitor's own location. Two offices have no coordinates: they are listed but not
mapped, and their directions link uses the address.

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
A malformed record is dropped rather than failing the list, and a sudden
collapse in the count is refused, since a truncated response parses like a good
one.
`.github/workflows/econt-sync.yml` runs it every Monday and keeps one open PR
on `chore/econt-sync`, force-pushed each week, so that branch is the
workflow's and never holds hand-made work. A PR opened with `GITHUB_TOKEN`
starts no workflows, so its checks run only once it is closed and reopened.
The 2.45 MB response is over Next's 2 MB data-cache limit, which is why
fetching it during a build was never cached and made every build depend on
Econt being up.

`src/lib/econt.ts` is client-safe — the type, the label and the sort, nothing
more — because the picker's client components import from it. The sort is there
because SQLite orders Cyrillic by code point. The remote call,
its Zod schema and its mapping live in `econt-nomenclature.ts`, and the Prisma
read in `delivery-offices.ts`.

The map draws on free OpenStreetMap tiles. Their usage policy, re-read on
24 Sep 2026, permits normal interactive viewing by a human on three conditions:
visible attribution on the map, a clear User-Agent naming the caller, and no
preloading of regions or zoom stacks. The tile layer carries the attribution and
the sync script sets the User-Agent; a browser sends its own. The service is
best-effort and can be withdrawn without notice.

## Admin

Auth.js v5 with Google as the only provider. `next-auth` is a beta pinned to an
exact version, since betas break their API between releases.

`ADMIN_EMAILS` is re-read on every admin request by `requireAdmin()`, not only at
sign-in, so removing an address revokes a session that is still valid. Every
admin page and every admin server action calls it itself — a layout does not
re-render on client navigation, and there is no `proxy.ts` to lean on. The
sign-in callback also requires Google's `email_verified`.

Auth.js reads `AUTH_SECRET`, `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` by name,
which is why `Google()` takes no keys. A production server refuses its own host
unless `AUTH_URL` or `AUTH_TRUST_HOST` is set. With none of
them, `auth()` logs and returns no session, so `/admin` falls back to the login
page instead of failing. Outside production the host is trusted by default, but
Auth.js takes the first of `AUTH_URL`, `AUTH_TRUST_HOST` and the platform
variables that is not nullish and then applies `!!`, so an empty
`AUTH_TRUST_HOST=""` or `AUTH_URL=""` switches that default off —
`.env.example` sets `AUTH_TRUST_HOST` to `"true"` rather than leaving it blank
like its neighbours.

An unknown `/products/[slug]` returns `notFoundMetadata` from
`generateMetadata`: a title built from the param would name the missing product
on the 404, and `{}` falls back to the root title. Orders have no page of their
own; their details expand in place on `/admin/orders`, which lists at most
`ORDERS_MAX`: past roughly a thousand orders the nested items, consents and events queries
exceed SQLite's bound-parameter limit.

An order's state is four nullable timestamps — `sentAt`, `paidAt`,
`cancelledAt`, `collectedAt` — and its status is derived from them by
`orderStatus`, never stored. The admin takes named steps rather than toggling
marks: the action sends the step and the status the card showed, the server
refuses a step that status does not allow and answers `stale` when the row has
moved on, and the write matches all four timestamps and `withdrawnAt` as read,
so two screens cannot both apply one and a withdrawal landing mid-step makes it
`stale`. A returned parcel is `sentAt` plus `cancelledAt` until
`collectedAt` records that the owner fetched it back. A Попово hand-over writes
`sentAt` and `paidAt` together. Undo clears the latest timestamp at any age.
Each step, an undo included, also writes an `OrderEvent` with the admin's
email, inside the same transaction and only when the compare-and-set wrote, so
a stale or doubled step leaves no trace; placing and withdrawing write one too.
The events are the card's history, never its status, which still comes from
the timestamps.
Cancel, return and undo open a native `<dialog>` naming the order, the buyer and
the status it will move to, with the cancel button focused; `undoTarget` is the
single source for that destination, so the dialog and the server cannot disagree. A failed step does not refresh the page, so the card stays
on screen with its message even when the step would have moved it out of the
current filter. The list sets `overflow-anchor: none`, because a card that
changes height after a step otherwise scrolls the page under the owner's finger.

A new order's contact and delivery are edited by `editOrderContact` in
`src/lib/order-edit.ts`. The caller sends the values its form started from as
`original`; the server answers `stale` when the order no longer holds them, and
the write matches them as read. The email lives on `Customer`, so a corrected
one moves the order to the customer with that address, writes only the fields
that changed onto it, and deletes the old customer once it has no orders. The
order's offers consent is recreated unconfirmed: its confirmation token names
the consent, and the misspelled address may already have confirmed it.
Delivery is repriced only when the method changes, and an unchanged office is
never re-read, so a phone fix can neither reprice an order nor fail on an
office `econt:sync` dropped. The edit's `OrderEvent` keeps the old and new
values in `changes`, which `/privacy` declares. The admin form asks
`previewOrderEdit`, the same function without the write, for the changes its
dialog lists, and fetches the 590 offices only when it opens, so the order list
never carries them once per card.

The same edit changes an order's lines. A kept line keeps the price it was
sold at; an added or swapped product takes today's catalogue price and must
pass checkout's rules, and so must a kept line whose quantity grows — a product
no longer sold may stay on the order or shrink, never grow. The lines are
re-read inside the transaction before they are rewritten, because two swaps at
an equal total pass the `itemsCents` compare-and-set alike.

The admin bar above the shop header is fetched from `/api/admin-status` in the
browser after load. Asking the session while rendering would make every
prerendered shop page dynamic, so do not move that check to the server.

`/admin/products` edits price and stock only. A save revalidates `/`, `/cart`,
`/checkout` and that product's page, since all four are prerendered with the
catalogue. The product route must not set `dynamicParams = false`: with it, a
revalidated page answers 404 with `NoFallbackError` in a production build.

The e2e suite signs in by minting the session cookie with `next-auth/jwt`'s
`encode`, salted with the cookie's own name — Playwright cannot click through
Google. Its secret reaches the server through `webServer.env`, so a reused local
server started without it fails every admin spec.

## Docker

`compose.yaml` syncs source into the container rather than bind-mounting it. A
bind mount never delivers an edit on Windows — file events do not cross the
Windows→WSL2→container boundary, and `WATCHPACK_POLLING` cannot rescue it,
because `next dev` runs Turbopack, whose watcher never reads that variable.

`output: "standalone"` is set only when `BUILD_STANDALONE` is, which the builder
stage exports: `next start`, which `npm start` and Playwright run, does not
support standalone output and warns at startup.

The standalone `server.js` does **not** serve `public/` or `.next/static`. The
Dockerfile copies both in explicitly — drop either and the site still returns
200, with no styling.

`compose.prod.yaml` starts the `runner` image only after a one-off `migrate`
service, built from `builder` because the standalone output has no Prisma CLI,
has migrated and seeded the shared volume. Both run as uid 1001 and both images
create `/app/data` owned by it: an empty named volume takes the ownership of
whichever image mounts it first, and the builder's own `/app/data` is root's.
`prisma db seed` spawns `tsx` without npm's `PATH`, which is why the `migrate`
stage puts `node_modules/.bin` on it. `env_file` reaches only the running
container, so `NEXT_PUBLIC_GA_MEASUREMENT_ID` is passed to the build as an arg
interpolated from the same `.env`.

`.github/workflows/image.yml` publishes both images to GHCR on a push to
`main`, and on a manual run from any branch, which tags the commit only —
`latest` is `main`'s alone. The image names are written out in lowercase
because GHCR refuses capitals and `github.repository` is `Nik-Kolev/beepollen`.
The `org.opencontainers.image.source` label is what links each package to the
repository. Its `deploy` job then runs the host's `deploy.sh` over SSH, from
`main` only, so a manual run on another branch publishes a tag and deploys
nothing.

The image prerenders the shop pages from the builder's own seeded database, not
the volume's, so after every start they show seed prices and default stock
until `POST /api/revalidate` re-renders them. It answers only a `Bearer`
matching `REVALIDATE_SECRET` and refuses everything while that is unset or
under 32 characters. A route handler only marks pages stale, and each
re-renders on its next visit — so a page left unvisited since an earlier
revalidation already reads the database, which a test must visit first to see.

## Testing

Two layers. `npm run test:unit` runs `node:test` through tsx over `tests/**`,
for logic reachable without a browser — the order service above all, where the
rules being tested are the ones that stop a crafted request. It has no mocking
library on purpose: `scripts/test-unit.mjs` points `DATABASE_URL` at its own
`data/test.db`, deletes it, migrates and seeds it on every run, so the real
constraints fire and nothing can touch `data/dev.db`. Files run one at a time,
since they share that database. It runs npm through a fixed shell string because
Node 24 will not spawn Windows' `npm.cmd` without a shell. On Windows libsql
can crash a file's process at teardown with `0xC0000005` after every test in it
passed (tursodatabase/libsql-js#231); when that crash is the run's only failure,
the script reads the TAP report it writes to `data/test-unit.tap`, rebuilds the
database and re-runs just those files once. The last test in
`tests/orders/reference.test.ts` blocks the day's numbering until its own
cleanup, so it stays last.

Playwright is the other layer. It starts the app with
`npm run build:demo && npm start`, not `next dev` — but `reuseExistingServer` is
on outside CI, so a local run silently attaches to whatever already holds the
port. With `npm run dev` up, the whole suite tests Turbopack dev instead of the
build and can fail on differences that do not exist in what ships. Stop the dev
server before a local suite run, or point the suite at a free port with
`E2E_PORT`, which it hands `next start` as `PORT`.
Dev runs Turbopack and is not what ships, so a smoke test against it proves less
than the seconds it saves. The suite runs twice, mobile project first, because
mobile is the priority everything else here is built around.

The server Playwright starts reads `data/e2e.db`, deleted before every build,
because re-seeding no longer resets an edited price. The test draft is added
after `build:demo` rather than before it, because the seed deletes every product
missing from its own list. Checkout specs assert
seeded totals, so the spec that edits a published product is its own
`catalogue-edit` project, run after both others and restoring the seeded values.
`catalogue-fixtures` runs after that one and publishes throwaway products —
one photo, none, no food information — then deletes them; run beside the edit
spec, its revalidations would bake the throwaways into the prerendered pages. A
published fixture in the shared seed would instead show in the admin's product
list and break the unit test asserting the published set. A product page
rendered on request stays cached after its row is deleted, so changing a
fixture needs a fresh server.

Every Playwright context starts with the cookie choice stored as `rejected`,
through `use.storageState` in `playwright.config.ts`, and the Lighthouse script
stores the same before each URL — otherwise the bar covers the controls a spec
clicks and the page a run measures. A spec about the bar opts out with an empty
`storageState`, as `e2e/cookie-consent.spec.ts` does.

`@axe-core/playwright` scans each page against WCAG A and AA and fails on any
violation. It runs inside the existing suite rather than as its own job, because
the suite already builds the app and drives a browser. Add a scan for every new
page — the gate only covers routes a spec actually visits.

`error.tsx` is reached by a failed order submission: `useActionState` rethrows
whatever `placeOrder` throws into the nearest boundary. The spec reaches it by
answering the action's POST with a 500. `global-error.tsx` stays outside the
gate because nothing reaches it in a browser: it catches only a throw in the root
layout, which is static. `/admin` renders at request time, but below that layout.

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

SQLite through Prisma 7 and `@prisma/adapter-libsql`, reached through
`DATABASE_URL`.

`src/lib/prisma.ts` gives the adapter a 5 s busy timeout. libsql's default is
none, so a write that met another process's lock — an e2e helper, the seed —
failed at once with `SQLITE_BUSY`, which Prisma reports as "Operation has timed
out". The wait blocks the whole process, so a lock held by a second client in
the same process can never be released during it; `tests/busy-timeout.test.ts`
holds its lock from a child process for that reason.

**Migrations are authored on the host and applied in the container.** Compose
syncs one way, host→container, so a migration created inside the container writes
its SQL to a filesystem that dies with the container and never reaches git. Run
`prisma migrate dev` on the host, then
`docker compose exec web npx prisma migrate deploy`. The two dev databases are
separate — host `data/dev.db`, container `/app/data/dev.db` on a named volume that
`docker compose down` keeps and `down -v` destroys.

The seed deletes a product dropped from its list rather than leaving it
published in an existing database, and replaces image rows inside one
transaction, since they have no natural key and it is their only writer. It
owns a product's content but sets the price only on create and never the stock:
those belong to the admin, and every build re-seeds.

The home page queries the catalogue during `next build`, so every path that
builds the app seeds first — CI as its own step, Playwright's `webServer` and
the Dockerfile's builder stage all reach `db:setup`. It
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

`scripts/db-backup.ts` copies with `VACUUM INTO`, never a file copy, which
would miss what is still in the WAL. It checks the copy through `ATTACH` on the
source connection rather than a client of its own: on Windows libsql keeps a
file open after `$disconnect`, so renaming the checked copy into place fails
with `EBUSY`. Retention in `src/lib/backup-retention.ts` counts periods that
have a backup, as restic's `--keep-daily/weekly/monthly` do, rather
than calendar windows, so backups that stopped are never all pruned at once.

The seed runs through `tsx`, not `node`. Node strips the types fine, but the
generated client imports `./enums` and `./internal/class` without extensions and
Node’s ESM resolver cannot follow those. `db:fresh` chains `prisma db seed`
explicitly because `migrate reset` does not run the seed on Prisma 7 — Prisma 6
did, and most documentation still reads that way.

Each pack size is its own `Product` row rather than a variant of one — at this
catalogue size a variant table buys nothing, and net quantity is a per-size legal
label field anyway. `variety` is free text because a batch is a blend, "40%
акация, 60% липа", not a category.

The food-information fields are nullable so a product can be drafted. A
published product needs every field owed before purchase — a whole positive
`netWeightGrams` and non-blank `composition`, `origin`, `storage` and
`allergenInfo` — and `assertPublishable` in `src/lib/food-information.ts` makes
the seed throw before it writes anything otherwise. `bestBefore` is owed only on
delivery, so it is not checked. `TODO:` text counts as filled, because it is on
the page on purpose. Outside the test fixtures, e2e and unit, which publish
products without food information on purpose, the seed is the only writer of `isPublished`; a
future one calls the same check.

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
