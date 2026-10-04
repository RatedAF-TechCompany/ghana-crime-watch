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
export const SEXUAL_OR_DV = /\b(rape[ds]?|raping|defile\w*|sexual(ly)? (assault|abus)\w*|indecent assault|incest|domestic violence|wife[- ]beating|assaulted (his|her) (wife|husband|partner))\b/i;
export const MINOR_HINT = /\b(minor|juvenile|\d{1,2}-year-old (girl|boy|pupil|student)|aged (1[0-7]|[1-9])\b|pupil|schoolgirl|schoolboy|JHS|SHS student|basic school)\b/i;
export const SCHOOL_NAME = /\b[A-Z][\w'.]+(?: [A-Z][\w'.]+)* (Senior High|Junior High|Basic|Primary|SHS|JHS|M\/A|D\/A|R\/C|Methodist|Presby|Anglican) ?(School)?\b/;
export const ENTERTAINMENT = /\b(celebrity|showbiz|musician|rapper|actress|actor|album|music video|concert|movie|nollywood|kumawood|reality show|talent show|award show|red carpet|gospel artist)\b/i;
export const CONVICTED = /\b(convicted|sentenced|found guilty|jailed|imprisoned for|pleaded guilty)\b/i;

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

const norm = (s: string) => s.toLowerCase().replace(/[,’']/g, "").replace(/\s+/g, " ");

const STOP_CAPS = new Set([
  "The","A","An","In","On","At","He","She","They","It","His","Her","Their","According","Police","This","That","These","Those",
  "Ghana","Ghanaian","Source","Mr","Mrs","Ms","Dr","But","And","Also","However","Meanwhile","After","Before","When","While",
  "Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday","January","February","March","April","May","June","July",
  "August","September","October","November","December","Court","High","Circuit","District","Region","Regional","Command","Service",
  "GhanaCrimes","Division","Unit","Officer","Inspector","Superintendent","Chief","Deputy","Commissioner","Assistant","Sergeant","Corporal",
  "Constable","General","Director","Public","Relations","Republic","Act","Section","Criminal","Offences","Investigation","Department",
]);

/** Every number and proper-noun token in the draft must appear in the source text. */
export function unsupportedFacts(draft: string, source: string): string[] {
  const src = norm(source);
  const missing = new Set<string>();
  for (const n of draft.match(/\b\d[\d,.]*\b/g) || []) {
    const v = n.replace(/[,.]$/, "").replace(/,/g, "");
    if (v && !src.includes(v) && !src.includes(n.replace(/[,.]$/, ""))) missing.add(n);
  }
  for (const sentence of draft.split(/(?<=[.!?])\s+/)) {
    const words = sentence.split(/\s+/).slice(1); // skip sentence-initial capital
    for (const w of words) {
      const clean = w.replace(/[^A-Za-z'-]/g, "");
      if (!/^[A-Z][a-z]{2,}/.test(clean) || STOP_CAPS.has(clean)) continue;
      if (!src.includes(clean.toLowerCase())) missing.add(clean);
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

export const OFFENCES = ["robbery","murder","fraud_cyber","galamsey","narcotics","corruption","road_crash_arrest","mob_violence","court_judgement"];

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

  // a) Ghana only, no entertainment
  if (a.is_ghana === false && !a.ghanaian_central) hard.push("not_ghana");
  if (a.is_entertainment || (ENTERTAINMENT.test(sourceText) && !a.is_crime)) hard.push("entertainment");
  if (a.is_ghana !== false && !a.region) soft.push("region_unresolved");

  // b) Crime only
  if (!a.is_crime || !a.offence_type || !OFFENCES.includes(a.offence_type)) hard.push("not_in_crime_scope");

  // c) Factual
  const missing = unsupportedFacts(draft, `${sourceText}`);
  if (missing.length) hard.push(`unsupported_facts:${missing.join("|")}`);
  if (!/according to/i.test(draftBody)) soft.push("missing_attribution");
  const wc = wordCount(draftBody);
  if (wc < 80 || wc > 180) soft.push(`word_count_${wc}`);
  if (a.suspect_named && !isOfficial && corroboratingSources < 1) soft.push("suspect_named_single_media_source");

  // d) Presumption of innocence
  const convicted = a.case_status === "convicted" || CONVICTED.test(sourceText);
  if (VERDICT_WORDS.test(draft) && !convicted) hard.push("verdict_word_before_conviction");

  // e) Graphic
  if (GORE.test(draft)) hard.push("graphic_terms");
  if (a.graphic_content) soft.push("graphic_source_material");

  // f) Privacy
  if ((a.sexual_or_domestic_violence || SEXUAL_OR_DV.test(sourceText)) && a.victim_named) hard.push("sexual_or_dv_victim_named");
  if (a.minor_involved && (a.minor_identifiable || SCHOOL_NAME.test(draft))) hard.push("minor_identifiable");
  if (PHONE.test(draft)) hard.push("phone_number");
  if (HOUSE_ADDRESS.test(draft)) hard.push("home_address");
  if ((a.sexual_or_domestic_violence || a.minor_involved) && !hard.length) soft.push("sensitive_case_check");

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
  if (VERDICT_WORDS.test(text) && !convicted) hard.push("verdict_word_before_conviction");
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
