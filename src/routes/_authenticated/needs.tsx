import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import { NeedStatusBadge, NeedUrgencyBadge } from "@/components/badges";
import { VerifiedGate } from "@/components/VerifiedGate";
import { useAuth, type OrgRecord } from "@/hooks/useAuth";
import { useNeeds } from "@/hooks/useNeeds";
import { supabase } from "@/integrations/supabase/client";
import { getDemoOrgName, isDemoRecordId } from "@/lib/demoData";
import {
  CATEGORY_LABELS,
  MUNICIPALITIES,
  NEED_URGENCY_LABELS,
  NEED_STATUS_LABELS,
  timeAgo,
  type Need,
  type NeedStatus,
  type NeedUrgency,
  type ResourceCategory,
} from "@/lib/crisis";

export const Route = createFileRoute("/_authenticated/needs")({
  head: () => ({
    meta: [
      { title: "Potrzeby — Koordynacja Kryzysowa" },
      {
        name: "description",
        content: "Zgłaszaj i przeglądaj potrzeby organizacji w sytuacji kryzysowej.",
      },
      { property: "og:title", content: "Potrzeby — Koordynacja Kryzysowa" },
      {
        property: "og:description",
        content: "Rejestr potrzeb ludzkich, materialnych i logistycznych.",
      },
    ],
  }),
  component: NeedsPage,
});

const categories: ResourceCategory[] = ["human", "material", "logistics"];
const urgencies: NeedUrgency[] = ["urgent", "medium", "low"];
const statuses: NeedStatus[] = ["open", "satisfied"];

const emptyForm = {
  category: "material" as ResourceCategory,
  description: "",
  quantity: "",
  urgency: "medium" as NeedUrgency,
};

