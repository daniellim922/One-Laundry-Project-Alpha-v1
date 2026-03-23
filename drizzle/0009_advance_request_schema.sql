CREATE TABLE "advance_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"worker_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"request_date" date NOT NULL,
	"amount_requested" integer NOT NULL,
	"purpose" text,
	"employee_signature" text,
	"employee_signature_date" date,
	"manager_signature" text,
	"manager_signature_date" date,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"source_advance_id" uuid
);--> statement-breakpoint
ALTER TABLE "advance_request" ADD CONSTRAINT "advance_request_worker_id_worker_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."worker"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
INSERT INTO "advance_request" ("worker_id", "status", "request_date", "amount_requested", "created_at", "updated_at", "source_advance_id")
SELECT "worker_id", "status", "loan_date", "amount", "created_at", "updated_at", "id" FROM "advance";--> statement-breakpoint
ALTER TABLE "advance" ADD COLUMN "advance_request_id" uuid;--> statement-breakpoint
UPDATE "advance" SET "advance_request_id" = (SELECT "id" FROM "advance_request" WHERE "advance_request"."source_advance_id" = "advance"."id");--> statement-breakpoint
ALTER TABLE "advance_request" DROP COLUMN "source_advance_id";--> statement-breakpoint
ALTER TABLE "advance" DROP CONSTRAINT "advance_worker_id_worker_id_fk";--> statement-breakpoint
ALTER TABLE "advance" DROP COLUMN "worker_id";--> statement-breakpoint
ALTER TABLE "advance" DROP COLUMN "loan_date";--> statement-breakpoint
ALTER TABLE "advance" ALTER COLUMN "advance_request_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "advance" ADD CONSTRAINT "advance_advance_request_id_advance_request_id_fk" FOREIGN KEY ("advance_request_id") REFERENCES "public"."advance_request"("id") ON DELETE cascade ON UPDATE no action;
