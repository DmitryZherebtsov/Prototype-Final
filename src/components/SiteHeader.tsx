import { Link } from "@tanstack/react-router";
import { Icon } from "@iconify/react";
import { useAuth } from "@/hooks/useAuth";
import { publicNavItems } from "@/lib/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";

export function SiteHeader() {
  const { session, isVerified } = useAuth();

  return (
    <header className="sticky top-0 z-20 border-b bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <Icon icon="solar:shield-warning-bold" className="size-6 text-sev-high" aria-hidden />
          <span className="text-base leading-tight font-bold tracking-tight">
            Koordynacja
            <span className="block text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              Kryzysowa
            </span>
          </span>
        </Link>
        <span className="hidden rounded-sm border px-2 py-0.5 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase sm:inline">
          Widok publiczny
        </span>
        <nav
          aria-label="Nawigacja publiczna"
          className="ml-auto flex items-center gap-1 text-sm font-medium"
        >
          {publicNavItems.map((item) =>
            item.to === "/" ? (
              <Link
                key={item.to}
                to={item.to}
                className="flex items-center gap-1.5 rounded-sm px-3 py-2 hover:bg-muted"
                activeOptions={{ exact: true }}
                activeProps={{ className: "bg-muted" }}
              >
                <Icon icon={item.icon} width={15} height={15} aria-hidden />
                {item.label}
              </Link>
            ) : (
              <Link
                key={item.to}
                to={item.to}
                className="flex items-center gap-1.5 rounded-sm px-3 py-2 hover:bg-muted"
                activeProps={{ className: "bg-muted" }}
              >
                <Icon icon={item.icon} width={15} height={15} aria-hidden />
                {item.label}
              </Link>
            ),
          )}
          {session && isVerified ? (
            <Link
              to="/dashboard"
              className="rounded-sm bg-primary px-3 py-2 text-primary-foreground hover:bg-primary/90"
            >
              Panel
            </Link>
          ) : session ? (
            <Link
              to="/dashboard"
              className="rounded-sm border px-3 py-2 hover:bg-muted"
              title="Konto oczekuje na weryfikację"
            >
              Panel
            </Link>
          ) : (
            <Link
              to="/login"
              className="rounded-sm bg-primary px-3 py-2 text-primary-foreground hover:bg-primary/90"
            >
              Zaloguj
            </Link>
          )}
          <ThemeToggle className="ml-1" />
        </nav>
      </div>
    </header>
  );
}
