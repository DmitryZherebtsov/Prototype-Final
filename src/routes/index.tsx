import { createFileRoute, Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@iconify/react";
import { AlertCard } from "@/components/AlertCard";
import { SiteHeader } from "@/components/SiteHeader";
import { useAlerts } from "@/hooks/useAlerts";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Alerty kryzysowe — Koordynacja Kryzysowa" },
      {
        name: "description",
        content:
          "Zweryfikowane alerty kryzysowe z gmin i służb — aktualizowane na żywo, dostępne bez logowania.",
      },
      { property: "og:title", content: "Alerty kryzysowe — Koordynacja Kryzysowa" },
      {
        property: "og:description",
        content: "Zweryfikowane alerty kryzysowe z gmin i służb, aktualizowane na żywo.",
      },
    ],
  }),
  component: PublicFeed,
});

function PublicFeed() {
  const { alerts, loading } = useAlerts();
  const active = alerts.filter((a) => a.status !== "cancelled");
  const cancelled = alerts.filter((a) => a.status === "cancelled");

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <div className="mb-5">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Alerty</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Zweryfikowane informacje od samorządów, służb i organizacji pomocowych.
          </p>
          <Link
            to="/map"
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-base font-semibold text-primary-foreground hover:bg-primary/90 sm:w-auto"
          >
            Pokaż na mapie
            <Icon icon="tabler:arrow-right" width={16} height={16} aria-hidden />
          </Link>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Ładowanie alertów…</p>
        ) : alerts.length === 0 ? (
          <p className="rounded-md border bg-surface p-6 text-center text-sm text-muted-foreground">
            Brak aktywnych alertów.
          </p>
        ) : (
          <motion.div layout className="space-y-3">
            <AnimatePresence initial={false}>
              {active.map((alert) => (
                <AlertCard key={alert.id} alert={alert} />
              ))}
            </AnimatePresence>
            {cancelled.length > 0 ? (
              <>
                <h2 className="pt-4 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Odwołane
                </h2>
                {cancelled.map((alert) => (
                  <AlertCard key={alert.id} alert={alert} />
                ))}
              </>
            ) : null}
          </motion.div>
        )}
      </main>
    </div>
  );
}
