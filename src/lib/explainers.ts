export interface Explainer {
  slug: string;
  title: string;
  summary: string;
  updated: string; // ISO date
  sections: { heading: string; paragraphs: string[] }[];
  sources: { label: string; href: string }[];
  related: { label: string; href: string }[];
}

export const EXPLAINERS: Explainer[] = [
  {
    slug: 'your-rights-if-arrested-in-ghana',
    title: 'Your rights if you are arrested in Ghana',
    summary: 'What the 1992 Constitution says happens when police arrest or detain someone: reasons, a lawyer, the 48-hour rule, bail and fair treatment.',
    updated: '2026-10-27',
    sections: [
      {
        heading: 'You must be told why, and that you can have a lawyer',
        paragraphs: [
          'Article 14(2) of the 1992 Constitution says a person who is arrested, restricted or detained must be informed immediately, in a language they understand, of the reasons for the arrest and of their right to a lawyer of their choice.',
          'Police may arrest on reasonable suspicion that a person has committed, or is about to commit, a criminal offence (Article 14(1)).',
        ],
      },
      {
        heading: 'The 48-hour rule',
        paragraphs: [
          'Under Article 14(3), a person arrested on suspicion of an offence who is not released must be brought before a court within 48 hours after the arrest.',
          'If the person is not tried within a reasonable time, Article 14(4) says they must be released, either unconditionally or on reasonable conditions such as bail, without stopping any later proceedings.',
          'Police enquiry bail and court bail are explained in our guide to how police bail works.',
        ],
      },
      {
        heading: 'Dignity in custody',
        paragraphs: [
          'Article 15 says no person, whether or not they are arrested or detained, may be subjected to torture or other cruel, inhuman or degrading treatment.',
          'It also says a person who has not been convicted must not be treated as a convicted person.',
          'A person who is unlawfully arrested or detained is entitled to compensation (Article 14(5)).',
        ],
      },
      {
        heading: 'If you are charged',
        paragraphs: [
          'Article 19 guarantees a fair hearing within a reasonable time. A person charged is presumed innocent until proved guilty or until they plead guilty (Article 19(2)(c)).',
          'They must be told in detail, in a language they understand, what offence they are charged with, given time to prepare a defence, and may defend themselves in person or through a lawyer of their choice. An interpreter is provided free where needed.',
          'No person on trial for a criminal offence can be compelled to give evidence at their trial (Article 19).',
        ],
      },
      {
        heading: 'Complaints about police conduct',
        paragraphs: [
          'Complaints about how officers behaved can be made to the Police Professional Standards Bureau (PPSB) of the Ghana Police Service.',
          'This guide is general information, not legal advice. Anyone arrested should speak to a lawyer; the Legal Aid Commission can help people who cannot afford one.',
        ],
      },
    ],
    sources: [
      { label: '1992 Constitution of Ghana (as amended 1996), full text: Constitute Project', href: 'https://www.constituteproject.org/constitution/Ghana_1996' },
      { label: 'Ghana Police Service', href: 'https://police.gov.gh' },
      { label: 'Ghana Police Service: Police Professional Standards Bureau', href: 'https://police.gov.gh/en/index.php/police-professional-standard-bureau/' },
      { label: 'Legal Aid Commission of Ghana', href: 'https://www.lac.gov.gh/' },
    ],
    related: [
      { label: 'How police bail works', href: '/explainers/how-police-bail-works-in-ghana' },
      { label: 'Emergency contacts', href: '/emergency-contacts' },
      { label: 'Court cases', href: '/courts' },
    ],
  },
  {
    slug: 'how-to-report-cybercrime-in-ghana',
    title: 'How to report cybercrime and online fraud in Ghana',
    summary: 'Where to report MoMo fraud, hacked accounts, sextortion and online scams, and what evidence to keep.',
    updated: '2026-10-27',
    sections: [
      {
        heading: 'Report to the Cyber Security Authority (24 hours)',
        paragraphs: [
          'The Cyber Security Authority (CSA) runs a 24-hour reporting point through its CERT-GH team. You can call or text 292, send a WhatsApp message to 0501603111, email report@csa.gov.gh, use the CSA Ghana mobile app or fill in the incident form on csa.gov.gh.',
          'The CSA also takes calls from people who want guidance before they go ahead with an online transaction they are unsure about.',
        ],
      },
      {
        heading: 'Make a criminal complaint to the police',
        paragraphs: [
          'The Cybercrime Unit of the Criminal Investigations Department (CID) investigates crimes committed with phones, computers or the internet. The Ghana Police Service says complaints can be made at CID Headquarters in Accra or through the police helplines 18555 and 191.',
          'For fraud involving large sums, money laundering or organised groups, the Economic and Organised Crime Office (EOCO) also takes reports.',
        ],
      },
      {
        heading: 'Keep the evidence',
        paragraphs: [
          'Before you block or delete anything, take screenshots of the conversation, the account name or number, any links, and payment requests or MoMo transaction messages.',
          'If you sent money by mobile money or bank transfer, contact your network or bank straight away and give them the transaction ID.',
        ],
      },
      {
        heading: 'If someone threatens to leak private images',
        paragraphs: [
          'Do not pay. Paying does not guarantee the images are deleted and often leads to more demands. Stop replying, keep the evidence and report it to the CSA on 292 or to the police.',
        ],
      },
    ],
    sources: [
      { label: 'Cyber Security Authority: report an incident', href: 'https://csa.gov.gh/report' },
      { label: 'Ghana Police Service: Cyber Crime Unit', href: 'https://police.gov.gh/en/index.php/cyber-crime/' },
      { label: 'EOCO: report a crime', href: 'https://www.eoco.gov.gh/resources/report-a-crime' },
    ],
    related: [
      { label: 'Scam alerts', href: '/scam-alerts' },
      { label: 'Fraud Watch', href: '/fraud-watch' },
      { label: 'How to spot a romance scam', href: '/explainers/how-to-spot-a-romance-scam-in-ghana' },
      { label: 'Emergency contacts', href: '/emergency-contacts' },
    ],
  },
  {
    slug: 'how-police-bail-works-in-ghana',
    title: 'How police bail works in Ghana',
    summary: 'A plain-language overview of police enquiry bail and court bail in Ghana.',
    updated: '2026-10-05',
    sections: [
      {
        heading: 'Arrest and the 48-hour rule',
        paragraphs: [
          'Under Article 14 of the 1992 Constitution, a person who is arrested and not released must be brought before a court within 48 hours.',
          'While the police investigate, they may release a suspect on police enquiry bail instead of keeping them in custody.',
        ],
      },
      {
        heading: 'Police enquiry bail',
        paragraphs: [
          'Police bail usually requires the suspect, and often one or more sureties, to agree to report back to the police when asked. Conditions vary by case.',
          'The Ghana Police Service has publicly stated that police bail is free. If an officer demands money for bail, the Police Professional Standards Bureau (PPSB) accepts complaints.',
        ],
      },
      {
        heading: 'Court bail and remand',
        paragraphs: [
          'Once a person is charged and appears in court, the judge or magistrate decides whether to grant bail and on what terms, or to remand the person in custody.',
          'Being remanded is not a conviction. Everyone charged with an offence is presumed innocent until proven guilty.',
        ],
      },
    ],
    sources: [
      { label: 'Ghana Police Service', href: 'https://police.gov.gh' },
      { label: 'Judicial Service of Ghana', href: 'https://judicial.gov.gh' },
    ],
    related: [
      { label: 'Court coverage', href: '/courts' },
      { label: 'Court cases topic', href: '/topics/court-cases' },
    ],
  },
  {
    slug: 'what-eoco-does',
    title: 'What EOCO does',
    summary: 'The role of the Economic and Organised Crime Office in fighting financial and organised crime.',
    updated: '2026-10-05',
    sections: [
      {
        heading: 'What it is',
        paragraphs: [
          'The Economic and Organised Crime Office (EOCO) is a Ghanaian state agency set up under the Economic and Organised Crime Office Act, 2010 (Act 804). It replaced the former Serious Fraud Office.',
        ],
      },
      {
        heading: 'What it handles',
        paragraphs: [
          'EOCO investigates and, with the authority of the Attorney-General, prosecutes serious offences that cause financial or economic loss to the state or to people, including fraud, money laundering, human trafficking, tax fraud and cybercrime.',
          'It can also trace, freeze and recover proceeds of crime.',
        ],
      },
      {
        heading: 'How it differs from other agencies',
        paragraphs: [
          'The Office of the Special Prosecutor focuses on corruption involving public officers. The Ghana Police Service handles general crime. NACOC deals with narcotics. Cases can involve more than one agency.',
        ],
      },
    ],
    sources: [{ label: 'Economic and Organised Crime Office', href: 'https://eoco.gov.gh' }],
    related: [
      { label: 'Corruption topic', href: '/topics/corruption' },
      { label: 'Cyber fraud topic', href: '/topics/cyber-fraud' },
    ],
  },
  {
    slug: 'how-to-spot-a-romance-scam-in-ghana',
    title: 'How to spot a romance scam in Ghana',
    summary: 'Common warning signs of online romance scams and what to do if you are targeted.',
    updated: '2026-10-05',
    sections: [
      {
        heading: 'How these scams usually work',
        paragraphs: [
          'A scammer builds an online relationship, often through social media, dating apps or messaging apps, and then asks for money, gifts, mobile money transfers or personal information.',
        ],
      },
      {
        heading: 'Red flags',
        paragraphs: [
          'They profess strong feelings very quickly but always avoid meeting in person or on a live video call.',
          'They describe sudden emergencies: medical bills, customs fees for a parcel, a stuck inheritance or travel costs.',
          'They ask you to send mobile money, gift cards or cryptocurrency, or to receive and forward money for them.',
          'Their photos or stories do not add up. A reverse image search can show the pictures belong to someone else.',
        ],
      },
      {
        heading: 'What to do',
        paragraphs: [
          'Stop sending money and keep the messages, numbers and transaction references.',
          'Contact your mobile money provider or bank immediately to try to stop transfers.',
          'Report it to the Ghana Police Service, including its Cybercrime Unit, or to the Cyber Security Authority.',
        ],
      },
    ],
    sources: [
      { label: 'Ghana Police Service', href: 'https://police.gov.gh' },
      { label: 'Cyber Security Authority', href: 'https://www.csa.gov.gh' },
    ],
    related: [
      { label: 'Cyber fraud topic', href: '/topics/cyber-fraud' },
      { label: 'Fraud Watch', href: '/fraud-watch' },
      { label: 'Safety guide', href: '/safety' },
    ],
  },
];

export const getExplainer = (slug: string) => EXPLAINERS.find((e) => e.slug === slug) ?? null;
