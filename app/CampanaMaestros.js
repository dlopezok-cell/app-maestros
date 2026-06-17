'use client';
import { useState, useEffect, useRef } from 'react';

// ---- Datos de la campaña (contactos públicos de directorios) ----
const CONTACTS = [{"seg":"Particular","o":"Carpintería","n":"Duo Concepto (muebles)","p":"+56 9 4925 9445","w":"56949259445","c":"Santiago","z":"RM"},{"seg":"Particular","o":"Carpintería","n":"Tu Carpintero a Domicilio","p":"+56 9 6204 7838","w":"56962047838","c":"RM","z":"RM"},{"seg":"Particular","o":"Carpintería","n":"Repisas Económicas","p":"+56 9 5859 1445","w":"56958591445","c":"Santiago","z":"RM"},{"seg":"Particular","o":"Carpintería","n":"Practimuebles (muebles a medida)","p":"+56 9 3483 9213","w":"56934839213","c":"Santiago","z":"RM"},{"seg":"Particular","o":"Carpintería","n":"Modular - Armado de Muebles","p":"+56 9 5634 1751","w":"56956341751","c":"RM (24h)","z":"RM"},{"seg":"Particular","o":"Carpintería","n":"Tapicería de Paulina","p":"+56 9 8807 7523","w":"56988077523","c":"Santiago","z":"RM"},{"seg":"Particular","o":"Carpintería","n":"Carpinterito Bazar","p":"+56 2 2792 0785","w":"56227920785","c":"Ñuñoa","z":"RM"},{"seg":"Particular","o":"Cerrajería","n":"Cerrajero Al Tiro","p":"+56 9 3624 8686","w":"56936248686","c":"Santiago (24h)","z":"RM"},{"seg":"Particular","o":"Cerrajería","n":"Cerrajero Amigo","p":"+56 9 6236 1491","w":"56962361491","c":"RM (24h)","z":"RM"},{"seg":"Particular","o":"Cerrajería","n":"cerramax","p":"+56 9 4179 6997","w":"56941796997","c":"San Pablo (24h)","z":"RM"},{"seg":"Particular","o":"Cerrajería","n":"Cerrajería Condes","p":"+56 9 4587 5297","w":"56945875297","c":"La Gloria (24h)","z":"RM"},{"seg":"Particular","o":"Cerrajería","n":"Cerrajería Providencia a domicilio","p":"+56 9 3672 2841","w":"56936722841","c":"Providencia","z":"RM"},{"seg":"Particular","o":"Cerrajería","n":"Cerrajero Las Condes 24/7","p":"+56 9 7769 4730","w":"56977694730","c":"Las Condes","z":"RM"},{"seg":"Particular","o":"Cerrajería","n":"Cerrajería 24h Las Condes","p":"+56 9 9448 8428","w":"56994488428","c":"Las Condes","z":"RM"},{"seg":"Particular","o":"Cerrajería","n":"Cerrajero Apoquindo","p":"+56 9 9870 0039","w":"56998700039","c":"Las Condes","z":"RM"},{"seg":"Particular","o":"Cerrajería","n":"Cerrajero Vitacura","p":"+56 9 5342 5082","w":"56953425082","c":"Vitacura (24h)","z":"RM"},{"seg":"Particular","o":"Cerrajería","n":"Cerrajero Alex","p":"+56 9 3128 6076","w":"56931286076","c":"Santiago","z":"RM"},{"seg":"Particular","o":"Cerrajería","n":"Cerrajero Maestro","p":"+56 9 2949 0310","w":"56929490310","c":"RM (24h)","z":"RM"},{"seg":"Particular","o":"Cerrajería","n":"Home Improvement Chile","p":"+56 9 5232 1169","w":"56952321169","c":"RM (24h)","z":"RM"},{"seg":"Particular","o":"Climatización/AA","n":"Aire Acondicionado Chile","p":"+56 9 4758 4106","w":"56947584106","c":"Antonio Bellet","z":"RM"},{"seg":"Particular","o":"Electricidad","n":"Electricista24 (SEC)","p":"+56 9 7241 2050","w":"56972412050","c":"RM (24/7)","z":"RM"},{"seg":"Particular","o":"Electricidad","n":"Solucionelectricas.cl","p":"+56 9 7236 1592","w":"56972361592","c":"Av. Kennedy","z":"RM"},{"seg":"Particular","o":"Electricidad","n":"Electricista Certificado SEC","p":"+56 9 9516 0797","w":"56995160797","c":"Vitacura","z":"RM"},{"seg":"Particular","o":"Electricidad","n":"Lectrix 24/7","p":"+56 9 9051 5081","w":"56990515081","c":"Las Condes","z":"RM"},{"seg":"Particular","o":"Electricidad","n":"Electricistas Santiago","p":"+56 9 7598 0706","w":"56975980706","c":"Ñuñoa","z":"RM"},{"seg":"Particular","o":"Electricidad","n":"Técnico Eléctrico a Domicilio","p":"+56 9 8591 7200","w":"56985917200","c":"Las Condes","z":"RM"},{"seg":"Particular","o":"Electricidad","n":"Electricista cert. SEC (San Isidro)","p":"+56 9 9106 0582","w":"56991060582","c":"Santiago","z":"RM"},{"seg":"Particular","o":"Electricidad","n":"Tuelectricista.cl","p":"+56 9 6768 6499","w":"56967686499","c":"RM","z":"RM"},{"seg":"Particular","o":"Electricidad","n":"Servicio Eléctricos & Domicilio SEC","p":"+56 9 9001 5205","w":"56990015205","c":"RM (24h)","z":"RM"},{"seg":"Particular","o":"Electricidad","n":"Maestro Manuel (eléctrico)","p":"+56 9 6740 9961","w":"56967409961","c":"Hipódromo Chile","z":"RM"},{"seg":"Particular","o":"Electricidad","n":"Electricista en Santiago 24 Horas","p":"+56 9 6134 8310","w":"56961348310","c":"La Florida","z":"RM"},{"seg":"Particular","o":"Electricidad","n":"Voltio Servicios SEC","p":"+56 9 6521 1727","w":"56965211727","c":"La Florida","z":"RM"},{"seg":"Particular","o":"Electricidad","n":"Imatelec","p":"+56 9 4491 3507","w":"56944913507","c":"La Florida","z":"RM"},{"seg":"Particular","o":"Electricidad","n":"Proyectc Montajes eléctricos","p":"+56 9 6232 1672","w":"56962321672","c":"La Florida","z":"RM"},{"seg":"Particular","o":"Electricidad","n":"Glaas","p":"+56 9 9586 7032","w":"56995867032","c":"Av. Quilín","z":"RM"},{"seg":"Particular","o":"Electricidad","n":"selproyectoselectricos","p":"+56 9 3075 4267","w":"56930754267","c":"La Florida","z":"RM"},{"seg":"Particular","o":"Gasfitería","n":"Aquí Gasfiter","p":"+56 9 5019 5849","w":"56950195849","c":"Ñuñoa / RM","z":"RM"},{"seg":"Particular","o":"Gasfitería","n":"Alo Gasfiter","p":"+56 9 2177 8479","w":"56921778479","c":"RM","z":"RM"},{"seg":"Particular","o":"Gasfitería","n":"J&R Gasfitería","p":"+56 9 5768 9656","w":"56957689656","c":"RM (24/7)","z":"RM"},{"seg":"Particular","o":"Gasfitería","n":"Somos Gasfiter","p":"+56 9 9208 4378","w":"56992084378","c":"Las Condes","z":"RM"},{"seg":"Particular","o":"Gasfitería","n":"CumbrePartner (SEC)","p":"+56 9 6223 4483","w":"56962234483","c":"Maipú / RM","z":"RM"},{"seg":"Particular","o":"Gasfitería","n":"Gasfiter a domicilio - Plomero.cl","p":"+56 2 2683 7000","w":"56226837000","c":"Providencia","z":"RM"},{"seg":"Particular","o":"Gasfitería","n":"Gasfiter a domicilio (téc. sanitario)","p":"+56 9 9938 3581","w":"56999383581","c":"Santiago","z":"RM"},{"seg":"Particular","o":"Gasfitería","n":"Gasfiter a domicilio - Rep. calefont","p":"+56 9 7302 9395","w":"56973029395","c":"Santiago","z":"RM"},{"seg":"Particular","o":"Gasfitería","n":"La Casa del Gásfiter","p":"+56 2 2633 8613","w":"56226338613","c":"Santiago","z":"RM"},{"seg":"Particular","o":"Gasfitería","n":"Gasfiter y Más","p":"+56 9 8220 0197","w":"56982200197","c":"Santiago","z":"RM"},{"seg":"Particular","o":"Gasfitería","n":"Gasfitería a domicilio","p":"+56 9 9956 0730","w":"56999560730","c":"Santiago","z":"RM"},{"seg":"Particular","o":"Gasfitería","n":"Maestros Ya - Gasfitería","p":"+56 9 5664 8684","w":"56956648684","c":"RM (24h)","z":"RM"},{"seg":"Particular","o":"Gasfitería","n":"Gasfitería GEAC","p":"+56 9 9624 8651","w":"56996248651","c":"RM (24h)","z":"RM"},{"seg":"Particular","o":"Gasfitería","n":"Fugas Pro","p":"+56 9 7409 5877","w":"56974095877","c":"Moneda / Maipú","z":"RM"},{"seg":"Particular","o":"Gasfitería","n":"Gasfitería SECGAS","p":"+56 9 9020 0270","w":"56990200270","c":"Maipú (24h)","z":"RM"},{"seg":"Particular","o":"Gasfitería","n":"gasfihelp","p":"+56 9 5966 8772","w":"56959668772","c":"Maipú","z":"RM"},{"seg":"Particular","o":"Gasfitería","n":"Gasfitería 24 Horas","p":"+56 9 2160 3867","w":"56921603867","c":"Maipú (24h)","z":"RM"},{"seg":"Particular","o":"Gasfitería","n":"Gasfiter y Alcantarillado","p":"+56 9 4263 8395","w":"56942638395","c":"Maipú","z":"RM"},{"seg":"Particular","o":"Gasfitería","n":"Gasfitería En General","p":"+56 9 8476 5541","w":"56984765541","c":"Maipú","z":"RM"},{"seg":"Particular","o":"Gasfitería","n":"Gasfitería y Grifería Carola","p":"+56 9 8992 0770","w":"56989920770","c":"Maipú","z":"RM"},{"seg":"Particular","o":"Gasfitería","n":"Gasfipro.cl","p":"+56 9 6685 2245","w":"56966852245","c":"Maipú (24h)","z":"RM"},{"seg":"Particular","o":"Gasfitería","n":"Mundo Fugas","p":"+56 9 7667 7898","w":"56976677898","c":"Maipú","z":"RM"},{"seg":"Particular","o":"Gasfitería","n":"OSGASfitería profesional","p":"+56 9 6348 7257","w":"56963487257","c":"Maipú","z":"RM"},{"seg":"Particular","o":"Gasfitería","n":"Gasficol","p":"+56 9 6865 9160","w":"56968659160","c":"Maipú","z":"RM"},{"seg":"Particular","o":"Gasfitería","n":"Gasfiter (G. González Videla)","p":"+56 9 7286 2882","w":"56972862882","c":"Maipú","z":"RM"},{"seg":"Particular","o":"Gasfitería","n":"Gasfiter Autorizado","p":"+56 2 2225 7458","w":"56222257458","c":"Av. Bilbao","z":"RM"},{"seg":"Particular","o":"Gasfitería","n":"Gasfitería Amaranto Minaya","p":"+56 2 2437 6350","w":"56224376350","c":"Maipú","z":"RM"},{"seg":"Particular","o":"Gasfitería","n":"Giannis Gasfitería","p":"+56 9 3906 4521","w":"56939064521","c":"Guardia Vieja (24h)","z":"RM"},{"seg":"Particular","o":"Gasfitería","n":"Fuga de gas/calefont (Patagonia)","p":"+56 9 9234 8695","w":"56992348695","c":"Las Condes","z":"RM"},{"seg":"Particular","o":"Gasfitería","n":"Mantención Calefont","p":"+56 9 7735 2616","w":"56977352616","c":"Sta. Julia","z":"RM"},{"seg":"Particular","o":"Gasfitería","n":"Reparación Calefont (Sta. Rosa)","p":"+56 9 4290 5286","w":"56942905286","c":"Santiago","z":"RM"},{"seg":"Particular","o":"Gasfitería","n":"Gasfiter calefont/destapes 24h","p":"+56 9 8569 3770","w":"56985693770","c":"Sta. Rosa (24h)","z":"RM"},{"seg":"Particular","o":"Gasfitería","n":"Gasfiter Providencia","p":"+56 9 8496 5107","w":"56984965107","c":"Providencia (24h)","z":"RM"},{"seg":"Particular","o":"Gasfitería","n":"Gasfitería Integral","p":"+56 9 6118 7437","w":"56961187437","c":"Av. Las Torres","z":"RM"},{"seg":"Particular","o":"Gasfitería","n":"Detector.cl (fugas)","p":"+56 9 5416 1777","w":"56954161777","c":"Las Condes (24h)","z":"RM"},{"seg":"Particular","o":"Gasfitería","n":"Gasfiter SEC Chile","p":"+56 9 5478 6510","w":"56954786510","c":"Av. Macul","z":"RM"},{"seg":"Particular","o":"Impermeab./Techos","n":"Impertech","p":"+56 9 9828 6880","w":"56998286880","c":"Providencia","z":"RM"},{"seg":"Particular","o":"Impermeab./Techos","n":"Reparaciones Techos Aasphalt","p":"+56 9 9221 4735","w":"56992214735","c":"Suiza (24h)","z":"RM"},{"seg":"Particular","o":"Impermeab./Techos","n":"Impp - Impermeab. Techos","p":"+56 9 6729 2923","w":"56967292923","c":"H. de Aguirre","z":"RM"},{"seg":"Particular","o":"Impermeab./Techos","n":"Zu Impermeabilizaciones","p":"+56 9 8436 9589","w":"56984369589","c":"N. Providencia (24h)","z":"RM"},{"seg":"Particular","o":"Impermeab./Techos","n":"Techo Santiago","p":"+56 9 8746 6011","w":"56987466011","c":"RM (24h)","z":"RM"},{"seg":"Particular","o":"Jardinería/Poda","n":"Retiro Escombros Toledo (poda)","p":"+56 9 6625 8528","w":"56966258528","c":"El León","z":"RM"},{"seg":"Particular","o":"Jardinería/Poda","n":"InnoClean (jardinería)","p":"+56 9 4566 4978","w":"56945664978","c":"Apoquindo","z":"RM"},{"seg":"Particular","o":"Jardinería/Poda","n":"Playgreen (pasto sintético)","p":"+56 9 9084 4619","w":"56990844619","c":"Chile España (24h)","z":"RM"},{"seg":"Particular","o":"Jardinería/Poda","n":"Virarboles Podas","p":"+56 9 6394 8021","w":"56963948021","c":"Q. del Salado (24h)","z":"RM"},{"seg":"Particular","o":"Jardinería/Poda","n":"Jardín Pro","p":"+56 9 3574 5603","w":"56935745603","c":"RM","z":"RM"},{"seg":"Particular","o":"Jardinería/Poda","n":"Arborismo Quillaja","p":"+56 9 7833 5831","w":"56978335831","c":"El Arrayán (24h)","z":"RM"},{"seg":"Particular","o":"Jardinería/Poda","n":"Imperio Verde Jardinería","p":"+56 9 7877 3879","w":"56978773879","c":"Antonio Varas","z":"RM"},{"seg":"Particular","o":"Jardinería/Poda","n":"El Jardinero","p":"+56 9 9539 8110","w":"56995398110","c":"RM","z":"RM"},{"seg":"Particular","o":"Jardinería/Poda","n":"Don Luis Jardinería","p":"+56 9 7531 0576","w":"56975310576","c":"RM","z":"RM"},{"seg":"Particular","o":"Jardinería/Poda","n":"Jardinería Promaucaes","p":"+56 9 8287 7088","w":"56982877088","c":"RM (24h)","z":"RM"},{"seg":"Particular","o":"Jardinería/Poda","n":"PAISARQ Paisajismo","p":"+56 9 4446 8971","w":"56944468971","c":"Arturo Prat","z":"RM"},{"seg":"Particular","o":"Jardinería/Poda","n":"PEMACAR","p":"+56 9 5744 4084","w":"56957444084","c":"RM (24h)","z":"RM"},{"seg":"Particular","o":"Jardinería/Poda","n":"Casa Olivo","p":"+56 9 9614 3055","w":"56996143055","c":"RM","z":"RM"},{"seg":"Particular","o":"Jardinería/Poda","n":"Garden Master","p":"+56 9 8285 7077","w":"56982857077","c":"RM","z":"RM"},{"seg":"Particular","o":"Mudanzas/Fletes","n":"Mudanzas y Fletes Stgo Centro","p":"+56 9 6583 4296","w":"56965834296","c":"San Isidro (24h)","z":"RM"},{"seg":"Particular","o":"Mudanzas/Fletes","n":"Move Your House","p":"+56 9 5980 6414","w":"56959806414","c":"Manquehue Sur","z":"RM"},{"seg":"Particular","o":"Mudanzas/Fletes","n":"Fletes Rápidos Santiago","p":"+56 9 9539 1532","w":"56995391532","c":"Román Díaz (24h)","z":"RM"},{"seg":"Particular","o":"Mudanzas/Fletes","n":"Fletes Volta","p":"+56 9 9415 8796","w":"56994158796","c":"M. León Prado","z":"RM"},{"seg":"Particular","o":"Mudanzas/Fletes","n":"Mudanzas y Fletes Santiago","p":"+56 9 8704 0888","w":"56987040888","c":"Santo Domingo (24h)","z":"RM"},{"seg":"Particular","o":"Mudanzas/Fletes","n":"Mudanzas Económicas","p":"+56 9 9836 3104","w":"56998363104","c":"Estrella Solitaria","z":"RM"},{"seg":"Particular","o":"Mudanzas/Fletes","n":"FletesPro","p":"+56 9 7979 6841","w":"56979796841","c":"RM (24h)","z":"RM"},{"seg":"Particular","o":"Mudanzas/Fletes","n":"Fletes y Mudanzas en Santiago","p":"+56 9 7445 5333","w":"56974455333","c":"A. Vespucio (24h)","z":"RM"},{"seg":"Particular","o":"Mudanzas/Fletes","n":"FLETES CITY","p":"+56 9 3443 0631","w":"56934430631","c":"La Laguna","z":"RM"},{"seg":"Particular","o":"Mudanzas/Fletes","n":"Mudanzas Norte Sur Chile","p":"+56 9 4494 4291","w":"56944944291","c":"Colo Colo (24h)","z":"RM"},{"seg":"Particular","o":"Mudanzas/Fletes","n":"Cargo Encomiendas y Fletes","p":"+56 9 2047 5760","w":"56920475760","c":"Eulogia Sánchez","z":"RM"},{"seg":"Particular","o":"Persianas/Cortinas","n":"Persialux","p":"+56 9 7995 9615","w":"56979959615","c":"Apoquindo","z":"RM"},{"seg":"Particular","o":"Persianas/Cortinas","n":"DECORED","p":"+56 9 4463 6803","w":"56944636803","c":"Quillagua","z":"RM"},{"seg":"Particular","o":"Persianas/Cortinas","n":"3DBLOCK Cortinas Roller","p":"+56 9 3656 2804","w":"56936562804","c":"Las Condes","z":"RM"},{"seg":"Particular","o":"Persianas/Cortinas","n":"Home Saba","p":"+56 9 6449 7473","w":"56964497473","c":"Portugal","z":"RM"},{"seg":"Particular","o":"Persianas/Cortinas","n":"Cortinas Roller En Las Condes","p":"+56 9 9870 2755","w":"56998702755","c":"Las Condes","z":"RM"},{"seg":"Particular","o":"Persianas/Cortinas","n":"Cortinas Roller / lavado","p":"+56 9 9799 3071","w":"56997993071","c":"Las Crisálidas","z":"RM"},{"seg":"Particular","o":"Persianas/Cortinas","n":"Cortinas Deco Hogar Chile","p":"+56 9 8996 0883","w":"56989960883","c":"Providencia","z":"RM"},{"seg":"Particular","o":"Persianas/Cortinas","n":"Cortinas Roller Rollermás","p":"+56 9 5112 0245","w":"56951120245","c":"Av. Sucre","z":"RM"},{"seg":"Particular","o":"Persianas/Cortinas","n":"Cortinas Izurieta","p":"+56 2 2228 4449","w":"56222284449","c":"Patagonia","z":"RM"},{"seg":"Particular","o":"Persianas/Cortinas","n":"Insideart Roller","p":"+56 2 2732 8591","w":"56227328591","c":"Alderete","z":"RM"},{"seg":"Particular","o":"Pintura","n":"Pinta Chile","p":"+56 9 4054 7785","w":"56940547785","c":"RM","z":"RM"},{"seg":"Particular","o":"Pintura","n":"Lo Pintamos","p":"+56 9 5706 2514","w":"56957062514","c":"Santiago","z":"RM"},{"seg":"Particular","o":"Pintura","n":"Lo Pintamos (alt.)","p":"+56 9 3209 4908","w":"56932094908","c":"Santiago","z":"RM"},{"seg":"Particular","o":"Pintura","n":"Blue sky ingeniería","p":"+56 9 6449 2869","w":"56964492869","c":"Manquehue Sur","z":"RM"},{"seg":"Particular","o":"Pintura","n":"Maestro Pintor José Luis","p":"+56 9 8562 1917","w":"56985621917","c":"Stgo Centro/Oriente","z":"RM"},{"seg":"Particular","o":"Pintura","n":"Pintores a domicilio (G. Palma)","p":"+56 9 7933 1835","w":"56979331835","c":"Santiago","z":"RM"},{"seg":"Particular","o":"Pintura","n":"Maestros Pintores y remodelaciones","p":"+56 9 9016 4983","w":"56990164983","c":"RM (24h)","z":"RM"},{"seg":"Particular","o":"Pisos/Cerámica","n":"Multidecora Pisos flotantes","p":"+56 9 8642 8950","w":"56986428950","c":"Almirante Lynch","z":"RM"},{"seg":"Particular","o":"Pisos/Cerámica","n":"La Casa de la Cerámica","p":"+56 9 5822 1383","w":"56958221383","c":"Cam. Lo Ruiz","z":"RM"},{"seg":"Particular","o":"Pisos/Cerámica","n":"Dr Pisos Chile (vitrificado)","p":"+56 2 2701 3716","w":"56227013716","c":"Muñoz Gamero","z":"RM"},{"seg":"Particular","o":"Pisos/Cerámica","n":"Pisos Manríquez","p":"+56 2 3305 8688","w":"56233058688","c":"Las Condes","z":"RM"},{"seg":"Particular","o":"Pisos/Cerámica","n":"Pisos flotantes (A. Vespucio)","p":"+56 2 2504 1788","w":"56225041788","c":"Américo Vespucio","z":"RM"},{"seg":"Particular","o":"Remodelación/Obras","n":"Maestros Express","p":"+56 9 8742 5186","w":"56987425186","c":"Peñalolén","z":"RM"},{"seg":"Particular","o":"Remodelación/Obras","n":"Don Joel","p":"+56 9 3119 4066","w":"56931194066","c":"RM","z":"RM"},{"seg":"Particular","o":"Remodelación/Obras","n":"Maestro Experto","p":"+56 9 8249 3891","w":"56982493891","c":"Providencia","z":"RM"},{"seg":"Particular","o":"Remodelación/Obras","n":"Maestro Completo","p":"+56 9 3876 5212","w":"56938765212","c":"RM (24h)","z":"RM"},{"seg":"Particular","o":"Remodelación/Obras","n":"Maestros a Domicilio (multioficio)","p":"+56 9 5035 8762","w":"56950358762","c":"Balmaceda 142","z":"RM"},{"seg":"Particular","o":"Remodelación/Obras","n":"Multiservicios A.T","p":"+56 9 6131 1000","w":"56961311000","c":"RM","z":"RM"},{"seg":"Particular","o":"Remodelación/Obras","n":"Mas Service Chile","p":"+56 9 7453 2162","w":"56974532162","c":"Santiago","z":"RM"},{"seg":"Particular","o":"Remodelación/Obras","n":"Multiservicios (Av. Las Condes)","p":"+56 2 2229 8365","w":"56222298365","c":"Las Condes","z":"RM"},{"seg":"Particular","o":"Remodelación/Obras","n":"Remodelaciones - FullCasa","p":"+56 9 2725 3776","w":"56927253776","c":"RM","z":"RM"},{"seg":"Particular","o":"Soldadura/Herrería","n":"Maestro soldador 24 hrs","p":"+56 9 6168 1753","w":"56961681753","c":"La Reina (24h)","z":"RM"},{"seg":"Particular","o":"Soldadura/Herrería","n":"Soldador a domicilio","p":"+56 9 3053 1791","w":"56930531791","c":"Apoquindo","z":"RM"},{"seg":"Particular","o":"Soldadura/Herrería","n":"El Che Soldador","p":"+56 9 4920 0969","w":"56949200969","c":"Stgo (Sierra Leona)","z":"RM"},{"seg":"Particular","o":"Soldadura/Herrería","n":"Soldadura de escapes","p":"+56 9 7261 4297","w":"56972614297","c":"Santiago","z":"RM"},{"seg":"Particular","o":"Soldadura/Herrería","n":"Maestro Soldador (Salamanca)","p":"+56 9 4572 2289","w":"56945722289","c":"Santiago","z":"RM"},{"seg":"Particular","o":"Soldadura/Herrería","n":"STDA.CL","p":"+56 9 3698 6081","w":"56936986081","c":"Santa Rosa","z":"RM"},{"seg":"Particular","o":"Soldadura/Herrería","n":"Soldadura TIG","p":"+56 9 8461 7668","w":"56984617668","c":"Santiago","z":"RM"},{"seg":"Particular","o":"Soldadura/Herrería","n":"Maestro Soldador Santiago","p":"+56 9 4484 6794","w":"56944846794","c":"RM (24h)","z":"RM"},{"seg":"Particular","o":"Soldadura/Herrería","n":"Inst. El Imperio de la Soldadura","p":"+56 9 7844 6493","w":"56978446493","c":"Santiago","z":"RM"},{"seg":"Particular","o":"Soldadura/Herrería","n":"RKS Soldadura / Corte","p":"+56 9 9884 3026","w":"56998843026","c":"RM","z":"RM"},{"seg":"Particular","o":"Soldadura/Herrería","n":"Hojalatería Moreno","p":"+56 9 5029 3383","w":"56950293383","c":"Santiago","z":"RM"},{"seg":"Particular","o":"Soldadura/Herrería","n":"Palacio de la Soldadura","p":"+56 2 2466 6634","w":"56224666634","c":"Diez de Julio","z":"RM"},{"seg":"Particular","o":"Soldadura/Herrería","n":"Palacios Soldaduras","p":"+56 2 2555 1953","w":"56225551953","c":"Maule","z":"RM"},{"seg":"Particular","o":"Soldadura/Herrería","n":"Soldaduras especiales","p":"+56 2 2555 6150","w":"56225556150","c":"Maule","z":"RM"},{"seg":"Particular","o":"Soldadura/Herrería","n":"Taller Soldaduras Gangas","p":"+56 2 2688 9343","w":"56226889343","c":"Baquedano","z":"RM"},{"seg":"Particular","o":"Soldadura/Herrería","n":"Aravena Javier y Cía (soldadura)","p":"+56 2 2556 5255","w":"56225565255","c":"Ñuble","z":"RM"},{"seg":"Particular","o":"Vidriería","n":"Vidriería Colón","p":"+56 9 7979 6131","w":"56979796131","c":"Av. C. Colón","z":"RM"},{"seg":"Particular","o":"Vidriería","n":"Vidriería Isabel La Católica","p":"+56 9 8333 2676","w":"56983332676","c":"Las Condes","z":"RM"},{"seg":"Particular","o":"Vidriería","n":"Vidrio Emergencia 24h","p":"+56 9 3732 5405","w":"56937325405","c":"Av. Las Condes","z":"RM"},{"seg":"Particular","o":"Vidriería","n":"Vidriarte Pizarras de vidrio","p":"+56 9 6183 7275","w":"56961837275","c":"Nueva Bilbao","z":"RM"},{"seg":"Particular","o":"Vidriería","n":"Vidriería Central Santiago","p":"+56 9 5991 4756","w":"56959914756","c":"San Isidro","z":"RM"},{"seg":"Particular","o":"Vidriería","n":"Vidrios Larraín","p":"+56 2 2758 4126","w":"56227584126","c":"Av. Larraín","z":"RM"},{"seg":"Empresa","o":"Cerrajería","n":"Multiservice Chip (llaves)","p":"+56 2 2952 3251","w":"56229523251","c":"Padre Hurtado","z":"RM"},{"seg":"Empresa","o":"Cerrajería","n":"Multiservice Jumbo Padre Hurtado","p":"+56 2 2485 9408","w":"56224859408","c":"Bilbao","z":"RM"},{"seg":"Empresa","o":"Cerrajería","n":"Multiservice Mall Alto Las Condes","p":"+56 2 2485 9410","w":"56224859410","c":"Las Condes","z":"RM"},{"seg":"Empresa","o":"Climatización/AA","n":"Parkol Climatización","p":"+56 9 3946 3714","w":"56939463714","c":"Thayer Ojeda","z":"RM"},{"seg":"Empresa","o":"Climatización/AA","n":"Climatizate","p":"+56 9 2733 9402","w":"56927339402","c":"RM","z":"RM"},{"seg":"Empresa","o":"Climatización/AA","n":"León Climatización","p":"+56 9 6371 0820","w":"56963710820","c":"Islas Guaitecas","z":"RM"},{"seg":"Empresa","o":"Climatización/AA","n":"Pro JyM SPA (AA)","p":"+56 9 7884 3315","w":"56978843315","c":"Apoquindo","z":"RM"},{"seg":"Empresa","o":"Climatización/AA","n":"Clima Tegnology","p":"+56 9 6545 9454","w":"56965459454","c":"Las Condes","z":"RM"},{"seg":"Empresa","o":"Climatización/AA","n":"Clima Solution","p":"+56 9 4676 2124","w":"56946762124","c":"Las Parcelas","z":"RM"},{"seg":"Empresa","o":"Climatización/AA","n":"Teknigas (calefacción)","p":"+56 9 5692 2100","w":"56956922100","c":"RM","z":"RM"},{"seg":"Empresa","o":"Climatización/AA","n":"Raisa Climatizaciones","p":"+56 9 3083 8331","w":"56930838331","c":"Morandé (24h)","z":"RM"},{"seg":"Empresa","o":"Climatización/AA","n":"JC Climatización SPA","p":"+56 9 7595 4806","w":"56975954806","c":"Apoquindo","z":"RM"},{"seg":"Empresa","o":"Climatización/AA","n":"Cold Service 24 SpA","p":"+56 9 3440 4879","w":"56934404879","c":"C. Henríquez","z":"RM"},{"seg":"Empresa","o":"Climatización/AA","n":"Climatización Jn","p":"+56 9 3009 3661","w":"56930093661","c":"Diego Rojas","z":"RM"},{"seg":"Empresa","o":"Electricidad","n":"Conectek SpA","p":"+56 9 2245 6826","w":"56922456826","c":"Av. Marathón","z":"RM"},{"seg":"Empresa","o":"Electricidad","n":"Voltcircuit Las Condes","p":"+56 9 2623 4214","w":"56926234214","c":"Las Condes","z":"RM"},{"seg":"Empresa","o":"Electricidad","n":"VoltajeLm Spa","p":"+56 9 5225 2898","w":"56952252898","c":"Santiago Centro","z":"RM"},{"seg":"Empresa","o":"Electricidad","n":"RH Electric","p":"+56 9 5791 4122","w":"56957914122","c":"Vicuña Mackenna","z":"RM"},{"seg":"Empresa","o":"Electricidad","n":"EYM Solutions SPA","p":"+56 9 5319 0698","w":"56953190698","c":"Vicuña Mackenna","z":"RM"},{"seg":"Empresa","o":"Electricidad","n":"L.O.V Construcciones","p":"+56 9 7135 3428","w":"56971353428","c":"La Florida","z":"RM"},{"seg":"Empresa","o":"Gasfitería","n":"Gasfiter a domicilio y construcción","p":"+56 9 5718 2617","w":"56957182617","c":"Santiago","z":"RM"},{"seg":"Empresa","o":"Impermeab./Techos","n":"Geosynt","p":"+56 9 3781 1637","w":"56937811637","c":"Bayona","z":"RM"},{"seg":"Empresa","o":"Impermeab./Techos","n":"Waterproofings","p":"+56 9 5001 9750","w":"56950019750","c":"Badajoz (24h)","z":"RM"},{"seg":"Empresa","o":"Impermeab./Techos","n":"Vigo Solutions Spa","p":"+56 9 3467 5093","w":"56934675093","c":"Moneda","z":"RM"},{"seg":"Empresa","o":"Jardinería/Poda","n":"C&M Servicios SpA","p":"+56 9 3318 2848","w":"56933182848","c":"RM","z":"RM"},{"seg":"Empresa","o":"Mudanzas/Fletes","n":"Transportes Fletes y Mudanzas","p":"+56 9 5694 3291","w":"56956943291","c":"Valenzuela Castillo","z":"RM"},{"seg":"Empresa","o":"Mudanzas/Fletes","n":"Mudango Chile","p":"+56 9 9711 4037","w":"56997114037","c":"Las Malvas","z":"RM"},{"seg":"Empresa","o":"Pintura","n":"Pintura Remodela constructora","p":"+56 9 9150 9530","w":"56991509530","c":"Los Militares","z":"RM"},{"seg":"Empresa","o":"Remodelación/Obras","n":"Steele Construcciones (multioficio)","p":"+56 9 3629 7637","w":"56936297637","c":"RM (24h)","z":"RM"},{"seg":"Empresa","o":"Remodelación/Obras","n":"Maestro en Construcción CL","p":"+56 9 5074 5246","w":"56950745246","c":"Santiago","z":"RM"},{"seg":"Empresa","o":"Remodelación/Obras","n":"Maestro en construcción","p":"+56 9 2382 8385","w":"56923828385","c":"RM (24h)","z":"RM"},{"seg":"Empresa","o":"Remodelación/Obras","n":"Multiservicios M&R SpA","p":"+56 9 2634 1074","w":"56926341074","c":"Santiago","z":"RM"},{"seg":"Empresa","o":"Remodelación/Obras","n":"Construcción Multihogar","p":"+56 9 7909 4609","w":"56979094609","c":"Maipú (24h)","z":"RM"},{"seg":"Empresa","o":"Vidriería","n":"Vistalibre (cierres terraza)","p":"+56 2 2954 2750","w":"56229542750","c":"Las Condes","z":"RM"},{"seg":"Otros","o":"Carpintería","n":"Maestro.cl (carpintero/mueblista)","p":"+56 9 3416 3852","w":"56934163852","c":"Santiago","z":"RM"},{"seg":"Otros","o":"Carpintería","n":"Timbrit Carpinteros","p":"+56 2 3210 0611","w":"56232100611","c":"Providencia","z":"RM"},{"seg":"Otros","o":"Carpintería","n":"Ferretería El Carpintero","p":"+56 2 2698 4785","w":"56226984785","c":"San Diego","z":"RM"},{"seg":"Otros","o":"Electricidad","n":"Portal de Especialistas","p":"+56 9 9333 6261","w":"56993336261","c":"RM (24h)","z":"RM"},{"seg":"Otros","o":"Electricidad","n":"Casa Musa Las Condes (tienda)","p":"+56 2 2201 9090","w":"56222019090","c":"Las Condes","z":"RM"},{"seg":"Otros","o":"Electricidad","n":"Materiales Eléctricos DJ&R","p":"+56 9 4287 0480","w":"56942870480","c":"San José Estrella","z":"RM"},{"seg":"Otros","o":"Impermeab./Techos","n":"FerreteríaWeb (impermeab.)","p":"+56 9 8746 2910","w":"56987462910","c":"Los Jardines","z":"RM"},{"seg":"Otros","o":"Pisos/Cerámica","n":"Importadora Madeza Spa","p":"+56 9 8920 7099","w":"56989207099","c":"San Nicolás","z":"RM"},{"seg":"Otros","o":"Pisos/Cerámica","n":"MK Las Condes (materiales)","p":"+56 2 2678 9000","w":"56226789000","c":"Av. Las Condes","z":"RM"},{"seg":"Otros","o":"Pisos/Cerámica","n":"Importadora Kellinghusen","p":"+56 2 2635 8840","w":"56226358840","c":"Pedro Montt","z":"RM"},{"seg":"Otros","o":"Pisos/Cerámica","n":"Budnik S.A.","p":"+56 2 2398 0100","w":"56223980100","c":"Av. Kennedy","z":"RM"},{"seg":"Otros","o":"Pisos/Cerámica","n":"Floor Center","p":"+56 2 2220 3514","w":"56222203514","c":"Av. Kennedy","z":"RM"},{"seg":"Otros","o":"Pisos/Cerámica","n":"Limatco Vespucio (materiales)","p":"+56 2 2221 1030","w":"56222211030","c":"Américo Vespucio","z":"RM"}];

