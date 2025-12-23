-- Add service_request_json column to tb_detail_order
-- This column will store the full FHIR ServiceRequest object from SIMRS
ALTER TABLE "tb_detail_order" ADD COLUMN "service_request_json" jsonb;

-- Create index on service_request_json for faster queries
CREATE INDEX "detail_order_service_request_json_idx" ON "tb_detail_order" USING gin ("service_request_json");
