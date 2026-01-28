import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
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
    // Store dismissal in localStorage
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());
  };

  // Check if prompt was recently dismissed
  const isDismissed = () => {
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (!dismissed) return false;
    
    const dismissedTime = parseInt(dismissed, 10);
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
    return Date.now() - dismissedTime < threeDaysMs;
  };

  return {
    isInstallable: isInstallable && !isDismissed(),
    isInstalled,
    promptInstall,
    dismissPrompt,
  };
}
