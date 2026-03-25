-- Normalize legacy payroll status values to draft | settled (app enum).
UPDATE "payroll" SET "status" = 'settled' WHERE "status" IN ('settle', 'paid');
