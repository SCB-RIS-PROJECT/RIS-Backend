-- Add code_text field to tb_detail_order
ALTER TABLE "tb_detail_order" ADD COLUMN "code_text" varchar(255);

-- Add comment for documentation
COMMENT ON COLUMN "tb_detail_order"."code_text" IS 'FHIR ServiceRequest code.text - human readable description of the procedure';