const TEMPLATES = {
  Particular: {
    'Cercano (tú)': 'Hola, ¿cómo estás? Mi nombre es {remitente} y tengo tu contacto. Te cuento que con una amiga estamos lanzando una nueva app, *Maestros En Línea*, para conectar maestros con clientes que necesitan trabajos en sus hogares. Inscribirse es gratis y es para que consigas más pega. Te dejo el link por si te animas: https://www.maestrosenlinea.cl/unete',
    'Corta': 'Hola, soy {remitente}, tengo tu contacto. Con una amiga estamos lanzando *Maestros En Línea*, una app gratis que te conecta con clientes que buscan maestros. ¿Te gustaría inscribirte? https://www.maestrosenlinea.cl/unete',
    'Con pregunta': 'Hola, mi nombre es {remitente}. Con una amiga estamos partiendo con una nueva app para maestros, *Maestros En Línea*, y tengo tu contacto. ¿Estás tomando trabajos nuevos? Si quieres te paso cómo inscribirte gratis: https://www.maestrosenlinea.cl/unete'
  },
  Empresa: {
    'Formal (B2B)': 'Hola, mi nombre es {remitente} y tengo este contacto. Quería comentarles que con una socia estamos lanzando *Maestros En Línea*, una nueva plataforma que conecta empresas de servicios con clientes en Santiago. La inscripción es gratuita. Les dejo la información: https://www.maestrosenlinea.cl/unete. Quedo atenta.',
    'Alianza': 'Hola, soy {remitente}. Junto a una amiga estamos lanzando *Maestros En Línea*, una app para derivar clientes a empresas de servicios. Tengo este contacto y me encantaría que se sumen. Más info: https://www.maestrosenlinea.cl/unete',
    'Breve': 'Hola, mi nombre es {remitente}. Con una socia lanzamos *Maestros En Línea*, una nueva app que conecta empresas de servicios con clientes que buscan sus servicios. El registro es gratis: https://www.maestrosenlinea.cl/unete'
  },
  Otros: {
    'Sondeo': 'Hola, mi nombre es {remitente} y tengo este contacto. Con una amiga estamos lanzando una nueva app, *Maestros En Línea*, para conectar maestros con clientes. ¿Trabajan con maestros a domicilio o los recomiendan? Nos encantaría conversar una colaboración: https://www.maestrosenlinea.cl/unete',
    'Recomendación': 'Hola, soy {remitente}. Con una amiga estamos partiendo con *Maestros En Línea*, una app gratis donde los maestros consiguen más clientes. Pensé que quizás puedan recomendarla a sus maestros o técnicos: https://www.maestrosenlinea.cl/unete',
    'Breve': 'Hola, mi nombre es {remitente}. Con una socia lanzamos *Maestros En Línea* y nos interesa sumar aliados como ustedes. ¿Les puedo contar más? https://www.maestrosenlinea.cl/unete'
  }
};

