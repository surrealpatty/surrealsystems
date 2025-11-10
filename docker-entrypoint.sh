#!/bin/sh
set -e

# This entrypoint will attempt to run migrations (retrying while DB boots),
# optionally seeds the DB (if SEED_ON_STARTUP=true), and then exec the app.

MAX_RETRIES=${MAX_RETRIES:-20}
SLEEP_SECONDS=${SLEEP_SECONDS:-3}

echo "=> Running entrypoint: migrations will be attempted (max $MAX_RETRIES tries)"

i=0
until npx sequelize-cli db:migrate; do
  i=$((i+1))
  echo "=> Migrations attempt $i failed. Sleeping $SLEEP_SECONDS seconds before retry..."
  if [ "$i" -ge "$MAX_RETRIES" ]; then
    echo "=> ERROR: migrations failed after $i attempts. Exiting."
    exit 1
  fi
  sleep $SLEEP_SECONDS
done

# Optionally run seeders if SEED_ON_STARTUP=true
if [ "${SEED_ON_STARTUP}" = "true" ]; then
  echo "=> Running seeders (SEED_ON_STARTUP=true)"
  npx sequelize-cli db:seed:all || echo "=> Seeders completed (or skipped on error)"
fi

echo "=> Starting application"
# Exec the command provided as CMD in Dockerfile (or overridden by docker-compose)
exec "$@"
