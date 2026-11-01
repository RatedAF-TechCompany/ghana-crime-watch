import { WHATSAPP_CHANNEL_URL, hasWhatsAppChannel } from '@/lib/channels';

/** "Follow us on WhatsApp". Renders nothing until the official channel link is set in src/lib/channels.ts. */
export function WhatsAppFollowBlock({ className = '' }: { className?: string }) {
  if (!hasWhatsAppChannel()) return null;
  return (
    <a href={WHATSAPP_CHANNEL_URL} target="_blank" rel="noopener noreferrer"
      className={`flex items-center justify-between gap-3 rounded-md bg-[#128C7E] px-4 py-3 font-sans text-sm font-bold text-white hover:bg-[#0e6f63] ${className}`}>
      <span>Follow GhanaCrimes on WhatsApp</span><span aria-hidden>→</span>
    </a>
  );
}
