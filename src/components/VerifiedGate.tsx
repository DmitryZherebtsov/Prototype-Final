import { Link } from "@tanstack/react-router";
import { Icon } from "@iconify/react";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";

/** Blocks pages until the signed-in user's organization is approved. */
export function VerifiedGate({ title, children }: { title: string; children: React.ReactNode }) {
  const { loading, organization, isVerified } = useAuth();

  if (loading) {
    return (
      <AppShell title={title}>
        <p className="text-sm text-muted-foreground">Ładowanie…</p>
      </AppShell>
    );
  }

  if (!isVerified) {
    return (
      <AppShell title={title}>
        <div className="rounded-md border bg-surface p-6 text-center">
          <Icon
            icon="solar:clock-circle-bold"
            className="mx-auto size-10 text-muted-foreground"
            aria-hidden
          />
          <h2 className="mt-3 text-lg font-semibold">
            {organization?.status === "rejected"
              ? "Twoje konto zostało odrzucone. Skontaktuj się z administratorem."
              : "Oczekuje na weryfikację"}
          </h2>
          {organization?.status !== "rejected" ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Twoje konto oczekuje na weryfikację przez administratora.
            </p>
          ) : null}
          <Link to="/" className="mt-4 inline-block text-sm font-medium text-primary underline">
            Przejdź do publicznych alertów
          </Link>
        </div>
      </AppShell>
    );
  }

  return <AppShell title={title}>{children}</AppShell>;
}
