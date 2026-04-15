-- Drop IAM tables after permission layer removal.

DROP TABLE IF EXISTS "user_roles" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "role_permissions" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "features" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "roles" CASCADE;
