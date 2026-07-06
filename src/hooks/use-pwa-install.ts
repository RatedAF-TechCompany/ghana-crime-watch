import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const DISMISSAL_KEY = "pwa-install-dismissed";
const DISMISSAL_TTL_MS = 3 * 24 * 60 * 60 * 1000;

function isRecentlyDismissed(): boolean {
  if (typeof window === "undefined") return false;
  const dismissed = localStorage.getItem(DISMISSAL_KEY);
  if (!dismissed) return false;
  const dismissedTime = parseInt(dismissed, 10);
  return Date.now() - dismissedTime < DISMISSAL_TTL_MS;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    setIsDismissed(isRecentlyDismissed());

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) return false;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === "accepted") {
        setIsInstalled(true);
        setIsInstallable(false);
      }

      setDeferredPrompt(null);
      return outcome === "accepted";
    } catch (error) {
      console.error("PWA install error:", error);
      return false;
    }
  };

  const dismissPrompt = () => {
    setIsInstallable(false);
    setIsDismissed(true);
    if (typeof window !== "undefined") {
      localStorage.setItem(DISMISSAL_KEY, Date.now().toString());
    }
  };

  return {
    isInstallable: isInstallable && !isDismissed,
    isInstalled,
    promptInstall,
    dismissPrompt,
  };
}
