-- Correct one transcription error in the connector-applied migration.
-- The canonical review SQL already contains the correct, fetched GOV.UK URL.
-- Original six record before-images remain private and unchanged.
UPDATE public.visa_requirements SET
 source_url='https://www.gov.uk/government/publications/tuberculosis-test-for-a-uk-visa-clinics-in-uzbekistan/tuberculosis-testing-in-uzbekistan',
 updated_at=now()
WHERE id=11 AND country='United Kingdom' AND visa_type='Student Route Visa'
 AND source_name='GOV.UK (review 2026-11-03)'
 AND source_url='https://www.gov.uk/government/publications/tuberculosis-test-for-a-uk-visa-clinics-in-uzbekistan/tuberculosis/testing-in-uzbekistan';
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.visa_requirements WHERE id=11 AND country='United Kingdom'
 AND source_url='https://www.gov.uk/government/publications/tuberculosis-test-for-a-uk-visa-clinics-in-uzbekistan/tuberculosis-testing-in-uzbekistan')
 THEN RAISE EXCEPTION 'UK TB source URL postcondition failed'; END IF;
END $$;
