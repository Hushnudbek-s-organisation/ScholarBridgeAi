# Supabase universitetlar — QS reytingi, rasm va dastur bo'shliqlari ro'yxati (2026-10-23)

Loyiha: Supabase `zkdguzbdopfedkffsatk`, jadval `public.universities` (jami **364** qator). Tekshiruv mezonlari: QS reytingi = `world_ranking IS NULL`; rasm = `image_url` bo'sh (ilova faqat shu ustundan foydalanadi — `UniversityExplorer` / `UniversityDetail`, Wikimedia Commons kampus fotosi); dastur = `programs` jadvalida bitta ham qator yo'q.

Mashina o'qiydigan nusxa: `data/universities_missing_rank_image_programs_2026-10-23.csv`.

## 1. Xulosa

| Mezon | Soni | Izoh |
| --- | ---: | --- |
| Jami universitetlar | 364 | |
| QS reytingi (`world_ranking`) yo'q | **164** | qolgan 200 tasida QS reytingi bor |
| Rasmi (`image_url`) yo'q | **164** | **aynan o'sha 164 ta** — 200 ta QS-reytingli universitetning hammasida rasm bor |
| Dasturi (`programs`) yo'q | **4** | to'rttasi ham reytingsiz va rasmsiz (eski "placeholder" qatorlar) |
| Uchala ma'lumot ham yo'q | **4** | `id` 213, 214, 215, 216 |
| Kamida bittasi yo'q | **164** | |

Reytingsiz/rasmsiz 164 ta universitetning kelib chiqishi:

