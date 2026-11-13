#!/usr/bin/env bash
set -u

cd "$(dirname "$0")" || exit 1

env_value() {
  tr -d '\r' <.env | sed -n "s/^$1=\"\{0,1\}\([^\"]*\)\"\{0,1\}\$/\1/p"
}

report=$(docker compose -f compose.prod.yaml run --rm -T migrate npm run -s email:count)
status=$?
[ -n "$report" ] || report="The email count did not run (exit $status)"
echo "$report"

url=$(env_value HEALTHCHECK_EMAIL_URL)
if [ -n "$url" ]; then
  target=$url
  [ "$status" -eq 0 ] || target="$url/fail"
  curl -fsS --max-time 10 --retry 5 --retry-all-errors -o /dev/null \
    --data-raw "$report" "$target" ||
    echo "The Healthchecks ping failed" >&2
fi

exit "$status"
