FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --strict-allow-scripts

FROM node:24-alpine AS dev
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG DATABASE_URL=file:./data/build.db
RUN npx prisma generate
EXPOSE 3000
CMD ["npm", "run", "dev"]

FROM node:24-alpine AS builder
WORKDIR /app
ENV BUILD_STANDALONE=1
ARG DATABASE_URL=file:./data/build.db
ARG NEXT_PUBLIC_GA_MEASUREMENT_ID
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN --mount=type=cache,target=/app/.next/cache npm run build:demo

FROM builder AS migrate
RUN rm -rf /app/data && mkdir /app/data && chown 1001:1001 /app/data
ENV HOME=/tmp
ENV PATH=/app/node_modules/.bin:$PATH
USER 1001
CMD ["sh", "-c", "prisma migrate deploy && prisma db seed"]

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN addgroup -g 1001 -S nodejs && adduser -u 1001 -S nextjs -G nodejs
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
RUN mkdir /app/data && chown nextjs:nodejs /app/data
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
