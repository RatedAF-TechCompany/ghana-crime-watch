/**
 * Know-your-rights explainers and quiz. Content slots are intentionally EMPTY:
 * each must be written and checked against the cited primary source (e.g. the 1992 Constitution
 * on GhaLII) before publishing. Pages stay noindex until at least one topic has a body.
 */
export type RightsTopic = { slug: string; title: string; body: string; sources: { label: string; url: string }[] };
export type QuizItem = { question: string; options: string[]; answerIndex: number; explanation: string; source: string };

export const RIGHTS_SOURCES = [
  { label: 'GhaLII — Ghana Legal Information Institute (Constitution, Acts, judgments)', url: 'https://ghalii.org' },
  { label: 'Commission on Human Rights and Administrative Justice (CHRAJ)', url: 'https://chraj.gov.gh' },
  { label: 'Ghana Police Service', url: 'https://police.gov.gh' },
  { label: 'Parliament of Ghana (Acts and bills)', url: 'https://www.parliament.gh' },
  { label: 'Cyber Security Authority', url: 'https://www.csa.gov.gh' },
];

export const RIGHTS_TOPICS: RightsTopic[] = [
  { slug: 'if-you-are-arrested', title: 'If you are arrested', body: '', sources: [] },
  { slug: 'bail', title: 'Bail', body: '', sources: [] },
  { slug: 'police-searches', title: 'Police stops and searches', body: '', sources: [] },
  { slug: 'reporting-a-crime', title: 'Reporting a crime', body: '', sources: [] },
  { slug: 'domestic-violence', title: 'Domestic violence protection', body: '', sources: [] },
  { slug: 'cyber-fraud-victims', title: 'If you are a victim of cyber fraud', body: '', sources: [] },
];

export const RIGHTS_QUIZ: QuizItem[] = [];

export const hasRightsContent = () => RIGHTS_TOPICS.some((t) => t.body.trim()) || RIGHTS_QUIZ.length > 0;
