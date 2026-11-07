#!/usr/bin/env bash
set -u

cd "$(dirname "$0")" || exit 1

env_value() {
  tr -d '\r' <.env | sed -n "s/^$1=\"\{0,1\}\([^\"]*\)\"\{0,1\}\$/\1/p"
}

B2_KEY_ID=$(env_value B2_KEY_ID)
B2_APPLICATION_KEY=$(env_value B2_APPLICATION_KEY)
export B2_KEY_ID B2_APPLICATION_KEY

unreadable=0
if grep -Eq '^[[:space:]]*(export[[:space:]]+)?B2_(KEY_ID|APPLICATION_KEY)[[:space:]]*=' .env && { [ -z "$B2_KEY_ID" ] || [ -z "$B2_APPLICATION_KEY" ]; }; then
  echo "B2_KEY_ID or B2_APPLICATION_KEY in .env could not be read" >&2
  unreadable=1
fi

docker compose -f compose.prod.yaml run --rm -e B2_KEY_ID -e B2_APPLICATION_KEY migrate npm run db:backup
status=$?
if [ "$status" -eq 0 ] && [ "$unreadable" -eq 1 ]; then
  status=2
fi

url=$(env_value HEALTHCHECK_BACKUP_URL)
if [ -n "$url" ]; then
  curl -fsS --max-time 10 --retry 5 --retry-all-errors -o /dev/null "$url/$status" ||
    echo "The Healthchecks ping failed" >&2
fi

exit "$status"
