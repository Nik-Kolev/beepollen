#!/usr/bin/env bash
set -u

cd "$(dirname "$0")" || exit 1

docker compose -f compose.prod.yaml run --rm migrate npm run db:backup
status=$?

url=$(sed -n 's/^HEALTHCHECK_BACKUP_URL="\{0,1\}\([^"]*\)"\{0,1\}$/\1/p' .env)
if [ -n "$url" ]; then
  curl -fsS --max-time 10 --retry 5 --retry-all-errors -o /dev/null "$url/$status" ||
    echo "The Healthchecks ping failed" >&2
fi

exit "$status"
