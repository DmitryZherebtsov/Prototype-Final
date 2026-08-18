import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { AlertCard } from "@/components/AlertCard";
import { NeedUrgencyBadge } from "@/components/badges";
import { AppShell } from "@/components/AppShell";
import { useAlerts } from "@/hooks/useAlerts";
import { useAuth, type OrgRecord } from "@/hooks/useAuth";
import { useNeeds } from "@/hooks/useNeeds";
import { useTasks } from "@/hooks/useTasks";
import { supabase } from "@/integrations/supabase/client";
import {
  CATEGORY_LABELS,
  NEED_STATUS_LABELS,
  ORG_TYPE_LABELS,
  ROLE_LABELS,
  TASK_STATUS_LABELS,
  formatDateTime,
  type AppRole,
  type NeedStatus,
  type TaskStatus,
} from "@/lib/crisis";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Administracja - Koordynacja Kryzysowa" },
      {
        name: "description",
        content:
          "Panel administratora: weryfikacja organizacji, konta, alerty, zadania i potrzeby.",
      },
      { property: "og:title", content: "Administracja - Koordynacja Kryzysowa" },
      {
        property: "og:description",
        content: "Panel administratora sieci koordynacji kryzysowej.",
      },
    ],
  }),
  component: AdminPage,
});

interface UserRow {
  id: string;
  active: boolean;
  created_at: string;
  organizations: { name: string; municipality: string } | null;
}

type Tab = "pending" | "users" | "alerts" | "coordination";
type CoordinationSubTab = "tasks" | "needs";

const taskStatuses: TaskStatus[] = ["new", "in_progress", "completed"];
const needStatuses: NeedStatus[] = ["open", "satisfied"];

