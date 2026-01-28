import { Bell, BellOff, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useNotifications } from "@/hooks/use-notifications";

export function NotificationBell() {
  const { isSupported, permission, isSubscribed, requestPermission, unsubscribe } = useNotifications();

  if (!isSupported) {
    return null;
  }

  const handleClick = () => {
    if (isSubscribed) {
      unsubscribe();
    } else {
      requestPermission();
    }
  };

  const getIcon = () => {
    if (permission === "denied") {
      return <BellOff className="h-5 w-5" />;
    }
    if (isSubscribed) {
      return <BellRing className="h-5 w-5 text-primary" />;
    }
    return <Bell className="h-5 w-5" />;
  };

  const getTooltip = () => {
    if (permission === "denied") {
      return "Notifications blocked - enable in browser settings";
    }
    if (isSubscribed) {
      return "Breaking news alerts enabled - click to disable";
    }
    return "Get breaking news alerts";
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClick}
            className={`relative ${isSubscribed ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
            aria-label={getTooltip()}
          >
            {getIcon()}
            {isSubscribed && (
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{getTooltip()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
