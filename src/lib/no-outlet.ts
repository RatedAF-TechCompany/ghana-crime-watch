/**
 * No-outlet rule (Zeb, 3 Nov 2026): news outlets are never named, linked or credited on ghanacrimes.com.
 * Display-time only: stored article bodies are not rewritten.
 */
const OUTLET_NAMES = String.raw`(?:the )?(?:MyJoy ?Online|MyJoy ?News|Joy ?News|Joy ?FM|JoyFM'?s? Top Story|Citi ?(?:Newsroom|FM|TV)|Citi|Graphic Online|Daily Graphic|graphic\.com\.gh|GhanaWeb|Ghana Web|Adom ?(?:Online|News|FM|TV)|3News|TV3|Ghana News Agency|GNA|Starr ?FM|UTV|Daily Guide(?: Network)?|Modern ?Ghana|Pulse Ghana|Asaase(?: Radio)?|GBC(?: Ghana Online| News)?|Ghanaian Times|Chale News|Rainbow Radio(?: Online)?|The Ghana Report|Kessben(?: Online| FM)?|Atinka(?: Online| FM)?|The High Street Journal|Ghana Business News|Yen Ghana|Yen\.com\.gh|The Chronicle(?: Ghana)?|Peace FM(?: Online)?|Okay FM|Angel FM|Onua FM|Nhyira FM|Luv FM|Accra FM|Metro TV|Net2 TV|Ghana Guardian|Myjoyonline\.com|Citinewsroom\.com|Ghanaweb\.com)`;

export const OUTLET_RE = new RegExp(String.raw`\b${OUTLET_NAMES}\b`, 'i');

const STRIPS: [RegExp, string | ((...a: string[]) => string)][] = [
  // "According to Adom Online, the baby..." -> "The baby..."
  [new RegExp(String.raw`\b[Aa]ccording to ${OUTLET_NAMES}(?:,? citing [^,]{1,80})?,\s*(\S)`, 'g'), (_m, c) => c.toUpperCase()],
  // "..., according to Citi Newsroom." -> "."
  [new RegExp(String.raw`,?\s*(?:according to|as reported by|reported by|citing)\s+${OUTLET_NAMES}(?:'s(?: [A-Z][\w]*){1,4})?`, 'g'), ''],
  // "..., MyJoyOnline reported." -> "."
  [new RegExp(String.raw`,?\s*${OUTLET_NAMES}\s+(?:has |had )?(?:reported|reports|said|says|learnt|learned|gathered)`, 'g'), ''],
  // "told JoyFM's Top Story on ..." / "in an interview with Citi FM"
  [new RegExp(String.raw`\s*(?:in an interview with|speaking (?:to|on)|on)\s+${OUTLET_NAMES}(?:'s(?: [A-Z][\w]*){1,4})?`, 'g'), ''],
  [new RegExp(String.raw`\b(told|telling)\s+${OUTLET_NAMES}(?:'s(?: [A-Z][\w]*){1,4})?`, 'g'), '$1 journalists'],
  [new RegExp(String.raw`\b${OUTLET_NAMES}(?:'s)?\b`, 'g'), ''],
];

const OWN_HOST = /^(?:https?:\/\/)?(?:www\.)?ghanacrimes\.com(?:\/|$)|^\/(?!\/)|^#|^mailto:/i;

/** Remove outlet credit and unwrap links to other hosts in rendered HTML (text kept, link dropped). */
export function stripOutlets(html: string): string {
  if (!html) return html;
  // Merged 'X also reported on this story' notes are outlet credit: drop the whole paragraph/line.
  html = html.replace(/<p\b[^>]*>(?:(?!<\/p>)[\s\S])*also reported on this story(?:(?!<\/p>)[\s\S])*<\/p>/gi, '').replace(/^.*also reported on this story.*$/gim, '');
  let out = html.replace(/<a\b[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, (m, href: string, text: string) => (OWN_HOST.test(href) ? m : text));
  out = out.split(/(<[^>]+>)/g).map((part) => {
    if (part.startsWith('<')) return part;
    let t = part;
    for (const [re, rep] of STRIPS) t = t.replace(re, rep as any);
    return t.replace(/https?:\/\/(?!(?:www\.)?ghanacrimes\.com)\S+/gi, '')
      .replace(/\(\s*\)/g, '').replace(/\s+([,.;:])/g, '$1').replace(/,\s*\./g, '.').replace(/ {2,}/g, ' ');
  }).join('');
  return out;
}

const OFFICIAL = /\b(police|command|court|judicial|attorney[- ]general|prosecut|ministry|minister|nacoc|narcotics|eoco|economic and organised crime|special prosecutor|cid|immigration|customs|gra\b|revenue authority|fire service|nadmo|army|armed forces|gaf\b|navy|national security|naimos|bank of ghana|electoral commission|commission|authority|agency|service|directorate|department|government|parliament|assembly|regional|municipal|district|office|whip|spokes(?:person|man|woman)|commander|igp|inspector[- ]general)\b/i;

/** The primary (official) source for the visible "Source:" line, or null. Never an outlet. */
export function primarySource(a: { gate_report?: any } | null | undefined): string | null {
  const g = a?.gate_report || {};
  for (const c of [g.primary_source, g.source]) {
    if (typeof c !== 'string') continue;
    const s = c.trim();
    if (!s || s.length > 200 || OUTLET_RE.test(s) || /https?:|\.com|\.gh\b|online|news|radio|\bfm\b|\btv\b|report(ed|er|ers|s)?\b|account/i.test(s)) continue;
    if (OFFICIAL.test(s)) return s;
  }
  return null;
}

const SELF_HOSTED = /^(?:https:\/\/rscqxztgtpcifcqxjskh\.supabase\.co\/storage\/|\/(?!\/))/;

/** Public list/article row: outlet credit stripped from text, hot-linked outlet images and outlet URLs removed. */
export function publicRow<T extends Record<string, any>>(a: T): T {
  if (!a) return a;
  const { source_url: _u, source_urls: _us, gate_report: _g, ...rest } = a as any;
  for (const k of ['body', 'summary', 'subtitle', 'seo_description']) if (typeof rest[k] === 'string') rest[k] = stripOutlets(rest[k]);
  if ('hero_image' in rest && rest.hero_image && !SELF_HOSTED.test(rest.hero_image)) rest.hero_image = null;
  if (rest.hero_image_credit && OUTLET_RE.test(rest.hero_image_credit)) rest.hero_image_credit = null;
  return rest as T;
}
export const publicArticle = publicRow;
