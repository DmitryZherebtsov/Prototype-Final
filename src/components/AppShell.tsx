import { Link } from "@tanstack/react-router";
import { Icon } from "@iconify/react";
import type { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { ROLE_LABELS } from "@/lib/crisis";
import { adminNavItem, filterNavItems, panelNavItems, type NavAuth } from "@/lib/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";

export function AppShell({ title, children }: { title: string; children: ReactNode }) {
  const auth = useAuth();
  const navAuth: NavAuth = {
    isVerified: auth.isVerified,
    isAdmin: auth.isAdmin,
    canManageAlerts: auth.canManageAlerts,
    canManageTasks: auth.canManageTasks,
    role: auth.role,
  };

  const panelLinks = filterNavItems(panelNavItems, navAuth);
  const showAdmin = adminNavItem.visible?.(navAuth) ?? true;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b bg-surface">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link to="/dashboard" className="flex items-center gap-2 font-bold">
            <Icon icon="solar:shield-warning-bold" className="size-5 text-sev-high" aria-hidden />
            <span className="hidden sm:inline">Koordynacja Kryzysowa</span>
          </Link>
          <span className="hidden rounded-sm bg-primary/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-primary uppercase md:inline">
            Panel organizacji
          </span>
          <div className="ml-auto flex items-center gap-2 text-sm">
            <div className="hidden text-right leading-tight sm:block">
              <p className="font-medium">{auth.organization?.name}</p>
              <p className="text-xs text-muted-foreground">
                {auth.role ? ROLE_LABELS[auth.role] : ""}
              </p>
            </div>
            <ThemeToggle />
            <button
              onClick={() => void auth.signOut()}
              className="inline-flex items-center gap-1.5 rounded-sm border px-3 py-2 font-medium hover:bg-muted"
            >
              <Icon icon="solar:logout-3-bold" className="size-4" aria-hidden />
              <span className="hidden sm:inline">Wyloguj</span>
            </button>
          </div>
        </div>

        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-2 pb-2">
          <nav
            aria-label="Panel organizacji"
            className="flex gap-1 overflow-x-auto text-sm font-medium"
          >
            {panelLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="flex items-center gap-1.5 rounded-sm px-3 py-2 whitespace-nowrap hover:bg-muted"
                activeProps={{ className: "bg-primary/10 text-primary" }}
              >
                <Icon icon={link.icon} width={16} height={16} aria-hidden />
                {link.label}
              </Link>
            ))}
            {showAdmin ? (
              <Link
                to={adminNavItem.to}
                className="flex items-center gap-1.5 rounded-sm px-3 py-2 whitespace-nowrap hover:bg-muted"
                activeProps={{ className: "bg-primary/10 text-primary" }}
              >
                <Icon icon={adminNavItem.icon} width={16} height={16} aria-hidden />
                {adminNavItem.label}
              </Link>
            ) : null}
          </nav>

          <div className="flex items-center gap-2 border-t pt-2">
            <Link
              to="/map"
              className="inline-flex items-center gap-1.5 rounded-sm px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Icon icon="mdi:earth" width={14} height={14} aria-hidden />
              Wyjdź do widoku publicznego
            </Link>
            <span className="text-muted-foreground/40">·</span>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-sm px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Icon icon="mdi:bell-outline" width={14} height={14} aria-hidden />
              Lista alertów publicznych
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="mb-5 text-2xl font-bold tracking-tight">{title}</h1>
        {children}
      </main>
    </div>
  );
}
