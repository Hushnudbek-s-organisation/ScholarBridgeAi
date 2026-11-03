-- Safe defaults + canonical verification flags for future catalogue writes.
-- Does not change existing facts or automatically promote any record.
ALTER TABLE public.programs ALTER COLUMN verification_status SET DEFAULT 'unverified';
ALTER TABLE public.program_requirements ALTER COLUMN is_verified SET DEFAULT false;
CREATE OR REPLACE FUNCTION scholarbridge_maintenance.sync_catalogue_verification_flags()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
  NEW.is_verified := NEW.verification_status = 'verified';
  IF TG_TABLE_NAME = 'application_cycles' THEN
    NEW.is_estimated := NEW.verification_status <> 'verified';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION scholarbridge_maintenance.sync_catalogue_verification_flags() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS sync_program_verification_flags ON public.programs;
CREATE TRIGGER sync_program_verification_flags BEFORE INSERT OR UPDATE OF verification_status,is_verified
ON public.programs FOR EACH ROW EXECUTE FUNCTION scholarbridge_maintenance.sync_catalogue_verification_flags();
DROP TRIGGER IF EXISTS sync_requirement_verification_flags ON public.program_requirements;
CREATE TRIGGER sync_requirement_verification_flags BEFORE INSERT OR UPDATE OF verification_status,is_verified
ON public.program_requirements FOR EACH ROW EXECUTE FUNCTION scholarbridge_maintenance.sync_catalogue_verification_flags();
DROP TRIGGER IF EXISTS sync_cycle_verification_flags ON public.application_cycles;
CREATE TRIGGER sync_cycle_verification_flags BEFORE INSERT OR UPDATE OF verification_status,is_verified,is_estimated
ON public.application_cycles FOR EACH ROW EXECUTE FUNCTION scholarbridge_maintenance.sync_catalogue_verification_flags();
