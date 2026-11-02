/**
 * Emergency and reporting contacts. Every number here was copied from the official page in `source`
 * and checked on VERIFIED_ON. Do not add a number without an official source link.
 */
export const VERIFIED_ON = '2026-10-27';

export interface Contact { name: string; what: string; lines: { label: string; value: string; tel?: string }[]; source: { label: string; href: string } }

const MINT = { label: 'Ministry of the Interior: contact page (emergency numbers)', href: 'https://mint.gov.gh/public/contact' };

export const NATIONAL: Contact[] = [
  { name: 'Ghana Police Service', what: 'Crime in progress, threats to life, any police emergency.',
    lines: [{ label: 'Emergency (toll-free, all networks)', value: '191', tel: '191' }, { label: 'Toll-free (MTN and Telecel, formerly Vodafone)', value: '18555', tel: '18555' }], source: MINT },
  { name: 'Emergency Response Centre (GIFEC)', what: 'National emergency line.', lines: [{ label: 'Emergency', value: '112', tel: '112' }], source: MINT },
  { name: 'National Ambulance Service', what: 'Medical emergencies and injured people.', lines: [{ label: 'Ambulance', value: '193', tel: '193' }], source: MINT },
  { name: 'Ghana National Fire Service', what: 'Fires and rescues.', lines: [{ label: 'Fire (toll-free, all networks)', value: '192', tel: '192' }, { label: 'Alternative', value: '0299 340 383', tel: '+233299340383' }], source: MINT },
  { name: 'National Disaster Management Organisation (NADMO)', what: 'Floods, building collapses and other disasters.', lines: [{ label: 'NADMO', value: '0299 350 030', tel: '+233299350030' }], source: MINT },
];

export const SPECIALIST: Contact[] = [
  { name: 'Domestic Violence and Victim Support Unit (DOVVSU), Ghana Police', what: 'Domestic violence, abuse of women and children, sexual offences.',
    lines: [{ label: 'DOVVSU helpline', value: '055 100 0900', tel: '+233551000900' }],
    source: { label: 'Ghana Police Service: DOVVSU', href: 'https://police.gov.gh/en/index.php/domestic-violence-victims-support-unit-dovvsu/' } },
  { name: 'Cyber Security Authority (CSA), CERT-GH', what: 'Online fraud, MoMo scams, hacked accounts, sextortion. 24-hour reporting.',
    lines: [{ label: 'Call or SMS', value: '292', tel: '292' }, { label: 'WhatsApp', value: '050 160 3111' }, { label: 'Email', value: 'report@csa.gov.gh' }],
    source: { label: 'Cyber Security Authority: report an incident', href: 'https://csa.gov.gh/report' } },
  { name: 'Ghana Police Cybercrime Unit (CID)', what: 'Criminal complaints about cybercrime, made through the police.',
    lines: [{ label: 'Police helpline', value: '18555 or 191', tel: '18555' }],
    source: { label: 'Ghana Police Service: Cyber Crime Unit', href: 'https://police.gov.gh/en/index.php/cyber-crime/' } },
  { name: 'Economic and Organised Crime Office (EOCO)', what: 'Fraud against the state, money laundering, organised crime, human trafficking.',
    lines: [{ label: 'Hotline (24 hours)', value: '0800 911 911', tel: '0800911911' }, { label: 'Phone', value: '0547 419 419', tel: '+233547419419' }, { label: 'Email', value: 'eoco@eoco.gov.gh' }],
    source: { label: 'EOCO: report a crime', href: 'https://www.eoco.gov.gh/resources/report-a-crime' } },
  { name: 'Narcotics Control Commission (NACOC)', what: 'Drug trafficking and suspected drug activity. Reports are confidential.',
    lines: [{ label: 'Toll-free hotline', value: '0800 307 307', tel: '0800307307' }, { label: 'Anonymous line', value: '0302 761 028', tel: '+233302761028' }],
    source: { label: 'Narcotics Control Commission: wanted persons and FAQ', href: 'https://www.ncc.gov.gh/wanted-persons/' } },
];

export interface RegionalCommand { name: string; url: string; location: string | null; phones: string[]; emails: string[]; digitalAddress: string | null }