function AdminPage() {
  const { isAdmin, loading } = useAuth();
  const { alerts, reload: reloadAlerts } = useAlerts();
  const { tasks, reload: reloadTasks } = useTasks();
  const { needs, reload: reloadNeeds } = useNeeds();
  const [tab, setTab] = useState<Tab>("pending");
  const [coordinationSubTab, setCoordinationSubTab] = useState<CoordinationSubTab>("tasks");
  const [pending, setPending] = useState<OrgRecord[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<Record<string, AppRole>>({});
  const [orgs, setOrgs] = useState<OrgRecord[]>([]);

  const load = useCallback(async () => {
    const [{ data: orgsPending }, { data: allOrgs }, { data: appUsers }, { data: roleRows }] =
      await Promise.all([
        supabase.from("organizations").select("*").eq("status", "pending").order("created_at"),
        supabase.from("organizations").select("*").order("name"),
        supabase
          .from("app_users")
          .select("id, active, created_at, organizations(name, municipality)"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
    setPending((orgsPending ?? []) as OrgRecord[]);
    setOrgs((allOrgs ?? []) as OrgRecord[]);
    setUsers((appUsers ?? []) as unknown as UserRow[]);
    setRoles(
      Object.fromEntries((roleRows ?? []).map((r) => [r.user_id, r.role as AppRole])) as Record<
        string,
        AppRole
      >,
    );
  }, []);

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);

  const orgById = useMemo(() => new Map(orgs.map((o) => [o.id, o])), [orgs]);

  if (loading) {
    return (
      <AppShell title="Administracja">
        <p className="text-sm text-muted-foreground">Ładowanie…</p>
      </AppShell>
    );
  }

  if (!isAdmin) {
    return (
      <AppShell title="Administracja">
        <p className="rounded-md border bg-surface p-6 text-center text-sm text-muted-foreground">
          Ta sekcja jest dostępna wyłącznie dla administratora systemu.
        </p>
      </AppShell>
    );
  }

  const decide = async (org: OrgRecord, status: "active" | "rejected") => {
    const { error } = await supabase.from("organizations").update({ status }).eq("id", org.id);
    if (error) {
      toast.error("Nie udało się zapisać decyzji.");
      return;
    }
    toast.success(status === "active" ? "Organizacja zatwierdzona." : "Organizacja odrzucona.");
    void load();
  };

  const toggleUser = async (row: UserRow) => {
    const { error } = await supabase
      .from("app_users")
      .update({ active: !row.active })
      .eq("id", row.id);
    if (error) {
      toast.error("Nie udało się zmienić statusu konta.");
      return;
    }
    void load();
  };

  const cancelAlert = async (id: string) => {
    const { error } = await supabase.from("alerts").update({ status: "cancelled" }).eq("id", id);
    if (error) {
      toast.error("Nie udało się odwołać alertu.");
      return;
    }
    toast.success("Alert odwołany.");
    void reloadAlerts();
  };

  const updateTaskStatus = async (id: string, status: TaskStatus) => {
    const { error } = await supabase.from("tasks").update({ status }).eq("id", id);
    if (error) {
      toast.error("Nie udało się zaktualizować zadania.");
      return;
    }
    toast.success("Status zadania zaktualizowany.");
    void reloadTasks();
  };

  const updateNeedStatus = async (id: string, status: NeedStatus) => {
    const { error } = await supabase.from("needs").update({ status }).eq("id", id);
    if (error) {
      toast.error("Nie udało się zaktualizować potrzeby.");
      return;
    }
    toast.success("Status potrzeby zaktualizowany.");
    void reloadNeeds();
  };

  return (
    <AppShell title="Administracja">
      <div className="mb-4 flex gap-1 overflow-x-auto border-b">
        {(
          [
            ["pending", `Oczekujące (${pending.length})`],
            ["users", "Użytkownicy"],
            ["alerts", "Wszystkie alerty"],
            ["coordination", "Zadania i potrzeby"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap ${
              tab === key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "pending" ? (
        <div className="space-y-3">
          {pending.length === 0 ? (
            <p className="rounded-md border bg-surface p-6 text-center text-sm text-muted-foreground">
              Brak zgłoszeń oczekujących na weryfikację.
            </p>
          ) : (
            pending.map((org) => (
              <div key={org.id} className="rounded-md border bg-surface p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold">{org.name}</h2>
                  <span className="rounded-sm bg-muted px-2 py-0.5 text-xs font-medium">
                    {ORG_TYPE_LABELS[org.type]}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {formatDateTime(org.created_at)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {org.municipality} · {org.contact_person} · {org.email}
                  {org.phone ? ` · ${org.phone}` : ""}
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => void decide(org, "active")}
                    className="rounded-sm bg-sev-low px-4 py-2 text-sm font-semibold text-sev-low-foreground"
                  >
                    Zatwierdź
                  </button>
                  <button
                    onClick={() => void decide(org, "rejected")}
                    className="rounded-sm border px-4 py-2 text-sm font-semibold hover:bg-muted"
                  >
                    Odrzuć
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : null}

      {tab === "users" ? (
        <div className="overflow-x-auto rounded-md border bg-surface">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs tracking-wide text-muted-foreground uppercase">
              <tr>
                <th className="px-4 py-3">Organizacja</th>
                <th className="px-4 py-3">Rola</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.map((row) => (
                <tr key={row.id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    {row.organizations?.name ?? "—"}
                    <span className="block text-xs text-muted-foreground">
                      {row.organizations?.municipality}
                    </span>
                  </td>
                  <td className="px-4 py-3">{roles[row.id] ? ROLE_LABELS[roles[row.id]!] : "—"}</td>
                  <td className="px-4 py-3">{row.active ? "Aktywne" : "Zablokowane"}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => void toggleUser(row)}
                      className="rounded-sm border px-3 py-1.5 text-sm font-medium hover:bg-muted"
                    >
                      {row.active ? "Dezaktywuj" : "Aktywuj"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {tab === "alerts" ? (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              actions={
                alert.status !== "cancelled" ? (
                  <button
                    onClick={() => void cancelAlert(alert.id)}
                    className="rounded-sm bg-sev-high px-3 py-2 text-sm font-medium text-sev-high-foreground"
                  >
                    Odwołaj alert
                  </button>
                ) : null
              }
            />
          ))}
        </div>
      ) : null}

      {tab === "coordination" ? (
        <div>
          <div className="mb-4 flex gap-1">
            {(
              [
                ["tasks", "Zadania"],
                ["needs", "Potrzeby"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setCoordinationSubTab(key)}
                className={`rounded-sm border px-3 py-1.5 text-sm font-medium transition-colors ${
                  coordinationSubTab === key
                    ? "border-primary bg-primary/10 text-primary"
                    : "hover:bg-muted"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {coordinationSubTab === "tasks" ? (
            <div className="overflow-x-auto rounded-md border bg-surface">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-xs tracking-wide text-muted-foreground uppercase">
                  <tr>
                    <th className="px-4 py-3">Zadanie</th>
                    <th className="px-4 py-3">Organizacja</th>
                    <th className="px-4 py-3">Gmina</th>
                    <th className="px-4 py-3">Termin</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                        Brak zadań.
                      </td>
                    </tr>
                  ) : (
                    tasks.map((task) => (
                      <tr key={task.id} className="border-b last:border-0">
                        <td className="max-w-xs px-4 py-3 font-medium">{task.title}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {orgById.get(task.assigned_organization_id)?.name ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{task.municipality}</td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {new Date(task.deadline).toLocaleDateString("pl-PL")}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={task.status}
                            onChange={(e) =>
                              void updateTaskStatus(task.id, e.target.value as TaskStatus)
                            }
                            className="input-base py-1.5 text-xs"
                          >
                            {taskStatuses.map((s) => (
                              <option key={s} value={s}>
                                {TASK_STATUS_LABELS[s]}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : null}

          {coordinationSubTab === "needs" ? (
            <div className="overflow-x-auto rounded-md border bg-surface">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-xs tracking-wide text-muted-foreground uppercase">
                  <tr>
                    <th className="px-4 py-3">Potrzeba</th>
                    <th className="px-4 py-3">Organizacja</th>
                    <th className="px-4 py-3">Gmina</th>
                    <th className="px-4 py-3">Pilność</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {needs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                        Brak potrzeb.
                      </td>
                    </tr>
                  ) : (
                    needs.map((need) => (
                      <tr key={need.id} className="border-b last:border-0">
                        <td className="max-w-xs px-4 py-3 font-medium">
                          {CATEGORY_LABELS[need.category]} — {need.description}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {orgById.get(need.organization_id)?.name ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{need.municipality}</td>
                        <td className="px-4 py-3">
                          <NeedUrgencyBadge urgency={need.urgency} />
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={need.status}
                            onChange={(e) =>
                              void updateNeedStatus(need.id, e.target.value as NeedStatus)
                            }
                            className="input-base py-1.5 text-xs"
                          >
                            {needStatuses.map((s) => (
                              <option key={s} value={s}>
                                {NEED_STATUS_LABELS[s]}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}
    </AppShell>
  );
}