const STORE = 'mel_campaign_v2';
const SEGMENTOS = ['Todos', 'Particular', 'Empresa', 'Otros'];
const REGIONES = ['Región Metropolitana', 'Arica y Parinacota', 'Tarapacá', 'Antofagasta', 'Atacama', 'Coquimbo', 'Valparaíso', "O'Higgins", 'Maule', 'Ñuble', 'Biobío', 'La Araucanía', 'Los Ríos', 'Los Lagos', 'Aysén', 'Magallanes'];
const OFICIOS_BUSQUEDA = ['gasfiter', 'electricista', 'carpintero', 'pintor', 'cerrajero', 'soldador', 'jardinero', 'reparacion calefont', 'aire acondicionado', 'persianas cortinas', 'impermeabilizacion techos', 'mudanzas fletes', 'vidriero', 'albanil', 'piso flotante ceramica'];
const ESTADOS = { pend: 'Pendiente', sent: 'Enviado', repl: 'Respondió', ins: 'Inscrito' };
const SGT_COLOR = { Particular: ['#dbeafe', '#1e40af'], Empresa: ['#ffedd5', '#9a3412'], Otros: ['#e5e7eb', '#475569'] };

export default function CampanaMaestros() {
  const [seg, setSeg] = useState('Todos');
  const [tmplKey, setTmplKey] = useState(Object.keys(TEMPLATES.Particular)[0]);
  const [tmplTxt, setTmplTxt] = useState(TEMPLATES.Particular[Object.keys(TEMPLATES.Particular)[0]]);
  const [of, setOf] = useState('');
  const [zona, setZona] = useState('');
  const [size, setSize] = useState(20);
  const [remit, setRemit] = useState('Andrea');
  const [estado, setEstado] = useState({});
  const [abiertos, setAbiertos] = useState({ 0: true });
  const [bOf, setBOf] = useState('');
  const [bCom, setBCom] = useState('');
  const [bReg, setBReg] = useState('Región Metropolitana');
  const fileRef = useRef(null);

  useEffect(function () {
    try { setEstado(JSON.parse(localStorage.getItem(STORE) || '{}')); } catch (e) {}
    try { var r = localStorage.getItem('mel_remit'); if (r) setRemit(r); } catch (e) {}
  }, []);

  var grupo = seg === 'Todos' ? 'Particular' : seg;
  function cambiarSeg(s) {
    setSeg(s);
    var g = s === 'Todos' ? 'Particular' : s;
    var k = Object.keys(TEMPLATES[g])[0];
    setTmplKey(k); setTmplTxt(TEMPLATES[g][k]);
  }
  function cambiarTmpl(k) { setTmplKey(k); setTmplTxt(TEMPLATES[grupo][k]); }
  function guardar(ns) { setEstado(ns); try { localStorage.setItem(STORE, JSON.stringify(ns)); } catch (e) {} }
  function cambiarRemit(v) { setRemit(v); try { localStorage.setItem('mel_remit', v); } catch (e) {} }

  function getSt(c) { return estado[c.w] || 'pend'; }
  function msg(c) {
    var rm = (remit || 'Andrea').trim();
    return tmplTxt.replace(/{nombre}/g, (c.n || '').split(' ')[0] || 'maestro').replace(/{remitente}/g, rm);
  }
  function wa(c) { return 'https://wa.me/' + c.w + '?text=' + encodeURIComponent(msg(c)); }

  var lista = CONTACTS.filter(function (c) {
    return (seg === 'Todos' || c.seg === seg) && (!of || c.o === of) && (!zona || c.z === zona);
  });
  var paso = Math.max(5, parseInt(size) || 20);
  function chunk(a, n) { var r = []; for (var i = 0; i < a.length; i += n) r.push(a.slice(i, i + n)); return r; }
  var paquetes = chunk(lista, paso);

  function setW(w, s) { var ns = Object.assign({}, estado); ns[w] = s; guardar(ns); }
  function marcarEnviado(w) { if ((estado[w] || 'pend') === 'pend') { var ns = Object.assign({}, estado); ns[w] = 'sent'; guardar(ns); } }
  function siguiente(i) {
    var pk = paquetes[i];
    var nx = pk.find(function (c) { return getSt(c) === 'pend'; });
    if (!nx) { alert('Paquete completo'); return; }
    window.open(wa(nx), '_blank');
    var ns = Object.assign({}, estado); ns[nx.w] = 'sent'; guardar(ns);
  }
  function copiarLinks(i) {
    var pk = paquetes[i];
    var txt = pk.map(function (c) { return c.n + ': ' + wa(c); }).join('\n');
    if (navigator.clipboard) navigator.clipboard.writeText(txt);
    alert('Links del paquete ' + (i + 1) + ' copiados');
  }
  function exportar() {
    var d = { state: estado, remit: remit };
    var b = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(b); a.download = 'avance_campana_maestros.json'; a.click();
  }
  function importar(e) {
    var f = e.target.files[0]; if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      try {
        var d = JSON.parse(r.result);
        if (d.state) guardar(d.state);
        if (d.remit) cambiarRemit(d.remit);
        alert('Avance importado correctamente');
      } catch (err) { alert('Archivo inválido'); }
    };
    r.readAsText(f);
    e.target.value = '';
  }
  function reiniciar() { if (confirm('¿Borrar todo el avance marcado? (no borra contactos)')) guardar({}); }

  function buscarMaps() {
    var oficio = (bOf || '').trim();
    var zonaTxt = (bCom || '').trim() || bReg;
    if (oficio === '' || /todos/i.test(oficio)) {
      if (!confirm('Se abrirán ' + OFICIOS_BUSQUEDA.length + ' pestañas (una por oficio) para: ' + zonaTxt + '. Permite ventanas emergentes.')) return;
      OFICIOS_BUSQUEDA.forEach(function (o) {
        window.open('https://www.google.com/maps/search/' + encodeURIComponent(o + ' ' + zonaTxt), '_blank');
      });
      return;
    }
    var q = [oficio, zonaTxt].filter(Boolean).join(' ');
    window.open('https://www.google.com/maps/search/' + encodeURIComponent(q), '_blank');
  }
  function buscarYapo() {
    var q = [bOf, bCom].filter(Boolean).join(' ').trim() || 'maestro';
    window.open('https://www.yapo.cl/chile/servicios?q=' + encodeURIComponent(q), '_blank');
  }

  var oficios = Array.from(new Set(CONTACTS.map(function (c) { return c.o; }))).sort();
  var zonas = Array.from(new Set(CONTACTS.map(function (c) { return c.z; }))).sort();
  var contactados = lista.filter(function (c) { return getSt(c) !== 'pend'; }).length;
  var respondieron = lista.filter(function (c) { return getSt(c) === 'repl'; }).length;
  var inscritos = lista.filter(function (c) { return getSt(c) === 'ins'; }).length;

  var ORANGE = '#FF4D2E';
  var input = { fontSize: 14, padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 9, background: '#fff' };
  var lbl = { fontSize: 11, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 4, display: 'block' };
  var card = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 16, marginBottom: 16 };

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* Encabezado */}
      <div style={{ background: 'linear-gradient(135deg,#FF7A4D,#FF4D2E)', color: '#fff', borderRadius: 14, padding: '16px 20px', marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>{'\u{1F4E3}'} Campaña de reclutamiento</div>
        <div style={{ fontSize: 13, opacity: .9, marginTop: 2 }}>Invita maestros a inscribirse en la app. Segmentado por tipo de contacto, con plantillas y envío por paquetes.</div>
      </div>

      {/* Buscador por zona */}
      <div style={card}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>{'\u{1F50E}'} Buscar más contactos por zona</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
          <div><label style={lbl}>Oficio</label><input list="campOfs" value={bOf} onChange={function (e) { setBOf(e.target.value); }} placeholder="ej: gasfiter (o vacío = todos)" style={Object.assign({ width: 220 }, input)} />
            <datalist id="campOfs">{OFICIOS_BUSQUEDA.map(function (o) { return <option key={o} value={o} />; })}</datalist>
          </div>
          <div><label style={lbl}>Comuna</label><input value={bCom} onChange={function (e) { setBCom(e.target.value); }} placeholder="ej: Maipú" style={Object.assign({ width: 150 }, input)} /></div>
          <div><label style={lbl}>Región</label><select value={bReg} onChange={function (e) { setBReg(e.target.value); }} style={input}>{REGIONES.map(function (r) { return <option key={r} value={r}>{r}</option>; })}</select></div>
          <button onClick={buscarMaps} style={{ background: ORANGE, color: '#fff', border: 'none', borderRadius: 9, padding: '9px 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Buscar en Google Maps</button>
          <button onClick={buscarYapo} style={{ background: '#eef2f7', color: '#334155', border: 'none', borderRadius: 9, padding: '9px 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Buscar en Yapo</button>
        </div>
        <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>Abre la búsqueda en una pestaña nueva; copia los números nuevos a la planilla. "Oficio" vacío abre una pestaña por cada oficio.</div>
      </div>

      {/* Segmentos */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {SEGMENTOS.map(function (s) {
          var on = seg === s;
          return <button key={s} onClick={function () { cambiarSeg(s); }} style={{ border: '1px solid ' + (on ? ORANGE : '#e5e7eb'), background: on ? ORANGE : '#fff', color: on ? '#fff' : '#475569', borderRadius: 20, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>{s}</button>;
        })}
      </div>

      {/* Métricas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))', gap: 12, marginBottom: 16 }}>
        {[[lista.length, 'Contactos'], [paquetes.length, 'Paquetes'], [contactados, 'Contactados'], [respondieron, 'Respondieron'], [inscritos, 'Inscritos']].map(function (m, i) {
          return <div key={i} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '12px 14px' }}><div style={{ fontSize: 23, fontWeight: 800 }}>{m[0]}</div><div style={{ fontSize: 12, color: '#6b7280' }}>{m[1]}</div></div>;
        })}
      </div>

      {/* Controles */}
      <div style={Object.assign({ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }, card)}>
        <div style={{ width: 120 }}><label style={lbl}>Remitente</label><input value={remit} onChange={function (e) { cambiarRemit(e.target.value); }} style={Object.assign({ width: '100%' }, input)} /></div>
        <div style={{ minWidth: 160 }}><label style={lbl}>Plantilla</label><select value={tmplKey} onChange={function (e) { cambiarTmpl(e.target.value); }} style={input}>{Object.keys(TEMPLATES[grupo]).map(function (k) { return <option key={k} value={k}>{k}</option>; })}</select></div>
        <div style={{ minWidth: 130 }}><label style={lbl}>Oficio</label><select value={of} onChange={function (e) { setOf(e.target.value); }} style={input}><option value="">Todos</option>{oficios.map(function (o) { return <option key={o} value={o}>{o}</option>; })}</select></div>
        <div style={{ minWidth: 110 }}><label style={lbl}>Zona</label><select value={zona} onChange={function (e) { setZona(e.target.value); }} style={input}><option value="">Todas</option>{zonas.map(function (z) { return <option key={z} value={z}>{z}</option>; })}</select></div>
        <div style={{ width: 90 }}><label style={lbl}>Paquete</label><input type="number" min="5" max="50" value={size} onChange={function (e) { setSize(e.target.value); }} style={Object.assign({ width: '100%' }, input)} /></div>
        <div style={{ flex: 1, minWidth: 240 }}><label style={lbl}>Texto del mensaje</label><textarea value={tmplTxt} onChange={function (e) { setTmplTxt(e.target.value); }} style={Object.assign({ width: '100%', minHeight: 80, resize: 'vertical', lineHeight: 1.5 }, input)} /></div>
      </div>

      {/* Acciones de avance */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <button onClick={exportar} style={{ background: '#eef2f7', color: '#334155', border: 'none', borderRadius: 9, padding: '8px 12px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Exportar avance</button>
        <button onClick={function () { fileRef.current && fileRef.current.click(); }} style={{ background: '#eef2f7', color: '#334155', border: 'none', borderRadius: 9, padding: '8px 12px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Importar avance</button>
        <input ref={fileRef} type="file" accept="application/json" onChange={importar} style={{ display: 'none' }} />
        <button onClick={reiniciar} style={{ background: '#fff', color: '#b3261e', border: '1px solid #f0c8c2', borderRadius: 9, padding: '8px 12px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Reiniciar avance</button>
      </div>

      {/* Aviso WhatsApp */}
      <div style={{ fontSize: 12, color: '#b45309', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
        Envía de a poco (paquetes de 20, uno por uno). No mandes el mismo mensaje masivo a muchos desconocidos: WhatsApp puede suspender el número.
      </div>

      {/* Paquetes */}
      {paquetes.map(function (pk, i) {
        var done = pk.filter(function (c) { return getSt(c) !== 'pend'; }).length;
        var abierto = !!abiertos[i];
        return (
          <div key={i} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, marginBottom: 16, overflow: 'hidden' }}>
            <div onClick={function () { var a = Object.assign({}, abiertos); a[i] = !abierto; setAbiertos(a); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 18px', cursor: 'pointer', background: '#fafafa', borderBottom: '1px solid #e5e7eb' }}>
              <div><div style={{ fontSize: 15, fontWeight: 700 }}>Paquete {i + 1}</div><div style={{ fontSize: 12, color: '#6b7280' }}>{pk.length} contactos · {done}/{pk.length} contactados</div></div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={function (e) { e.stopPropagation(); siguiente(i); }} style={{ background: '#25D366', color: '#063d2b', border: 'none', borderRadius: 9, padding: '9px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>{'▶'} Abrir siguiente</button>
                <button onClick={function (e) { e.stopPropagation(); copiarLinks(i); }} style={{ background: '#eef2f7', color: '#334155', border: 'none', borderRadius: 9, padding: '6px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Copiar links</button>
              </div>
            </div>
            <div style={{ height: 8, background: '#e5e7eb' }}><div style={{ height: '100%', width: Math.round(done / pk.length * 100) + '%', background: '#25D366' }} /></div>
            {abierto && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr>{['#', 'Nombre', 'Segmento', 'Oficio', 'Teléfono', 'Estado', ''].map(function (h, k) { return <th key={k} style={{ padding: '9px 14px', fontSize: 11, color: '#6b7280', textAlign: 'left', textTransform: 'uppercase' }}>{h}</th>; })}</tr></thead>
                  <tbody>
                    {pk.map(function (c, j) {
                      var s = getSt(c); var sc = SGT_COLOR[c.seg] || ['#e5e7eb', '#475569'];
                      return (
                        <tr key={c.w} style={{ borderBottom: '1px solid #f1f1f1' }}>
                          <td style={{ padding: '9px 14px', fontSize: 13 }}>{i * paso + j + 1}</td>
                          <td style={{ padding: '9px 14px', fontSize: 13 }}>{c.n}<div style={{ fontSize: 11, color: '#9ca3af' }}>{c.c || ''}</div></td>
                          <td style={{ padding: '9px 14px' }}><span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: sc[0], color: sc[1] }}>{c.seg}</span></td>
                          <td style={{ padding: '9px 14px' }}><span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#eef2f7', color: '#475569' }}>{c.o}</span></td>
                          <td style={{ padding: '9px 14px', fontSize: 13 }}>{c.p}</td>
                          <td style={{ padding: '9px 14px' }}>
                            <select value={s} onChange={function (e) { setW(c.w, e.target.value); }} style={{ fontSize: 11, padding: '3px 6px', border: '1px solid #e5e7eb', borderRadius: 7 }}>
                              {Object.keys(ESTADOS).map(function (v) { return <option key={v} value={v}>{ESTADOS[v]}</option>; })}
                            </select>
                          </td>
                          <td style={{ padding: '9px 14px' }}><a href={wa(c)} target="_blank" rel="noreferrer" onClick={function () { marcarEnviado(c.w); }} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 10px', fontSize: 12, color: '#075E54', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>WhatsApp {'→'}</a></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
      {paquetes.length === 0 && <div style={{ color: '#9ca3af', fontSize: 14, padding: 20, textAlign: 'center' }}>No hay contactos con estos filtros.</div>}
    </div>
  );
}