/** Police regional commands, as listed on police.gov.gh (phone numbers only where the page gives them). */
export const POLICE_REGIONS: RegionalCommand[] = [
  { name: "Accra", url: "https://police.gov.gh/en/index.php/accra-region/", location: "Accra Central, near Tudu and Kantamanto", phones: ["0299200000", "0302773906", "0302787373"], emails: ["ar.pro@police.gov.gh"], digitalAddress: "GH-GA141-2554" },
  { name: "Ashanti", url: "https://police.gov.gh/en/index.php/ashanti-region/", location: "Adum-Central, Kumasi", phones: ["0299207770", "0299292240", "0291205876"], emails: ["ash.pro@police.gov.gh"], digitalAddress: null },
  { name: "Ashanti North", url: "https://police.gov.gh/en/index.php/ashanti-north-region/", location: "Ashanti-Mampong", phones: [], emails: [], digitalAddress: null },
  { name: "Ashanti South", url: "https://police.gov.gh/en/index.php/ashanti-south-region/", location: "Bekwai", phones: ["0322193011"], emails: [], digitalAddress: "AD-0016-3773" },
  { name: "Ahafo", url: "https://police.gov.gh/en/index.php/brong-ahafo/", location: "Goaso", phones: ["0291213225", "0292290145", "0299206307", "0299204475"], emails: ["goasoreghqrs@gmail.com"], digitalAddress: "BS-0003-8530" },
  { name: "Bono", url: "https://police.gov.gh/en/index.php/bono/", location: "Sunyani, Area 4 near Sunyani Polytechnic", phones: [], emails: ["bar.pro@police.gov.gh"], digitalAddress: "BS-0022-2889" },
  { name: "Bono East", url: "https://police.gov.gh/en/index.php/bono-east/", location: "Techiman, Hansua Brigade", phones: [], emails: ["bonoeastregiontechiman@gmail.com"], digitalAddress: "BT-0148-6790" },
  { name: "Central", url: "https://police.gov.gh/en/index.php/central-region/", location: null, phones: [], emails: ["cr.pro@police.gov.gh"], digitalAddress: null },
  { name: "Central East", url: "https://police.gov.gh/en/index.php/central-east-region/", location: "Kasoa", phones: [], emails: [], digitalAddress: null },
  { name: "Central North", url: "https://police.gov.gh/en/index.php/central-north-region/", location: "Assin Fosu", phones: [], emails: [], digitalAddress: null },
  { name: "Eastern", url: "https://police.gov.gh/en/index.php/eastern-region-2/", location: "Koforidua, Adweso Estate", phones: [], emails: ["er.pro@police.gov.gh"], digitalAddress: null },
  { name: "Eastern North", url: "https://police.gov.gh/en/index.php/eastern-north-region/", location: "Mpraeso", phones: [], emails: [], digitalAddress: null },
  { name: "Eastern South", url: "https://police.gov.gh/en/index.php/eastern-south-region/", location: "Kibi", phones: [], emails: [], digitalAddress: null },
  { name: "North East", url: "https://police.gov.gh/en/index.php/north-east/", location: "Nalerigu, near the Baptist Medical Centre", phones: [], emails: ["northeastregionhr@gmail.com"], digitalAddress: null },
  { name: "Northern", url: "https://police.gov.gh/en/index.php/northern-region/", location: "Tamale, Tishigu", phones: [], emails: ["nr.pro@police.gov.gh"], digitalAddress: null },
  { name: "Oti", url: "https://police.gov.gh/en/index.php/oti/", location: "Dambai, Banka, near the Fire Service Office", phones: [], emails: ["rhqoti@gmail.com"], digitalAddress: null },
  { name: "Savannah", url: "https://police.gov.gh/en/index.php/savannah/", location: null, phones: [], emails: ["svrhqrs@gmail.com"], digitalAddress: null },
  { name: "Tema", url: "https://police.gov.gh/en/index.php/tema-region/", location: "Tema, Main Harbour and adjacent Long Room", phones: [], emails: ["tr.pro@police.gov.gh"], digitalAddress: null },
  { name: "Upper East", url: "https://police.gov.gh/en/index.php/upper-east/", location: "Damweon, Bolga", phones: [], emails: [], digitalAddress: null },
  { name: "Upper West", url: "https://police.gov.gh/en/index.php/upper-west/", location: "Wa, near the Wa Circuit Court", phones: [], emails: ["uwr.pro@police.gov.gh"], digitalAddress: null },
  { name: "Volta", url: "https://police.gov.gh/en/index.php/volta-region/", location: "Ho, Lokoe", phones: [], emails: ["rhqhopolice@gmail.com"], digitalAddress: "VH-0037-4771" },
  { name: "Volta North", url: "https://police.gov.gh/en/index.php/volta-north-region/", location: "Hohoe", phones: [], emails: [], digitalAddress: null },
  { name: "Western", url: "https://police.gov.gh/en/index.php/western-region/", location: "Sekondi Takoradi near the State Transport Metro Bus Station and West Africa Examination council", phones: [], emails: ["wr.pro@police.gov.gh"], digitalAddress: null },
  { name: "Western North", url: "https://police.gov.gh/en/index.php/western-north/", location: "Sehwi-Wiaso, Susumenepah, old library, opposite the Electoral Commission\u2019s office", phones: [], emails: ["westernnorthpolicehq@gmail.com"], digitalAddress: null },
  { name: "Western Central", url: "https://police.gov.gh/en/index.php/western-central-region/", location: null, phones: [], emails: [], digitalAddress: null },
];
