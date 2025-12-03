ALTER TABLE "tb_order" ALTER COLUMN "accession_number" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "tb_order" ALTER COLUMN "order_number" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "tb_order" ALTER COLUMN "order_date" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "tb_order" ALTER COLUMN "schedule_date" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "tb_order" ALTER COLUMN "priority" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "tb_order" ALTER COLUMN "status_order" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "tb_order" ALTER COLUMN "require_fasting" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "tb_order" ALTER COLUMN "require_pregnancy_check" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "tb_order" ALTER COLUMN "require_use_contrast" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "tb_order" ALTER COLUMN "created_at" DROP NOT NULL;