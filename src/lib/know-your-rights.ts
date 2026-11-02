/**
 * Know-your-rights explainers and quiz. Every statement paraphrases a cited clause of the 1992 Constitution
 * (checked against the Constitute Project text on 2 Nov 2026). Statute topics (Act 29, Act 30 detail, Act 1038,
 * Domestic Violence Act) are left out until checked clause by clause against the official text.
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

const CONSTITUTION = (art: string) => ({ label: `1992 Constitution of Ghana, ${art}`, url: 'https://www.constituteproject.org/constitution/Ghana_1996' });
const GHALII = { label: 'GhaLII: full texts of Ghana legislation, including Act 29, Act 30 and Act 1038', url: 'https://ghalii.org' };

export const RIGHTS_TOPICS: RightsTopic[] = [
  { slug: 'if-you-are-arrested', title: 'If you are arrested', sources: [CONSTITUTION('article 14 (personal liberty)'), CONSTITUTION('article 15 (human dignity)')],
    body: `Police may only take away your liberty in the cases the law allows, for example on reasonable suspicion that you have committed or are about to commit a criminal offence (article 14(1)).

You must be told immediately, in a language you understand, why you have been arrested and that you have the right to a lawyer of your choice (article 14(2)).

If you are held on suspicion of a crime and not released, you must be brought before a court within 48 hours (article 14(3)).

Whether or not you are arrested, nobody may subject you to torture or cruel, inhuman or degrading treatment (article 15(2)). If you have not been convicted you must not be treated as a convicted person, and you must be kept apart from convicted persons (article 15(3)). A juvenile in custody must be kept apart from adults (article 15(4)).

If you are unlawfully arrested or detained, you are entitled to compensation from the person responsible (article 14(5)).` },
  { slug: 'bail', title: 'Bail and release before trial', sources: [CONSTITUTION('article 14(4) and 14(6)'), GHALII],
    body: `If you are arrested and are not tried within a reasonable time, you must be released, either unconditionally or on reasonable conditions, such as conditions to make sure you come back for trial (article 14(4)).

The detailed rules on how courts and police grant bail are in the Criminal and Other Offences (Procedure) Act, 1960 (Act 30). Ask a lawyer or the Legal Aid Commission about your case.

If you are later convicted and jailed, the time you spent in lawful custody before the end of your trial must be taken into account in your sentence (article 14(6)).` },
  { slug: 'police-searches', title: 'Privacy, searches and your home', sources: [CONSTITUTION('article 18(2)')],
    body: `No one may interfere with the privacy of your home, property, correspondence or communication except in accordance with law and as necessary in a free and democratic society, for example for public safety, for the prevention of disorder or crime, or to protect the rights of others (article 18(2)).

If you believe a search was not lawful, note the officers' names or numbers and the time, and get legal advice.` },
  { slug: 'fair-trial', title: 'Your rights at trial', sources: [CONSTITUTION('article 19 (fair trial)')],
    body: `If you are charged with a criminal offence you are entitled to a fair hearing within a reasonable time by a court (article 19(1)).

You are presumed innocent until you are proved guilty or plead guilty (article 19(2)(c)). You must be told immediately, in a language you understand and in detail, what offence you are charged with (article 19(2)(d)), and given adequate time and facilities to prepare your defence (article 19(2)(e)).

You may defend yourself in person or through a lawyer of your choice (article 19(2)(f)), and you are entitled to an interpreter free of charge if you cannot understand the language used at the trial (article 19(2)(h)).

You cannot be compelled to give evidence at your own trial (article 19(10)). You cannot be convicted unless the offence is defined and its penalty prescribed in a written law (article 19(11)). If a competent court has already convicted or acquitted you of an offence, you cannot be tried again for it, except on appeal or review (article 19(7)).

People named in GhanaCrimes reports are suspects unless a court has convicted them, for exactly this reason.` },
  { slug: 'enforcing-your-rights', title: 'If your rights are violated', sources: [CONSTITUTION('article 33 (protection of rights by the courts)'), { label: 'Commission on Human Rights and Administrative Justice (CHRAJ)', url: 'https://chraj.gov.gh' }],
    body: `If a fundamental human right in the Constitution has been, is being or is likely to be contravened in relation to you, you may apply to the High Court for redress (article 33(1)). The High Court can issue orders including habeas corpus, which requires a detained person to be brought before the court (article 33(2)).

You can also complain to the Commission on Human Rights and Administrative Justice (CHRAJ). If you cannot afford a lawyer, contact the Legal Aid Commission.` },
];

export const RIGHTS_QUIZ: QuizItem[] = [
  { question: 'Within how many hours must a suspect who is not released be brought before a court?', options: ['24 hours', '48 hours', '72 hours', 'Seven days'], answerIndex: 1,
    explanation: 'Article 14(3) sets 48 hours after the arrest, restriction or detention.', source: '1992 Constitution, article 14(3)' },
  { question: 'When you are arrested, what must you be told immediately?', options: ['Nothing until you reach the station', 'The reasons for your arrest and your right to a lawyer of your choice', 'Only the name of the arresting officer', 'The date of your trial'], answerIndex: 1,
    explanation: 'You must be told, in a language you understand, why you were arrested and that you may have a lawyer of your choice.', source: '1992 Constitution, article 14(2)' },
  { question: 'Until when is a person charged with a criminal offence presumed innocent?', options: ['Until the police finish investigating', 'Until they are charged', 'Until they are proved guilty or plead guilty', 'Until the media report the case'], answerIndex: 2,
    explanation: 'The presumption of innocence lasts until guilt is proved or the accused pleads guilty.', source: '1992 Constitution, article 19(2)(c)' },
  { question: 'Can a person on trial be forced to give evidence at their own trial?', options: ['Yes, always', 'Only if the judge orders it', 'No', 'Only in fraud cases'], answerIndex: 2,
    explanation: 'No person who is tried for a criminal offence can be compelled to give evidence at the trial.', source: '1992 Constitution, article 19(10)' },
  { question: 'Who pays for an interpreter if you cannot understand the language used at your trial?', options: ['You do', 'You do not pay', 'Your family', 'The complainant'], answerIndex: 1,
    explanation: 'The assistance of an interpreter is provided without payment by the accused.', source: '1992 Constitution, article 19(2)(h)' },
  { question: 'Where can you apply if your fundamental human rights are being violated?', options: ['The High Court', 'Only Parliament', 'Only the police', 'The District Assembly'], answerIndex: 0,
    explanation: 'Article 33(1) lets you apply to the High Court for redress.', source: '1992 Constitution, article 33(1)' },
];

export const hasRightsContent = () => RIGHTS_TOPICS.some((t) => t.body.trim()) || RIGHTS_QUIZ.length > 0;
