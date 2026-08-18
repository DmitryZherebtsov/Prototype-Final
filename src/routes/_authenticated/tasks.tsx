import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import { TaskPriorityBadge } from "@/components/badges";
import { VerifiedGate } from "@/components/VerifiedGate";
import { useAlerts } from "@/hooks/useAlerts";
import { useAuth, type OrgRecord } from "@/hooks/useAuth";
import { useTasks } from "@/hooks/useTasks";
import { supabase } from "@/integrations/supabase/client";
import { getDemoOrgName, isDemoRecordId } from "@/lib/demoData";
import {
  MUNICIPALITIES,
  TASK_PRIORITY_LABELS,
  type Task,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/crisis";

export const Route = createFileRoute("/_authenticated/tasks")({
  head: () => ({
    meta: [
      { title: "Zadania — Koordynacja Kryzysowa" },
      {
        name: "description",
        content: "Tablica zadań koordynacyjnych — przypisania, terminy i status realizacji.",
      },
      { property: "og:title", content: "Zadania — Koordynacja Kryzysowa" },
      {
        property: "og:description",
        content: "Tablica zadań koordynacyjnych dla zweryfikowanych organizacji.",
      },
    ],
  }),
  component: TasksPage,
});

const columns: {
  status: TaskStatus;
  label: string;
  dot: string;
  next: TaskStatus | null;
  nextLabel: string | null;
}[] = [
  {
    status: "new",
    label: "Nowe",
    dot: "bg-muted-foreground",
    next: "in_progress",
    nextLabel: "W trakcie",
  },
  {
    status: "in_progress",
    label: "W trakcie",
    dot: "bg-primary",
    next: "completed",
    nextLabel: "Zakończone",
  },
  { status: "completed", label: "Zakończone", dot: "bg-sev-low", next: null, nextLabel: null },
];

const priorities: TaskPriority[] = ["low", "medium", "high"];

const emptyForm = {
  title: "",
  description: "",
  assignedOrganizationId: "",
  priority: "medium" as TaskPriority,
  relatedAlertId: "",
  deadline: "",
  municipality: MUNICIPALITIES[0]!,
};

function TasksPage() {
  const { organization, canManageTasks } = useAuth();
  const { tasks, loading, reload } = useTasks();
  const { alerts } = useAlerts();
  const [orgs, setOrgs] = useState<OrgRecord[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [mobileTab, setMobileTab] = useState<TaskStatus>("new");
  const [filters, setFilters] = useState({
    organizationId: "",
    priority: "",
    municipality: "",
  });

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("organizations")
        .select("*")
        .eq("status", "active")
        .order("name");
      setOrgs((data ?? []) as OrgRecord[]);
    })();
  }, []);

  const orgById = useMemo(() => new Map(orgs.map((o) => [o.id, o])), [orgs]);
  const alertById = useMemo(() => new Map(alerts.map((a) => [a.id, a])), [alerts]);

  const canSubmit =
    form.title.trim() && form.assignedOrganizationId && form.deadline && canManageTasks;

  const canAdvance = (task: Task) =>
    canManageTasks ||
    task.assigned_organization_id === organization?.id ||
    task.created_by === organization?.id;

  const filtered = useMemo(
    () =>
      tasks.filter(
        (t) =>
          (!filters.organizationId || t.assigned_organization_id === filters.organizationId) &&
          (!filters.priority || t.priority === filters.priority) &&
          (!filters.municipality || t.municipality === filters.municipality),
      ),
    [tasks, filters],
  );

  const tasksByStatus = (status: TaskStatus) =>
    filtered
      .filter((t) => t.status === status)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const createTask = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit || !organization) return;
    setBusy(true);
    const assigned = orgById.get(form.assignedOrganizationId);
    const { error } = await supabase.from("tasks").insert({
      title: form.title.trim(),
      description: form.description.trim(),
      priority: form.priority,
      status: "new",
      assigned_organization_id: form.assignedOrganizationId,
      created_by: organization.id,
      related_alert_id: form.relatedAlertId || null,
      municipality: assigned?.municipality ?? form.municipality,
      deadline: form.deadline,
    });
    setBusy(false);
    if (error) {
      toast.error("Nie udało się utworzyć zadania.");
      return;
    }
    toast.success("Zadanie utworzone.");
    setForm(emptyForm);
    setFormOpen(false);
    void reload();
  };

  const advanceStatus = async (task: Task, next: TaskStatus) => {
    if (isDemoRecordId(task.id)) return;
    const { error } = await supabase.from("tasks").update({ status: next }).eq("id", task.id);
    if (error) {
      toast.error("Nie udało się zaktualizować statusu.");
      return;
    }
    toast.success("Status zadania zaktualizowany.");
    void reload();
  };

  const renderCard = (task: Task) => {
    const org = orgById.get(task.assigned_organization_id);
    const orgName = org?.name ?? getDemoOrgName(task.assigned_organization_id);
    const related = task.related_alert_id ? alertById.get(task.related_alert_id) : null;
    const column = columns.find((c) => c.status === task.status);

    return (
      <motion.article
        key={task.id}
        layout
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-md border bg-surface p-3 shadow-sm transition-colors hover:border-primary/40"
      >
        <h3 className="text-sm leading-snug font-semibold">{task.title}</h3>
        {task.description ? (
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{task.description}</p>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <TaskPriorityBadge priority={task.priority} />
          <span className="truncate text-xs text-muted-foreground">{orgName}</span>
        </div>
        <p className="mt-2 font-mono text-xs text-muted-foreground">
          Termin: {new Date(task.deadline).toLocaleDateString("pl-PL")}
        </p>
        {related ? (
          <span className="mt-2 inline-flex items-center gap-1 rounded-sm border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            <Icon icon="mdi:alarm-light" width={12} height={12} aria-hidden />
            {related.title}
          </span>
        ) : null}
        {column?.next && canAdvance(task) ? (
          <button
            type="button"
            onClick={() => void advanceStatus(task, column.next!)}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-sm border px-3 py-2 text-xs font-medium hover:bg-muted"
          >
            <Icon icon="tabler:arrow-right" width={14} height={14} aria-hidden />
            {column.nextLabel}
          </button>
        ) : null}
      </motion.article>
    );
  };

  return (
    <VerifiedGate title="Zadania">
      <div className="space-y-6">
        {canManageTasks ? (
          <section className="overflow-hidden rounded-md border bg-surface">
            <button
              type="button"
              onClick={() => setFormOpen((v) => !v)}
              className="flex w-full items-center justify-between px-4 py-3 text-left"
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Icon
                  icon="tabler:plus"
                  width={16}
                  height={16}
                  className="text-primary"
                  aria-hidden
                />
                Utwórz nowe zadanie
              </span>
              <Icon
                icon="tabler:chevron-down"
                width={16}
                height={16}
                className={`transition-transform ${formOpen ? "rotate-180" : ""}`}
                aria-hidden
              />
            </button>
            <AnimatePresence initial={false}>
              {formOpen ? (
                <motion.form
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={createTask}
                  className="overflow-hidden border-t"
                >
                  <div className="grid gap-4 p-4 lg:grid-cols-2">
                    <div className="space-y-3">
                      <div>
                        <label htmlFor="task-title" className="mb-1 block text-sm font-medium">
                          Tytuł
                        </label>
                        <input
                          id="task-title"
                          required
                          maxLength={140}
                          value={form.title}
                          onChange={(e) => setForm({ ...form, title: e.target.value })}
                          className="input-base"
                        />
                      </div>
                      <div>
                        <label htmlFor="task-desc" className="mb-1 block text-sm font-medium">
                          Opis
                        </label>
                        <textarea
                          id="task-desc"
                          rows={3}
                          maxLength={1000}
                          value={form.description}
                          onChange={(e) => setForm({ ...form, description: e.target.value })}
                          className="input-base"
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label htmlFor="task-org" className="mb-1 block text-sm font-medium">
                          Przypisz do organizacji
                        </label>
                        <select
                          id="task-org"
                          required
                          value={form.assignedOrganizationId}
                          onChange={(e) =>
                            setForm({ ...form, assignedOrganizationId: e.target.value })
                          }
                          className="input-base"
                        >
                          <option value="">Wybierz organizację</option>
                          {orgs.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="task-deadline" className="mb-1 block text-sm font-medium">
                          Termin
                        </label>
                        <input
                          id="task-deadline"
                          type="date"
                          required
                          value={form.deadline}
                          onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                          className="input-base"
                        />
                      </div>
                      <div>
                        <p className="mb-1 text-sm font-medium">Priorytet</p>
                        <div className="flex flex-wrap gap-2">
                          {priorities.map((p) => (
                            <button
                              key={p}
                              type="button"
                              onClick={() => setForm({ ...form, priority: p })}
                              className={`rounded-sm border px-3 py-2 text-sm font-medium transition-colors ${
                                form.priority === p
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "hover:bg-muted"
                              }`}
                            >
                              {TASK_PRIORITY_LABELS[p]}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label htmlFor="task-alert" className="mb-1 block text-sm font-medium">
                          Powiązany alert (opcjonalnie)
                        </label>
                        <select
                          id="task-alert"
                          value={form.relatedAlertId}
                          onChange={(e) => setForm({ ...form, relatedAlertId: e.target.value })}
                          className="input-base"
                        >
                          <option value="">Brak</option>
                          {alerts.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.title}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="submit"
                        disabled={!canSubmit || busy}
                        className="w-full rounded-sm bg-primary px-4 py-3 font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                      >
                        {busy ? "Tworzenie…" : "Utwórz zadanie"}
                      </button>
                    </div>
                  </div>
                </motion.form>
              ) : null}
            </AnimatePresence>
          </section>
        ) : null}

        <div className="grid gap-2 sm:grid-cols-3">
          <select
            aria-label="Filtruj po organizacji"
            value={filters.organizationId}
            onChange={(e) => setFilters({ ...filters, organizationId: e.target.value })}
            className="input-base"
          >
            <option value="">Wszystkie organizacje</option>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Filtruj po priorytecie"
            value={filters.priority}
            onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
            className="input-base"
          >
            <option value="">Wszystkie priorytety</option>
            {priorities.map((p) => (
              <option key={p} value={p}>
                {TASK_PRIORITY_LABELS[p]}
              </option>
            ))}
          </select>
          <select
            aria-label="Filtruj po gminie"
            value={filters.municipality}
            onChange={(e) => setFilters({ ...filters, municipality: e.target.value })}
            className="input-base"
          >
            <option value="">Wszystkie gminy</option>
            {MUNICIPALITIES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Ładowanie zadań…</p>
        ) : (
          <>
            <div className="hidden gap-4 md:grid md:grid-cols-3">
              {columns.map((col) => (
                <div key={col.status}>
                  <div className="mb-3 flex items-center gap-2">
                    <span className={`size-2 rounded-full ${col.dot}`} />
                    <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      {col.label}
                    </h2>
                    <span className="font-mono text-xs text-muted-foreground">
                      {tasksByStatus(col.status).length}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {tasksByStatus(col.status).map(renderCard)}
                    {tasksByStatus(col.status).length === 0 ? (
                      <p className="py-6 text-center text-xs text-muted-foreground">Brak zadań</p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            <div className="md:hidden">
              <div className="mb-4 flex gap-1 overflow-x-auto border-b">
                {columns.map((col) => (
                  <button
                    key={col.status}
                    type="button"
                    onClick={() => setMobileTab(col.status)}
                    className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                      mobileTab === col.status
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground"
                    }`}
                  >
                    <span className={`size-1.5 rounded-full ${col.dot}`} />
                    {col.label}
                    <span className="font-mono text-xs">{tasksByStatus(col.status).length}</span>
                  </button>
                ))}
              </div>
              <div className="space-y-3">
                {tasksByStatus(mobileTab).map(renderCard)}
                {tasksByStatus(mobileTab).length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted-foreground">Brak zadań</p>
                ) : null}
              </div>
            </div>
          </>
        )}
      </div>
    </VerifiedGate>
  );
}
