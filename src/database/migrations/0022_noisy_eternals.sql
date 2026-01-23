ALTER TABLE "tb_detail_order" ALTER COLUMN "schedule_date" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tb_detail_order" ALTER COLUMN "schedule_date" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "tb_detail_order" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tb_detail_order" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "tb_detail_order" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tb_detail_order" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
UPDATE "tb_detail_order" SET "updated_at" = "created_at" WHERE "updated_at" IS NULL;--> statement-breakpoint
ALTER TABLE "tb_detail_order" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tb_order" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tb_order" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "tb_order" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tb_order" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
UPDATE "tb_order" SET "updated_at" = "created_at" WHERE "updated_at" IS NULL;--> statement-breakpoint
ALTER TABLE "tb_order" ALTER COLUMN "updated_at" SET NOT NULL;