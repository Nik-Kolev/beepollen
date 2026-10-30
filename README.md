# beepollen

Online shop for bee products — Пчелни продукти Д & Н Димитрови.

Next.js 16 (App Router), TypeScript, Tailwind v4.

## Running it

```bash
npm install
cp .env.example .env
npm run db:setup
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The home page reads the catalogue from the database, so `db:setup` has to run
before the app does.

`/admin` signs in with Google and admits only the addresses in `ADMIN_EMAILS`.
It needs `AUTH_SECRET` and a Google OAuth client's `AUTH_GOOGLE_ID` and
`AUTH_GOOGLE_SECRET` in `.env`; without them the shop still runs.
`AUTH_TRUST_HOST` lets `npm start` accept sign-ins on localhost; a public host
drops it and sets `AUTH_URL` to its own origin.
`ADMIN_WITHOUT_SIGN_IN="true"` opens the admin to every visitor with no
sign-in, for review before a Google client exists.

The rest of `.env`:

| Variable                        | Does                                                                                                          |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `ORDERING_OPEN`                 | Only `"true"` accepts orders; anything else shows the shop only; rebuild after changing it                    |
| `RESEND_API_KEY`                | Sends the emails through Resend; left empty, nothing is sent                                                  |
| `EMAIL_FROM`                    | Sender address; empty uses Resend's test sender, which delivers only to the Resend account's own address      |
| `EMAIL_REPLY_TO`                | Where replies go; required once `RESEND_API_KEY` is set                                                       |
| `OWNER_EMAIL`                   | Receives a notice for every new order and every withdrawal                                                    |
| `EMAIL_TOKEN_SECRET`            | Signs the subscribe and unsubscribe links; at least 32 characters; empty, no such link is sent and none opens |
| `REVALIDATE_SECRET`             | Bearer secret for `POST /api/revalidate`; at least 32 characters; empty, every call is refused                |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Google Analytics, after cookie consent; read at build time                                                    |

### With Docker

```bash
docker compose watch
```

Uses the same `.env`.

Same URL. Edits to `src/`, `public/`, `prisma/`, `prisma.config.ts` and
`next.config.ts` sync into the running container, `tsconfig.json` and
`postcss.config.mjs` sync and restart it, and changing `package.json` or the
lockfile rebuilds the image.

Production runs from its own compose file:

```bash
docker compose -f compose.prod.yaml up -d --build
```

The site reads `.env` when it starts, except `NEXT_PUBLIC_GA_MEASUREMENT_ID`,
which is fixed when the image is built, so changing it needs `--build`. The
database lives in its own volume, apart from the dev one. Before the site
starts, a one-off `migrate` service applies the migrations and seeds the
catalogue into that volume. The site answers on `127.0.0.1:3000` only, for a
reverse proxy on the same host.

Once it is up, re-render the shop pages from that database:

```bash
curl -X POST -H "Authorization: Bearer $REVALIDATE_SECRET" http://127.0.0.1:3000/api/revalidate
```

## Scripts

| Command                    | Does                                      |
| -------------------------- | ----------------------------------------- |
| `npm run dev`              | Development server                        |
| `npm run build`            | Production build                          |
| `npm run build:demo`       | Migrate, seed, then build                 |
| `npm run build:vercel`     | Like `build:demo`, plus sample orders     |
| `npm start`                | Serve the production build                |
| `npm run format`           | Prettier, writing in place                |
| `npm run format:check`     | Prettier, failing on a diff               |
| `npm run lint`             | ESLint                                    |
| `npm run generate`         | Prisma client from the schema             |
| `npm run typecheck`        | Generate, route types, `tsc`              |
| `npm run ci`               | CI's `ci` job, run locally                |
| `npm run db:migrate`       | New migration, then generate              |
| `npm run db:deploy`        | Apply migrations in Docker                |
| `npm run db:setup`         | Generate, migrate, then seed              |
| `npm run db:seed`          | Seed the database                         |
| `npm run db:studio`        | Browse the database                       |
| `npm run db:reset`         | Wipe and replay migrations                |
| `npm run db:fresh`         | Reset, then seed                          |
| `npm run db:sample-orders` | Sample orders in each status, subscribers |
| `npm run econt:sync`       | Refresh the Econt office list             |
| `npm run test:unit`        | Unit tests, own throwaway DB              |
| `npm run test:e2e`         | E2E and accessibility tests               |
| `npm run test:perf`        | Lighthouse, not on Windows                |

## Preview

A demo tracks `develop` at
[beepollen-wheat.vercel.app](https://beepollen-wheat.vercel.app); each pull
request gets its own temporary URL. Not the production host.
