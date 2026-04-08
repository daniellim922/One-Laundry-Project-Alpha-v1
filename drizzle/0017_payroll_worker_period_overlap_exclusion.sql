CREATE EXTENSION IF NOT EXISTS btree_gist;--> statement-breakpoint

ALTER TABLE "payroll"
ADD CONSTRAINT "payroll_worker_period_overlap_excl"
EXCLUDE USING gist (
    "worker_id" WITH =,
    daterange("period_start", "period_end", '[]') WITH &&
);

-- If this migration fails because historical overlaps exist, use this query
-- to identify conflicting payroll periods before rerunning the migration:
-- SELECT
--   p1.id AS payroll_id_1,
--   p2.id AS payroll_id_2,
--   w.name AS worker_name,
--   p1.period_start AS payroll_1_start,
--   p1.period_end AS payroll_1_end,
--   p2.period_start AS payroll_2_start,
--   p2.period_end AS payroll_2_end,
--   p1.status AS payroll_1_status,
--   p2.status AS payroll_2_status
-- FROM payroll p1
-- JOIN payroll p2
--   ON p1.worker_id = p2.worker_id
--  AND p1.id < p2.id
--  AND daterange(p1.period_start, p1.period_end, '[]')
--      && daterange(p2.period_start, p2.period_end, '[]')
-- JOIN worker w ON w.id = p1.worker_id
-- ORDER BY w.name, p1.period_start, p2.period_start;
