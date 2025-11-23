CREATE TABLE "tb_location" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"id_location_satusehat" varchar(255),
	"identifier_system" varchar(255),
	"identifier_value" varchar(255),
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"mode" varchar(50),
	"telecom" jsonb,
	"address_use" varchar(50),
	"address_line" jsonb,
	"address_city" varchar(100),
	"address_postal_code" varchar(20),
	"address_country" varchar(10),
	"province_code" varchar(10),
	"city_code" varchar(10),
	"district_code" varchar(10),
	"village_code" varchar(15),
	"rt" varchar(5),
	"rw" varchar(5),
	"physical_type_code" varchar(50),
	"physical_type_display" varchar(100),
	"longitude" numeric(11, 8),
	"latitude" numeric(10, 8),
	"altitude" numeric(10, 2),
	"managing_organization_id" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "tb_location_id_location_satusehat_unique" UNIQUE("id_location_satusehat")
);
--> statement-breakpoint
CREATE INDEX "idx_locations_id_location_satusehat" ON "tb_location" USING btree ("id_location_satusehat");--> statement-breakpoint
CREATE INDEX "idx_locations_status" ON "tb_location" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_locations_name" ON "tb_location" USING btree ("name");