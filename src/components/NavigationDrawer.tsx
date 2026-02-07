import { X } from "lucide-react";
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
      <SheetContent side="left" className="w-[300px] border-r border-border bg-card p-0">
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <span className="font-serif text-lg font-bold text-primary">Menu</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-primary hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <nav className="flex flex-col py-2">
          {CATEGORIES.map((category) => (
            <Link
              key={category.slug}
              to={`/${category.slug}`}
              onClick={onClose}
              className="border-b border-border/50 px-4 py-3.5 font-serif text-sm font-medium text-foreground transition-colors hover:bg-muted hover:text-primary"
            >
              {category.label}
            </Link>
          ))}
          <div className="border-t border-border mt-2 pt-2">
            <Link
              to="/about"
              onClick={onClose}
              className="px-4 py-3.5 font-serif text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-primary flex items-center"
            >
              About Us & Editorial Policy
            </Link>
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
