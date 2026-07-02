import { X, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { CATEGORIES } from "@/lib/categories";
import { Link } from "react-router-dom";

interface NavigationDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function NavigationDrawer({ open, onClose }: NavigationDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="left" className="w-[320px] border-r border-border bg-background p-0">
        <div className="flex h-14 items-center justify-between border-b border-border bg-black px-4 text-white">
          <span className="font-display text-lg font-bold uppercase tracking-wide">Sections</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-white hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <nav className="flex flex-col py-2">
          <Link
            to="/fraud-watch"
            onClick={onClose}
            className="flex items-center gap-2 border-b border-border bg-primary/10 px-4 py-3.5 text-sm font-bold uppercase tracking-wide text-primary transition-colors hover:bg-primary/20"
          >
            <Shield className="h-4 w-4 shrink-0" />
            Fraud Watch
          </Link>
          {CATEGORIES.map((category) => (
            <Link
              key={category.slug}
              to={`/${category.slug}`}
              onClick={onClose}
              className="border-b border-border/60 px-4 py-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted hover:text-primary"
            >
              {category.label}
            </Link>
          ))}
          <div className="border-t border-border mt-2 pt-2">
            <Link
              to="/about"
              onClick={onClose}
              className="flex items-center px-4 py-3.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
            >
              About Us & Editorial Policy
            </Link>
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
