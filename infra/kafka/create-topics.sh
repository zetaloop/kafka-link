#!/usr/bin/env bash
set -euo pipefail

readonly bootstrap_server="kafka-1:19092"

for _ in $(seq 1 30); do
  if kafka-topics --bootstrap-server "${bootstrap_server}" --list >/dev/null 2>&1; then
    break
  fi

  sleep 2
done

create_topic() {
  local name="$1"
  kafka-topics \
    --bootstrap-server "${bootstrap_server}" \
    --create \
    --if-not-exists \
    --topic "${name}" \
    --partitions 3 \
    --replication-factor 3
}

create_topic raw.weather
create_topic raw.airquality
create_topic raw.earthquake
create_topic normalized.events
create_topic alerts

kafka-topics --bootstrap-server "${bootstrap_server}" --list
