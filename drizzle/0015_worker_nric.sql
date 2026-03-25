ALTER TABLE "worker" ADD COLUMN "nric" text;

ALTER TABLE "worker" ADD CONSTRAINT "worker_nric_unique" UNIQUE ("nric");

