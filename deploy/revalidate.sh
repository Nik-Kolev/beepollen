#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

secret=$(docker compose -f compose.prod.yaml exec -T web node -e \
  'process.stdout.write(process.env.REVALIDATE_SECRET ?? "")')
if [ -z "$secret" ]; then
  echo "REVALIDATE_SECRET is not set in .env" >&2
  exit 1
fi

status=$(curl -sS --max-time 30 --retry 3 --retry-all-errors -o /dev/null \
  -w "%{http_code}" -X POST -H @- \
  http://127.0.0.1:3000/api/revalidate <<<"Authorization: Bearer $secret")
if [ "$status" != "204" ]; then
  echo "Revalidate answered $status, not 204" >&2
  exit 1
fi

echo "Re-rendered the shop pages for $(date +%F)"
