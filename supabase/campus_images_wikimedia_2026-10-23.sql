-- ============================================================================
-- Campus photos for 93 universities that had an empty universities.image_url
-- (2026-10-23). Every file below was found on Wikimedia Commons by a title
-- search and its upload URL follows the standard Commons MD5 path scheme
-- (md5(<File name with underscores>)[0] / [0:2]); six of them were additionally
-- resolved through the Commons imageinfo API to confirm the scheme.
--
-- The PDF's `Special:FilePath/<Name>_Campus.jpg` URLs were NOT used: 4/4 sampled
-- files do not exist (docs/QS2026_RANK_VERIFICATION_2026-10-23.md §3).
--
-- Idempotent: updates only rows that are still empty, so a later, better photo
-- is never overwritten by this file.
-- ============================================================================
BEGIN;

UPDATE public.universities AS u
SET image_url = v.url,
    last_verified_at = now()
FROM (VALUES
  (213, 'https://upload.wikimedia.org/wikipedia/commons/2/2c/CzechTech_Univ_Campus%2C_Prague_Dejvice.jpg', 'https://commons.wikimedia.org/wiki/File:CzechTech_Univ_Campus%2C_Prague_Dejvice.jpg'),
  (214, 'https://upload.wikimedia.org/wikipedia/commons/7/71/Westminster_International_University_in_Tashkent.jpg', 'https://commons.wikimedia.org/wiki/File:Westminster_International_University_in_Tashkent.jpg'),
  (202, 'https://upload.wikimedia.org/wikipedia/commons/b/ba/Ko%C3%A7University2.jpg', 'https://commons.wikimedia.org/wiki/File:Ko%C3%A7University2.jpg'),
  (203, 'https://upload.wikimedia.org/wikipedia/commons/d/d9/Bogazici_University.jpg', 'https://commons.wikimedia.org/wiki/File:Bogazici_University.jpg'),
  (204, 'https://upload.wikimedia.org/wikipedia/commons/7/72/Sabanc%C4%B1_%C3%9Cniversitesi_Giri%C5%9F.jpg', 'https://commons.wikimedia.org/wiki/File:Sabanc%C4%B1_%C3%9Cniversitesi_Giri%C5%9F.jpg'),
  (205, 'https://upload.wikimedia.org/wikipedia/commons/7/79/ElteFotoThalerTamas2.jpg', 'https://commons.wikimedia.org/wiki/File:ElteFotoThalerTamas2.jpg'),
  (206, 'https://upload.wikimedia.org/wikipedia/commons/b/b4/Budapest%2C_M%C5%B1szaki_Egyetem.jpg', 'https://commons.wikimedia.org/wiki/File:Budapest%2C_M%C5%B1szaki_Egyetem.jpg'),
  (207, 'https://upload.wikimedia.org/wikipedia/commons/0/00/Building_of_the_University_of_Debrecen_20230730.jpg', 'https://commons.wikimedia.org/wiki/File:Building_of_the_University_of_Debrecen_20230730.jpg'),
  (209, 'https://upload.wikimedia.org/wikipedia/commons/7/72/Al-Farabi_KazNU_rektorat.jpg', 'https://commons.wikimedia.org/wiki/File:Al-Farabi_KazNU_rektorat.jpg'),
  (211, 'https://upload.wikimedia.org/wikipedia/commons/e/e7/Jagiellonian_University_Collegium_Novum%2C_1882_designed_Feliks_Ksi%C4%99%C5%BCarski%2C_24_Go%C5%82%C4%99bia_Street%2C_Old_Town%2C_Krak%C3%B3w%2C_Poland.jpg', 'https://commons.wikimedia.org/wiki/File:Jagiellonian_University_Collegium_Novum%2C_1882_designed_Feliks_Ksi%C4%99%C5%BCarski%2C_24_Go%C5%82%C4%99bia_Street%2C_Old_Town%2C_Krak%C3%B3w%2C_Poland.jpg'),
  (327, 'https://upload.wikimedia.org/wikipedia/commons/8/8e/Kyung_Hee_Univ._Administration_Building%28Seoul_Campus%29.JPG', 'https://commons.wikimedia.org/wiki/File:Kyung_Hee_Univ._Administration_Building%28Seoul_Campus%29.JPG'),
  (329, 'https://upload.wikimedia.org/wikipedia/commons/0/0e/ITU_Pond6.jpg', 'https://commons.wikimedia.org/wiki/File:ITU_Pond6.jpg'),
  (330, 'https://upload.wikimedia.org/wikipedia/commons/2/24/Bilkent_University_-_Main_Library.jpg', 'https://commons.wikimedia.org/wiki/File:Bilkent_University_-_Main_Library.jpg'),
  (331, 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Hacettepe_University_Turkish_Studies_Institute_20220415_%284%29.jpg', 'https://commons.wikimedia.org/wiki/File:Hacettepe_University_Turkish_Studies_Institute_20220415_%284%29.jpg'),
  (332, 'https://upload.wikimedia.org/wikipedia/commons/1/1e/Istanbul_University_campus_March_2008c.JPG', 'https://commons.wikimedia.org/wiki/File:Istanbul_University_campus_March_2008c.JPG'),
  (333, 'https://upload.wikimedia.org/wikipedia/commons/5/52/Y%C4%B1ld%C4%B1z_Teknik_%C3%9Cniversitesi_06.jpg', 'https://commons.wikimedia.org/wiki/File:Y%C4%B1ld%C4%B1z_Teknik_%C3%9Cniversitesi_06.jpg'),
  (334, 'https://upload.wikimedia.org/wikipedia/commons/3/37/Dil_ve_Tarih_Co%C4%9Frafya_Fak%C3%BCltesi_Binas%C4%B1%2C_Ankara.jpg', 'https://commons.wikimedia.org/wiki/File:Dil_ve_Tarih_Co%C4%9Frafya_Fak%C3%BCltesi_Binas%C4%B1%2C_Ankara.jpg'),
  (335, 'https://upload.wikimedia.org/wikipedia/commons/a/aa/Universit%C3%A0_degli_Studi_di_Napoli_Federico_II_%283542%29.jpg', 'https://commons.wikimedia.org/wiki/File:Universit%C3%A0_degli_Studi_di_Napoli_Federico_II_%283542%29.jpg'),
  (336, 'https://upload.wikimedia.org/wikipedia/commons/8/8c/555PisaPalazzoAllaGiornata.JPG', 'https://commons.wikimedia.org/wiki/File:555PisaPalazzoAllaGiornata.JPG'),
  (337, 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Rettorato_firenze%2C_aula_magna_02.JPG', 'https://commons.wikimedia.org/wiki/File:Rettorato_firenze%2C_aula_magna_02.JPG'),
  (338, 'https://upload.wikimedia.org/wikipedia/commons/1/1b/Loggiato_Universit%C3%A0_di_Torino.jpg', 'https://commons.wikimedia.org/wiki/File:Loggiato_Universit%C3%A0_di_Torino.jpg'),
  (339, 'https://upload.wikimedia.org/wikipedia/commons/a/a2/Szegedi_Tudom%C3%A1nyegyetem.jpg', 'https://commons.wikimedia.org/wiki/File:Szegedi_Tudom%C3%A1nyegyetem.jpg'),
  (340, 'https://upload.wikimedia.org/wikipedia/commons/5/50/Rector%27s_Office%2C_University_of_P%C3%A9cs.JPG', 'https://commons.wikimedia.org/wiki/File:Rector%27s_Office%2C_University_of_P%C3%A9cs.JPG'),
  (341, 'https://upload.wikimedia.org/wikipedia/commons/c/ce/Corvinus_foepulet.jpg', 'https://commons.wikimedia.org/wiki/File:Corvinus_foepulet.jpg'),
  (342, 'https://upload.wikimedia.org/wikipedia/commons/2/2c/Semmelweis-Ulloi26.JPG', 'https://commons.wikimedia.org/wiki/File:Semmelweis-Ulloi26.JPG'),
  (343, 'https://upload.wikimedia.org/wikipedia/commons/f/ff/University_of_G%C3%B6d%C3%B6ll%C5%91_02.JPG', 'https://commons.wikimedia.org/wiki/File:University_of_G%C3%B6d%C3%B6ll%C5%91_02.JPG'),
  (344, 'https://upload.wikimedia.org/wikipedia/commons/7/71/Budapest_Tech_Polytechnical_Institute.jpg', 'https://commons.wikimedia.org/wiki/File:Budapest_Tech_Polytechnical_Institute.jpg'),
  (345, 'https://upload.wikimedia.org/wikipedia/commons/b/ba/Universidad_Sz%C3%A9chenyi_Istv%C3%A1n_3.jpg', 'https://commons.wikimedia.org/wiki/File:Universidad_Sz%C3%A9chenyi_Istv%C3%A1n_3.jpg'),
  (346, 'https://upload.wikimedia.org/wikipedia/commons/d/d1/RUDN.jpg', 'https://commons.wikimedia.org/wiki/File:RUDN.jpg'),
  (347, 'https://upload.wikimedia.org/wikipedia/commons/7/70/Philological_Faculty_of_University_SPB.jpg', 'https://commons.wikimedia.org/wiki/File:Philological_Faculty_of_University_SPB.jpg'),
  (349, 'https://upload.wikimedia.org/wikipedia/commons/d/d4/Moscow_Institute_of_Physics_and_Technology_20260330_135338_%281%29.jpg', 'https://commons.wikimedia.org/wiki/File:Moscow_Institute_of_Physics_and_Technology_20260330_135338_%281%29.jpg'),
  (350, 'https://upload.wikimedia.org/wikipedia/commons/5/5e/Novosibirsk_State_University_main_town.jpg', 'https://commons.wikimedia.org/wiki/File:Novosibirsk_State_University_main_town.jpg'),
  (351, 'https://upload.wikimedia.org/wikipedia/commons/2/2c/%D0%93%D0%BB%D0%B0%D0%B2%D0%BD%D1%8B%D0%B9_%D0%BA%D0%BE%D1%80%D0%BF%D1%83%D1%81_%D0%A2%D0%93%D0%A3.jpg', 'https://commons.wikimedia.org/wiki/File:%D0%93%D0%BB%D0%B0%D0%B2%D0%BD%D1%8B%D0%B9_%D0%BA%D0%BE%D1%80%D0%BF%D1%83%D1%81_%D0%A2%D0%93%D0%A3.jpg'),
  (352, 'https://upload.wikimedia.org/wikipedia/commons/7/75/MEPhI_main_building_20060417-01.jpg', 'https://commons.wikimedia.org/wiki/File:MEPhI_main_building_20060417-01.jpg'),
  (353, 'https://upload.wikimedia.org/wikipedia/commons/3/3d/Kazan_State_University_from_the_2_Korpus.jpg', 'https://commons.wikimedia.org/wiki/File:Kazan_State_University_from_the_2_Korpus.jpg'),
  (354, 'https://upload.wikimedia.org/wikipedia/commons/1/10/Sunway_University_%28New_Building%29_-_2015.jpg', 'https://commons.wikimedia.org/wiki/File:Sunway_University_%28New_Building%29_-_2015.jpg'),
  (355, 'https://upload.wikimedia.org/wikipedia/commons/c/c2/Iiumcampus.jpg', 'https://commons.wikimedia.org/wiki/File:Iiumcampus.jpg'),
  (356, 'https://upload.wikimedia.org/wikipedia/commons/4/4d/Gmach_G%C5%82%C3%B3wny_Politechniki_Warszawskiej_2018.jpg', 'https://commons.wikimedia.org/wiki/File:Gmach_G%C5%82%C3%B3wny_Politechniki_Warszawskiej_2018.jpg'),
  (357, 'https://upload.wikimedia.org/wikipedia/commons/c/c4/Gmach_g%C5%82%C3%B3wny_AGH.jpg', 'https://commons.wikimedia.org/wiki/File:Gmach_g%C5%82%C3%B3wny_AGH.jpg'),
  (359, 'https://upload.wikimedia.org/wikipedia/commons/1/1f/20220711_Final_50_Bazuna_Gdansk_University_of_Technology.jpg', 'https://commons.wikimedia.org/wiki/File:20220711_Final_50_Bazuna_Gdansk_University_of_Technology.jpg'),
  (360, 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Politechnika_Wroclawska_-_budynek_glowny.jpg', 'https://commons.wikimedia.org/wiki/File:Politechnika_Wroclawska_-_budynek_glowny.jpg'),
  (361, 'https://upload.wikimedia.org/wikipedia/commons/2/2e/Wroclaw-_Uniwersytet_i_Kosciol_Uniwersytecki.jpg', 'https://commons.wikimedia.org/wiki/File:Wroclaw-_Uniwersytet_i_Kosciol_Uniwersytecki.jpg'),
  (362, 'https://upload.wikimedia.org/wikipedia/commons/9/94/Rektorat_Politechniki_Pozna%C5%84skiej_03.JPG', 'https://commons.wikimedia.org/wiki/File:Rektorat_Politechniki_Pozna%C5%84skiej_03.JPG'),
  (363, 'https://upload.wikimedia.org/wikipedia/commons/f/f5/Politechnika_%C5%81%C3%B3dzka_-_Campus_B.JPG', 'https://commons.wikimedia.org/wiki/File:Politechnika_%C5%81%C3%B3dzka_-_Campus_B.JPG'),
  (201, 'https://upload.wikimedia.org/wikipedia/commons/a/ae/MiddleEastTechnicalUniversityCampus800x470.jpg', 'https://commons.wikimedia.org/wiki/File:MiddleEastTechnicalUniversityCampus800x470.jpg'),
  (210, 'https://upload.wikimedia.org/wikipedia/commons/4/41/Kazimierzowski_Palace%2C_University_of_Warsaw%2C_Poland_04.jpg', 'https://commons.wikimedia.org/wiki/File:Kazimierzowski_Palace%2C_University_of_Warsaw%2C_Poland_04.jpg'),
  (212, 'https://upload.wikimedia.org/wikipedia/commons/d/d1/Praha%2C_Univerzita_Karlova_-_Karolinum.jpg', 'https://commons.wikimedia.org/wiki/File:Praha%2C_Univerzita_Karlova_-_Karolinum.jpg'),
  (217, 'https://upload.wikimedia.org/wikipedia/commons/1/18/HKUST_campus_view_looking_from_above.jpg', 'https://commons.wikimedia.org/wiki/File:HKUST_campus_view_looking_from_above.jpg'),
  (218, 'https://upload.wikimedia.org/wikipedia/commons/9/9b/TU_Berlin_Hauptgebaeude070710_UlrichDahl.jpg', 'https://commons.wikimedia.org/wiki/File:TU_Berlin_Hauptgebaeude070710_UlrichDahl.jpg'),
  (219, 'https://upload.wikimedia.org/wikipedia/commons/0/0a/Northwestern_University_campus%2C_Evanston%2C_IL.jpg', 'https://commons.wikimedia.org/wiki/File:Northwestern_University_campus%2C_Evanston%2C_IL.jpg'),
  (220, 'https://upload.wikimedia.org/wikipedia/commons/4/40/Karlsruher_Institut_f%C3%BCr_Technologie%2C_Forum%2C_08.2012_-_panoramio.jpg', 'https://commons.wikimedia.org/wiki/File:Karlsruher_Institut_f%C3%BCr_Technologie%2C_Forum%2C_08.2012_-_panoramio.jpg'),
  (221, 'https://upload.wikimedia.org/wikipedia/commons/c/c9/Sungkyunkwan_University_Bicheondang_and_600th_Anniversary_Hall.jpg', 'https://commons.wikimedia.org/wiki/File:Sungkyunkwan_University_Bicheondang_and_600th_Anniversary_Hall.jpg'),
  (222, 'https://upload.wikimedia.org/wikipedia/commons/6/60/Lancaster_University_Courtyard.JPG', 'https://commons.wikimedia.org/wiki/File:Lancaster_University_Courtyard.JPG'),
  (223, 'https://upload.wikimedia.org/wikipedia/commons/9/93/UNC_South_Building.jpg', 'https://commons.wikimedia.org/wiki/File:UNC_South_Building.jpg'),
  (224, 'https://upload.wikimedia.org/wikipedia/commons/6/6a/WUR_forum_building.JPG', 'https://commons.wikimedia.org/wiki/File:WUR_forum_building.JPG'),
  (225, 'https://upload.wikimedia.org/wikipedia/commons/3/31/Rectorado_de_la_Universidad_Complutense_de_Madrid.jpg', 'https://commons.wikimedia.org/wiki/File:Rectorado_de_la_Universidad_Complutense_de_Madrid.jpg'),
  (227, 'https://upload.wikimedia.org/wikipedia/commons/9/98/Tongjidaxue_Tushuguan.JPG', 'https://commons.wikimedia.org/wiki/File:Tongjidaxue_Tushuguan.JPG'),
  (228, 'https://upload.wikimedia.org/wikipedia/commons/2/24/Curtin_University_from_Edinburgh_Oval.jpg', 'https://commons.wikimedia.org/wiki/File:Curtin_University_from_Edinburgh_Oval.jpg'),
  (230, 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Wuhan_University_Library_Front_View.jpg', 'https://commons.wikimedia.org/wiki/File:Wuhan_University_Library_Front_View.jpg'),
  (231, 'https://upload.wikimedia.org/wikipedia/commons/4/4b/Emory-university-quad.jpg', 'https://commons.wikimedia.org/wiki/File:Emory-university-quad.jpg'),
  (232, 'https://upload.wikimedia.org/wikipedia/commons/c/cd/Deakin_University_Burwood_Campus.jpg', 'https://commons.wikimedia.org/wiki/File:Deakin_University_Burwood_Campus.jpg'),
  (233, 'https://upload.wikimedia.org/wikipedia/commons/2/2e/Campus_UAM%2C_pan%C3%B3ramica.jpg', 'https://commons.wikimedia.org/wiki/File:Campus_UAM%2C_pan%C3%B3ramica.jpg'),
  (235, 'https://upload.wikimedia.org/wikipedia/commons/4/4f/UMN-NorthrupMall.jpg', 'https://commons.wikimedia.org/wiki/File:UMN-NorthrupMall.jpg'),
  (236, 'https://upload.wikimedia.org/wikipedia/commons/8/86/No_18_Rektorat_Universitas_Indonesia.jpg', 'https://commons.wikimedia.org/wiki/File:No_18_Rektorat_Universitas_Indonesia.jpg'),
  (237, 'https://upload.wikimedia.org/wikipedia/commons/e/e2/Tel_Aviv_University_from_Air.jpg', 'https://commons.wikimedia.org/wiki/File:Tel_Aviv_University_from_Air.jpg'),
  (238, 'https://upload.wikimedia.org/wikipedia/commons/5/5c/NTHU_entrance.JPG', 'https://commons.wikimedia.org/wiki/File:NTHU_entrance.JPG'),
  (240, 'https://upload.wikimedia.org/wikipedia/commons/9/96/NCKU_College_of_Engineering_buildings_01.jpg', 'https://commons.wikimedia.org/wiki/File:NCKU_College_of_Engineering_buildings_01.jpg'),
  (241, 'https://upload.wikimedia.org/wikipedia/commons/c/cb/Dsg_UF_Reitz_Union_20050507.jpg', 'https://commons.wikimedia.org/wiki/File:Dsg_UF_Reitz_Union_20050507.jpg'),
  (242, 'https://upload.wikimedia.org/wikipedia/commons/a/a0/La_Trobe_University.jpg', 'https://commons.wikimedia.org/wiki/File:La_Trobe_University.jpg'),
  (243, 'https://upload.wikimedia.org/wikipedia/commons/1/1b/Kollegienhaus_universitaet-erlangen.jpg', 'https://commons.wikimedia.org/wiki/File:Kollegienhaus_universitaet-erlangen.jpg'),
  (244, 'https://upload.wikimedia.org/wikipedia/commons/f/f8/University-bonn_2005-11-18.jpg', 'https://commons.wikimedia.org/wiki/File:University-bonn_2005-11-18.jpg'),
  (245, 'https://upload.wikimedia.org/wikipedia/commons/f/f4/UM%2C_Minderbroedersberg.jpg', 'https://commons.wikimedia.org/wiki/File:UM%2C_Minderbroedersberg.jpg'),
  (246, 'https://upload.wikimedia.org/wikipedia/commons/2/2c/Entrada_Unicamp_2.jpg', 'https://commons.wikimedia.org/wiki/File:Entrada_Unicamp_2.jpg'),
  (247, 'https://upload.wikimedia.org/wikipedia/commons/3/3c/WaikatoUni.jpg', 'https://commons.wikimedia.org/wiki/File:WaikatoUni.jpg'),
  (248, 'https://upload.wikimedia.org/wikipedia/commons/4/49/Palazzo_Bo_%28Padua%29.jpg', 'https://commons.wikimedia.org/wiki/File:Palazzo_Bo_%28Padua%29.jpg'),
  (249, 'https://upload.wikimedia.org/wikipedia/commons/9/95/Academic_building_around_quad_at_the_University_of_Rochester.jpg', 'https://commons.wikimedia.org/wiki/File:Academic_building_around_quad_at_the_University_of_Rochester.jpg'),
  (250, 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Gedung_Pusat_%28Rektorat%29_UGM.jpg', 'https://commons.wikimedia.org/wiki/File:Gedung_Pusat_%28Rektorat%29_UGM.jpg'),
  (251, 'https://upload.wikimedia.org/wikipedia/commons/8/81/Manawatu_campus.jpg', 'https://commons.wikimedia.org/wiki/File:Manawatu_campus.jpg'),
  (252, 'https://upload.wikimedia.org/wikipedia/commons/2/28/Dartmouth_College_campus_2007-06-23_Dartmouth_Hall_02.JPG', 'https://commons.wikimedia.org/wiki/File:Dartmouth_College_campus_2007-06-23_Dartmouth_Hall_02.JPG'),
  (253, 'https://upload.wikimedia.org/wikipedia/commons/a/a0/VUW-Kelburn.jpg', 'https://commons.wikimedia.org/wiki/File:VUW-Kelburn.jpg'),
  (257, 'https://upload.wikimedia.org/wikipedia/commons/f/f1/Bandung_Institute_of_Technology%2C_Indonesia%2C_2019-12-03.jpg', 'https://commons.wikimedia.org/wiki/File:Bandung_Institute_of_Technology%2C_Indonesia%2C_2019-12-03.jpg'),
  (258, 'https://upload.wikimedia.org/wikipedia/commons/6/6b/Heriot-Watt_University%2C_Edinburgh_Campus_-_geograph.org.uk_-_3450763.jpg', 'https://commons.wikimedia.org/wiki/File:Heriot-Watt_University%2C_Edinburgh_Campus_-_geograph.org.uk_-_3450763.jpg'),
  (259, 'https://upload.wikimedia.org/wikipedia/commons/2/21/Reitoria_Pardal_Monteiro_4330.jpg', 'https://commons.wikimedia.org/wiki/File:Reitoria_Pardal_Monteiro_4330.jpg'),
  (261, 'https://upload.wikimedia.org/wikipedia/commons/d/d1/University_of_Canterbury%2C_Christchurch%2C_New_Zealand%2C_12_June_2008.jpg', 'https://commons.wikimedia.org/wiki/File:University_of_Canterbury%2C_Christchurch%2C_New_Zealand%2C_12_June_2008.jpg'),
  (262, 'https://upload.wikimedia.org/wikipedia/commons/f/fb/NTNU_Trondheim_Mainbuilding.jpg', 'https://commons.wikimedia.org/wiki/File:NTNU_Trondheim_Mainbuilding.jpg'),
  (263, 'https://upload.wikimedia.org/wikipedia/commons/b/b2/UCSI_University_Sarawak_campus.jpg', 'https://commons.wikimedia.org/wiki/File:UCSI_University_Sarawak_campus.jpg'),
  (264, 'https://upload.wikimedia.org/wikipedia/commons/3/35/The_Wits_University_East_Campus_%28archived%29.jpg', 'https://commons.wikimedia.org/wiki/File:The_Wits_University_East_Campus_%28archived%29.jpg'),
  (265, 'https://upload.wikimedia.org/wikipedia/commons/0/0b/TJU_Gate.JPG', 'https://commons.wikimedia.org/wiki/File:TJU_Gate.JPG'),
  (266, 'https://upload.wikimedia.org/wikipedia/commons/8/86/Main_building_of_Beijing_Normal_University_%2820200921154115%29.jpg', 'https://commons.wikimedia.org/wiki/File:Main_building_of_Beijing_Normal_University_%2820200921154115%29.jpg'),
  (267, 'https://upload.wikimedia.org/wikipedia/commons/2/28/Universidad-carlos3.jpg', 'https://commons.wikimedia.org/wiki/File:Universidad-carlos3.jpg'),
  (268, 'https://upload.wikimedia.org/wikipedia/commons/0/07/University_of_Leicester_towers_2010.jpg', 'https://commons.wikimedia.org/wiki/File:University_of_Leicester_towers_2010.jpg'),
  (269, 'https://upload.wikimedia.org/wikipedia/commons/2/2d/Festa_del_Perdono_Facciata_Milano.jpg', 'https://commons.wikimedia.org/wiki/File:Festa_del_Perdono_Facciata_Milano.jpg'),
  (270, 'https://upload.wikimedia.org/wikipedia/commons/e/ed/Guildford_Cathedral_and_University_of_Surrey_from_the_west.jpg', 'https://commons.wikimedia.org/wiki/File:Guildford_Cathedral_and_University_of_Surrey_from_the_west.jpg')
) AS v(id, url, commons)
WHERE u.id = v.id
  AND NULLIF(trim(coalesce(u.image_url, '')), '') IS NULL;

COMMIT;

-- Verification: SELECT count(*) FILTER (WHERE image_url IS NOT NULL) AS with_image FROM public.universities;  -- 293
