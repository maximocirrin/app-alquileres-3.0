
CREATE TABLE IF NOT EXISTS marketplace_properties (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    owner_id uuid REFERENCES auth.users NOT NULL,
    
    contact_nombre text NOT NULL,
    contact_apellido text NOT NULL,
    contact_condicion text NOT NULL,
    contact_documento text NOT NULL,
    contact_celular text NOT NULL,
    contact_fijo text,
    
    operacion text NOT NULL,
    tipo_propiedad text NOT NULL,
    subtipo_propiedad text,
    
    calle_altura text NOT NULL,
    provincia text NOT NULL,
    ciudad text NOT NULL,
    barrio text NOT NULL,
    subzona text,
    ubicacion_exacta boolean DEFAULT true,
    
    ambientes integer DEFAULT 1,
    dormitorios integer DEFAULT 1,
    banos integer DEFAULT 1,
    toilettes integer DEFAULT 0,
    cocheras integer DEFAULT 0,
    
    status text DEFAULT 'draft'
);

ALTER TABLE marketplace_properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own marketplace properties." ON marketplace_properties FOR
SELECT USING (auth.uid () = owner_id);

CREATE POLICY "Users can insert their own marketplace properties." ON marketplace_properties FOR
INSERT
WITH
    CHECK (auth.uid () = owner_id);

CREATE POLICY "Users can update their own marketplace properties." ON marketplace_properties FOR
UPDATE USING (auth.uid () = owner_id);

CREATE POLICY "Users can delete their own marketplace properties." ON marketplace_properties FOR DELETE USING (auth.uid () = owner_id);