CREATE TABLE "tb_profile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nik" varchar(16),
	"name" varchar(255) NOT NULL,
	"gender" "gender",
	"birth_date" timestamp,
	"phone" varchar(20),
	"email" varchar(255),
	"address" text,
	"id_province" varchar,
	"province" varchar,
	"id_city" varchar,
	"city" varchar,
	"id_district" varchar,
	"district" varchar,
	"id_sub_district" varchar,
	"sub_district" varchar,
	"rt" varchar(3),
	"rw" varchar(3),
	"postal_code" varchar(10),
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	CONSTRAINT "tb_profile_nik_unique" UNIQUE("nik")
);
--> statement-breakpoint
ALTER TABLE "tb_user" DROP CONSTRAINT "tb_user_practitioner_id_tb_practitioner_id_fk";
--> statement-breakpoint
DROP INDEX "user_practitioner_idx";--> statement-breakpoint
ALTER TABLE "tb_user" ADD COLUMN "profile_id" uuid;--> statement-breakpoint
CREATE INDEX "profile_name_idx" ON "tb_profile" USING btree ("name");--> statement-breakpoint
CREATE INDEX "profile_email_idx" ON "tb_profile" USING btree ("email");--> statement-breakpoint
CREATE INDEX "profile_nik_idx" ON "tb_profile" USING btree ("nik");--> statement-breakpoint
ALTER TABLE "tb_user" ADD CONSTRAINT "tb_user_profile_id_tb_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."tb_profile"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_profile_idx" ON "tb_user" USING btree ("profile_id");--> statement-breakpoint
ALTER TABLE "tb_user" DROP COLUMN "practitioner_id";