function NeedsPage() {
  const { organization } = useAuth();
  const { needs, loading, reload } = useNeeds();
  const [orgs, setOrgs] = useState<OrgRecord[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState({
    category: "",
    urgency: "",
    municipality: "",
    status: "",
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

  const canSubmit = form.description.trim() && form.quantity.trim() && organization;

  const filtered = useMemo(
    () =>
      needs.filter(
        (n) =>
          (!filters.category || n.category === filters.category) &&
          (!filters.urgency || n.urgency === filters.urgency) &&
          (!filters.municipality || n.municipality === filters.municipality) &&
          (!filters.status || n.status === filters.status),
      ),
    [needs, filters],
  );

  const submitNeed = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit || !organization) return;
    setBusy(true);
    const { error } = await supabase.from("needs").insert({
      organization_id: organization.id,
      category: form.category,
      description: form.description.trim(),
      quantity: form.quantity.trim(),
      urgency: form.urgency,
      status: "open",
      municipality: organization.municipality,
    });
    setBusy(false);
    if (error) {
      toast.error("Nie udało się zgłosić potrzeby.");
      return;
    }
    toast.success("Potrzeba zgłoszona.");
    setForm(emptyForm);
    setFormOpen(false);
    void reload();
  };

  const markSatisfied = async (need: Need) => {
    if (isDemoRecordId(need.id)) return;
    const { error } = await supabase
      .from("needs")
      .update({ status: "satisfied" })
      .eq("id", need.id);
    if (error) {
      toast.error("Nie udało się zaktualizować statusu.");
      return;
    }
    toast.success("Potrzeba oznaczona jako zaspokojona.");
    void reload();
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderNeed = (need: Need) => {
    const org = orgById.get(need.organization_id);
    const orgName = org?.name ?? getDemoOrgName(need.organization_id);
    const satisfied = need.status === "satisfied";
    const expanded = expandedIds.has(need.id);

    if (satisfied && !expanded) {
      return (
        <motion.button
          key={need.id}
          type="button"
          layout
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => toggleExpanded(need.id)}
          className="flex w-full items-center gap-3 rounded-md border bg-surface px-4 py-2.5 text-left hover:border-primary/40"
        >
          <Icon
            icon="solar:check-circle-bold"
            className="size-4 shrink-0 text-sev-low"
            aria-hidden
          />
          <span className="flex-1 truncate text-sm text-muted-foreground">
            {orgName} — {need.description}
          </span>
          <Icon
            icon="tabler:chevron-right"
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
        </motion.button>
      );
    }

    return (
      <motion.article
        key={need.id}
        layout
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-md border bg-surface p-4 shadow-sm"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-semibold">{orgName ?? "Organizacja"}</p>
            <p className="text-xs tracking-wide text-muted-foreground uppercase">
              {CATEGORY_LABELS[need.category]} · {need.municipality}
            </p>
          </div>
          {satisfied ? (
            <button
              type="button"
              onClick={() => toggleExpanded(need.id)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Zwiń
            </button>
          ) : null}
        </div>
        <p className="mt-2 text-sm leading-relaxed">
          {need.description} · {need.quantity}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <NeedUrgencyBadge urgency={need.urgency} />
          <NeedStatusBadge status={need.status} />
          <span className="ml-auto text-xs text-muted-foreground">{timeAgo(need.created_at)}</span>
        </div>
        {!satisfied && need.organization_id === organization?.id ? (
          <button
            type="button"
            onClick={() => void markSatisfied(need)}
            className="mt-3 rounded-sm border border-sev-low/40 px-3 py-2 text-xs font-medium text-sev-low hover:bg-sev-low/10"
          >
            Oznacz jako zaspokojone
          </button>
        ) : null}
      </motion.article>
    );
  };

  return (
    <VerifiedGate title="Potrzeby">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Zgłaszaj braki i prośby o wsparcie dla swojej organizacji.
          </p>
          <button
            type="button"
            onClick={() => setFormOpen((v) => !v)}
            className="inline-flex items-center gap-2 rounded-sm bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Icon icon="tabler:plus" width={16} height={16} aria-hidden />
            Zgłoś potrzebę
          </button>
        </div>

        <AnimatePresence initial={false}>
          {formOpen ? (
            <motion.form
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              onSubmit={submitNeed}
              className="overflow-hidden rounded-md border bg-surface p-5"
            >
              <h2 className="text-lg font-semibold">Nowa potrzeba</h2>
              <div className="mt-4 space-y-4">
                <div>
                  <p className="mb-2 text-sm font-medium">Kategoria</p>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setForm({ ...form, category: c })}
                        className={`rounded-sm border px-3 py-2 text-sm font-medium transition-colors ${
                          form.category === c
                            ? "border-primary bg-primary/10 text-primary"
                            : "hover:bg-muted"
                        }`}
                      >
                        {CATEGORY_LABELS[c]}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label htmlFor="need-desc" className="mb-1 block text-sm font-medium">
                    Opis
                  </label>
                  <textarea
                    id="need-desc"
                    required
                    rows={3}
                    maxLength={500}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="input-base"
                    placeholder="Opisz czego potrzebujesz…"
                  />
                </div>
                <div>
                  <label htmlFor="need-qty" className="mb-1 block text-sm font-medium">
                    Ilość
                  </label>
                  <input
                    id="need-qty"
                    required
                    maxLength={80}
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    className="input-base"
                    placeholder="np. 3 osoby, 50 szt."
                  />
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium">Pilność</p>
                  <div className="flex flex-wrap gap-2">
                    {urgencies.map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setForm({ ...form, urgency: u })}
                        className={`rounded-sm border px-3 py-2 text-sm font-medium transition-colors ${
                          form.urgency === u
                            ? "border-primary bg-primary/10 text-primary"
                            : "hover:bg-muted"
                        }`}
                      >
                        {NEED_URGENCY_LABELS[u]}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={!canSubmit || busy}
                  className="rounded-sm bg-primary px-4 py-3 font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  {busy ? "Zgłaszanie…" : "Zgłoś potrzebę"}
                </button>
              </div>
            </motion.form>
          ) : null}
        </AnimatePresence>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <select
            aria-label="Filtruj po kategorii"
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            className="input-base"
          >
            <option value="">Wszystkie kategorie</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
          <select
            aria-label="Filtruj po pilności"
            value={filters.urgency}
            onChange={(e) => setFilters({ ...filters, urgency: e.target.value })}
            className="input-base"
          >
            <option value="">Wszystkie pilności</option>
            {urgencies.map((u) => (
              <option key={u} value={u}>
                {NEED_URGENCY_LABELS[u]}
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
          <select
            aria-label="Filtruj po statusie"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="input-base"
          >
            <option value="">Wszystkie statusy</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {NEED_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Ładowanie potrzeb…</p>
        ) : filtered.length === 0 ? (
          <p className="rounded-md border bg-surface p-6 text-center text-sm text-muted-foreground">
            Brak potrzeb spełniających kryteria.
          </p>
        ) : (
          <div className="space-y-3">{filtered.map(renderNeed)}</div>
        )}
      </div>
    </VerifiedGate>
  );
}
