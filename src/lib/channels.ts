/**
 * Official GhanaCrimes follow channels.
 * WhatsApp: official GhanaCrimes channel, confirmed by the owner on 2026-10-27.
 * NEXT_PUBLIC_WHATSAPP_CHANNEL_URL overrides it at build time; set it to "off" to hide every block.
 * There is no Telegram channel and none should be linked.
 */
export const WHATSAPP_CHANNEL_URL: string = (process.env.NEXT_PUBLIC_WHATSAPP_CHANNEL_URL || 'https://whatsapp.com/channel/0029VbC0vLjFcow2FZTEqy2J').trim();
export const hasWhatsAppChannel = () => /^https:\/\/(www\.)?whatsapp\.com\/channel\/[A-Za-z0-9]+$/.test(WHATSAPP_CHANNEL_URL);
