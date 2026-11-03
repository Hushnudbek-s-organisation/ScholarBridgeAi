-- Six UK records only. Private before-images preserved; safe replay refuses
-- later content drift, no updates or deletes to the other 69 visa records.
LOCK TABLE public.visa_requirements IN SHARE ROW EXCLUSIVE MODE;
CREATE SCHEMA IF NOT EXISTS scholarbridge_maintenance;
REVOKE ALL ON SCHEMA scholarbridge_maintenance FROM PUBLIC,anon,authenticated;
CREATE TABLE IF NOT EXISTS scholarbridge_maintenance.visa_uk_backup_20261103 (
 id integer PRIMARY KEY,row_before jsonb NOT NULL,captured_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE scholarbridge_maintenance.visa_uk_backup_20261103 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON scholarbridge_maintenance.visa_uk_backup_20261103 FROM PUBLIC,anon,authenticated;
CREATE TEMP TABLE uk_visa_review_20261103 (
 id integer PRIMARY KEY,previous_title text,title text,instructions text,source_url text,is_required boolean
) ON COMMIT DROP;
INSERT INTO uk_visa_review_20261103 VALUES
(7,'Confirmation of Acceptance for Studies (CAS) Reference Number','Confirmation of Acceptance for Studies (CAS) Reference Number','Obtain an unconditional offer from a licensed Student sponsor and a CAS reference before applying. Apply within 6 months of receiving the CAS. The CAS records course and fee details; check whether ATAS is also required for your course and circumstances.','https://www.gov.uk/student-visa/course',true),
(8,'UKVI Online Student Visa Application Fee (£490)','UKVI Online Student Visa Application Fee (£558)','The standard Student visa application fee is £558 for an application outside the UK, or to extend or switch inside the UK. Pay through the official application. IHS and optional services are separate. GBP is the authoritative fee currency; any USD conversion is an estimate, not the payable fee.','https://www.gov.uk/student-visa',true),
(9,'Immigration Health Surcharge (IHS — £776 per year of visa)','Immigration Health Surcharge (student rate: £776 per visa year)','The student IHS rate is £776 per year, based on visa duration rather than course length. A visa longer than 12 but no more than 18 months costs 1.5 years; longer than 18 but less than 24 months costs 2 years. A visa of 6 months or less applied for outside the UK does not incur IHS; inside the UK it normally costs half a year. Use the official calculator for the actual visa duration and exemptions. This is a surcharge calculation, not a promise that all healthcare is free.','https://www.gov.uk/healthcare-immigration-application/how-much-pay',false),
(10,'28-Day Consecutive Bank Statement (£1,483/mo London or £1,136/mo outside London)','Financial evidence (£1,529/month London; £1,171/month outside London)','Normally show outstanding course fees for one academic year as stated on the CAS, plus living costs of £1,529/month in London or £1,171/month outside London, for up to 9 months (£13,761 or £10,539). Personal funds must be held for 28 consecutive days ending within 31 days before applying. Student loans and official sponsorship have separate evidence rules. Exemptions include some applicants resident in the UK with a valid visa for at least 12 months and differential evidence arrangements; dependants have separate amounts. Check which rules apply to you.','https://www.gov.uk/student-visa/money',false),
(11,'Tuberculosis (TB) Clearance Certificate from IOM Tashkent','Conditional TB certificate: approved clinic in Uzbekistan','A TB test is normally required when coming to the UK for 6 months or more, having lived in a listed country for at least 6 months and been living there within the last 6 months; exemptions apply. See https://www.gov.uk/tb-test-visa for the residence test. GOV.UK lists Tashkent International Clinic, 38 Sarikul Street, Tashkent 100105, as an approved clinic in Uzbekistan. Book directly with that clinic and confirm current arrangements. The certificate is normally valid for 6 months. Children under 11 do not normally need an X-ray; they still need clinical assessment where the TB rule applies.','https://www.gov.uk/government/publications/tuberculosis-test-for-a-uk-visa-clinics-in-uzbekistan/tuberculosis-testing-in-uzbekistan',false),
(12,'Biometrics Enrolment & Passport Submission at TLScontact Tashkent','Visa application centre: follow UKVI identity instructions','Apply online before booking a visa application centre appointment. Follow the identity, biometrics and document instructions issued for your own application. The GOV.UK centre directory links Uzbekistan to VFS Global: https://visa.vfsglobal.com/uzb/en/gbr/attend-centre. Use that official directory to locate the current centre and booking process. This review establishes no universal 240-day appointment deadline and does not require every applicant to surrender a passport by the same procedure.','https://www.gov.uk/find-a-visa-application-centre',false);
DO $$ BEGIN
 IF (SELECT count(*) FROM public.visa_requirements v JOIN uk_visa_review_20261103 r USING(id)
 LEFT JOIN scholarbridge_maintenance.visa_uk_backup_20261103 b USING(id)
 WHERE v.country='United Kingdom' AND v.visa_type='Student Route Visa'
 AND ((b.id IS NULL AND v.title=r.previous_title) OR (b.id IS NOT NULL AND
 (to_jsonb(v)=b.row_before OR ((v.title,v.instructions,v.is_required,v.source_url,v.source_name,v.source_type,v.verification_status) IS NOT DISTINCT FROM (r.title,r.instructions,r.is_required,r.source_url,'GOV.UK (review 2026-11-03)','government','verified'))))))<>6
 THEN RAISE EXCEPTION 'UK visa review identity/content drift'; END IF;
END $$;
INSERT INTO scholarbridge_maintenance.visa_uk_backup_20261103(id,row_before)
SELECT v.id,to_jsonb(v) FROM public.visa_requirements v JOIN uk_visa_review_20261103 r USING(id)
ON CONFLICT(id) DO NOTHING;
UPDATE public.visa_requirements v SET title=r.title,instructions=r.instructions,is_required=r.is_required,
 source_url=r.source_url,source_name='GOV.UK (review 2026-11-03)',source_type='government',
 verification_status='verified',last_verified_at=now(),updated_at=now()
FROM uk_visa_review_20261103 r WHERE v.id=r.id AND NOT ((v.title,v.instructions,v.is_required,v.source_url,v.source_name,v.source_type,v.verification_status) IS NOT DISTINCT FROM (r.title,r.instructions,r.is_required,r.source_url,'GOV.UK (review 2026-11-03)','government','verified'));
DO $$ BEGIN
 IF (SELECT count(*) FROM public.visa_requirements v JOIN uk_visa_review_20261103 r USING(id)
 WHERE ((v.title,v.instructions,v.is_required,v.source_url,v.source_name,v.source_type,v.verification_status) IS NOT DISTINCT FROM (r.title,r.instructions,r.is_required,r.source_url,'GOV.UK (review 2026-11-03)','government','verified')) AND v.last_verified_at IS NOT NULL)<>6
 THEN RAISE EXCEPTION 'UK visa review postcondition failed'; END IF;
 IF (SELECT count(*) FROM scholarbridge_maintenance.visa_uk_backup_20261103)<>6
 THEN RAISE EXCEPTION 'UK visa review before-images missing'; END IF;
END $$;
