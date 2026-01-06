-- Drop dan recreate kolom aet sebagai array
ALTER TABLE "tb_modality" DROP COLUMN IF EXISTS "aet";
ALTER TABLE "tb_modality" ADD COLUMN "aet" text[];