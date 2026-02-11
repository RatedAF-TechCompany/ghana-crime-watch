import { useAdSettings } from "@/hooks/use-ad-settings";
import calabasheReviewBanner from "@/assets/ads/calabashe-review-banner.png";

interface Ad {
  id: string;
  image: string;
  url: string;
  alt: string;
}

const ADS: Ad[] = [
  {
    id: "calabashe-doctor-review",
    image: calabasheReviewBanner,
    url: "https://calabashe.com",
    alt: "Calabashe – Review your Ghanaian doctor to help others",
  },
];

/**
 * Determines which ad slots to show based on a session-stable random seed.
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
    return Math.random();
  }
}

function seededRandom(seed: number, slot: number): number {
  const x = Math.sin(seed * 9301 + slot * 49297) * 49297;
  return x - Math.floor(x);
}

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
  const { ad_calabashe } = useAdSettings();
  const shouldShow = useShouldShowAd(slotId, probability);

  if (!ad_calabashe || !shouldShow || ADS.length === 0) return null;

  const ad = ADS[slotId % ADS.length];

  return (
    <div className={`overflow-hidden rounded-lg ${className}`}>
      <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        Advertisement
      </p>
      <a
        href={ad.url}
        target="_blank"
        rel="noopener noreferrer sponsored"
        aria-label={ad.alt}
        className="block overflow-hidden rounded-lg transition-opacity hover:opacity-95"
      >
        <img
          src={ad.image}
          alt={ad.alt}
          className="w-full h-auto"
          loading="lazy"
        />
      </a>
    </div>
  );
}
