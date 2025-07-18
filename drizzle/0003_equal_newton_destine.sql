ALTER TABLE "domains" ALTER COLUMN "created_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "domains" ALTER COLUMN "created_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "domains" ALTER COLUMN "updated_at" SET DATA TYPE timestamp;