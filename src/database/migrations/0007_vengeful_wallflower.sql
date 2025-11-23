CREATE TYPE "public"."address_type" AS ENUM('postal', 'physical', 'both');--> statement-breakpoint
CREATE TYPE "public"."address_use" AS ENUM('home', 'work', 'temp', 'old', 'billing');--> statement-breakpoint
CREATE TYPE "public"."organization_type" AS ENUM('prov', 'dept', 'team', 'govt', 'ins', 'pay', 'edu', 'reli', 'crs', 'cg', 'bus', 'ntwk');--> statement-breakpoint
CREATE TYPE "public"."telecom_system" AS ENUM('phone', 'fax', 'email', 'pager', 'url', 'sms', 'other');--> statement-breakpoint
CREATE TYPE "public"."telecom_use" AS ENUM('home', 'work', 'temp', 'old', 'mobile');--> statement-breakpoint
CREATE TABLE "tb_organization" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(100) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"type" "organization_type" DEFAULT 'prov' NOT NULL,
	"satu_sehat_org_id" varchar(255),
	"satu_sehat_identifier_system" varchar(255),
	"satu_sehat_identifier_value" varchar(255),
	"parent_org_id" uuid,
	"satu_sehat_parent_org_id" varchar(255),
	"telecom" jsonb,
	"address" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tb_organization_code_unique" UNIQUE("code"),
	CONSTRAINT "tb_organization_satu_sehat_org_id_unique" UNIQUE("satu_sehat_org_id")
);
--> statement-breakpoint
ALTER TABLE "tb_organization" ADD CONSTRAINT "tb_organization_parent_org_id_tb_organization_id_fk" FOREIGN KEY ("parent_org_id") REFERENCES "public"."tb_organization"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "satu_sehat_org_id_idx" ON "tb_organization" USING btree ("satu_sehat_org_id");--> statement-breakpoint
CREATE INDEX "organization_type_idx" ON "tb_organization" USING btree ("type");--> statement-breakpoint
CREATE INDEX "parent_org_id_idx" ON "tb_organization" USING btree ("parent_org_id");--> statement-breakpoint
CREATE INDEX "organization_active_idx" ON "tb_organization" USING btree ("active");