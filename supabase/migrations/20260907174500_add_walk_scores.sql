-- Add mobility scores to Propiedad table
ALTER TABLE "public"."Propiedad"
ADD COLUMN "caminabilidad_score" integer,
ADD COLUMN "transporte_score" integer,
ADD COLUMN "bicicleta_score" integer;

-- Add a comment to the columns
COMMENT ON COLUMN "public"."Propiedad"."caminabilidad_score" IS 'Walk Score from API';
COMMENT ON COLUMN "public"."Propiedad"."transporte_score" IS 'Transit Score from API';
COMMENT ON COLUMN "public"."Propiedad"."bicicleta_score" IS 'Bike Score from API';
