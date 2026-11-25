-- Replace five misidentified campus photos discovered in the live catalogue.
-- Licensed photo evidence is kept as image provenance, not an academic official source.
WITH evidence(id,old_suffix,new_url,source_url,caption,alt_text,hero) AS (VALUES
 (76,'Campus_Ecole_polytechnique_de_palaiseau.jpg','https://upload.wikimedia.org/wikipedia/commons/0/0c/LschoolE.jpg','https://commons.wikimedia.org/wiki/File:LschoolE.jpg','LSE Houghton Street, photographed in 2007 — James Ketteringham, public domain.','Houghton Street at the London School of Economics',true),
 (109,'Parkville_-_University_of_Melbourne_%28Ormond_College%29.jpg','https://upload.wikimedia.org/wikipedia/commons/2/20/Rmit_building_8.jpg','https://commons.wikimedia.org/wiki/File:Rmit_building_8.jpg','RMIT Building 8, Swanston Street — Biatch, public domain (2006).','RMIT Building 8 in Melbourne',true),
 (97,'Universiti_Malaya.jpg','https://upload.wikimedia.org/wikipedia/commons/d/dd/Pusat_Kepimpinan_Wanita_Tun_Fatimah_Hashim.jpg','https://commons.wikimedia.org/wiki/File:Pusat_Kepimpinan_Wanita_Tun_Fatimah_Hashim.jpg','Tun Fatimah Hashim Women Leadership Centre entrance at UKM — Zahirulnukman, CC0 (2023).','Entrance to the Tun Fatimah Hashim Women Leadership Centre at UKM',true),
 (71,'Campus_Ecole_polytechnique_de_palaiseau.jpg','https://upload.wikimedia.org/wikipedia/commons/b/b2/Fa%C3%A7ade_B%C3%A2timent_Henri_Moissan.jpg','https://commons.wikimedia.org/wiki/File:Fa%C3%A7ade_B%C3%A2timent_Henri_Moissan.jpg','Henri Moissan building, Paris-Saclay — Jmex, CC0 (2024).','Henri Moissan building at Université Paris-Saclay',true),
 (38,'2024_Yasuda_Auditorium_-_Tokyo_University.jpg','https://upload.wikimedia.org/wikipedia/commons/2/29/Main_Building_-_Tokyo_Institute_of_Technology.jpg','https://commons.wikimedia.org/wiki/File:Main_Building_-_Tokyo_Institute_of_Technology.jpg','Ookayama main building, former Tokyo Institute of Technology (now Institute of Science Tokyo) — Kakidai, CC BY-SA 4.0, 2018. Display resized; original and licence at source.','Ookayama main building at Institute of Science Tokyo',false)
), matching AS MATERIALIZED (
 SELECT e.*,to_jsonb(u) old_uni,to_jsonb(i) old_image
 FROM evidence e JOIN public.universities u ON u.id=e.id
 JOIN public.university_images i ON i.id=e.id AND i.university_id=u.id
 WHERE u.is_active AND right(u.image_url,length(e.old_suffix))=e.old_suffix AND i.image_url=u.image_url
), images_updated AS (
 UPDATE public.university_images i SET image_url=m.new_url,source_url=m.source_url,caption=m.caption,
 alt_text=m.alt_text,verification_status='verified'
 FROM matching m WHERE i.id=m.id AND to_jsonb(i)=m.old_image
 RETURNING i.id,i.image_url,i.source_url,i.caption
), universities_updated AS (
 UPDATE public.universities u SET image_url=CASE WHEN m.hero THEN m.new_url ELSE NULL END
 FROM matching m JOIN images_updated i ON i.id=m.id WHERE u.id=m.id AND to_jsonb(u)=m.old_uni
 RETURNING u.id,u.image_url
), audited AS (
 INSERT INTO public.audit_logs(entity_type,entity_id,field_changed,old_value,new_value,source,actor,verification_status)
 SELECT 'university',u.id,'campus_image',jsonb_build_object('image_url',m.old_uni->'image_url','image_row',m.old_image)::text,
 jsonb_build_object('image_url',u.image_url,'verified_image',to_jsonb(i))::text,m.source_url,'catalogue_review','verified'
 FROM universities_updated u JOIN matching m ON m.id=u.id JOIN images_updated i ON i.id=u.id RETURNING id
), revision AS (
 INSERT INTO public.cache_revisions(scope,revision,reason,updated_at)
 SELECT scope,2,'2026-11-25 corrected misidentified campus images',now() FROM (VALUES ('catalogue'),('evidence')) s(scope)
 WHERE EXISTS(SELECT 1 FROM universities_updated)
 ON CONFLICT(scope) DO UPDATE SET revision=public.cache_revisions.revision+1,reason=excluded.reason,updated_at=excluded.updated_at RETURNING scope
)
SELECT (SELECT count(*) FROM images_updated) corrected_images,(SELECT count(*) FROM universities_updated) university_cards,
 (SELECT count(*) FROM audited) audit_rows,(SELECT count(*) FROM revision) invalidated_scopes;
