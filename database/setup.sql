-- Run from the project root:  psql -U postgres -f database/setup.sql
-- Different database name:    psql -U postgres -v dbname=microbanking_test -f database/setup.sql

\set ON_ERROR_STOP on
\if :{?dbname}
\else
  \set dbname microbanking
\endif

CREATE DATABASE :"dbname";
\c :"dbname"

\ir init-postgres.sql

\ir insert-interests.sql

-- Default login: admin / admin123
\ir insert-admin.sql
