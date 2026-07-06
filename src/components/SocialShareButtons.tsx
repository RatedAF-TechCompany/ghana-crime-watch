import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Link2, MessageCircle, Send } from "lucide-react";
import { useMemo } from "react";

interface SocialShareButtonsProps {
  title: string;
  summary: string;
  url?: string;
}

export function SocialShareButtons({ title, summary, url }: SocialShareButtonsProps) {
  const shareUrl = useMemo(
    () => url || (typeof window !== "undefined" ? window.location.href : ""),
    [url]
  );
  const shareText = `${title}\n\n${summary}`;
  const canNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  const handleWhatsAppShare = () => {
    if (typeof window === "undefined") return;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n\nRead more: ${shareUrl}`)}`;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  const handleTelegramShare = () => {
    if (typeof window === "undefined") return;
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
    window.open(telegramUrl, "_blank", "noopener,noreferrer");
  };

  const handleCopyLink = async () => {
    if (typeof navigator === "undefined") return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied to clipboard!");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator === "undefined") return;
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: summary,
          url: shareUrl,
        });
      } catch (error) {
        // User cancelled or share failed silently
        if ((error as Error).name !== "AbortError") {
          console.error("Share failed:", error);
        }
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium text-muted-foreground">Share this story</p>
      <div className="flex flex-wrap gap-2">
        {/* WhatsApp - Most popular in Ghana */}
        <Button
          onClick={handleWhatsAppShare}
          className="gap-2 bg-[#25D366] text-white hover:bg-[#128C7E]"
          size="sm"
        >
          <MessageCircle className="h-4 w-4" />
          WhatsApp
        </Button>

        {/* Telegram */}
        <Button
          onClick={handleTelegramShare}
          className="gap-2 bg-[#0088cc] text-white hover:bg-[#006699]"
          size="sm"
        >
          <Send className="h-4 w-4" />
          Telegram
        </Button>

        {/* Copy Link / Native Share */}
        <Button
          onClick={handleNativeShare}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <Link2 className="h-4 w-4" />
          {canNativeShare ? "Share" : "Copy Link"}
        </Button>
      </div>
    </div>
  );
}
