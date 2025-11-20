CREATE TYPE "public"."gender" AS ENUM('MALE', 'FEMALE');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('DOCTOR', 'NURSE', 'MIDWIFE', 'PHARMACIST', 'LAB_TECHNICIAN', 'RADIOLOGIST', 'THERAPIST', 'DENTIST', 'ADMINISTRATIVE_STAFF');--> statement-breakpoint
CREATE TABLE "tb_patient" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mrn" varchar(6) NOT NULL,
	"ihs_number" varchar(12),
	"ihs_last_sync" timestamp,
	"ihs_response_status" varchar(3),
	"nik" varchar(16) NOT NULL,
	"name" varchar(255) NOT NULL,
	"gender" "gender" NOT NULL,
	"birth_date" timestamp NOT NULL,
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
	"emergency_contact_name" varchar(255),
	"emergency_contact_phone" varchar(20),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	CONSTRAINT "tb_patient_mrn_unique" UNIQUE("mrn"),
	CONSTRAINT "tb_patient_ihs_number_unique" UNIQUE("ihs_number"),
	CONSTRAINT "tb_patient_nik_unique" UNIQUE("nik")
);
--> statement-breakpoint
CREATE TABLE "tb_practitioner" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ihs_number" varchar(12),
	"ihs_last_sync" timestamp,
	"ihs_response_status" varchar(3),
	"role" "role" DEFAULT 'DOCTOR' NOT NULL,
	"nik" varchar(16) NOT NULL,
	"name" varchar(255) NOT NULL,
	"gender" "gender" NOT NULL,
	"birth_date" timestamp NOT NULL,
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
	CONSTRAINT "tb_practitioner_ihs_number_unique" UNIQUE("ihs_number"),
	CONSTRAINT "tb_practitioner_nik_unique" UNIQUE("nik")
);
--> statement-breakpoint
CREATE TABLE "tb_permission" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	CONSTRAINT "permission_name_unq" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "tb_role_permission" (
	"id_role" uuid NOT NULL,
	"id_permission" uuid NOT NULL,
	CONSTRAINT "tb_role_permission_id_role_id_permission_pk" PRIMARY KEY("id_role","id_permission")
);
--> statement-breakpoint
CREATE TABLE "tb_role" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	CONSTRAINT "role_name_unq" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "tb_user_permission" (
	"id_user" uuid NOT NULL,
	"id_permission" uuid NOT NULL,
	CONSTRAINT "tb_user_permission_id_user_id_permission_pk" PRIMARY KEY("id_user","id_permission")
);
--> statement-breakpoint
CREATE TABLE "tb_user_role" (
	"id_user" uuid NOT NULL,
	"id_role" uuid NOT NULL,
	CONSTRAINT "tb_user_role_id_user_id_role_pk" PRIMARY KEY("id_user","id_role")
);
--> statement-breakpoint
CREATE TABLE "tb_session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"id_user" uuid NOT NULL,
	"expires_at" timestamp NOT NULL,
	"ip" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "tb_user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	"avatar" text,
	"email_verified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	CONSTRAINT "tb_user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "tb_role_permission" ADD CONSTRAINT "tb_role_permission_id_role_tb_role_id_fk" FOREIGN KEY ("id_role") REFERENCES "public"."tb_role"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tb_role_permission" ADD CONSTRAINT "tb_role_permission_id_permission_tb_permission_id_fk" FOREIGN KEY ("id_permission") REFERENCES "public"."tb_permission"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tb_user_permission" ADD CONSTRAINT "tb_user_permission_id_user_tb_user_id_fk" FOREIGN KEY ("id_user") REFERENCES "public"."tb_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tb_user_permission" ADD CONSTRAINT "tb_user_permission_id_permission_tb_permission_id_fk" FOREIGN KEY ("id_permission") REFERENCES "public"."tb_permission"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tb_user_role" ADD CONSTRAINT "tb_user_role_id_user_tb_user_id_fk" FOREIGN KEY ("id_user") REFERENCES "public"."tb_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tb_user_role" ADD CONSTRAINT "tb_user_role_id_role_tb_role_id_fk" FOREIGN KEY ("id_role") REFERENCES "public"."tb_role"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tb_session" ADD CONSTRAINT "tb_session_id_user_tb_user_id_fk" FOREIGN KEY ("id_user") REFERENCES "public"."tb_user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "patient_name_idx" ON "tb_patient" USING btree ("name");--> statement-breakpoint
CREATE INDEX "patient_nik_idx" ON "tb_patient" USING btree ("nik");--> statement-breakpoint
CREATE INDEX "patient_mrn_idx" ON "tb_patient" USING btree ("mrn");--> statement-breakpoint
CREATE INDEX "patient_phone_idx" ON "tb_patient" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "patient_email_idx" ON "tb_patient" USING btree ("email");--> statement-breakpoint
CREATE INDEX "practitioner_name_idx" ON "tb_practitioner" USING btree ("name");--> statement-breakpoint
CREATE INDEX "practitioner_email_idx" ON "tb_practitioner" USING btree ("email");--> statement-breakpoint
CREATE INDEX "practitioner_nik_idx" ON "tb_practitioner" USING btree ("nik");--> statement-breakpoint
CREATE INDEX "practitioner_role_idx" ON "tb_practitioner" USING btree ("role");--> statement-breakpoint
CREATE INDEX "id_role_idx" ON "tb_role_permission" USING btree ("id_role");--> statement-breakpoint
CREATE INDEX "id_permission_idx" ON "tb_role_permission" USING btree ("id_permission");--> statement-breakpoint
CREATE INDEX "id_user_permission_idx" ON "tb_user_permission" USING btree ("id_user");--> statement-breakpoint
CREATE INDEX "id_permission_user_idx" ON "tb_user_permission" USING btree ("id_permission");--> statement-breakpoint
CREATE INDEX "id_user_role_idx" ON "tb_user_role" USING btree ("id_user");--> statement-breakpoint
CREATE INDEX "id_role_user_idx" ON "tb_user_role" USING btree ("id_role");--> statement-breakpoint
CREATE INDEX "id_user_idx" ON "tb_session" USING btree ("id_user");--> statement-breakpoint
CREATE UNIQUE INDEX "email_idx" ON "tb_user" USING btree ("email");--> statement-breakpoint
CREATE INDEX "name_idx" ON "tb_user" USING btree ("name");