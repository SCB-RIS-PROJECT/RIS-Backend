CREATE TABLE "tb_modality" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	CONSTRAINT "tb_modality_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE INDEX "name_modality_idx" ON "tb_modality" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "code_modality_idx" ON "tb_modality" USING btree ("code");