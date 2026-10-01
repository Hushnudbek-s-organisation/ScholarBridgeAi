-- DEPRECATED / DIVERGENT LEGACY FILE — DO NOT RUN.
-- This script used a different program-requirements/application-cycle schema and
-- depended on relation creation order that was not safe on a fresh deployment.
-- It has been neutralized to prevent schema drift or partial live changes.
--
-- Use the reviewed sequence in docs/SUPABASE_SCHEMA_REVIEW.md:
--   university_schema_preflight.sql (read only)
--   university_schema_data_audit.sql (read only)
--   university_schema_v2.sql (guarded migration, only after review/backup)
SELECT 'Deprecated. No changes made. Use the reviewed schema audit/migration files.' AS status;
