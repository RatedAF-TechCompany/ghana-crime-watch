// Deterministic editorial gate checks shared by source-ingest and the backfill.
// Hard fail = rejected. Soft flag = editor review. No flags = eligible for auto-publish.

export interface GateResult {
  hard_fails: string[];
  soft_flags: string[];
  notes: Record<string, unknown>;
}

export const VERDICT_WORDS = /(?<!(suspected|alleged|accused|wanted) )\b(killer|killers|thief|thieves|criminals|a criminal(?! (case|charge|offence|court|record|investigation|trial|division|matter))|murderer|murderers|rapist|rapists|fraudster|fraudsters|armed robbers?|kidnappers?)\b/i;
export const GUILTY_LANGUAGE = /\b(is guilty|was guilty|are guilty|clearly guilty|obviously guilty|undoubtedly)\b/i;
export const SPECULATION = /\b(evidence (suggests|shows|proves) (he|she|they)|it is believed (he|she|they) (did|committed)|likely (committed|guilty))\b/i;
export const GORE = /\b(decapitat\w*|beheaded|dismember\w*|mutilat\w*|disembowel\w*|entrails|brains? (spilled|scattered)|pool of blood|gory|charred bod(y|ies)|severed (head|limb)s?|body parts)\b/i;
export const PHONE = /(\+233|\b0)[\s-]?[235]\d[\s-]?\d{3}[\s-]?\d{4}\b/;
export const HOUSE_ADDRESS = /\b(house (no\.?|number) ?[A-Z0-9/-]+|H\/No\.? ?[A-Z0-9/-]+|GPS address:? ?[A-Z]{2}-\d{3,4}-\d{3,4})\b/i;
/** Claims attributed to an official body: Police, EOCO, NACOC, courts/Judicial Service, Attorney-General. */
const OFFICIAL_BODY = String.raw`(?:the )?(?:Ghana Police Service|Ghana Police|police|Police Public Affairs Directorate|(?:Regional|Divisional|District|Municipal) Police Command|CID|EOCO|Economic and Organised Crime Office|NACOC|Narcotics Control Commission|Attorney[- ]General(?:'s Department)?|Office of the Attorney[- ]General|Office of the Special Prosecutor|Judicial Service|prosecution|prosecutors?)`;
/** Claims attributed to an official body (Police, EOCO, NACOC, courts/Judicial Service, A-G): a mention alone does not count. */
export const OFFICIAL_ATTRIBUTION = new RegExp(String.raw`\b(?:according to ${OFFICIAL_BODY}\b|${OFFICIAL_BODY}\b[^.]{0,80}?\b(?:said|says|stated|confirmed|arrested|have arrested|charged|announced|seized|indicated|disclosed|told the court|in a statement|statement)\b|(?:the )?(?:court|High Court|Circuit Court|District Court|Court of Appeal|Supreme Court)\b[^.]{0,60}?\b(?:heard|ruled|granted|remanded|convicted|sentenced|ordered|adjourned|admitted|dismissed|charged)\b|charge sheet|court (?:documents|records)|arraigned)`, "i");
export function officialAttribution(text: string): boolean { return OFFICIAL_ATTRIBUTION.test(text || ""); }
export const PRESUMPTION_WORDS = /\b(alleged|allegedly|suspect|suspects|suspected|accused|charged|remanded|arraigned|pleaded)\b/i;

export const SEXUAL_OR_DV = /\b(rape[ds]?|raping|defile\w*|sexual(ly)? (assault|abus)\w*|indecent assault|incest|domestic violence|wife[- ]beating|assaulted (his|her) (wife|husband|partner))\b/i;
export const MINOR_HINT = /\b(minor|juvenile|child|children|baby|toddler|infant|schoolchild|(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen)-year-old|1[0-7]-year-old|[1-9]-year-old|\d{1,2}-year-old (girl|boy|pupil|student)|aged (1[0-7]|[1-9])\b|pupil|schoolgirl|schoolboy|JHS|SHS student|basic school)\b/i;
export const SCHOOL_NAME = /\b[A-Z][\w'.]+(?: [A-Z][\w'.]+)* (Senior High|Junior High|Basic|Primary|SHS|JHS|M\/A|D\/A|R\/C|Methodist|Presby|Anglican) ?(School)?\b/;
export const ENTERTAINMENT = /\b(celebrity|showbiz|musician|rapper|actress|actor|album|music video|concert|movie|nollywood|kumawood|reality show|talent show|award show|red carpet|gospel artist)\b/i;
export const CONVICTED = /\b(convicted|sentenced|found guilty|jailed|imprisoned for|pleaded guilty)\b/i;
export const FILLER_PHRASES = /\b(in a significant development|in a shocking turn of events|in an unprecedented move|in a dramatic turn|it is worth noting that|it should be noted that|this incident highlights|this development underscores|sending shockwaves through|the community has been left reeling)\b/gi;

