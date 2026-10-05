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
