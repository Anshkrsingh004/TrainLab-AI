-- TrainLab AI — PostgreSQL bootstrap.
-- Runs once on first container start. Enables the extension used for
-- database-side UUID generation in future migrations.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
