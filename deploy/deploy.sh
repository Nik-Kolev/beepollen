#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

compose=(docker compose -f compose.prod.yaml)

env_value() {
  tr -d '\r' <.env | sed -n "s/^$1=\"\{0,1\}\([^\"]*\)\"\{0,1\}\$/\1/p"
}

B2_KEY_ID=$(env_value B2_KEY_ID)
B2_APPLICATION_KEY=$(env_value B2_APPLICATION_KEY)
export B2_KEY_ID B2_APPLICATION_KEY

"${compose[@]}" pull
backup=0
"${compose[@]}" run --rm -e B2_KEY_ID -e B2_APPLICATION_KEY migrate npm run db:backup ||
  backup=$?
if [ "$backup" -eq 2 ]; then
  echo "The backup is on the host but was not uploaded to B2; deploying anyway" >&2
elif [ "$backup" -ne 0 ]; then
  exit "$backup"
fi
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
