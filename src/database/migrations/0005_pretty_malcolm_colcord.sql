CREATE TABLE "tb_organization" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"id_organization" varchar NOT NULL,
	"name" varchar NOT NULL,
	"json_response" json NOT NULL,
	CONSTRAINT "tb_organization_id_organization_unique" UNIQUE("id_organization")
);
--> statement-breakpoint
DROP TABLE "tb_order" CASCADE;--> statement-breakpoint
CREATE INDEX "idx_id_organization" ON "tb_organization" USING btree ("id_organization");--> statement-breakpoint
CREATE INDEX "idx_name" ON "tb_organization" USING btree ("name");