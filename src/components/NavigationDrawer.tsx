import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CATEGORIES } from "@/lib/categories";
import { Link } from "react-router-dom";

interface NavigationDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function NavigationDrawer({ open, onClose }: NavigationDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="left" className="w-[300px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span>Categories</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="hover:bg-transparent"
            >
              <X className="h-5 w-5" />
            </Button>
          </SheetTitle>
        </SheetHeader>
        <nav className="mt-6 flex flex-col space-y-1">
          {CATEGORIES.map((category) => (
            <Link
              key={category.slug}
              to={`/${category.slug}`}
              onClick={onClose}
              className="rounded px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
            >
              {category.label}
            </Link>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
