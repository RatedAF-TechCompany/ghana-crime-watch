import { useAdSettings } from "@/hooks/use-ad-settings";
import whatsappBanner from "@/assets/whatsapp-channel-banner.png";

const WHATSAPP_CHANNEL_URL = "https://whatsapp.com/channel/0029VbC0vLjFcow2FZTEqy2J";

interface WhatsAppChannelCTAProps {
  className?: string;
  /** Use "banner" for full-width ad-style placement, "compact" for sidebar */
  variant?: "banner" | "compact";
}

export function WhatsAppChannelCTA({ className = "", variant = "banner" }: WhatsAppChannelCTAProps) {
  const { ad_whatsapp_cta } = useAdSettings();

  if (!ad_whatsapp_cta) return null;

  return (
    <a
      href={WHATSAPP_CHANNEL_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Join GhanaCrimes WhatsApp Channel"
      className={`block transition-opacity hover:opacity-95 ${className}`}
    >
      <img
        src={whatsappBanner}
        alt="Follow GhanaCrimes on WhatsApp"
        className={
          variant === "banner"
            ? "w-full max-w-3xl h-auto mx-auto"
            : "w-full max-w-xs h-auto"
        }
      />
    </a>
  );
}

/**
 * Hook to determine if the WhatsApp CTA should be shown on an article page.
 * Returns true for approximately 25% of article views.
 */
export function useShouldShowWhatsAppCTA(): boolean {
  // Generate a random number between 1 and 100
  // Show CTA if number is 25 or below (25% probability)
  const randomValue = Math.floor(Math.random() * 100) + 1;
  return randomValue <= 30;
}
