#!/usr/bin/env bash
set -euo pipefail

root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
prefix="nico-qa-${BASHPID}-${RANDOM}"
network="$prefix-net"
image="python:3.12-alpine@sha256:c5ba3deef00c7758561a0f03c26f44f10589263d40e732b8748e0d1f38f6dd89"
cleanup() {
  docker rm -f "$prefix-a" "$prefix-b" "$prefix-c" >/dev/null 2>&1 || true
  docker network rm "$network" >/dev/null 2>&1 || true
}
docker network create --internal "$network" >/dev/null
trap cleanup EXIT

worker() {
  docker run -d --rm --name "$prefix-$1" --network "$network" --network-alias "node-$1" \
    --read-only --mount "type=bind,source=$root,destination=/qa,readonly" \
    "$image" python -B /qa/shard.py worker
}
probe() {
  docker run --rm --network "$network" --read-only \
    --mount "type=bind,source=$root,destination=/qa,readonly" \
    "$image" python -B /qa/shard.py probe "$@"
}

worker a >/dev/null
previous=$(worker b)
worker c >/dev/null
probe
docker stop --timeout 1 "$prefix-b" >/dev/null
probe b
replacement=$(worker b)
test "$replacement" != "$previous"
probe
