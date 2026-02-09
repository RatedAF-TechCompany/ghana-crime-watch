import calabasheBanner from "@/assets/ads/calabashe-banner.jpeg";

interface Ad {
  id: string;
  image: string;
  url: string;
  alt: string;
}

const ADS: Ad[] = [
  {
    id: "calabashe-doctor-review",
    image: calabasheBanner,
    url: "https://calabashe.com",
    alt: "Calabashe – Review your Ghanaian doctor to help others",
  },
  // Future ads can be added here
];

/**
 * Determines which ad slots to show based on a session-stable random seed.
 * Each slot has an independent probability of showing, creating variety across viewers.
 */
function getSessionSeed(): number {
  const key = "gc_ad_seed";
  try {
    let seed = sessionStorage.getItem(key);
    if (!seed) {
      seed = String(Math.random());
      sessionStorage.setItem(key, seed);
    }
    return parseFloat(seed);
  } catch {
    // sessionStorage may be unavailable in iframes
    return Math.random();
  }
}

function seededRandom(seed: number, slot: number): number {
  const x = Math.sin(seed * 9301 + slot * 49297) * 49297;
  return x - Math.floor(x);
}

/**
 * Hook to determine if an ad should show in a given slot.
 * Uses a session-stable seed so the same viewer sees consistent placement
 * within a session, but different viewers see ads in different spots.
 * @param slotId - Unique numeric identifier for the placement slot
 * @param probability - Chance of showing (0-1), default 0.5
 */
export function useShouldShowAd(slotId: number, probability = 0.5): boolean {
  const seed = getSessionSeed();
  return seededRandom(seed, slotId) < probability;
}

interface AdBannerProps {
  slotId: number;
  probability?: number;
  className?: string;
}

export function AdBanner({ slotId, probability = 0.5, className = "" }: AdBannerProps) {
  const shouldShow = useShouldShowAd(slotId, probability);

  if (!shouldShow || ADS.length === 0) return null;

  // Pick ad based on slot to allow rotation when multiple ads exist
  const ad = ADS[slotId % ADS.length];

  return (
    <a
      href={ad.url}
      target="_blank"
      rel="noopener noreferrer sponsored"
      aria-label={ad.alt}
      className={`block overflow-hidden rounded-lg transition-opacity hover:opacity-95 ${className}`}
    >
      <img
        src={ad.image}
        alt={ad.alt}
        className="w-full h-auto"
        loading="lazy"
      />
    </a>
  );
}
