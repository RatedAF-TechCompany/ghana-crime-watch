import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePWAInstall } from "@/hooks/use-pwa-install";

export function PWAInstallPrompt() {
  const { isInstallable, promptInstall, dismissPrompt } = usePWAInstall();

  if (!isInstallable) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md animate-in slide-in-from-bottom-4 duration-300 md:left-auto md:right-4">
      <div className="rounded-xl border border-border bg-card p-4 shadow-lg">
        <button
          onClick={dismissPrompt}
          className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
        
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Download className="h-6 w-6" />
          </div>
          
          <div className="min-w-0 flex-1">
            <h3 className="font-serif font-bold text-foreground">
              Install GhanaCrimes
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Add to home screen for quick access and offline reading
            </p>
            
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                onClick={promptInstall}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Install App
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={dismissPrompt}
              >
                Not Now
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