| Manba (`data_source`) | Soni | Dasturi bor |
| --- | ---: | ---: |
| Top 300 PDF importi (`id` 201–326 oralig'ida) | 114 | 114 |
| 13-davlat Top-10 PDF importi (`id` 202–364 oralig'ida) | 46 | 46 |
| Placeholder (manbasiz, `unverified`) | 4 | 0 |

Nega reyting yo'q: ikkala PDF ham `world_ranking`ni "litsenziyali — qat'iy NULL" deb talab qilgan, shuning uchun PDFdan kirgan yangi qatorlarda reyting ataylab bo'sh qoldirilgan (mavjud 200 ta QS reytingi saqlangan). Rasm PDFlarda umuman bo'lmagan. `university_images` (200 qator) va `campuses.image_url` (200 qator) ham faqat 200 ta reytingli universitet uchun mavjud.

## 2. Uchala ma'lumot ham yo'q — reyting ✗, rasm ✗, dastur ✗ (4 ta)

Bu qatorlarda faqat nom, shahar, qisqa tavsif va sayt bor; tuition, IELTS/GPA, acceptance, founded_year, university_type, grantlar, muddatlar, manbalar (`university_sources`) — hammasi bo'sh.

| id | Universitet | Davlat | Shahar | Sayt | Holat |
| ---: | --- | --- | --- | --- | --- |
| 213 | Czech Technical University in Prague (CTU) | Czechia | Prague | https://www.cvut.cz/en | `unverified` |
| 215 | Inha University in Tashkent (IUT) | Uzbekistan | Tashkent | https://inha.uz/en/ | `unverified` |
| 216 | New Uzbekistan University | Uzbekistan | Tashkent | https://newuu.uz/en | `unverified` |
| 214 | Westminster International University in Tashkent (WIUT) | Uzbekistan | Tashkent | https://wiut.uz/ | `unverified` |

## 3. Reyting ✗, rasm ✗, lekin dasturi bor (160 ta) — davlatlar bo'yicha

Ustunlar: Dastur / Grant / Muddat = `programs` / `scholarships` (`university_id` bo'yicha) / `application_cycles` qatorlari soni. Manba: T300 = Top 300 PDF, UZ13 = 13-davlat PDF.

### Australia (8)

| id | Universitet | Shahar | Manba | Dastur | Grant | Muddat | Sayt |
| ---: | --- | --- | --- | ---: | ---: | ---: | --- |
| 228 | Curtin University | Perth | T300 | 1 | 1 | 1 | https://www.curtin.edu.au |
| 232 | Deakin University | Melbourne / Geelong | T300 | 1 | 1 | 1 | https://www.deakin.edu.au |
| 256 | Griffith University | Brisbane / Gold Coast | T300 | 1 | 1 | 1 | https://www.griffith.edu.au |
| 242 | La Trobe University | Melbourne | T300 | 1 | 1 | 1 | https://www.latrobe.edu.au |
| 326 | Queensland University of Technology | Brisbane | T300 | 1 | 1 | 1 | https://www.qut.edu.au |
| 271 | Swinburne University of Technology | Melbourne | T300 | 1 | 1 | 1 | https://www.swinburne.edu.au |
| 310 | University of Newcastle (Australia) | Newcastle, NSW | T300 | 1 | 1 | 1 | https://www.newcastle.edu.au |
| 290 | University of Tasmania | Hobart | T300 | 1 | 1 | 1 | https://www.utas.edu.au |

### Belgium (2)

| id | Universitet | Shahar | Manba | Dastur | Grant | Muddat | Sayt |
| ---: | --- | --- | --- | ---: | ---: | ---: | --- |
| 318 | Université libre de Bruxelles | Brussels | T300 | 1 | 1 | 2 | https://www.ulb.be |
| 300 | Vrije Universiteit Brussel | Brussels | T300 | 1 | 1 | 2 | https://www.vub.be |

### Brazil (1)

| id | Universitet | Shahar | Manba | Dastur | Grant | Muddat | Sayt |
| ---: | --- | --- | --- | ---: | ---: | ---: | --- |
| 246 | University of Campinas | Campinas | T300 | 1 | 1 | 1 | https://www.unicamp.br |

### Canada (2)

| id | Universitet | Shahar | Manba | Dastur | Grant | Muddat | Sayt |
| ---: | --- | --- | --- | ---: | ---: | ---: | --- |
| 284 | Dalhousie University | Halifax, NS | T300 | 1 | 1 | 1 | https://www.dal.ca |
| 229 | Western University | London, ON | T300 | 1 | 1 | 1 | https://www.uwo.ca |

### Chile (1)

| id | Universitet | Shahar | Manba | Dastur | Grant | Muddat | Sayt |
| ---: | --- | --- | --- | ---: | ---: | ---: | --- |
| 303 | Universidad de Chile | Santiago | T300 | 1 | 1 | 1 | https://uchile.cl |

### China (8)

| id | Universitet | Shahar | Manba | Dastur | Grant | Muddat | Sayt |
| ---: | --- | --- | --- | ---: | ---: | ---: | --- |
| 266 | Beijing Normal University | Beijing | T300 | 1 | 1 | 1 | https://english.bnu.edu.cn |
| 280 | Harbin Institute of Technology | Harbin | T300 | 1 | 1 | 1 | https://en.hit.edu.cn |
| 295 | Huazhong University of Science and Technology | Wuhan | T300 | 1 | 1 | 1 | https://english.hust.edu.cn |
| 301 | Southern University of Science and Technology | Shenzhen | T300 | 1 | 1 | 1 | https://www.sustech.edu.cn |
| 265 | Tianjin University | Tianjin | T300 | 1 | 1 | 1 | https://www.tju.edu.cn |
| 227 | Tongji University | Shanghai | T300 | 1 | 1 | 1 | https://en.tongji.edu.cn |
| 230 | Wuhan University | Wuhan | T300 | 1 | 1 | 1 | https://en.whu.edu.cn |
| 291 | Xi’an Jiaotong University | Xi'an | T300 | 1 | 1 | 1 | https://en.xjtu.edu.cn |

### Czechia (1)

| id | Universitet | Shahar | Manba | Dastur | Grant | Muddat | Sayt |
| ---: | --- | --- | --- | ---: | ---: | ---: | --- |
| 212 | Charles University | Prague | T300 | 1 | 1 | 1 | https://cuni.cz/UKEN-1.html |

### France (4)

| id | Universitet | Shahar | Manba | Dastur | Grant | Muddat | Sayt |
| ---: | --- | --- | --- | ---: | ---: | ---: | --- |
| 302 | Institut Polytechnique de Paris | Palaiseau (Paris) | T300 | 1 | 1 | 1 | https://www.ip-paris.fr |
| 324 | Université Paris 1 Panthéon-Sorbonne | Paris | T300 | 1 | 1 | 1 | https://www.pantheonsorbonne.fr |
| 297 | École Normale Supérieure de Lyon | Lyon | T300 | 1 | 1 | 1 | https://www.ens-lyon.fr |
| 298 | École des Ponts ParisTech | Champs-sur-Marne (Paris) | T300 | 1 | 1 | 1 | https://ecoledesponts.fr |

### Germany (7)

| id | Universitet | Shahar | Manba | Dastur | Grant | Muddat | Sayt |
| ---: | --- | --- | --- | ---: | ---: | ---: | --- |
| 220 | Karlsruhe Institute of Technology | Karlsruhe | T300 | 1 | 1 | 2 | https://www.kit.edu |
| 320 | Technical University of Darmstadt | Darmstadt | T300 | 1 | 1 | 2 | https://www.tu-darmstadt.de |
| 218 | Technische Universität Berlin | Berlin | T300 | 1 | 1 | 2 | https://www.tu.berlin |
| 244 | University of Bonn | Bonn | T300 | 1 | 1 | 2 | https://www.uni-bonn.de |
| 243 | University of Erlangen-Nürnberg | Erlangen / Nuremberg | T300 | 1 | 1 | 2 | https://www.fau.eu |
| 239 | University of Freiburg | Freiburg im Breisgau | T300 | 1 | 1 | 2 | https://uni-freiburg.de |
| 275 | University of Tübingen | Tübingen | T300 | 1 | 1 | 2 | https://uni-tuebingen.de |

### Hong Kong SAR (2)

| id | Universitet | Shahar | Manba | Dastur | Grant | Muddat | Sayt |
| ---: | --- | --- | --- | ---: | ---: | ---: | --- |
| 321 | Hong Kong Baptist University | Hong Kong | T300 | 1 | 1 | 1 | https://www.hkbu.edu.hk |
| 217 | The Hong Kong University of Science and Technology | Hong Kong | T300 | 1 | 1 | 1 | https://hkust.edu.hk |

### Hungary (10)

| id | Universitet | Shahar | Manba | Dastur | Grant | Muddat | Sayt |
| ---: | --- | --- | --- | ---: | ---: | ---: | --- |
| 206 | Budapest University of Technology and Economics (BME) | Budapest | UZ13 | 1 | 1 | 2 | https://www.bme.hu/?language=en |
| 341 | Corvinus University of Budapest | Budapest | UZ13 | 1 | 1 | 2 | https://www.uni-corvinus.hu |
| 205 | Eötvös Loránd University (ELTE) | Budapest | UZ13 | 1 | 1 | 2 | https://www.elte.hu/en/ |
| 343 | Hungarian University of Agriculture and Life Sciences (MATE) | Gödöllő / Budapest | UZ13 | 1 | 1 | 2 | https://en.uni-mate.hu |
| 342 | Semmelweis University | Budapest | UZ13 | 1 | 1 | 2 | https://semmelweis.hu |
| 345 | Széchenyi István University | Győr | UZ13 | 1 | 1 | 2 | https://admissions.sze.hu |
| 207 | University of Debrecen | Debrecen | UZ13 | 1 | 1 | 2 | https://unideb.hu/en |
| 340 | University of Pécs | Pécs | UZ13 | 1 | 1 | 2 | https://international.pte.hu |
| 339 | University of Szeged (SZTE) | Szeged | UZ13 | 1 | 1 | 2 | https://u-szeged.hu |
| 344 | Óbuda University | Budapest | UZ13 | 1 | 1 | 2 | https://uni-obuda.hu |

### India (4)

| id | Universitet | Shahar | Manba | Dastur | Grant | Muddat | Sayt |
| ---: | --- | --- | --- | ---: | ---: | ---: | --- |
| 315 | Indian Institute of Science | Bengaluru | T300 | 1 | 1 | 1 | https://iisc.ac.in |
| 322 | Indian Institute of Technology Kanpur | Kanpur | T300 | 1 | 1 | 1 | https://www.iitk.ac.in |
| 316 | Indian Institute of Technology Kharagpur | Kharagpur | T300 | 1 | 1 | 1 | https://www.iitkgp.ac.in |
| 317 | Indian Institute of Technology Madras | Chennai | T300 | 1 | 1 | 1 | https://www.iitm.ac.in |

### Indonesia (3)

| id | Universitet | Shahar | Manba | Dastur | Grant | Muddat | Sayt |
| ---: | --- | --- | --- | ---: | ---: | ---: | --- |
| 257 | Bandung Institute of Technology | Bandung | T300 | 1 | 1 | 1 | https://www.itb.ac.id |
| 250 | Gadjah Mada University | Yogyakarta | T300 | 1 | 1 | 1 | https://ugm.ac.id |
| 236 | Universitas Indonesia | Depok / Jakarta | T300 | 1 | 1 | 1 | https://www.ui.ac.id |

### Ireland (2)

| id | Universitet | Shahar | Manba | Dastur | Grant | Muddat | Sayt |
| ---: | --- | --- | --- | ---: | ---: | ---: | --- |
| 282 | University College Cork | Cork | T300 | 1 | 1 | 1 | https://www.ucc.ie |
| 283 | University of Galway | Galway | T300 | 1 | 1 | 1 | https://www.universityofgalway.ie |

### Israel (2)

| id | Universitet | Shahar | Manba | Dastur | Grant | Muddat | Sayt |
| ---: | --- | --- | --- | ---: | ---: | ---: | --- |
| 237 | Tel Aviv University | Tel Aviv | T300 | 1 | 1 | 1 | https://english.tau.ac.il |
| 287 | The Hebrew University of Jerusalem | Jerusalem | T300 | 1 | 1 | 1 | https://en.huji.ac.il |

### Italy (7)

| id | Universitet | Shahar | Manba | Dastur | Grant | Muddat | Sayt |
| ---: | --- | --- | --- | ---: | ---: | ---: | --- |
| 319 | Politecnico di Torino | Turin | T300 | 1 | 1 | 1 | https://www.polito.it |
| 337 | University of Florence (UNIFI) | Florence | UZ13 | 1 | 1 | 1 | https://www.unifi.it |
| 269 | University of Milan | Milan | T300 | 1 | 1 | 1 | https://www.unimi.it |
| 335 | University of Naples Federico II | Naples | UZ13 | 1 | 1 | 1 | https://www.unina.it |
| 248 | University of Padua | Padua | T300 | 1 | 1 | 1 | https://www.unipd.it |
| 336 | University of Pisa (UNIPI) | Pisa | UZ13 | 1 | 1 | 1 | https://www.unipi.it |
| 338 | University of Turin (UniTo) | Turin | UZ13 | 1 | 1 | 1 | https://en.unito.it |

### Kazakhstan (2)

| id | Universitet | Shahar | Manba | Dastur | Grant | Muddat | Sayt |
| ---: | --- | --- | --- | ---: | ---: | ---: | --- |
| 209 | Al-Farabi Kazakh National University (KazNU) | Almaty | T300 | 1 | 1 | 1 | https://www.kaznu.kz/en/ |
| 208 | Nazarbayev University | Astana | UZ13 | 1 | 1 | 1 | https://nu.edu.kz/ |

### Lebanon (1)

| id | Universitet | Shahar | Manba | Dastur | Grant | Muddat | Sayt |
| ---: | --- | --- | --- | ---: | ---: | ---: | --- |
| 278 | American University of Beirut | Beirut | T300 | 1 | 1 | 1 | https://www.aub.edu.lb |

### Macau SAR (1)

| id | Universitet | Shahar | Manba | Dastur | Grant | Muddat | Sayt |
| ---: | --- | --- | --- | ---: | ---: | ---: | --- |
| 254 | University of Macau | Macau | T300 | 1 | 1 | 1 | https://www.um.edu.mo |

### Malaysia (5)

| id | Universitet | Shahar | Manba | Dastur | Grant | Muddat | Sayt |
| ---: | --- | --- | --- | ---: | ---: | ---: | --- |
| 355 | International Islamic University Malaysia (IIUM) | Kuala Lumpur (Gombak) | UZ13 | 1 | 1 | 1 | https://www.iium.edu.my |
| 354 | Sunway University | Bandar Sunway (Selangor) | UZ13 | 1 | 1 | 1 | https://sunwayuniversity.edu.my |
| 279 | Taylor’s University | Subang Jaya (Selangor) | T300 | 1 | 1 | 1 | https://university.taylors.edu.my |
| 263 | UCSI University | Kuala Lumpur | T300 | 1 | 1 | 1 | https://www.ucsiuniversity.edu.my |
| 323 | Universiti Teknologi PETRONAS | Seri Iskandar (Perak) | T300 | 1 | 1 | 1 | https://www.utp.edu.my |

### Mexico (1)

| id | Universitet | Shahar | Manba | Dastur | Grant | Muddat | Sayt |
| ---: | --- | --- | --- | ---: | ---: | ---: | --- |
| 226 | Tecnológico de Monterrey | Monterrey | T300 | 1 | 1 | 1 | https://tec.mx |

### Netherlands (3)

| id | Universitet | Shahar | Manba | Dastur | Grant | Muddat | Sayt |
| ---: | --- | --- | --- | ---: | ---: | ---: | --- |
| 245 | Maastricht University | Maastricht | T300 | 1 | 1 | 1 | https://www.maastrichtuniversity.nl |
| 281 | Radboud University | Nijmegen | T300 | 1 | 1 | 2 | https://www.ru.nl |
| 224 | Wageningen University & Research | Wageningen | T300 | 1 | 1 | 2 | https://www.wur.nl |

### New Zealand (4)

| id | Universitet | Shahar | Manba | Dastur | Grant | Muddat | Sayt |
| ---: | --- | --- | --- | ---: | ---: | ---: | --- |
| 251 | Massey University | Palmerston North | T300 | 1 | 1 | 1 | https://www.massey.ac.nz |
| 261 | University of Canterbury | Christchurch | T300 | 1 | 1 | 1 | https://www.canterbury.ac.nz |
| 247 | University of Waikato | Hamilton | T300 | 1 | 1 | 1 | https://www.waikato.ac.nz |
| 253 | Victoria University of Wellington | Wellington | T300 | 1 | 1 | 1 | https://www.wgtn.ac.nz |

### Norway (2)

| id | Universitet | Shahar | Manba | Dastur | Grant | Muddat | Sayt |
| ---: | --- | --- | --- | ---: | ---: | ---: | --- |
| 262 | Norwegian University of Science and Technology | Trondheim | T300 | 1 | 1 | 1 | https://www.ntnu.edu |
| 272 | University of Bergen | Bergen | T300 | 1 | 1 | 1 | https://www.uib.no |

### Poland (10)

| id | Universitet | Shahar | Manba | Dastur | Grant | Muddat | Sayt |
| ---: | --- | --- | --- | ---: | ---: | ---: | --- |
| 357 | AGH University of Krakow | Krakow | UZ13 | 1 | 1 | 1 | https://www.agh.edu.pl |
| 358 | Adam Mickiewicz University, Poznań | Poznań | UZ13 | 1 | 1 | 1 | https://amu.edu.pl |
| 359 | Gdańsk University of Technology (Gdańsk Tech) | Gdańsk | UZ13 | 1 | 1 | 1 | https://pg.edu.pl |
| 211 | Jagiellonian University | Kraków | UZ13 | 1 | 1 | 1 | https://en.uj.edu.pl/ |
| 363 | Lodz University of Technology (TUL) | Łódź | UZ13 | 1 | 1 | 1 | https://p.lodz.pl |
| 362 | Poznań University of Technology (PUT) | Poznań | UZ13 | 1 | 1 | 1 | https://www.put.poznan.pl |
| 210 | University of Warsaw | Warsaw | T300 | 1 | 1 | 1 | https://en.uw.edu.pl/ |
| 361 | University of Wrocław | Wrocław | UZ13 | 1 | 1 | 1 | https://uwr.edu.pl |
| 356 | Warsaw University of Technology (WUT) | Warsaw | UZ13 | 1 | 1 | 1 | https://www.pw.edu.pl |
| 360 | Wrocław University of Science and Technology | Wrocław | UZ13 | 1 | 1 | 1 | https://pwr.edu.pl |

### Portugal (2)

| id | Universitet | Shahar | Manba | Dastur | Grant | Muddat | Sayt |
| ---: | --- | --- | --- | ---: | ---: | ---: | --- |
| 259 | University of Lisbon | Lisbon | T300 | 1 | 1 | 1 | https://www.ulisboa.pt |
| 285 | University of Porto | Porto | T300 | 1 | 1 | 1 | https://www.up.pt |

### Qatar (1)

| id | Universitet | Shahar | Manba | Dastur | Grant | Muddat | Sayt |
| ---: | --- | --- | --- | ---: | ---: | ---: | --- |
| 296 | Hamad Bin Khalifa University | Doha | T300 | 1 | 1 | 1 | https://www.hbku.edu.qa |

### Russia (9)

| id | Universitet | Shahar | Manba | Dastur | Grant | Muddat | Sayt |
| ---: | --- | --- | --- | ---: | ---: | ---: | --- |
| 325 | Bauman Moscow State Technical University | Moscow | T300 | 1 | 1 | 1 | https://bmstu.ru |
| 348 | HSE University (Higher School of Economics) | Moscow / St. Petersburg | UZ13 | 1 | 1 | 1 | https://www.hse.ru |
| 353 | Kazan Federal University (KFU) | Kazan | UZ13 | 1 | 1 | 1 | https://eng.kpfu.ru |
| 349 | Moscow Institute of Physics and Technology (MIPT / Phystech) | Dolgoprudny (Moscow) | UZ13 | 1 | 1 | 1 | https://eng.mipt.ru |
| 352 | National Research Nuclear University MEPhI | Moscow | UZ13 | 1 | 1 | 1 | https://eng.mephi.ru |
| 350 | Novosibirsk State University (NSU) | Novosibirsk | UZ13 | 1 | 1 | 1 | https://english.nsu.ru |
| 346 | RUDN University (Peoples' Friendship University) | Moscow | UZ13 | 1 | 1 | 1 | https://eng.rudn.ru |
| 347 | Saint Petersburg State University (SPbU) | Saint Petersburg | UZ13 | 1 | 1 | 1 | https://english.spbu.ru |
| 351 | Tomsk State University (TSU) | Tomsk | UZ13 | 1 | 1 | 1 | https://en.tsu.ru |

### Saudi Arabia (2)

| id | Universitet | Shahar | Manba | Dastur | Grant | Muddat | Sayt |
| ---: | --- | --- | --- | ---: | ---: | ---: | --- |
| 304 | King Abdulaziz University | Jeddah | T300 | 1 | 1 | 1 | https://www.kau.edu.sa |
| 312 | King Saud University | Riyadh | T300 | 1 | 1 | 1 | https://ksu.edu.sa |

### South Africa (2)

| id | Universitet | Shahar | Manba | Dastur | Grant | Muddat | Sayt |
| ---: | --- | --- | --- | ---: | ---: | ---: | --- |
| 292 | Stellenbosch University | Stellenbosch | T300 | 1 | 1 | 1 | https://www.sun.ac.za |
| 264 | University of the Witwatersrand | Johannesburg | T300 | 1 | 1 | 1 | https://www.wits.ac.za |

### South Korea (4)

| id | Universitet | Shahar | Manba | Dastur | Grant | Muddat | Sayt |
| ---: | --- | --- | --- | ---: | ---: | ---: | --- |
| 328 | Gwangju Institute of Science and Technology (GIST) | Gwangju | UZ13 | 1 | 1 | 1 | https://www.gist.ac.kr |
| 327 | Kyung Hee University | Seoul / Suwon | UZ13 | 1 | 1 | 1 | https://www.khu.ac.kr |
| 221 | Sungkyunkwan University (SKKU) | Seoul / Suwon | T300 | 1 | 1 | 1 | https://www.skku.edu |
| 286 | Ulsan National Institute of Science and Technology | Ulsan | T300 | 1 | 1 | 1 | https://www.unist.ac.kr |

### Spain (5)

| id | Universitet | Shahar | Manba | Dastur | Grant | Muddat | Sayt |
| ---: | --- | --- | --- | ---: | ---: | ---: | --- |
| 233 | Autonomous University of Madrid | Madrid | T300 | 1 | 1 | 1 | https://www.uam.es |
| 225 | Complutense University of Madrid | Madrid | T300 | 1 | 1 | 1 | https://www.ucm.es |
| 267 | Universidad Carlos III de Madrid | Madrid | T300 | 1 | 1 | 1 | https://www.uc3m.es |
| 307 | University of Barcelona | Barcelona | T300 | 1 | 1 | 1 | https://web.ub.edu |
| 277 | University of Navarra | Pamplona | T300 | 1 | 1 | 1 | https://www.unav.edu |

### Taiwan (3)

| id | Universitet | Shahar | Manba | Dastur | Grant | Muddat | Sayt |
| ---: | --- | --- | --- | ---: | ---: | ---: | --- |
| 240 | National Cheng Kung University | Tainan | T300 | 1 | 1 | 1 | https://web.ncku.edu.tw |
| 238 | National Tsing Hua University | Hsinchu | T300 | 1 | 1 | 1 | https://nthu-en.site.nthu.edu.tw |
| 274 | National Yang Ming Chiao Tung University | Hsinchu / Taipei | T300 | 1 | 1 | 1 | https://en.nycu.edu.tw |

### Turkey (10)

| id | Universitet | Shahar | Manba | Dastur | Grant | Muddat | Sayt |
| ---: | --- | --- | --- | ---: | ---: | ---: | --- |
| 334 | Ankara University | Ankara | UZ13 | 1 | 1 | 1 | https://www.ankara.edu.tr |
| 330 | Bilkent University | Ankara | UZ13 | 1 | 1 | 1 | https://w3.bilkent.edu.tr |
| 203 | Boğaziçi University | Istanbul | UZ13 | 1 | 1 | 1 | https://www.bogazici.edu.tr/en |
| 331 | Hacettepe University | Ankara | UZ13 | 1 | 1 | 1 | https://www.hacettepe.edu.tr |
| 329 | Istanbul Technical University (İTÜ) | Istanbul | UZ13 | 1 | 1 | 1 | https://www.itu.edu.tr |
| 332 | Istanbul University | Istanbul | UZ13 | 1 | 1 | 1 | https://www.istanbul.edu.tr |
| 202 | Koç University | Istanbul | UZ13 | 1 | 1 | 1 | https://www.ku.edu.tr/en/ |
| 201 | Middle East Technical University (METU) | Ankara | T300 | 1 | 1 | 1 | https://www.metu.edu.tr/en |
| 204 | Sabancı University | Istanbul | UZ13 | 1 | 1 | 1 | https://www.sabanciuniv.edu/en |
| 333 | Yıldız Technical University (YTÜ) | Istanbul | UZ13 | 1 | 1 | 1 | https://www.yildiz.edu.tr |

### United Arab Emirates (3)

| id | Universitet | Shahar | Manba | Dastur | Grant | Muddat | Sayt |
| ---: | --- | --- | --- | ---: | ---: | ---: | --- |
| 234 | American University of Sharjah | Sharjah | T300 | 1 | 1 | 1 | https://www.aus.edu |
| 260 | Canadian University Dubai | Dubai | T300 | 1 | 1 | 1 | https://www.cud.ac.ae |
| 364 | United Arab Emirates University (UAEU) | Al Ain (Abu Dhabi) | UZ13 | 1 | 1 | 1 | https://www.uaeu.ac.ae |

### United Kingdom (8)

| id | Universitet | Shahar | Manba | Dastur | Grant | Muddat | Sayt |
| ---: | --- | --- | --- | ---: | ---: | ---: | --- |
| 258 | Heriot-Watt University | Edinburgh | T300 | 1 | 1 | 1 | https://www.hw.ac.uk |
| 222 | Lancaster University | Lancaster | T300 | 1 | 1 | 1 | https://www.lancaster.ac.uk |
| 313 | Queen’s University Belfast | Belfast | T300 | 1 | 1 | 1 | https://www.qub.ac.uk |
| 294 | Swansea University | Swansea | T300 | 1 | 1 | 1 | https://www.swansea.ac.uk |
| 268 | University of Leicester | Leicester | T300 | 1 | 1 | 1 | https://le.ac.uk |
| 288 | University of Strathclyde | Glasgow | T300 | 1 | 1 | 1 | https://www.strath.ac.uk |
| 270 | University of Surrey | Guildford | T300 | 1 | 1 | 1 | https://www.surrey.ac.uk |
| 255 | University of Sussex | Brighton | T300 | 1 | 1 | 1 | https://www.sussex.ac.uk |

### United States (18)

| id | Universitet | Shahar | Manba | Dastur | Grant | Muddat | Sayt |
| ---: | --- | --- | --- | ---: | ---: | ---: | --- |
| 311 | Arizona State University | Tempe, AZ | T300 | 1 | 1 | 1 | https://www.asu.edu |
| 299 | Case Western Reserve University | Cleveland, OH | T300 | 1 | 1 | 2 | https://case.edu |
| 252 | Dartmouth College | Hanover, NH | T300 | 1 | 1 | 2 | https://home.dartmouth.edu |
| 231 | Emory University | Atlanta, GA | T300 | 1 | 1 | 2 | https://www.emory.edu |
| 305 | Michigan State University | East Lansing, MI | T300 | 1 | 1 | 1 | https://msu.edu |
| 219 | Northwestern University | Evanston, IL | T300 | 1 | 1 | 2 | https://www.northwestern.edu |
| 306 | Texas A&M University | College Station, TX | T300 | 1 | 1 | 1 | https://www.tamu.edu |
| 314 | The Ohio State University | Columbus, OH | T300 | 1 | 1 | 1 | https://www.osu.edu |
| 289 | The University of Arizona | Tucson, AZ | T300 | 1 | 1 | 1 | https://www.arizona.edu |
| 309 | University of California, Santa Barbara | Santa Barbara, CA | T300 | 1 | 1 | 1 | https://www.ucsb.edu |
| 241 | University of Florida | Gainesville, FL | T300 | 1 | 1 | 1 | https://www.ufl.edu |
| 273 | University of Maryland, College Park | College Park, MD | T300 | 1 | 1 | 1 | https://umd.edu |
| 235 | University of Minnesota Twin Cities | Minneapolis, MN | T300 | 1 | 1 | 2 | https://twin-cities.umn.edu |
| 223 | University of North Carolina at Chapel Hill | Chapel Hill, NC | T300 | 1 | 1 | 1 | https://www.unc.edu |
| 249 | University of Rochester | Rochester, NY | T300 | 1 | 1 | 2 | https://www.rochester.edu |
| 293 | University of Virginia | Charlottesville, VA | T300 | 1 | 1 | 2 | https://www.virginia.edu |
| 276 | Vanderbilt University | Nashville, TN | T300 | 1 | 1 | 2 | https://www.vanderbilt.edu |
| 308 | Washington University in St. Louis | St. Louis, MO | T300 | 1 | 1 | 2 | https://wustl.edu |

## 4. To'liq jadval (164 ta, `id` bo'yicha)

| id | Universitet | Davlat | QS | Rasm | Dastur | Manba |
| ---: | --- | --- | :-: | :-: | :-: | --- |
| 201 | Middle East Technical University (METU) | Turkey | ✗ | ✗ | ✓ | Top 300 PDF |
| 202 | Koç University | Turkey | ✗ | ✗ | ✓ | 13-davlat PDF |
| 203 | Boğaziçi University | Turkey | ✗ | ✗ | ✓ | 13-davlat PDF |
| 204 | Sabancı University | Turkey | ✗ | ✗ | ✓ | 13-davlat PDF |
| 205 | Eötvös Loránd University (ELTE) | Hungary | ✗ | ✗ | ✓ | 13-davlat PDF |
| 206 | Budapest University of Technology and Economics (BME) | Hungary | ✗ | ✗ | ✓ | 13-davlat PDF |
| 207 | University of Debrecen | Hungary | ✗ | ✗ | ✓ | 13-davlat PDF |
| 208 | Nazarbayev University | Kazakhstan | ✗ | ✗ | ✓ | 13-davlat PDF |
| 209 | Al-Farabi Kazakh National University (KazNU) | Kazakhstan | ✗ | ✗ | ✓ | Top 300 PDF |
| 210 | University of Warsaw | Poland | ✗ | ✗ | ✓ | Top 300 PDF |
| 211 | Jagiellonian University | Poland | ✗ | ✗ | ✓ | 13-davlat PDF |
| 212 | Charles University | Czechia | ✗ | ✗ | ✓ | Top 300 PDF |
| 213 | Czech Technical University in Prague (CTU) | Czechia | ✗ | ✗ | ✗ | Placeholder (bo'sh) |
| 214 | Westminster International University in Tashkent (WIUT) | Uzbekistan | ✗ | ✗ | ✗ | Placeholder (bo'sh) |
| 215 | Inha University in Tashkent (IUT) | Uzbekistan | ✗ | ✗ | ✗ | Placeholder (bo'sh) |
| 216 | New Uzbekistan University | Uzbekistan | ✗ | ✗ | ✗ | Placeholder (bo'sh) |
| 217 | The Hong Kong University of Science and Technology | Hong Kong SAR | ✗ | ✗ | ✓ | Top 300 PDF |
| 218 | Technische Universität Berlin | Germany | ✗ | ✗ | ✓ | Top 300 PDF |
| 219 | Northwestern University | United States | ✗ | ✗ | ✓ | Top 300 PDF |
| 220 | Karlsruhe Institute of Technology | Germany | ✗ | ✗ | ✓ | Top 300 PDF |
| 221 | Sungkyunkwan University (SKKU) | South Korea | ✗ | ✗ | ✓ | Top 300 PDF |
| 222 | Lancaster University | United Kingdom | ✗ | ✗ | ✓ | Top 300 PDF |
| 223 | University of North Carolina at Chapel Hill | United States | ✗ | ✗ | ✓ | Top 300 PDF |
| 224 | Wageningen University & Research | Netherlands | ✗ | ✗ | ✓ | Top 300 PDF |
| 225 | Complutense University of Madrid | Spain | ✗ | ✗ | ✓ | Top 300 PDF |
| 226 | Tecnológico de Monterrey | Mexico | ✗ | ✗ | ✓ | Top 300 PDF |
| 227 | Tongji University | China | ✗ | ✗ | ✓ | Top 300 PDF |
| 228 | Curtin University | Australia | ✗ | ✗ | ✓ | Top 300 PDF |
| 229 | Western University | Canada | ✗ | ✗ | ✓ | Top 300 PDF |
| 230 | Wuhan University | China | ✗ | ✗ | ✓ | Top 300 PDF |
| 231 | Emory University | United States | ✗ | ✗ | ✓ | Top 300 PDF |
| 232 | Deakin University | Australia | ✗ | ✗ | ✓ | Top 300 PDF |
| 233 | Autonomous University of Madrid | Spain | ✗ | ✗ | ✓ | Top 300 PDF |
| 234 | American University of Sharjah | United Arab Emirates | ✗ | ✗ | ✓ | Top 300 PDF |
| 235 | University of Minnesota Twin Cities | United States | ✗ | ✗ | ✓ | Top 300 PDF |
| 236 | Universitas Indonesia | Indonesia | ✗ | ✗ | ✓ | Top 300 PDF |
| 237 | Tel Aviv University | Israel | ✗ | ✗ | ✓ | Top 300 PDF |
| 238 | National Tsing Hua University | Taiwan | ✗ | ✗ | ✓ | Top 300 PDF |
| 239 | University of Freiburg | Germany | ✗ | ✗ | ✓ | Top 300 PDF |
| 240 | National Cheng Kung University | Taiwan | ✗ | ✗ | ✓ | Top 300 PDF |
| 241 | University of Florida | United States | ✗ | ✗ | ✓ | Top 300 PDF |
| 242 | La Trobe University | Australia | ✗ | ✗ | ✓ | Top 300 PDF |
| 243 | University of Erlangen-Nürnberg | Germany | ✗ | ✗ | ✓ | Top 300 PDF |
| 244 | University of Bonn | Germany | ✗ | ✗ | ✓ | Top 300 PDF |
| 245 | Maastricht University | Netherlands | ✗ | ✗ | ✓ | Top 300 PDF |
| 246 | University of Campinas | Brazil | ✗ | ✗ | ✓ | Top 300 PDF |
| 247 | University of Waikato | New Zealand | ✗ | ✗ | ✓ | Top 300 PDF |
| 248 | University of Padua | Italy | ✗ | ✗ | ✓ | Top 300 PDF |
| 249 | University of Rochester | United States | ✗ | ✗ | ✓ | Top 300 PDF |
| 250 | Gadjah Mada University | Indonesia | ✗ | ✗ | ✓ | Top 300 PDF |
| 251 | Massey University | New Zealand | ✗ | ✗ | ✓ | Top 300 PDF |
| 252 | Dartmouth College | United States | ✗ | ✗ | ✓ | Top 300 PDF |
| 253 | Victoria University of Wellington | New Zealand | ✗ | ✗ | ✓ | Top 300 PDF |
| 254 | University of Macau | Macau SAR | ✗ | ✗ | ✓ | Top 300 PDF |
| 255 | University of Sussex | United Kingdom | ✗ | ✗ | ✓ | Top 300 PDF |
| 256 | Griffith University | Australia | ✗ | ✗ | ✓ | Top 300 PDF |
| 257 | Bandung Institute of Technology | Indonesia | ✗ | ✗ | ✓ | Top 300 PDF |
| 258 | Heriot-Watt University | United Kingdom | ✗ | ✗ | ✓ | Top 300 PDF |
| 259 | University of Lisbon | Portugal | ✗ | ✗ | ✓ | Top 300 PDF |
| 260 | Canadian University Dubai | United Arab Emirates | ✗ | ✗ | ✓ | Top 300 PDF |
| 261 | University of Canterbury | New Zealand | ✗ | ✗ | ✓ | Top 300 PDF |
| 262 | Norwegian University of Science and Technology | Norway | ✗ | ✗ | ✓ | Top 300 PDF |
| 263 | UCSI University | Malaysia | ✗ | ✗ | ✓ | Top 300 PDF |
| 264 | University of the Witwatersrand | South Africa | ✗ | ✗ | ✓ | Top 300 PDF |
| 265 | Tianjin University | China | ✗ | ✗ | ✓ | Top 300 PDF |
| 266 | Beijing Normal University | China | ✗ | ✗ | ✓ | Top 300 PDF |
| 267 | Universidad Carlos III de Madrid | Spain | ✗ | ✗ | ✓ | Top 300 PDF |
| 268 | University of Leicester | United Kingdom | ✗ | ✗ | ✓ | Top 300 PDF |
| 269 | University of Milan | Italy | ✗ | ✗ | ✓ | Top 300 PDF |
| 270 | University of Surrey | United Kingdom | ✗ | ✗ | ✓ | Top 300 PDF |
| 271 | Swinburne University of Technology | Australia | ✗ | ✗ | ✓ | Top 300 PDF |
| 272 | University of Bergen | Norway | ✗ | ✗ | ✓ | Top 300 PDF |
| 273 | University of Maryland, College Park | United States | ✗ | ✗ | ✓ | Top 300 PDF |
| 274 | National Yang Ming Chiao Tung University | Taiwan | ✗ | ✗ | ✓ | Top 300 PDF |
| 275 | University of Tübingen | Germany | ✗ | ✗ | ✓ | Top 300 PDF |
| 276 | Vanderbilt University | United States | ✗ | ✗ | ✓ | Top 300 PDF |
| 277 | University of Navarra | Spain | ✗ | ✗ | ✓ | Top 300 PDF |
| 278 | American University of Beirut | Lebanon | ✗ | ✗ | ✓ | Top 300 PDF |
| 279 | Taylor’s University | Malaysia | ✗ | ✗ | ✓ | Top 300 PDF |
| 280 | Harbin Institute of Technology | China | ✗ | ✗ | ✓ | Top 300 PDF |
| 281 | Radboud University | Netherlands | ✗ | ✗ | ✓ | Top 300 PDF |
| 282 | University College Cork | Ireland | ✗ | ✗ | ✓ | Top 300 PDF |
| 283 | University of Galway | Ireland | ✗ | ✗ | ✓ | Top 300 PDF |
| 284 | Dalhousie University | Canada | ✗ | ✗ | ✓ | Top 300 PDF |
| 285 | University of Porto | Portugal | ✗ | ✗ | ✓ | Top 300 PDF |
| 286 | Ulsan National Institute of Science and Technology | South Korea | ✗ | ✗ | ✓ | Top 300 PDF |
| 287 | The Hebrew University of Jerusalem | Israel | ✗ | ✗ | ✓ | Top 300 PDF |
| 288 | University of Strathclyde | United Kingdom | ✗ | ✗ | ✓ | Top 300 PDF |
| 289 | The University of Arizona | United States | ✗ | ✗ | ✓ | Top 300 PDF |
| 290 | University of Tasmania | Australia | ✗ | ✗ | ✓ | Top 300 PDF |
| 291 | Xi’an Jiaotong University | China | ✗ | ✗ | ✓ | Top 300 PDF |
| 292 | Stellenbosch University | South Africa | ✗ | ✗ | ✓ | Top 300 PDF |
| 293 | University of Virginia | United States | ✗ | ✗ | ✓ | Top 300 PDF |
| 294 | Swansea University | United Kingdom | ✗ | ✗ | ✓ | Top 300 PDF |
| 295 | Huazhong University of Science and Technology | China | ✗ | ✗ | ✓ | Top 300 PDF |
| 296 | Hamad Bin Khalifa University | Qatar | ✗ | ✗ | ✓ | Top 300 PDF |
| 297 | École Normale Supérieure de Lyon | France | ✗ | ✗ | ✓ | Top 300 PDF |
| 298 | École des Ponts ParisTech | France | ✗ | ✗ | ✓ | Top 300 PDF |
| 299 | Case Western Reserve University | United States | ✗ | ✗ | ✓ | Top 300 PDF |
| 300 | Vrije Universiteit Brussel | Belgium | ✗ | ✗ | ✓ | Top 300 PDF |
| 301 | Southern University of Science and Technology | China | ✗ | ✗ | ✓ | Top 300 PDF |
| 302 | Institut Polytechnique de Paris | France | ✗ | ✗ | ✓ | Top 300 PDF |
| 303 | Universidad de Chile | Chile | ✗ | ✗ | ✓ | Top 300 PDF |
| 304 | King Abdulaziz University | Saudi Arabia | ✗ | ✗ | ✓ | Top 300 PDF |
| 305 | Michigan State University | United States | ✗ | ✗ | ✓ | Top 300 PDF |
| 306 | Texas A&M University | United States | ✗ | ✗ | ✓ | Top 300 PDF |
| 307 | University of Barcelona | Spain | ✗ | ✗ | ✓ | Top 300 PDF |
| 308 | Washington University in St. Louis | United States | ✗ | ✗ | ✓ | Top 300 PDF |
| 309 | University of California, Santa Barbara | United States | ✗ | ✗ | ✓ | Top 300 PDF |
| 310 | University of Newcastle (Australia) | Australia | ✗ | ✗ | ✓ | Top 300 PDF |
| 311 | Arizona State University | United States | ✗ | ✗ | ✓ | Top 300 PDF |
| 312 | King Saud University | Saudi Arabia | ✗ | ✗ | ✓ | Top 300 PDF |
| 313 | Queen’s University Belfast | United Kingdom | ✗ | ✗ | ✓ | Top 300 PDF |
| 314 | The Ohio State University | United States | ✗ | ✗ | ✓ | Top 300 PDF |
| 315 | Indian Institute of Science | India | ✗ | ✗ | ✓ | Top 300 PDF |
| 316 | Indian Institute of Technology Kharagpur | India | ✗ | ✗ | ✓ | Top 300 PDF |
| 317 | Indian Institute of Technology Madras | India | ✗ | ✗ | ✓ | Top 300 PDF |
| 318 | Université libre de Bruxelles | Belgium | ✗ | ✗ | ✓ | Top 300 PDF |
| 319 | Politecnico di Torino | Italy | ✗ | ✗ | ✓ | Top 300 PDF |
| 320 | Technical University of Darmstadt | Germany | ✗ | ✗ | ✓ | Top 300 PDF |
| 321 | Hong Kong Baptist University | Hong Kong SAR | ✗ | ✗ | ✓ | Top 300 PDF |
| 322 | Indian Institute of Technology Kanpur | India | ✗ | ✗ | ✓ | Top 300 PDF |
| 323 | Universiti Teknologi PETRONAS | Malaysia | ✗ | ✗ | ✓ | Top 300 PDF |
| 324 | Université Paris 1 Panthéon-Sorbonne | France | ✗ | ✗ | ✓ | Top 300 PDF |
| 325 | Bauman Moscow State Technical University | Russia | ✗ | ✗ | ✓ | Top 300 PDF |
| 326 | Queensland University of Technology | Australia | ✗ | ✗ | ✓ | Top 300 PDF |
| 327 | Kyung Hee University | South Korea | ✗ | ✗ | ✓ | 13-davlat PDF |
| 328 | Gwangju Institute of Science and Technology (GIST) | South Korea | ✗ | ✗ | ✓ | 13-davlat PDF |
| 329 | Istanbul Technical University (İTÜ) | Turkey | ✗ | ✗ | ✓ | 13-davlat PDF |
| 330 | Bilkent University | Turkey | ✗ | ✗ | ✓ | 13-davlat PDF |
| 331 | Hacettepe University | Turkey | ✗ | ✗ | ✓ | 13-davlat PDF |
| 332 | Istanbul University | Turkey | ✗ | ✗ | ✓ | 13-davlat PDF |
| 333 | Yıldız Technical University (YTÜ) | Turkey | ✗ | ✗ | ✓ | 13-davlat PDF |
| 334 | Ankara University | Turkey | ✗ | ✗ | ✓ | 13-davlat PDF |
| 335 | University of Naples Federico II | Italy | ✗ | ✗ | ✓ | 13-davlat PDF |
| 336 | University of Pisa (UNIPI) | Italy | ✗ | ✗ | ✓ | 13-davlat PDF |
| 337 | University of Florence (UNIFI) | Italy | ✗ | ✗ | ✓ | 13-davlat PDF |
| 338 | University of Turin (UniTo) | Italy | ✗ | ✗ | ✓ | 13-davlat PDF |
| 339 | University of Szeged (SZTE) | Hungary | ✗ | ✗ | ✓ | 13-davlat PDF |
| 340 | University of Pécs | Hungary | ✗ | ✗ | ✓ | 13-davlat PDF |
| 341 | Corvinus University of Budapest | Hungary | ✗ | ✗ | ✓ | 13-davlat PDF |
| 342 | Semmelweis University | Hungary | ✗ | ✗ | ✓ | 13-davlat PDF |
| 343 | Hungarian University of Agriculture and Life Sciences (MATE) | Hungary | ✗ | ✗ | ✓ | 13-davlat PDF |
| 344 | Óbuda University | Hungary | ✗ | ✗ | ✓ | 13-davlat PDF |
| 345 | Széchenyi István University | Hungary | ✗ | ✗ | ✓ | 13-davlat PDF |
| 346 | RUDN University (Peoples' Friendship University) | Russia | ✗ | ✗ | ✓ | 13-davlat PDF |
| 347 | Saint Petersburg State University (SPbU) | Russia | ✗ | ✗ | ✓ | 13-davlat PDF |
| 348 | HSE University (Higher School of Economics) | Russia | ✗ | ✗ | ✓ | 13-davlat PDF |
| 349 | Moscow Institute of Physics and Technology (MIPT / Phystech) | Russia | ✗ | ✗ | ✓ | 13-davlat PDF |
| 350 | Novosibirsk State University (NSU) | Russia | ✗ | ✗ | ✓ | 13-davlat PDF |
| 351 | Tomsk State University (TSU) | Russia | ✗ | ✗ | ✓ | 13-davlat PDF |
| 352 | National Research Nuclear University MEPhI | Russia | ✗ | ✗ | ✓ | 13-davlat PDF |
| 353 | Kazan Federal University (KFU) | Russia | ✗ | ✗ | ✓ | 13-davlat PDF |
| 354 | Sunway University | Malaysia | ✗ | ✗ | ✓ | 13-davlat PDF |
| 355 | International Islamic University Malaysia (IIUM) | Malaysia | ✗ | ✗ | ✓ | 13-davlat PDF |
| 356 | Warsaw University of Technology (WUT) | Poland | ✗ | ✗ | ✓ | 13-davlat PDF |
| 357 | AGH University of Krakow | Poland | ✗ | ✗ | ✓ | 13-davlat PDF |
| 358 | Adam Mickiewicz University, Poznań | Poland | ✗ | ✗ | ✓ | 13-davlat PDF |
| 359 | Gdańsk University of Technology (Gdańsk Tech) | Poland | ✗ | ✗ | ✓ | 13-davlat PDF |
| 360 | Wrocław University of Science and Technology | Poland | ✗ | ✗ | ✓ | 13-davlat PDF |
| 361 | University of Wrocław | Poland | ✗ | ✗ | ✓ | 13-davlat PDF |
| 362 | Poznań University of Technology (PUT) | Poland | ✗ | ✗ | ✓ | 13-davlat PDF |
| 363 | Lodz University of Technology (TUL) | Poland | ✗ | ✗ | ✓ | 13-davlat PDF |
| 364 | United Arab Emirates University (UAEU) | United Arab Emirates | ✗ | ✗ | ✓ | 13-davlat PDF |

## 5. Qanday olingan (takrorlash uchun SQL)

```sql
SELECT u.id, u.name, u.country, u.city, u.world_ranking, u.image_url, u.data_source,
       (SELECT count(*) FROM public.programs p WHERE p.university_id = u.id)           AS programs,
       (SELECT count(*) FROM public.scholarships s WHERE s.university_id = u.id)       AS scholarships,
       (SELECT count(*) FROM public.application_cycles c WHERE c.university_id = u.id) AS cycles
FROM public.universities u
WHERE u.world_ranking IS NULL
   OR NULLIF(trim(coalesce(u.image_url, '')), '') IS NULL
   OR NOT EXISTS (SELECT 1 FROM public.programs p WHERE p.university_id = u.id)
ORDER BY u.country, u.name;   -- 164 qator (2026-10-23)
```

## 6. Keyingi qadamlar (taklif)

1. **Rasm** — 164 ta universitet uchun Wikimedia Commons kampus fotosi (`https://upload.wikimedia.org/wikipedia/commons/...`) topib `image_url`ga yozish; ilova thumbnail va `/api/image` proksi orqali o'zi optimallashtiradi.
2. **QS reytingi** — PDF talabi bo'yicha NULL qoldirilgan; agar reytinglar rasmiy/ruxsat etilgan manbadan berilsa, `world_ranking` + `qs_rank_year` to'ldiriladi (ilova saralash/filtrlarda ishlatadi).
3. **4 ta placeholder** (CTU Prague, WIUT, Inha Tashkent, New Uzbekistan University) — to'liq ma'lumot (tuition, talablar, dasturlar, muddatlar, grantlar, manbalar) kiritilishi yoki ilovadan yashirilishi (`is_active = false`) kerak.
