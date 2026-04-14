ALTER TABLE "capsules" ALTER COLUMN "slug" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "capsules" ADD COLUMN "original_slug" varchar(50) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "capsules" ADD COLUMN "deleted_at" timestamp with time zone;