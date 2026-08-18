import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Icon } from "@iconify/react";
import { VerifiedGate } from "@/components/VerifiedGate";
import {
  NeedUrgencyBadge,
  SeverityBadge,
  StatusPill,
  TaskPriorityBadge,
} from "@/components/badges";
import { useAlerts } from "@/hooks/useAlerts";
import { useAuth } from "@/hooks/useAuth";
import { useNeeds } from "@/hooks/useNeeds";
import { useTasks } from "@/hooks/useTasks";
import { supabase } from "@/integrations/supabase/client";
import { TASK_STATUS_LABELS, timeAgo } from "@/lib/crisis";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Pulpit - Koordynacja Kryzysowa" },
      {
        name: "description",
        content: "Przegląd alertów, zadań, potrzeb i zasobów dla Twojej organizacji.",
      },
      { property: "og:title", content: "Pulpit — Koordynacja Kryzysowa" },
      {
        property: "og:description",
        content: "Przegląd alertów, zadań, potrzeb i zasobów.",
      },
    ],
  }),
  component: DashboardPage,
});

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: string;
  tone: "default" | "critical" | "warn" | "ok";
}) {
  const toneClass =
    tone === "critical"
      ? "text-sev-critical"
      : tone === "warn"
        ? "text-sev-high"
        : tone === "ok"
          ? "text-sev-low"
          : "text-primary";

  return (
    <div className="rounded-md border bg-surface p-4">
      <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        <Icon icon={icon} width={16} height={16} className={toneClass} aria-hidden />
        {label}
      </div>
      <p className={`mt-2 text-3xl font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}

function DashboardPage() {
  const { organization, isVerified, canManageAlerts, canManageTasks } = useAuth();
  const { alerts } = useAlerts();
  const { tasks } = useTasks();
  const { needs } = useNeeds();
  const [resourceCount, setResourceCount] = useState(0);

  const municipality = organization?.municipality ?? "";

  useEffect(() => {
    if (!isVerified || !organization) return;
    void (async () => {
      const { count } = await supabase
        .from("resources")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organization.id)
        .eq("status", "available");
      setResourceCount(count ?? 0);
    })();
  }, [isVerified, organization]);

  const stats = useMemo(() => {
    const localAlerts = alerts.filter(
      (a) => a.municipality === municipality && a.status !== "cancelled",
    );
    return {
      activeAlerts: localAlerts.length,
      criticalAlerts: localAlerts.filter((a) => a.severity === "critical").length,
      openNeeds: needs.filter((n) => n.municipality === municipality && n.status === "open").length,
      tasksInProgress: tasks.filter(
        (t) =>
          t.status === "in_progress" &&
          (t.municipality === municipality || t.assigned_organization_id === organization?.id),
      ).length,
    };
  }, [alerts, needs, tasks, municipality, organization?.id]);

  const localAlerts = alerts
    .filter((a) => a.municipality === municipality && a.status !== "cancelled")
    .slice(0, 4);

  const recentTasks = tasks
    .filter(
      (t) => t.assigned_organization_id === organization?.id || t.municipality === municipality,
    )
    .slice(0, 5);

  const openNeeds = needs
    .filter((n) => n.municipality === municipality && n.status === "open")
    .slice(0, 5);

  return (
    <VerifiedGate title={`Pulpit — ${organization?.name ?? ""}`}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="space-y-6"
      >
        <div className="flex flex-wrap gap-2">
          {canManageAlerts ? (
            <Link
              to="/alerts"
              className="inline-flex items-center gap-2 rounded-sm bg-primary px-4 py-3 font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Icon icon="mdi:alarm-light" width={16} height={16} aria-hidden />
              Utwórz alert
            </Link>
          ) : null}
          {canManageTasks ? (
            <Link
              to="/tasks"
              className="inline-flex items-center gap-2 rounded-sm border bg-surface px-4 py-3 font-semibold hover:bg-muted"
            >
              <Icon icon="mdi:clipboard-check-outline" width={16} height={16} aria-hidden />
              Utwórz zadanie
            </Link>
          ) : null}
          <Link
            to="/needs"
            className="inline-flex items-center gap-2 rounded-sm border bg-surface px-4 py-3 font-semibold hover:bg-muted"
          >
            <Icon icon="mdi:hand-heart-outline" width={16} height={16} aria-hidden />
            Zgłoś potrzebę
          </Link>
          <Link
            to="/resources"
            className="inline-flex items-center gap-2 rounded-sm border bg-surface px-4 py-3 font-semibold hover:bg-muted"
          >
            <Icon icon="tabler:plus" width={16} height={16} aria-hidden />
            Dodaj zasób
          </Link>
        </div>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Aktywne alerty"
            value={stats.activeAlerts}
            icon="mdi:alarm-light"
            tone="warn"
          />
          <StatCard
            label="Krytyczne"
            value={stats.criticalAlerts}
            icon="solar:danger-triangle-bold"
            tone="critical"
          />
          <StatCard
            label="Otwarte potrzeby"
            value={stats.openNeeds}
            icon="mdi:hand-heart-outline"
            tone="default"
          />
          <StatCard
            label="Zadania w trakcie"
            value={stats.tasksInProgress}
            icon="mdi:clipboard-check-outline"
            tone="ok"
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-md border bg-surface p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              <Icon icon="mdi:alarm-light" width={16} height={16} aria-hidden />
              Alerty — {municipality}
            </h2>
            <div className="mt-3 space-y-2">
              {localAlerts.length === 0 ? (
                <p className="text-sm text-muted-foreground">Brak aktywnych alertów w gminie.</p>
              ) : (
                localAlerts.map((alert) => (
                  <div key={alert.id} className="rounded-sm border p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <SeverityBadge severity={alert.severity} />
                      <StatusPill status={alert.status} />
                      <span className="ml-auto text-xs text-muted-foreground">
                        {timeAgo(alert.created_at)}
                      </span>
                    </div>
                    <p className="mt-2 font-medium">{alert.title}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-md border bg-surface p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              <Icon icon="ph:package-fill" width={16} height={16} aria-hidden />
              Twoje zasoby
            </h2>
            <p className="mt-3 text-4xl font-bold">{resourceCount}</p>
            <p className="text-sm text-muted-foreground">dostępnych pozycji w rejestrze</p>
            <Link
              to="/resources"
              className="mt-3 inline-block text-sm font-medium text-primary underline"
            >
              Zarządzaj zasobami
            </Link>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-md border bg-surface p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                <Icon icon="mdi:clipboard-check-outline" width={16} height={16} aria-hidden />
                Ostatnie zadania
              </h2>
              <Link to="/tasks" className="text-xs font-medium text-primary underline">
                Wszystkie
              </Link>
            </div>
            <div className="mt-3 space-y-2">
              {recentTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">Brak przypisanych zadań.</p>
              ) : (
                recentTasks.map((task) => (
                  <div key={task.id} className="rounded-sm border p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <TaskPriorityBadge priority={task.priority} />
                      <span className="rounded-sm bg-muted px-2 py-0.5 text-xs font-medium">
                        {TASK_STATUS_LABELS[task.status]}
                      </span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {timeAgo(task.created_at)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-medium">{task.title}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-md border bg-surface p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                <Icon icon="mdi:hand-heart-outline" width={16} height={16} aria-hidden />
                Otwarte potrzeby
              </h2>
              <Link to="/needs" className="text-xs font-medium text-primary underline">
                Wszystkie
              </Link>
            </div>
            <div className="mt-3 space-y-2">
              {openNeeds.length === 0 ? (
                <p className="text-sm text-muted-foreground">Brak otwartych potrzeb w gminie.</p>
              ) : (
                openNeeds.map((need) => (
                  <div key={need.id} className="rounded-sm border p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <NeedUrgencyBadge urgency={need.urgency} />
                      <span className="ml-auto text-xs text-muted-foreground">
                        {timeAgo(need.created_at)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm">
                      {need.description} · {need.quantity}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </motion.div>
    </VerifiedGate>
  );
}
