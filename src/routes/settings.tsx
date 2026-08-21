import { createFileRoute, Link } from "@tanstack/react-router";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Forge Studio" },
      {
        name: "description",
        content: "Manage appearance, workspace defaults and account settings in Forge Studio.",
      },
      { property: "og:title", content: "Settings — Forge Studio" },
      {
        property: "og:description",
        content: "Theme, defaults and account controls for your AI content workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { user, signOut } = useAuth();

  return (
    <DashboardShell title="Settings" description="Appearance and account preferences">
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="panel p-6">
          <h2 className="text-lg font-semibold">Appearance</h2>
          <div className="mt-4 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <Label htmlFor="dark-mode">Dark mode</Label>
              <p className="mt-1 text-xs text-muted-foreground">
                Switch between the light and dark theme.
              </p>
            </div>
            <Switch
              id="dark-mode"
              checked={theme === "dark"}
              onCheckedChange={(v) => setTheme(v ? "dark" : "light")}
            />
          </div>
        </section>

        <section className="panel p-6">
          <h2 className="text-lg font-semibold">Account</h2>
          {user ? (
            <>
              <p className="mt-3 truncate text-sm text-muted-foreground">{user.email}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild variant="secondary" size="sm">
                  <Link to="/profile">Edit profile</Link>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => void signOut()}>
                  Sign out
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="mt-3 text-sm text-muted-foreground">
                Sign in to manage your account and archive.
              </p>
              <Button asChild size="sm" className="mt-4">
                <Link to="/auth">Sign in</Link>
              </Button>
            </>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}
