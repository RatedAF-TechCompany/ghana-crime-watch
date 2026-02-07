import { useEffect } from "react";
import { Shield, Eye, Camera, Scale, Users, Globe, Mail } from "lucide-react";

export default function AboutPage() {
  useEffect(() => {
    document.title = "About Us & Editorial Policy — GhanaCrimes";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content", "GhanaCrimes is Ghana's leading crime news platform. Learn about our mission, editorial standards, photo-first image policy, and commitment to factual, responsible journalism.");
    }
  }, []);

  return (
    <article className="mx-auto max-w-3xl">
        {/* Header */}
        <header className="border-b-2 border-primary pb-6 mb-8">
          <h1 className="font-serif text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl leading-tight">
            About GhanaCrimes
          </h1>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
            Ghana's most comprehensive crime news and public safety platform, delivering verified, factual reporting to keep communities informed and accountable.
          </p>
        </header>

        {/* Mission */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="h-5 w-5 text-primary flex-shrink-0" />
            <h2 className="font-serif text-2xl font-bold text-foreground">Our Mission</h2>
          </div>
          <div className="space-y-4 text-foreground leading-relaxed">
            <p>
              GhanaCrimes exists to provide the people of Ghana with timely, accurate, and responsibly reported crime news. We believe that access to reliable information about public safety is a fundamental right, and that informed communities are safer communities.
            </p>
            <p>
              We aggregate, verify, and publish crime-related news from across Ghana's sixteen regions, drawing from official sources, court records, police reports, and established news outlets. Our goal is to become the single most trusted reference point for crime reporting in Ghana.
            </p>
            <p>
              We are modelled on the editorial standards of the world's leading news organisations, including the Financial Times and The Economist, and hold ourselves to the same rigorous standards of accuracy, neutrality, and visual integrity.
            </p>
          </div>
        </section>

        {/* Editorial Standards */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <Scale className="h-5 w-5 text-primary flex-shrink-0" />
            <h2 className="font-serif text-2xl font-bold text-foreground">Editorial Standards</h2>
          </div>
          <div className="space-y-4 text-foreground leading-relaxed">
            <p>
              Every article published on GhanaCrimes must meet the following editorial requirements before publication.
            </p>

            <div className="border border-border rounded-lg p-5 bg-card space-y-3">
              <h3 className="font-serif font-bold text-lg text-foreground">Verification</h3>
              <p>
                All stories undergo a live verification scan. We cross-reference every claim against at least two reputable sources, prioritising primary materials such as police statements, court filings, official government releases, and direct quotes from named officials. Where a detail cannot be independently confirmed, we state this clearly and attribute the claim to its original source.
              </p>
            </div>

            <div className="border border-border rounded-lg p-5 bg-card space-y-3">
              <h3 className="font-serif font-bold text-lg text-foreground">Presumption of Innocence</h3>
              <p>
                We respect the presumption of innocence at all times. Suspects are described as "alleged" or "suspected" until proven guilty by a court of law. We do not publish accusations as established fact.
              </p>
            </div>

            <div className="border border-border rounded-lg p-5 bg-card space-y-3">
              <h3 className="font-serif font-bold text-lg text-foreground">Source Attribution</h3>
              <p>
                We name our sources plainly within the body of every article. Readers will see attributions such as "Ghana Police Service statement," "Accra High Court filing," or "Citi Newsroom report." We do not present unattributed claims as fact.
              </p>
            </div>

            <div className="border border-border rounded-lg p-5 bg-card space-y-3">
              <h3 className="font-serif font-bold text-lg text-foreground">Writing Tone</h3>
              <p>
                Our writing is factual, neutral, and professional. We do not use sensationalist language, emojis, hashtags, bullet points, or formatting tricks. Our articles read as serious journalism, not social media posts.
              </p>
            </div>
          </div>
        </section>

        {/* Photo-First Image Policy */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <Camera className="h-5 w-5 text-primary flex-shrink-0" />
            <h2 className="font-serif text-2xl font-bold text-foreground">Photo-First Image Policy</h2>
          </div>
          <div className="space-y-4 text-foreground leading-relaxed">
            <p>
              GhanaCrimes maintains a strict photo-first editorial image policy. Every article is illustrated with an image that reads as a real photograph. Our site must visually behave like a serious international newsroom at all times.
            </p>

            <div className="border-l-4 border-primary pl-5 py-2">
              <p className="font-serif font-semibold text-foreground italic">
                "Would this image feel normal on the Financial Times or The Economist website?"
              </p>
              <p className="text-muted-foreground text-sm mt-1">
                This is the test every image must pass before publication.
              </p>
            </div>

            <h3 className="font-serif font-bold text-lg text-foreground mt-6">Image Sourcing Priority</h3>
            <p>For each article, we attempt image sourcing in this exact order:</p>

            <ol className="space-y-3 ml-1">
              <li className="flex gap-3">
                <span className="font-serif font-bold text-primary text-lg">1.</span>
                <div>
                  <span className="font-semibold">Real photos tied directly to the story</span>
                  <span className="text-muted-foreground"> — Government buildings, offices, press rooms, farms, factories, ports, markets, infrastructure, and exterior shots of institutions mentioned in the article.</span>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="font-serif font-bold text-primary text-lg">2.</span>
                <div>
                  <span className="font-semibold">Contextual real-world photos</span>
                  <span className="text-muted-foreground"> — Generic but truthful photographs of the sector, such as cocoa farms, oil storage facilities, data centres, banks, or ports.</span>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="font-serif font-bold text-primary text-lg">3.</span>
                <div>
                  <span className="font-semibold">Representative environmental photography</span>
                  <span className="text-muted-foreground"> — Streets, skylines, offices, meeting rooms, workspaces, or objects involved in the story such as documents, commodities, and machinery.</span>
                </div>
              </li>
            </ol>

            <h3 className="font-serif font-bold text-lg text-foreground mt-6">What We Never Publish</h3>
            <p>The following are never acceptable as article imagery:</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {["Digital art", "Concept art", "Cartoons", "Infographics", "Stylised illustrations", "Abstract visuals"].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="text-destructive">✕</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <h3 className="font-serif font-bold text-lg text-foreground mt-6">Image Tone</h3>
            <p>All published images must be calm, neutral, and observational. They must be free of drama, cinematic filters, or effects. Low saturation, realistic lighting, and clean cropping are required. Images should feel as though they came from a wire service or a serious photo desk.</p>
          </div>
        </section>

        {/* Data & Privacy */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="h-5 w-5 text-primary flex-shrink-0" />
            <h2 className="font-serif text-2xl font-bold text-foreground">Data & Privacy</h2>
          </div>
          <div className="space-y-4 text-foreground leading-relaxed">
            <p>
              We take the privacy of our readers seriously. We do not sell personal data to third parties. Our newsletter subscription service collects only email addresses, and subscribers can unsubscribe at any time. Comments submitted on articles are published under the name provided by the commenter, and we do not require account registration to participate in discussions.
            </p>
          </div>
        </section>

        {/* Our Sources */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <Eye className="h-5 w-5 text-primary flex-shrink-0" />
            <h2 className="font-serif text-2xl font-bold text-foreground">Our Sources</h2>
          </div>
          <div className="space-y-4 text-foreground leading-relaxed">
            <p>
              GhanaCrimes monitors and cross-references news from Ghana's most established and reputable outlets, including:
            </p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
              {[
                "Ghana Police Service",
                "Ghana News Agency",
                "Graphic Online",
                "Citi Newsroom",
                "GhanaWeb",
                "Modern Ghana",
                "MyJoyOnline",
                "Starr FM",
                "Peace FM Online",
                "GBC Ghana Online",
                "Adom Online",
                "3News",
                "TV3 Ghana",
                "Pulse Ghana",
                "Kessben Online",
              ].map((source) => (
                <span key={source} className="text-sm font-medium text-foreground">
                  {source}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <Users className="h-5 w-5 text-primary flex-shrink-0" />
            <h2 className="font-serif text-2xl font-bold text-foreground">The GhanaCrimes Desk</h2>
          </div>
          <div className="space-y-4 text-foreground leading-relaxed">
            <p>
              Our editorial desk operates around the clock, monitoring news feeds and official channels to ensure that breaking crime stories reach our readers as quickly and accurately as possible. Articles are published under the GhanaCrimes Desk byline to reflect our collective editorial responsibility.
            </p>
            <p>
              Our automated newsroom technology scans trusted sources every three hours, generates verified reports, and applies our editorial standards before publication. Every article is subject to the same rigorous fact-checking and sourcing requirements, whether produced by our human editors or our AI-assisted newsroom.
            </p>
          </div>
        </section>

        {/* Contact */}
        <section className="mb-12 border-t border-border pt-8">
          <div className="flex items-center gap-3 mb-4">
            <Mail className="h-5 w-5 text-primary flex-shrink-0" />
            <h2 className="font-serif text-2xl font-bold text-foreground">Contact Us</h2>
          </div>
          <div className="space-y-4 text-foreground leading-relaxed">
            <p>
              For corrections, tips, partnership enquiries, or general feedback, reach us at:
            </p>
            <p className="font-semibold text-primary">
              editor@ghanacrimes.com
            </p>
            <p className="text-sm text-muted-foreground">
              We aim to respond to all legitimate enquiries within 48 hours.
            </p>
          </div>
        </section>
    </article>
  );
}
