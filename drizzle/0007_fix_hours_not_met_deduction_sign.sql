-- Flip legacy positive hours_not_met_deduction values to negative and
-- recompute totals per Option B:
--   total_pay includes hours_not_met_deduction (negative)
--   net_pay = total_pay - cpf

WITH affected AS (
    SELECT
        id,
        hours_not_met_deduction AS old_deduction
    FROM payroll_voucher
    WHERE hours_not_met_deduction IS NOT NULL
      AND hours_not_met_deduction > 0
)
UPDATE payroll_voucher pv
SET
    hours_not_met_deduction = -ABS(pv.hours_not_met_deduction),
    total_pay = pv.total_pay - a.old_deduction,
    net_pay = (pv.total_pay - a.old_deduction) - COALESCE(pv.cpf, 0),
    updated_at = NOW()
FROM affected a
WHERE pv.id = a.id;

