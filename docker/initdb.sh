#!/bin/sh
# Runs once, when the PostgreSQL container starts with an empty data volume
set -e
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" -f /database/setup.sql
