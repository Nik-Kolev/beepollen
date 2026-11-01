#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

compose=(docker compose -f compose.prod.yaml)

"${compose[@]}" pull
"${compose[@]}" run --rm migrate npm run db:backup
"${compose[@]}" up -d

for attempt in $(seq 1 30); do
  if curl -fs --max-time 5 -o /dev/null http://127.0.0.1:3000/; then
    break
  fi
  if [ "$attempt" -eq 30 ]; then
    echo "The site did not answer within a minute" >&2
    if [ -t 2 ]; then
      "${compose[@]}" logs --tail 50 web >&2
    else
      echo "Read docker compose -f ~/beepollen/compose.prod.yaml logs web on the host" >&2
    fi
    exit 1
  fi
  sleep 2
done

secret=$("${compose[@]}" exec -T web node -e \
  'process.stdout.write(process.env.REVALIDATE_SECRET ?? "")')
if [ -z "$secret" ]; then
  echo "REVALIDATE_SECRET is not set in .env" >&2
  exit 1
fi

status=$(curl -sS --max-time 30 -o /dev/null -w "%{http_code}" -X POST -H @- \
  http://127.0.0.1:3000/api/revalidate <<<"Authorization: Bearer $secret")
if [ "$status" != "204" ]; then
  echo "Revalidate answered $status, not 204" >&2
  exit 1
fi

echo "Deployed ${IMAGE_TAG:-latest} and re-rendered the shop pages"
