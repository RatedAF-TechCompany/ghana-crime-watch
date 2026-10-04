import type { Metadata } from 'next';
import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { StaticPage } from '@/components/StaticPage';
import { BASE_URL } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Editorial Policy and Ethics',
  description: 'The standards GhanaCrimes follows: presumption of innocence, careful legal wording, protection of victims and children, sourcing and corrections.',
  alternates: { canonical: `${BASE_URL}/editorial-policy` },
};

export default function EditorialPolicyPage() {
  return (
    <Layout>
      <StaticPage title="Editorial Policy and Ethics" intro="The standards every GhanaCrimes report must meet before and after publication.">
        <h2>Presumption of innocence</h2>
        <p>Everyone accused of a crime is presumed innocent until proven guilty by a court. We report allegations as allegations and never present a suspect as guilty before a conviction.</p>

        <h2>Wording rules</h2>
        <ul>
          <li><strong>Arrested</strong>: used only when police or another authority confirm an arrest.</li>
          <li><strong>Suspected</strong> or <strong>alleged</strong>: used for any act that has not been proven in court, for example "the alleged robbery" or "a suspected fraudster".</li>
          <li><strong>Charged</strong>: used only when formal charges are confirmed.</li>
          <li><strong>Convicted</strong> or <strong>guilty</strong>: used only after a court verdict.</li>
          <li>We do not describe a person as a criminal, thief or killer unless a court has convicted them of that offence.</li>
        </ul>

        <h2>Victims of sexual offences</h2>
        <p>We never name, picture or otherwise identify a victim or alleged victim of a sexual offence, whether living or dead. We also avoid details, such as a home address, school, workplace or close relative, that could allow readers to work out who they are.</p>

        <h2>Children</h2>
        <p>We do not identify any person under 18 who is a victim, witness or suspect in a criminal matter. This includes names, photographs, schools and any combination of details that could identify them.</p>

        <h2>Images</h2>
        <p>We do not publish graphic images, including images of bodies, body bags, injuries or crime scenes showing victims. We do not use photographs belonging to other publishers. Where we have no suitable image of our own, we show a neutral GhanaCrimes card.</p>

        <h2>Sourcing</h2>
        <ul>
          <li>Every article is based on an identifiable source: an official statement, a court record, a police release or an earlier published report.</li>
          <li>Each article shows a <strong>Source</strong> line linking to the original material where it is available.</li>
          <li>We do not invent quotes, figures, names or details.</li>
          <li>Where facts are unconfirmed, we say so.</li>
        </ul>

        <h2>Fairness and right of reply</h2>
        <p>People and organisations who are the subject of serious claims may contact us to respond. We will consider adding their response to the report.</p>

        <h2>How corrections work</h2>
        <p>When we find or are told about an error, we review it promptly. If a correction is needed, we update the article and, for significant errors, add a note explaining what changed. Readers can request a correction from any article or through our <Link href="/corrections">Corrections page</Link>.</p>
      </StaticPage>
    </Layout>
  );
}
