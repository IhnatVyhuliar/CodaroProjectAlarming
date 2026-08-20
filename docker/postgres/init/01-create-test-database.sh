#!/bin/bash
set -e

# Runs only on first initialisation of an empty data volume.
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE app_testing OWNER $POSTGRES_USER;
EOSQL
