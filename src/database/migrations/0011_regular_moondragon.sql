ALTER TABLE "tb_profile" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "tb_profile" CASCADE;--> statement-breakpoint
ALTER TABLE "tb_user" RENAME COLUMN "profile_id" TO "practitioner_id";--> statement-breakpoint
ALTER TABLE "tb_detail_order" DROP CONSTRAINT "tb_detail_order_id_modality_tb_modality_id_fk";
--> statement-breakpoint
ALTER TABLE "tb_user" DROP CONSTRAINT "tb_user_profile_id_tb_profile_id_fk";
--> statement-breakpoint
DROP INDEX "detail_order_modality_idx";--> statement-breakpoint
DROP INDEX "user_profile_idx";--> statement-breakpoint
ALTER TABLE "tb_user" ADD CONSTRAINT "tb_user_practitioner_id_tb_practitioner_id_fk" FOREIGN KEY ("practitioner_id") REFERENCES "public"."tb_practitioner"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_practitioner_idx" ON "tb_user" USING btree ("practitioner_id");--> statement-breakpoint
ALTER TABLE "tb_detail_order" DROP COLUMN "id_modality";