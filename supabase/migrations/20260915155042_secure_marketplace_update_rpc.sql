BEGIN;
-- Preserve the existing editor behavior, but enforce the same ownership rules
-- as Publicacion/Propiedad RLS before the SECURITY DEFINER function writes.
DO $migration$
DECLARE target regprocedure; definition text; marker text := '    -- 2. Update Publicacion';
BEGIN
  SELECT p.oid::regprocedure INTO STRICT target FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='update_marketplace_publication' AND p.pronargs=14;
  definition := pg_get_functiondef(target);
  IF strpos(definition, marker)=0 THEN RAISE EXCEPTION 'Unexpected marketplace function; review before migration.'; END IF;
  definition := replace(definition, marker, $guard$
    PERFORM 1 FROM public."Publicacion" WHERE id_publicacion=p_id_publicacion FOR UPDATE;
    PERFORM 1 FROM public."Propiedad" WHERE id_propiedad=v_prop_id FOR UPDATE;
    IF coalesce(auth.role(),'') <> 'service_role' AND NOT (
      coalesce(private.owns_publication(p_id_publicacion),false) AND coalesce(private.owns_property(v_prop_id),false)
    ) THEN
      RAISE EXCEPTION 'You do not own this publication and property.' USING ERRCODE='42501';
    END IF;
    -- 2. Update Publicacion$guard$);
  EXECUTE definition;
  EXECUTE format('ALTER FUNCTION %s SET search_path = %L',target,'');
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon',target);
  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role',target);
END $migration$;
ALTER FUNCTION public.sync_publication_view_count() SET search_path='';
REVOKE ALL ON FUNCTION public.sync_publication_view_count() FROM PUBLIC,anon,authenticated;
COMMIT;
BEGIN;
-- Preserve the existing editor behavior, but enforce the same ownership rules
-- as Publicacion/Propiedad RLS before the SECURITY DEFINER function writes.
DO $migration$
DECLARE target regprocedure; definition text; marker text := '    -- 2. Update Publicacion';
BEGIN
  SELECT p.oid::regprocedure INTO STRICT target FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='update_marketplace_publication' AND p.pronargs=14;
  definition := pg_get_functiondef(target);
  IF strpos(definition, marker)=0 THEN RAISE EXCEPTION 'Unexpected marketplace function; review before migration.'; END IF;
  definition := replace(definition, marker, $guard$
    PERFORM 1 FROM public."Publicacion" WHERE id_publicacion=p_id_publicacion FOR UPDATE;
    PERFORM 1 FROM public."Propiedad" WHERE id_propiedad=v_prop_id FOR UPDATE;
    IF coalesce(auth.role(),'') <> 'service_role' AND NOT (
      coalesce(private.owns_publication(p_id_publicacion),false) AND coalesce(private.owns_property(v_prop_id),false)
    ) THEN
      RAISE EXCEPTION 'You do not own this publication and property.' USING ERRCODE='42501';
    END IF;
    -- 2. Update Publicacion$guard$);
  EXECUTE definition;
  EXECUTE format('ALTER FUNCTION %s SET search_path = %L',target,'');
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon',target);
  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role',target);
END $migration$;
ALTER FUNCTION public.sync_publication_view_count() SET search_path='';
REVOKE ALL ON FUNCTION public.sync_publication_view_count() FROM PUBLIC,anon,authenticated;
COMMIT;
