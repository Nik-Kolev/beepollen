#!/usr/bin/env bash
set -u

cd "$(dirname "$0")" || exit 1

env_value() {
  tr -d '\r' <.env | sed -n "s/^$1=\"\{0,1\}\([^\"]*\)\"\{0,1\}\$/\1/p"
}

limit=80
read -r blocks inodes <<<"$(df --output=pcent,ipcent / | tail -n 1 | tr -dc '0-9 -')"
case $blocks in *[!0-9]* | '') blocks= ;; esac
case $inodes in *[!0-9]* | '') inodes= ;; esac

used=$blocks
if [ -n "$used" ] && [ -n "$inodes" ] && [ "$inodes" -gt "$used" ]; then
  used=$inodes
fi

percent() { if [ -n "$1" ]; then echo "$1%"; else echo "unknown"; fi; }
report="Disk on /: $(percent "$blocks") of space, $(percent "$inodes") of inodes (limit $limit%)"
echo "$report"

status=0
if [ -z "$used" ] || [ "$used" -gt "$limit" ]; then
  status=1
fi

url=$(env_value HEALTHCHECK_DISK_URL)
if [ -n "$url" ]; then
  target=$url
  [ "$status" -eq 0 ] || target="$url/fail"
  curl -fsS --max-time 10 --retry 5 --retry-all-errors -o /dev/null \
    --data-raw "$report" "$target" ||
    echo "The Healthchecks ping failed" >&2
fi

exit "$status"
