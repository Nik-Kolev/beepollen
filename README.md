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

### With Docker

```bash
docker compose watch
```

Uses the same `.env`.

Same URL. Edits to `src/`, `public/`, `prisma/`, `prisma.config.ts` and
`next.config.ts` sync into the running container, `tsconfig.json` and
`postcss.config.mjs` sync and restart it, and changing `package.json` or the
lockfile rebuilds the image.

The production image is a separate target:

```bash
docker build --target runner -t beepollen:prod .
docker run --rm -p 3000:3000 beepollen:prod
```

## Scripts

| Command                | Does                          |
| ---------------------- | ----------------------------- |
| `npm run dev`          | Development server            |
| `npm run build`        | Production build              |
| `npm run build:demo`   | Migrate, seed, then build     |
| `npm start`            | Serve the production build    |
| `npm run format`       | Prettier, writing in place    |
| `npm run format:check` | Prettier, failing on a diff   |
| `npm run lint`         | ESLint                        |
| `npm run generate`     | Prisma client from the schema |
| `npm run typecheck`    | Generate, route types, `tsc`  |
| `npm run ci`           | CI's `ci` job, run locally    |
| `npm run db:migrate`   | New migration, then generate  |
| `npm run db:deploy`    | Apply migrations in Docker    |
| `npm run db:setup`     | Generate, migrate, then seed  |
| `npm run db:seed`      | Seed the database             |
| `npm run db:studio`    | Browse the database           |
| `npm run db:reset`     | Wipe and replay migrations    |
| `npm run db:fresh`     | Reset, then seed              |
| `npm run test:e2e`     | E2E and accessibility tests   |
| `npm run test:perf`    | Lighthouse, not on Windows    |

## Preview

A demo tracks `develop` at
[beepollen-wheat.vercel.app](https://beepollen-wheat.vercel.app); each pull
request gets its own temporary URL. Not the production host.
