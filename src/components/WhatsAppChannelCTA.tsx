import whatsappBanner from "@/assets/whatsapp-channel-banner.png";

const WHATSAPP_CHANNEL_URL = "https://whatsapp.com/channel/0029VbC0vLjFcow2FZTEqy2J";

interface WhatsAppChannelCTAProps {
  className?: string;
}

export function WhatsAppChannelCTA({ className = "" }: WhatsAppChannelCTAProps) {
  return (
    <a
      href={WHATSAPP_CHANNEL_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Join GhanaCrimes WhatsApp Channel"
      className={`block transition-opacity hover:opacity-90 ${className}`}
    >
      <img
        src={whatsappBanner}
        alt="Follow GhanaCrimes on WhatsApp"
        className="w-full max-w-[120px] sm:max-w-[160px] h-auto"
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
  return randomValue <= 25;
}
