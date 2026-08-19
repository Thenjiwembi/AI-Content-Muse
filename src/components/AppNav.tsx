import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

const LINKS = [
  { to: "/studio", label: "Studio" },
  { to: "/images", label: "Images" },
  { to: "/minutes", label: "Minutes" },
  { to: "/prompts", label: "Prompts" },
  { to: "/archive", label: "Archive" },
] as const;

export function AppNav() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <nav className="mx-auto flex w-full max-w-7xl items-center gap-4 px-5 py-3">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <Sparkles className="size-5 text-primary" />
          Forge Studio
        </Link>
        <div className="hidden flex-1 items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "bg-secondary text-foreground" }}
            >
              {l.label}
            </Link>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <>
              <Button asChild variant="secondary" size="sm">
                <Link to="/profile">Profile</Link>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                aria-label="Sign out"
                onClick={async () => {
                  await signOut();
                  navigate({ to: "/" });
                }}
              >
                <LogOut />
              </Button>
            </>
          ) : (
            <Button asChild size="sm">
              <Link to="/auth">Sign in</Link>
            </Button>
          )}
        </div>
      </nav>
      <div className="flex gap-1 overflow-x-auto border-t border-border/60 px-4 py-2 md:hidden">
        {LINKS.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm text-muted-foreground"
            activeProps={{ className: "bg-secondary text-foreground" }}
          >
            {l.label}
          </Link>
        ))}
      </div>
    </header>
  );
}