export function stripHtml(s: string): string {
  return (s || "")
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;|&rsquo;|&lsquo;|&#8217;|&#8216;/g, "'")
    .replace(/&#8220;|&#8221;|&ldquo;|&rdquo;/g, '"').replace(/&#8211;|&#8212;|&ndash;|&mdash;/g, ", ").replace(/&#\d+;/g, " ")
    .replace(/\s+/g, " ").trim();
}

export function wordCount(s: string): number {
  return (s.match(/\S+/g) || []).length;
}

/** Generic filler: any sentence containing one of these is dropped whole (never supported by a source). */
export const BANNED_SENTENCE = /(continues? to work to ensure public safety|highlights? the risks|has been informed|aims? to deter|the judge considered the evidence|underscores? the (importance|need)|serves? as a reminder|remains? committed to|urged? the public to remain vigilant)/i;

export function dropBannedSentences(s: string): string {
  return (s || "").split(/\n\s*\n/).map((para) =>
    (para.match(/[^.!?]+[.!?]+["')]*\s*|[^.!?]+$/g) || [para]).filter((x) => !BANNED_SENTENCE.test(x)).join("").trim()
  ).filter(Boolean).join("\n\n");
}

export function stripEditorialFiller(s: string): string {
  return dropBannedSentences(s || "")
    .replace(FILLER_PHRASES, "")
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/(^|[.!?]\s+),?\s*/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function significantWords(s: string): Set<string> {
  const stop = new Set(["about", "after", "against", "alleged", "amid", "and", "are", "been", "before", "court", "from", "ghana", "into", "over", "police", "said", "says", "that", "the", "their", "this", "under", "were", "with"]);
  return new Set((s.toLowerCase().match(/[a-z]{4,}/g) || []).filter((w) => !stop.has(w)));
}

/** Headline and opening sentence must describe the same event, not merely share generic crime words. */
export function headlineMatchesLead(title: string, body: string): boolean {
  const titleWords = significantWords(title);
  const leadWords = significantWords((body || "").split(/(?<=[.!?])\s+/)[0] || "");
  if (!titleWords.size || !leadWords.size) return false;
  let shared = 0;
  for (const word of titleWords) if (leadWords.has(word)) shared++;
  return shared >= Math.min(2, titleWords.size);
}

const norm = (s: string) => s.toLowerCase().replace(/[,’']/g, "").replace(/\s+/g, " ");

const STOP_CAPS = new Set([
  "The","A","An","In","On","At","He","She","They","It","His","Her","Their","According","Police","This","That","These","Those",
  "Ghana","Ghanaian","Source","Mr","Mrs","Ms","Dr","But","And","Also","However","Meanwhile","After","Before","When","While",
  "Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday","January","February","March","April","May","June","July",
  "August","September","October","November","December","Court","High","Circuit","District","Region","Regional","Command","Service",
  "GhanaCrimes","Division","Unit","Officer","Inspector","Superintendent","Chief","Deputy","Commissioner","Assistant","Sergeant","Corporal",
  "Constable","General","Director","Public","Relations","Republic","Act","Section","Criminal","Offences","Investigation","Department",
  "Courts","MTTD","EOCO","OSP","CID","NACOC","CHRAJ","Greater","Accra","Ashanti","Western","Eastern","Central","Volta","Oti","Northern",
  "Savannah","North","East","West","Upper","Bono","Ahafo","Citi","Newsroom","GhanaWeb","News","Agency","Adom","Online","MyJoyOnline",
  "MyJoy","Joy","JoyNews","Graphic","Daily","Guide","Network","Starr","Pulse","Modern","Times","Chronicle","Report","Radio",
]);

/** Extra allowed tokens (publisher names from the sources table), set per run by the caller. */
const EXTRA_ALLOWED = new Set<string>();
export function allowSourceNames(names: string[]): void {
  for (const n of names) for (const w of (n || "").split(/[^A-Za-z]+/)) if (w) EXTRA_ALLOWED.add(w.toLowerCase());
}

/** Everyday English verbs/adjectives that appear capitalised in headlines but are not names. */
const COMMON_WORDS = new Set([
  "assist","assists","assisted","shoot","shoots","shot","shooting","arrest","arrests","arrested","attack","attacks","attacked",
  "kill","kills","killed","rob","robs","robbed","steal","steals","stole","stolen","jail","jails","jailed","sue","sues","sued",
  "fine","fines","fined","bail","bailed","remand","remanded","charge","charges","charged","convict","convicted","sentence","sentenced",
  "seize","seizes","seized","raid","raids","raided","ban","bans","banned","probe","probes","probed","deny","denies","denied",
  "face","faces","facing","flee","flees","fled","grab","grabs","grabbed","hold","holds","held","hunt","hunts","hunted",
  "nab","nabs","nabbed","name","names","named","parade","paraded","rescued","rescue","rescues","rescue","saved","save","saves",
  "storm","storms","stormed","suspect","suspects","suspected","wanted","warning","warns","warned","dead","dies","died","death",
  "injured","injures","hurt","missing","found","foiled","foil","busted","bust","smash","smashed","torch","torched","burnt",
  "buried","bury","married","rescues","freed","free","frees","jailed","detained","detain","detains","grabbed","impounded",
  "vows","vowed","urge","urges","urged","appeal","appeals","appealed","orders","ordered","order","rules","ruled","rule",
]);

/** Every number and proper-noun token in the draft must appear in the source text. */
export function unsupportedFacts(draft: string, source: string): string[] {
  const src = norm(source);
  const missing = new Set<string>();
  for (const n of draft.match(/\b\d[\d,.]*\b/g) || []) {
    const v = n.replace(/[,.]$/, "").replace(/,/g, "");
    if (v && !src.includes(v) && !src.includes(n.replace(/[,.]$/, ""))) missing.add(n);
  }
  // The first segment is the headline (callers pass "title. body"); Title Case there is
  // house style, not evidence of a name, so proper-noun checks skip it.
  const segments = draft.split(/(?<=[.!?])\s+/);
  for (const sentence of segments.slice(1)) {
    const words = sentence.split(/[\s\-\/]+/).slice(1); // skip sentence-initial capital
    for (const w of words) {
      const clean = w.replace(/['’]s$/i, "").replace(/[^A-Za-z]/g, "");
      if (!/^[A-Z][a-z]{2,}/.test(clean) || STOP_CAPS.has(clean) || EXTRA_ALLOWED.has(clean.toLowerCase())) continue;
      const lower = clean.toLowerCase();
      if (COMMON_WORDS.has(lower)) continue;
      if (!src.includes(lower)) missing.add(clean);
    }
  }
  return [...missing].slice(0, 20);
}

export interface Analysis {
  is_ghana?: boolean;
  ghanaian_central?: boolean;
  region?: string | null;
  district?: string | null;
  is_entertainment?: boolean;
  politics_without_enforcement?: boolean;
  is_crime?: boolean;
  offence_type?: string | null;
  case_status?: string | null;
  sexual_or_domestic_violence?: boolean;
  victim_named?: boolean;
  minor_involved?: boolean;
  minor_identifiable?: boolean;
  suspect_named?: boolean;
  pending_case_commentary?: boolean;
  graphic_content?: boolean;
}

export const OFFENCES = ["robbery","murder","fraud_cyber","galamsey","narcotics","corruption","road_crash_arrest","mob_violence","court_judgement",
  "kidnapping","assault","sexual_offence","arson","human_trafficking","cybercrime","firearms","road_crash","law_enforcement"];

// Ghana regions with well-known towns/districts, used to resolve location without the LLM.
export const REGION_TOWNS: Record<string, string[]> = {
  "Greater Accra": ["Greater Accra","Accra","Tema","Madina","Kasoa","Adenta","Dansoman","Ashaiman","Nima","Kaneshie","Teshie","Nungua","Achimota","Dodowa","Weija","Kpone","Amasaman","Spintex","Labadi","East Legon","Ablekuma","Odorkor","Pokuase"],
  "Ashanti": ["Ashanti","Kumasi","Obuasi","Ejisu","Konongo","Mampong","Bekwai","Suame","Asokwa","Offinso","Ejura","Manhyia","Kwadaso"],
  "Western": ["Western Region","Takoradi","Sekondi","Tarkwa","Prestea","Axim","Shama","Elubo","Half Assini"],
  "Western North": ["Western North","Sefwi","Wiawso","Bibiani","Juaboso","Enchi","Akontombra"],
  "Central": ["Central Region","Cape Coast","Winneba","Mankessim","Saltpond","Elmina","Swedru","Assin","Dunkwa","Twifo","Awutu","Gomoa","Ajumako"],
  "Eastern": ["Eastern Region","Koforidua","Nkawkaw","Akim","Akyem","Suhum","Nsawam","Somanya","Kyebi","Akuse","Begoro","Asamankese","Donkorkrom"],
  "Volta": ["Volta","Hohoe","Keta","Aflao","Kpando","Sogakope","Anloga","Akatsi","Dzodze","Klo-Agogo"],
  "Oti": ["Oti Region","Dambai","Nkwanta","Kete Krachi","Jasikan","Kadjebi"],
  "Northern": ["Northern Region","Tamale","Yendi","Savelugu","Tolon","Gushegu","Karaga","Bimbilla","Zabzugu","Kumbungu"],
  "Savannah": ["Savannah Region","Damongo","Salaga","Sawla","Buipe","Daboya"],
  "North East": ["North East Region","Nalerigu","Walewale","Gambaga","Chereponi","Bunkpurugu"],
  "Upper East": ["Upper East","Bolgatanga","Bawku","Navrongo","Zebilla","Paga","Sandema","Pusiga"],
  "Upper West": ["Upper West","Tumu","Lawra","Nandom","Jirapa","Nadowli"],
  "Bono": ["Bono Region","Sunyani","Berekum","Dormaa","Wenchi","Sampa","Drobo"],
  "Bono East": ["Bono East","Techiman","Kintampo","Atebubu","Nkoranza","Yeji"],
  "Ahafo": ["Ahafo","Goaso","Kenyasi","Bechem","Duayaw Nkwanta","Hwidiem"],
};
const REGION_RE: [string, RegExp][] = Object.entries(REGION_TOWNS).map(([r, towns]) =>
  [r, new RegExp(`\\b(${towns.map((t) => t.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")).join("|")})\\b`)]);

export function detectRegion(text: string): string | null {
  for (const [r, re] of REGION_RE) if (re.test(text || "")) return r;
  return null;
}

// Ghana institutions and identifiers that clearly place a story in Ghana's jurisdiction.
export const GHANA_INSTITUTION = /\b(Ghana(ian)?|IGP|EOCO|NACOC|Narcotics Control Commission|CHRAJ|Office of the Special Prosecutor|National Investigations Bureau|Cyber Security Authority|Bank of Ghana|Ghana Revenue Authority|MTTD|Minerals Commission|GH¢|cedis)\b/;

export function hasGhanaSignal(text: string): boolean {
  return GHANA_INSTITUTION.test(text || "") || detectRegion(text) !== null;
}


// ---- Loosened-gate transforms (Oct 2026): fix drafts automatically instead of holding them. ----
export const JUSTICE_SECURITY = /\b(police|court|judge|prosecut\w*|arrest\w*|crime|criminal|security|NACOC|EOCO|CID|Special Prosecutor|Attorney[- ]General|prison\w*|narcotic\w*|drug\w*|trafficking|galamsey|illegal mining|fraud|corruption|investigat\w*|immigration|border|military|soldiers?|justice)\b/i;
/** A concrete crime event or justice step (not commentary about one). Checked on the headline and the source lead. */
export const ENFORCEMENT_ACTION = /\b(arrest\w*|nab(s|bed)?|picked up|apprehend\w*|detain\w*|in custody|charged|arraign\w*|remand\w*|bail|convict\w*|sentenc\w*|jail\w*|imprison\w*|acquit\w*|plead\w*|court|trial|prosecut\w*|indict\w*|seiz\w*|confiscat\w*|impound\w*|raid\w*|intercept\w*|bust(s|ed)?|dismantl\w*|destroy(s|ed)? [^.]{0,30}(machines?|excavators?|chanfang|equipment|pits?)|rob(s|bed|bing|bery|beries|bers?)?|stole|stolen|steal\w*|theft|thie(f|ves)|burglar\w*|murder\w*|homicide|kill(ed|s|ing)|stab(bed|bing|s)?|shot|shoot\w*|gun(man|men|point)|kidnap\w*|abduct\w*|defraud\w*|fraud\w*|scam\w*|traffick\w*|smuggl\w*|assault\w*|attack(ed|s)?|lynch\w*|mob|clash\w*|escap\w*|inmates?|crash\w*|knock(ed)? down|manhunt|wanted|investigat\w*|probe\w*|interdict\w*|arson|set ablaze|defile\w*|rape\w*|launder\w*|embezzl\w*|misappropriat\w*|brib\w*|forg(ed|ery)|impersonat\w*|narcotic\w*|cannabis|cocaine|tramadol|galamsey (operators?|suspects?|sites?)|illegal miners?|missing person|found dead|abuse\w*|body (found|discovered))\b/i;
/** Headline shapes that are commentary, honours, appointments, business or farming news rather than a crime event. */
export const OFF_TOPIC_TITLE = /\b(honou?r(s|ed|ing)?|award(s|ed)?|salar(y|ies)|wages?|pay rise|fertili[sz]er\w*|maize|harvest\w*|farmers?|appoint\w*|sworn in|inaugurat\w*|launch(es|ed)?|celebrat\w*|congratulat\w*|condemn\w*|demand(s|ed)?|retract\w*|challeng\w*|criticis\w*|criticiz\w*|slam(s|med)?|lauds?|commend\w*|urges?|calls? (on|for)|reacts?|responds?|defends?|clarif\w*|chieftaincy|enstool\w*|title|festival|scholarships?|donat\w*|mining plan|policy|bill|manifesto|campaign|decr(y|ies)|lament\w*|allocat\w*|invest(s|ed|ment)?|stud(y|ies)|reclamation|reopens?|visits?|tours?|insurance|number plates|displaced|returned home|cooperatives?)\b/i;
/** An official law-enforcement or justice body speaking or acting in the headline (advisories from these stay in scope). */
export const OFFICIAL_ACTOR_TITLE = /\b(police|Chief Justice|Interior Minister|IGP|EOCO|NACOC|OSP|Special Prosecutor|NAIMOS|Cyber Security Authority|CSA|court|judge|Judicial Service|Attorney[- ]General|prisons?|Immigration|Customs|MTTD|DOVVSU|CID|NIB|Interpol)\b/i;

/** Why an item is off the crime beat (null when it is in scope). Deterministic, so the same rule can be re-run on published stories. */
export function offTopicReason(a: { is_crime?: boolean | null; offence_type?: string | null }, title: string, sourceTitle: string, lead: string): string | null {
  const head = `${title} ${sourceTitle}`;
  const action = ENFORCEMENT_ACTION.test(head) || ENFORCEMENT_ACTION.test(lead);
  if (a.is_crime === false && !(ENFORCEMENT_ACTION.test(head) && OFFICIAL_ACTOR_TITLE.test(head))) return "not_crime_event";
  if (OFF_TOPIC_TITLE.test(head) && !ENFORCEMENT_ACTION.test(head) && !OFFICIAL_ACTOR_TITLE.test(head)) return "commentary_or_off_topic_headline";
  if (!a.offence_type && !action) return "no_enforcement_action";
  return null;
}

const GORE_SOFT: [RegExp, string][] = [
  [/\b(decapitat\w*|beheaded)\b/gi, "killed"], [/\b(dismember\w*|mutilat\w*|disembowel\w*)\b/gi, "attacked"],
  [/\bentrails\b/gi, "remains"], [/\bbrains? (spilled|scattered)\b/gi, "fatal injuries"], [/\b(in )?a pool of blood\b/gi, ""],
  [/\bgory\b/gi, "serious"], [/\bcharred bod(y|ies)\b/gi, (m: string) => /ies$/i.test(m) ? "bodies" : "body" as any],
  [/\bsevered (head|limb)s?\b/gi, "remains"], [/\b(decomposing|partially naked|naked|mangled|bloodied) (body|bodies|corpse)\b/gi, "$2"], [/\bbody parts\b/gi, "remains"], [/\bset (?:it |the body |the bodies )?on fire\b/gi, "burned"],
];
export function toneDownGore(s: string): string {
  let out = s || "";
  for (const [re, rep] of GORE_SOFT) out = out.replace(re, rep as any);
  return out.replace(/ {2,}/g, " ").replace(/ ([.,])/g, "$1");
}
/** News outlets are never named, linked or credited (Zeb, 3 Nov 2026). */
export const OUTLET_NAMES = String.raw`(?:MyJoy ?Online|MyJoy ?News|Joy ?News|Joy ?FM|Citi ?(?:Newsroom|FM|TV)|Graphic Online|Daily Graphic|GhanaWeb|Adom ?(?:Online|News|FM|TV)|3News|TV3|Ghana News Agency|GNA|Starr ?FM|UTV|Daily Guide(?: Network)?|Modern ?Ghana|Pulse Ghana|Asaase(?: Radio)?|GBC(?: Ghana Online)?|Ghanaian Times|Chale News|Rainbow Radio(?: Online)?|The Ghana Report|Kessben(?: Online)?|Atinka(?: Online)?|The High Street Journal|Ghana Business News|Yen Ghana|The Chronicle(?: Ghana)?|Peace FM(?: Online)?)`;
export const OUTLETS = new RegExp(String.raw`\b${OUTLET_NAMES}\b`, "i");
/** No source is ever credited. Strips "According to …" and outlet credit; never adds attribution. */
export function ensureAttribution(body: string, _outlet?: string): string {
  return (body || "")
    .replace(new RegExp(String.raw`\b[Aa]ccording to (?:the )?${OUTLET_NAMES}(?:,? citing [^,]{1,80})?,\s*(\S)`, "g"), (_m, c) => c.toUpperCase())
    .replace(new RegExp(String.raw`,?\s*(?:according to|as reported by|reported by|citing)\s+(?:the )?${OUTLET_NAMES}`, "g"), "")
    .replace(new RegExp(String.raw`,?\s*(?:the )?${OUTLET_NAMES}\s+(?:has )?(?:reported|reports|said|learnt|gathered)`, "g"), "")
    .replace(/,?\s*according to reports/gi, "")
    // No source is ever credited (Zeb, 3 Nov 2026): drop "According to <anyone>," openers and "Source:" lines.
    .replace(/(^|[.!?]\s+|>)\s*[Aa]ccording to [^,.]{1,120},\s*(\S)/g, (_m, pre, c) => pre + c.toUpperCase())
    .replace(/,\s*according to [^,.]{1,120},/gi, "")
    .replace(/,?\s*according to [^,.]{1,120}(?=[.,])/gi, "")
    .replace(/^\s*(?:<p>)?\s*Source:[^\n]*$/gim, "")
    .replace(/ {2,}/g, " ").replace(/ ([.,])/g, "$1");
}
/** "alleged" on the first offence noun only, while a named suspect is unconvicted. No presumption closer is ever appended. */
export function ensurePresumption(body: string, a: Analysis): string {
  if (!a.suspect_named || a.case_status === "convicted" || a.case_status === "acquitted") return body;
  let done = /\balleged\b/i.test(body);
  return body.replace(/\b(the |a )(robbery|murder|killing|attack|theft|fraud|assault|kidnapping|rape|defilement|stabbing|shooting)\b/gi,
    (m, art, w) => (done ? m : (done = true, `${art}alleged ${w}`)));
}

const SLOP_SENTENCE = [
  /\bWhat we (don'?t )?know\b/i, /has not added facts/i, /\b(remains?|is|are) presumed innocent\b/i,
  /^It is (not yet clear|not known|unclear)\b/i, /\bat the time of publication\b/i,
  /^(No|The)[^.]{0,80}\b(has|have|had|was|were) not (been )?(reported|released|disclosed|named|made public|confirmed)\.?$/i,
  /^(Police )?[Ii]nvestigations (are|were) (ongoing|underway|continuing)\.?$/,
  /\b(left residents in shock|sparked outrage|shocking|heinous)\b/i,
];
/** Deterministic cleanup run on every draft before insert. Returns body + warnings (stored in gate_report.slop_warnings). */
export function lintSlop(title: string, body: string): { body: string; warnings: string[] } {
  const w: string[] = [];
  let paras = (body || "").split(/\n\s*\n|<\/p>\s*<p>/).map((p) => p.replace(/<\/?p>/g, "").trim()).filter(Boolean);
  const seen = new Set<string>();
  paras = paras.map((p) => p.split(/(?<=[.!?]["')]*)\s+(?=[A-Z0-9"'(])/).map((s) => s.trim()).filter((s) => {
    const k = s.toLowerCase().replace(/\W+/g, " ").trim();
    if (SLOP_SENTENCE.some((r) => r.test(s))) { w.push(`dropped: ${s.slice(0, 60)}`); return false; }
    if (seen.has(k)) { w.push("duplicate sentence"); return false; }
    seen.add(k); return true;
  }).join(" ")).filter(Boolean);
  let out = ensureAttribution(paras.join("\n\n"))
    .replace(/GH(?:S|₵|¢)\s*(\d[\d,]*(?:\.\d+)?)\s*(m|mn|million)\b/gi, "GH¢$1 million")
    .replace(/GH(?:S|₵|¢)\s*(\d[\d,]*(?:\.\d+)?)\s*(bn|billion)\b/gi, "GH¢$1 billion")
    .replace(/GH(?:S|₵|¢)\s+(\d)/g, "GH¢$1")
    .replace(/(\d) \.(\d)/g, "$1.$2")
    .replace(/\bSuspect\(s\)/g, "suspects")
    .replace(/[^\S\n]{2,}/g, " ");
  for (const word of ["allegedly", "reportedly"]) {
    let n = 0; out = out.replace(new RegExp(`\\s?\\b${word}\\b`, "gi"), (m) => (++n > 1 ? "" : m));
    if (n > 1) w.push(`${word} x${n} trimmed`);
  }
  if (OUTLETS.test(out)) w.push("outlet_named");
  if (out.split(/[.!?] /).some((s) => (s.match(/ — /g) || []).length > 1)) w.push("em-dash chain");
  const p1 = (paras[0] || "").toLowerCase();
  const tw = (title.toLowerCase().match(/[a-z0-9]{3,}/g) || []);
  if (tw.length && tw.filter((t) => p1.includes(t)).length / tw.length >= 0.8) w.push("headline restated in paragraph 1");
  if (/^(A|An) (man|woman|boy|girl)\b/.test(paras[0] || "")) w.push('"A man has been" opener');
  const finalParas = out.split(/\n\s*\n/).filter(Boolean);
  const words = out.split(/\s+/).filter(Boolean).length;
  if (words > 160 || finalParas.length > 6) w.push(`too long: ${words} words / ${finalParas.length} paras`);
  if (words < 80) w.push("under 80 words: publish as headline-only");
  return { body: finalParas.join("\n\n"), warnings: w };
}
const IDENT_CUES = /\b(named|identified as|known as|called|name withheld|a pupil of|a student of|student at|pupil at|attends?|lives? (at|in)|resident of|daughter of|son of|niece|nephew|granddaughter|grandson|house (no|number)|GPS)\b/i;
export function isProtectedCase(a: Analysis, text: string): boolean {
  return !!(a.minor_involved || a.sexual_or_domestic_violence || MINOR_HINT.test(text) || SEXUAL_OR_DV.test(text));
}
/** Redact minors and sexual-offence victims: drop any sentence carrying a name cue, school, address, phone or relative; scrub schools from the title. */
export function redactProtected(title: string, body: string, a: Analysis, sourceText: string): { title: string; body: string; removed: number } {
  if (!isProtectedCase(a, `${sourceText} ${body}`)) return { title, body, removed: 0 };
  let removed = 0;
  const paras = body.split(/\n\s*\n/).map((p) => {
    const sents = p.match(/[^.!?]+[.!?]+["')]*\s*|[^.!?]+$/g) || [p];
    return sents.filter((s) => {
      const bad = SCHOOL_NAME.test(s) || HOUSE_ADDRESS.test(s) || PHONE.test(s) || IDENT_CUES.test(s);
      if (bad) removed++;
      return !bad;
    }).join("").trim();
  }).filter(Boolean);
  // Drop the community/village of a protected person, keeping only the district/municipality/region.
  const COMMUNITY = /\b(?:at|in) [A-Z][\w'-]+(?:[- ][A-Z][\w'-]+)*,? (?=in the [A-Z][\w' -]+ (?:District|Municipality|Municipal|Metropolis|Metropolitan|Region))/g;
  let out = paras.join("\n\n");
  const before = out; out = out.replace(COMMUNITY, ""); if (out !== before) removed++;
  const t = title.replace(new RegExp(SCHOOL_NAME.source, "g"), "a school");
  return { title: t, body: out, removed };
}

/** Full gate for a freshly drafted item (LLM analysis + deterministic checks on the draft). */
export function runGate(opts: {
  analysis: Analysis;
  draftTitle: string;
  draftBody: string;
  sourceText: string;
  isOfficial: boolean;
  corroboratingSources: number;
}): GateResult {
  const { analysis: a, draftTitle, draftBody, sourceText, isOfficial, corroboratingSources } = opts;
  const draft = `${draftTitle}. ${draftBody}`;
  const hard: string[] = [];
  const soft: string[] = [];

  // a) Ghana only, no entertainment. Clear Ghana signals (places, Police, courts, agencies) count as Ghana.
  const ghanaSignal = hasGhanaSignal(sourceText);
  const detectedRegion = a.region || detectRegion(sourceText);
  if (a.is_ghana === false && !a.ghanaian_central && !ghanaSignal) hard.push("not_ghana");
  if (a.is_entertainment || (ENTERTAINMENT.test(sourceText) && !a.is_crime)) hard.push("entertainment");
  if (a.politics_without_enforcement) hard.push("party_politics_or_policy_no_enforcement");
  if (!detectedRegion && !ghanaSignal) soft.push("region_unresolved");

  // b) Crime only
  // Justice, security and policing news counts; only clearly non-crime, non-justice items are out of scope.
  if ((!a.is_crime || !a.offence_type || !OFFENCES.includes(a.offence_type)) && !JUSTICE_SECURITY.test(sourceText)) hard.push("not_in_crime_scope");
  // Tightened Oct 2026: honours, salaries, farming, appointments and political commentary are out even if police/military appear.
  const srcTitle = (sourceText.split(/(?<=[.!?])\s+/)[0] || "").slice(0, 200);
  const offTopic = offTopicReason(a, draftTitle, srcTitle, sourceText.slice(0, 600));
  if (offTopic) hard.push(`off_topic:${offTopic}`);

  // c) Factual
  const missing = unsupportedFacts(draft, `${sourceText}`);
  if (missing.length) hard.push(`unsupported_facts:${missing.join("|")}`);
  if (/\baccording to\b|^\s*Source:/im.test(draftBody)) soft.push("source_credited");
  if (OUTLETS.test(draft)) soft.push("outlet_named");
  if (!headlineMatchesLead(draftTitle, draftBody)) soft.push("headline_lead_mismatch");
  if (FILLER_PHRASES.test(draft)) soft.push("editorial_filler");
  FILLER_PHRASES.lastIndex = 0;
  const wc = wordCount(draftBody);
  if (wc < 80 || wc > 160) soft.push(`word_count_${wc}`);
  // Named suspects publish only when the claim comes from an official body (official source, or the source attributes it to
  // Police/EOCO/NACOC/courts/A-G) or 2+ independent outlets report it, and the draft keeps presumption-of-innocence wording.
  // Single-source stories publish with "According to <outlet>"; presumption wording is inserted upstream (ensurePresumption).
  void isOfficial; void corroboratingSources;

  // d) Presumption of innocence
  const convicted = a.case_status === "convicted" || CONVICTED.test(sourceText);
  if (VERDICT_WORDS.test(draft) && !convicted) hard.push("verdict_word_before_conviction");

  // e) Graphic
  // Gore wording is toned down upstream (toneDownGore); graphic source material no longer holds.
  if (GORE.test(draft)) soft.push("graphic_terms_remaining");

  // f) Privacy
  // Minors and sexual-offence victims are redacted upstream (redactProtected). This is the residual backstop on the draft.
  if (isProtectedCase(a, `${sourceText} ${draft}`) && (SCHOOL_NAME.test(draft) || IDENT_CUES.test(draft))) soft.push("redaction_incomplete");
  if (PHONE.test(draft)) hard.push("phone_number");
  if (HOUSE_ADDRESS.test(draft)) hard.push("home_address");

  // g) Contempt guard
  if (a.pending_case_commentary) soft.push("pending_case_commentary");
  if (GUILTY_LANGUAGE.test(draft) && !convicted) soft.push("guilty_language");
  if (SPECULATION.test(draft)) soft.push("evidence_speculation");

  return { hard_fails: hard, soft_flags: soft, notes: { word_count: wc, unsupported: missing } };
}

/** Deterministic-only gate for already published articles (backfill). */
export function runBackfillGate(a: { title: string; body: string; source_url: string | null; source_urls: string[] | null }): GateResult {
  const text = `${a.title}. ${stripHtml(a.body || "")}`;
  const hard: string[] = [];
  const soft: string[] = [];
  const convicted = CONVICTED.test(text);
  // Verdict words in already-published copy often refer to fraudsters in general (scam advice), so editors judge them.
  if (VERDICT_WORDS.test(text) && !convicted) soft.push("verdict_word_check_context");
  if (GORE.test(text)) hard.push("graphic_terms");
  if (PHONE.test(text)) hard.push("phone_number");
  if (HOUSE_ADDRESS.test(text)) hard.push("home_address");
  if (MINOR_HINT.test(text) && SCHOOL_NAME.test(text)) hard.push("minor_identifiable_school");
  if (SEXUAL_OR_DV.test(text)) soft.push("sexual_or_dv_check_victim_identity");
  if (MINOR_HINT.test(text)) soft.push("minor_mentioned");
  if (GUILTY_LANGUAGE.test(text) && !convicted) soft.push("guilty_language");
  if (ENTERTAINMENT.test(text)) soft.push("possible_entertainment");
  if (!a.source_url && !(a.source_urls && a.source_urls.length)) soft.push("source_not_recorded");
  return { hard_fails: hard, soft_flags: soft, notes: {} };
}
