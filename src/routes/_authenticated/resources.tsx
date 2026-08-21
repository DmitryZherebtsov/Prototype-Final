import { Fragment, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import { VerifiedGate } from "@/components/VerifiedGate";
import { useAuth } from "@/hooks/useAuth";
import { useResources } from "@/hooks/useResources";
import { supabase } from "@/integrations/supabase/client";
import { getDemoOrgName, isDemoRecordId } from "@/lib/demoData";
import { cn } from "@/lib/utils";
import {
  AVAILABILITY_LABELS,
  AVAILABILITY_ORDER,
  AVAILABILITY_SHORT,
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  MUNICIPALITIES,
  type AvailabilityWindow,
  type ResourceCategory,
} from "@/lib/crisis";
import type { ResourceMapItem } from "@/hooks/useMapResources";

export const Route = createFileRoute("/_authenticated/resources")({
  head: () => ({
    meta: [
      { title: "Zasoby — Koordynacja Kryzysowa" },
      {
        name: "description",
        content:
          "Macierz zasobów ludzkich, materialnych i logistycznych zweryfikowanych organizacji.",
      },
      { property: "og:title", content: "Zasoby — Koordynacja Kryzysowa" },
      {
        property: "og:description",
        content: "Macierz zasobów zweryfikowanych organizacji.",
      },
    ],
  }),
  component: ResourcesPage,
});

const categories: ResourceCategory[] = ["human", "material", "logistics"];
const windows: AvailabilityWindow[] = ["24h", "48h", "72h", "1week"];

type ColAxis = "category" | "window";
type ViewMode = "matrix" | "table";
type StatusFilter = "all" | "available" | "unavailable";

interface Column {
  key: string;
  label: string;
  icon: string;
  title: string;
}

const CATEGORY_COLUMNS: Column[] = categories.map((c) => ({
  key: c,
  label: CATEGORY_LABELS[c],
  icon: CATEGORY_ICONS[c],
  title: `Zasoby: ${CATEGORY_LABELS[c]}`,
}));

const WINDOW_COLUMNS: Column[] = windows.map((w) => ({
  key: w,
  label: AVAILABILITY_SHORT[w],
  icon: "solar:clock-circle-bold",
  title: AVAILABILITY_LABELS[w],
}));

/** One intersection of the matrix — counts plus the rows behind them. */
interface Cell {
  available: number;
  unavailable: number;
  items: ResourceMapItem[];
  fastest: AvailabilityWindow | null;
}

interface MatrixRow {
  orgId: string;
  orgName: string;
  municipality: string;
  cells: Map<string, Cell>;
  total: Cell;
}

function emptyCell(): Cell {
  return { available: 0, unavailable: 0, items: [], fastest: null };
}

function addToCell(cell: Cell, row: ResourceMapItem) {
  cell.items.push(row);
  if (row.status === "available") {
    cell.available += 1;
    const current = cell.fastest;
    if (!current || AVAILABILITY_ORDER[row.availability_window] < AVAILABILITY_ORDER[current]) {
      cell.fastest = row.availability_window;
    }
  } else {
    cell.unavailable += 1;
  }
}

/** Four static buckets so Tailwind keeps the classes; intensity is relative to the busiest cell. */
function heatClass(value: number, max: number): string {
  if (value <= 0) return "";
  const ratio = value / Math.max(max, 1);
  if (ratio > 0.75) return "bg-primary/20";
  if (ratio > 0.5) return "bg-primary/15";
  if (ratio > 0.25) return "bg-primary/10";
  return "bg-primary/5";
}

/** Join rows are nullable for records seeded outside Supabase, so fall back to the demo map. */
function orgNameOf(row: ResourceMapItem): string {
  return row.organizations?.name ?? getDemoOrgName(row.organization_id) ?? "Nieznana organizacja";
}

const emptyForm = {
  category: "material" as ResourceCategory,
  description: "",
  quantity: "",
  availability_window: "24h" as AvailabilityWindow,
};

function ResourcesPage() {
  const { organization } = useAuth();
  const { resources, loading, reload } = useResources();

  const [view, setView] = useState<ViewMode>("matrix");
  const [axis, setAxis] = useState<ColAxis>("category");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [filters, setFilters] = useState({
    query: "",
    municipality: "",
    category: "",
    window: "",
    status: "all" as StatusFilter,
  });

  const columns = axis === "category" ? CATEGORY_COLUMNS : WINDOW_COLUMNS;

  const filtered = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return resources.filter((r) => {
      if (filters.category && r.category !== filters.category) return false;
      if (filters.window && r.availability_window !== filters.window) return false;
      if (filters.municipality && r.organizations?.municipality !== filters.municipality)
        return false;
      if (filters.status !== "all" && r.status !== filters.status) return false;
      if (q) {
        const haystack = `${r.description} ${orgNameOf(r)} ${r.quantity ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [resources, filters]);

  const matrix = useMemo(() => {
    const byOrg = new Map<string, MatrixRow>();
    for (const row of filtered) {
      let entry = byOrg.get(row.organization_id);
      if (!entry) {
        entry = {
          orgId: row.organization_id,
          orgName: orgNameOf(row),
          municipality: row.organizations?.municipality ?? "—",
          cells: new Map(),
          total: emptyCell(),
        };
        byOrg.set(row.organization_id, entry);
      }
      const colKey = axis === "category" ? row.category : row.availability_window;
      let cell = entry.cells.get(colKey);
      if (!cell) {
        cell = emptyCell();
        entry.cells.set(colKey, cell);
      }
      addToCell(cell, row);
      addToCell(entry.total, row);
    }
    return [...byOrg.values()].sort(
      (a, b) =>
        b.total.available - a.total.available ||
        b.total.items.length - a.total.items.length ||
        a.orgName.localeCompare(b.orgName, "pl"),
    );
  }, [filtered, axis]);

  const columnTotals = useMemo(() => {
    const totals = new Map<string, Cell>();
    for (const col of columns) totals.set(col.key, emptyCell());
    const grand = emptyCell();
    for (const row of filtered) {
      const colKey = axis === "category" ? row.category : row.availability_window;
      const cell = totals.get(colKey);
      if (cell) addToCell(cell, row);
      addToCell(grand, row);
    }
    return { totals, grand };
  }, [filtered, columns, axis]);

  const maxCell = useMemo(() => {
    let max = 0;
    for (const row of matrix) {
      for (const cell of row.cells.values()) max = Math.max(max, cell.available);
    }
    return max;
  }, [matrix]);

  const stats = useMemo(() => {
    const available = filtered.filter((r) => r.status === "available").length;
    const rapid = filtered.filter(
      (r) => r.status === "available" && r.availability_window === "24h",
    ).length;
    return {
      total: filtered.length,
      available,
      unavailable: filtered.length - available,
      rapid,
      orgs: matrix.length,
    };
  }, [filtered, matrix]);

  const filtersActive =
    Boolean(filters.query || filters.municipality || filters.category || filters.window) ||
    filters.status !== "all";

  const resetFilters = () =>
    setFilters({ query: "", municipality: "", category: "", window: "", status: "all" });

  const addResource = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!organization) return;
    setBusy(true);
    const { error } = await supabase.from("resources").insert({
      organization_id: organization.id,
      category: form.category,
      description: form.description.trim(),
      quantity: form.quantity.trim() || null,
      availability_window: form.availability_window,
      status: "available",
    });
    setBusy(false);
    if (error) {
      toast.error("Nie udało się dodać zasobu.");
      return;
    }
    toast.success("Zasób dodany.");
    setForm(emptyForm);
    setFormOpen(false);
    void reload();
  };

  const toggleStatus = async (row: ResourceMapItem) => {
    if (isDemoRecordId(row.id)) {
      toast.info("To wpis demonstracyjny — nie można zmienić jego statusu.");
      return;
    }
    const next = row.status === "available" ? "unavailable" : "available";
    const { error } = await supabase.from("resources").update({ status: next }).eq("id", row.id);
    if (error) {
      toast.error("Nie udało się zmienić statusu.");
      return;
    }
    void reload();
  };

  const toggleExpanded = (key: string) => setExpanded((prev) => (prev === key ? null : key));

  return (
    <VerifiedGate title="Zasoby">
      <div className="space-y-4">
        <StatStrip stats={stats} />

        <Toolbar
          view={view}
          onView={setView}
          axis={axis}
          onAxis={setAxis}
          formOpen={formOpen}
          onToggleForm={() => setFormOpen((v) => !v)}
        />

        <AnimatePresence initial={false}>
          {formOpen ? (
            <motion.form
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              onSubmit={addResource}
              className="overflow-hidden rounded-md border bg-surface"
            >
              <div className="p-5">
                <h2 className="text-base font-semibold">Dodaj zasób</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Zasób trafi do rejestru jako dostępny i pojawi się na mapie.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="cat" className="mb-1 block text-sm font-medium">
                      Kategoria
                    </label>
                    <select
                      id="cat"
                      value={form.category}
                      onChange={(e) =>
                        setForm({ ...form, category: e.target.value as ResourceCategory })
                      }
                      className="input-base"
                    >
                      {categories.map((c) => (
                        <option key={c} value={c}>
                          {CATEGORY_LABELS[c]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="win" className="mb-1 block text-sm font-medium">
                      Okno dostępności
                    </label>
                    <select
                      id="win"
                      value={form.availability_window}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          availability_window: e.target.value as AvailabilityWindow,
                        })
                      }
                      className="input-base"
                    >
                      {windows.map((w) => (
                        <option key={w} value={w}>
                          {AVAILABILITY_LABELS[w]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="rdesc" className="mb-1 block text-sm font-medium">
                      Opis
                    </label>
                    <input
                      id="rdesc"
                      required
                      maxLength={300}
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      className="input-base"
                      placeholder="np. Łóżka polowe"
                    />
                  </div>
                  <div>
                    <label htmlFor="qty" className="mb-1 block text-sm font-medium">
                      Ilość
                    </label>
                    <input
                      id="qty"
                      maxLength={60}
                      value={form.quantity}
                      onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                      className="input-base"
                      placeholder="np. 40 szt."
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={busy || !form.description.trim()}
                      className="w-full rounded-sm bg-primary px-4 py-3 font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                    >
                      {busy ? "Dodawanie…" : "Dodaj zasób"}
                    </button>
                  </div>
                </div>
              </div>
            </motion.form>
          ) : null}
        </AnimatePresence>

        <Filters
          filters={filters}
          onChange={(patch) => setFilters({ ...filters, ...patch })}
          active={filtersActive}
          onReset={resetFilters}
          resultCount={filtered.length}
          totalCount={resources.length}
        />

        {loading ? (
          <p className="rounded-md border bg-surface p-6 text-center text-sm text-muted-foreground">
            Ładowanie zasobów…
          </p>
        ) : filtered.length === 0 ? (
          <div className="rounded-md border bg-surface p-10 text-center">
            <Icon
              icon="solar:box-minimalistic-broken"
              className="mx-auto size-9 text-muted-foreground"
              aria-hidden
            />
            <p className="mt-3 text-sm font-medium">Brak zasobów spełniających kryteria.</p>
            {filtersActive ? (
              <button
                type="button"
                onClick={resetFilters}
                className="mt-3 text-sm font-medium text-primary underline"
              >
                Wyczyść filtry
              </button>
            ) : null}
          </div>
        ) : view === "matrix" ? (
          <ResourceMatrix
            rows={matrix}
            columns={columns}
            axis={axis}
            maxCell={maxCell}
            columnTotals={columnTotals}
            ownOrgId={organization?.id}
            expanded={expanded}
            onToggleExpanded={toggleExpanded}
            onToggleStatus={toggleStatus}
          />
        ) : (
          <ResourceTable
            rows={filtered}
            ownOrgId={organization?.id}
            onToggleStatus={toggleStatus}
          />
        )}
      </div>
    </VerifiedGate>
  );
}

/* ------------------------------------------------------------------ stats */

function StatStrip({
  stats,
}: {
  stats: { total: number; available: number; unavailable: number; rapid: number; orgs: number };
}) {
  const tiles = [
    { label: "Zasoby w rejestrze", value: stats.total, icon: "solar:box-bold", tone: "" },
    {
      label: "Dostępne",
      value: stats.available,
      icon: "solar:check-circle-bold",
      tone: "text-sev-low",
    },
    {
      label: "Gotowe w 24h",
      value: stats.rapid,
      icon: "solar:clock-circle-bold",
      tone: "text-primary",
    },
    {
      label: "Niedostępne",
      value: stats.unavailable,
      icon: "solar:close-circle-bold",
      tone: "text-muted-foreground",
    },
    {
      label: "Organizacje",
      value: stats.orgs,
      icon: "solar:users-group-rounded-bold",
      tone: "",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {tiles.map((t) => (
        <div key={t.label} className="rounded-md border bg-surface px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Icon icon={t.icon} width={13} height={13} className={t.tone} aria-hidden />
            <span className="truncate">{t.label}</span>
          </div>
          <p className="mt-0.5 font-mono text-xl font-semibold tabular-nums">{t.value}</p>
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- toolbar */

function Toolbar({
  view,
  onView,
  axis,
  onAxis,
  formOpen,
  onToggleForm,
}: {
  view: ViewMode;
  onView: (v: ViewMode) => void;
  axis: ColAxis;
  onAxis: (a: ColAxis) => void;
  formOpen: boolean;
  onToggleForm: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <Segmented
        label="Widok"
        value={view}
        onChange={(v) => onView(v as ViewMode)}
        options={[
          { value: "matrix", label: "Macierz", icon: "solar:widget-4-bold" },
          { value: "table", label: "Tabela", icon: "solar:list-bold" },
        ]}
      />
      {view === "matrix" ? (
        <Segmented
          label="Kolumny"
          value={axis}
          onChange={(v) => onAxis(v as ColAxis)}
          options={[
            { value: "category", label: "Kategoria" },
            { value: "window", label: "Dostępność" },
          ]}
        />
      ) : null}
      <button
        type="button"
        onClick={onToggleForm}
        className="ml-auto inline-flex items-center gap-2 rounded-sm bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
      >
        <Icon icon={formOpen ? "tabler:x" : "tabler:plus"} width={16} height={16} aria-hidden />
        {formOpen ? "Anuluj" : "Dodaj zasób"}
      </button>
    </div>
  );
}

function Segmented({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; icon?: string }[];
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs tracking-wide text-muted-foreground uppercase">{label}</span>
      <div
        role="group"
        aria-label={label}
        className="inline-flex rounded-sm border bg-surface p-0.5"
      >
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1.5 text-sm font-medium transition-colors",
              value === o.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {o.icon ? <Icon icon={o.icon} width={14} height={14} aria-hidden /> : null}
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- filters */

function Filters({
  filters,
  onChange,
  active,
  onReset,
  resultCount,
  totalCount,
}: {
  filters: {
    query: string;
    municipality: string;
    category: string;
    window: string;
    status: StatusFilter;
  };
  onChange: (patch: Partial<typeof filters>) => void;
  active: boolean;
  onReset: () => void;
  resultCount: number;
  totalCount: number;
}) {
  return (
    <div className="rounded-md border bg-surface p-3">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Icon
            icon="tabler:search"
            width={16}
            height={16}
            className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            aria-label="Szukaj zasobu lub organizacji"
            placeholder="Szukaj zasobu lub organizacji"
            value={filters.query}
            onChange={(e) => onChange({ query: e.target.value })}
            className="input-base pl-9"
          />
        </div>
        <select
          aria-label="Filtruj po gminie"
          value={filters.municipality}
          onChange={(e) => onChange({ municipality: e.target.value })}
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
          aria-label="Filtruj po kategorii"
          value={filters.category}
          onChange={(e) => onChange({ category: e.target.value })}
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
          aria-label="Filtruj po dostępności"
          value={filters.window}
          onChange={(e) => onChange({ window: e.target.value })}
          className="input-base"
        >
          <option value="">Każda dostępność</option>
          {windows.map((w) => (
            <option key={w} value={w}>
              {AVAILABILITY_LABELS[w]}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
        <Segmented
          label="Status"
          value={filters.status}
          onChange={(v) => onChange({ status: v as StatusFilter })}
          options={[
            { value: "all", label: "Wszystkie" },
            { value: "available", label: "Dostępne" },
            { value: "unavailable", label: "Niedostępne" },
          ]}
        />
        <p className="ml-auto text-xs text-muted-foreground">
          Widoczne <span className="font-mono font-semibold tabular-nums">{resultCount}</span> z{" "}
          <span className="font-mono tabular-nums">{totalCount}</span>
        </p>
        {active ? (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1 rounded-sm border px-2.5 py-1.5 text-xs font-medium hover:bg-muted"
          >
            <Icon icon="tabler:filter-off" width={13} height={13} aria-hidden />
            Wyczyść filtry
          </button>
        ) : null}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- matrix */

function ResourceMatrix({
  rows,
  columns,
  axis,
  maxCell,
  columnTotals,
  ownOrgId,
  expanded,
  onToggleExpanded,
  onToggleStatus,
}: {
  rows: MatrixRow[];
  columns: Column[];
  axis: ColAxis;
  maxCell: number;
  columnTotals: { totals: Map<string, Cell>; grand: Cell };
  ownOrgId?: string | undefined;
  expanded: string | null;
  onToggleExpanded: (key: string) => void;
  onToggleStatus: (row: ResourceMapItem) => void;
}) {
  const span = columns.length + 2;

  return (
    <div className="overflow-hidden rounded-md border bg-surface">
      <div className="max-h-[62vh] overflow-auto">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th
                scope="col"
                className="sticky top-0 left-0 z-30 min-w-52 border-b bg-surface px-3 py-2.5 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase"
              >
                Organizacja
              </th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  title={col.title}
                  className="sticky top-0 z-20 min-w-24 border-b bg-surface px-3 py-2.5 text-center text-xs font-semibold tracking-wide text-muted-foreground uppercase"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Icon icon={col.icon} width={13} height={13} aria-hidden />
                    {col.label}
                  </span>
                </th>
              ))}
              <th
                scope="col"
                className="sticky top-0 z-20 min-w-20 border-b border-l bg-surface px-3 py-2.5 text-center text-xs font-semibold tracking-wide text-muted-foreground uppercase"
              >
                Razem
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => {
              const isOwn = row.orgId === ownOrgId;
              const rowExpandedKey = expanded?.startsWith(`${row.orgId}::`) ? expanded : null;

              return (
                <Fragment key={row.orgId}>
                  <tr className="group">
                    <th
                      scope="row"
                      className={cn(
                        "sticky left-0 z-10 border-b bg-surface px-3 py-2 text-left align-middle font-normal",
                        isOwn && "bg-primary/5",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => onToggleExpanded(`${row.orgId}::all`)}
                        className="flex w-full items-start gap-1.5 text-left"
                      >
                        <Icon
                          icon="tabler:chevron-right"
                          width={14}
                          height={14}
                          aria-hidden
                          className={cn(
                            "mt-1 shrink-0 text-muted-foreground transition-transform",
                            rowExpandedKey && "rotate-90",
                          )}
                        />
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{row.orgName}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {row.municipality}
                            {isOwn ? " · Twoja organizacja" : ""}
                          </span>
                        </span>
                      </button>
                    </th>

                    {columns.map((col) => {
                      const cell = row.cells.get(col.key);
                      const key = `${row.orgId}::${col.key}`;
                      const count = cell?.available ?? 0;
                      const unavailable = cell?.unavailable ?? 0;
                      const empty = !cell || cell.items.length === 0;

                      return (
                        <td key={col.key} className="border-b p-0 text-center">
                          <button
                            type="button"
                            disabled={empty}
                            aria-label={`${row.orgName} — ${col.label}: ${count} dostępnych`}
                            onClick={() => onToggleExpanded(key)}
                            className={cn(
                              "h-full w-full px-3 py-2 transition-colors",
                              heatClass(count, maxCell),
                              empty
                                ? "cursor-default text-muted-foreground/40"
                                : "cursor-pointer hover:ring-1 hover:ring-primary/50 hover:ring-inset",
                              expanded === key && "ring-1 ring-primary ring-inset",
                            )}
                          >
                            {empty ? (
                              <span className="font-mono text-sm">–</span>
                            ) : (
                              <>
                                <span className="flex items-baseline justify-center gap-1">
                                  <span className="font-mono text-base font-semibold tabular-nums">
                                    {count}
                                  </span>
                                  {unavailable > 0 ? (
                                    <span
                                      title={`${unavailable} niedostępnych`}
                                      className="font-mono text-xs text-muted-foreground"
                                    >
                                      +{unavailable}
                                    </span>
                                  ) : null}
                                </span>
                                {axis === "category" && cell?.fastest ? (
                                  <span className="mt-0.5 block text-[10px] text-muted-foreground">
                                    {AVAILABILITY_SHORT[cell.fastest]}
                                  </span>
                                ) : null}
                              </>
                            )}
                          </button>
                        </td>
                      );
                    })}

                    <td className="border-b border-l px-3 py-2 text-center">
                      <span className="font-mono text-base font-semibold tabular-nums">
                        {row.total.available}
                      </span>
                      {row.total.unavailable > 0 ? (
                        <span className="ml-1 font-mono text-xs text-muted-foreground">
                          +{row.total.unavailable}
                        </span>
                      ) : null}
                    </td>
                  </tr>

                  {rowExpandedKey ? (
                    <tr>
                      <td colSpan={span} className="border-b bg-muted/40 p-0">
                        <CellDetail
                          row={row}
                          expandedKey={rowExpandedKey}
                          columns={columns}
                          ownOrgId={ownOrgId}
                          onToggleStatus={onToggleStatus}
                          onClose={() => onToggleExpanded(rowExpandedKey)}
                        />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>

          <tfoot>
            <tr>
              <th
                scope="row"
                className="sticky bottom-0 left-0 z-30 border-t bg-surface px-3 py-2.5 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase"
              >
                Suma
              </th>
              {columns.map((col) => {
                const cell = columnTotals.totals.get(col.key);
                return (
                  <td
                    key={col.key}
                    className="sticky bottom-0 z-20 border-t bg-surface px-3 py-2.5 text-center"
                  >
                    <span className="font-mono text-sm font-semibold tabular-nums">
                      {cell?.available ?? 0}
                    </span>
                  </td>
                );
              })}
              <td className="sticky bottom-0 z-20 border-t border-l bg-surface px-3 py-2.5 text-center">
                <span className="font-mono text-sm font-semibold tabular-nums">
                  {columnTotals.grand.available}
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t px-3 py-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-sm bg-primary/20" aria-hidden />
          intensywność = liczba dostępnych zasobów
        </span>
        <span>
          <span className="font-mono">+n</span> = pozycje oznaczone jako niedostępne
        </span>
        <span>Kliknij komórkę, aby zobaczyć szczegóły</span>
      </div>
    </div>
  );
}

function CellDetail({
  row,
  expandedKey,
  columns,
  ownOrgId,
  onToggleStatus,
  onClose,
}: {
  row: MatrixRow;
  expandedKey: string;
  columns: Column[];
  ownOrgId?: string | undefined;
  onToggleStatus: (row: ResourceMapItem) => void;
  onClose: () => void;
}) {
  const colKey = expandedKey.slice(row.orgId.length + 2);
  const cell = colKey === "all" ? row.total : row.cells.get(colKey);
  const items = cell?.items ?? [];
  const colLabel = columns.find((c) => c.key === colKey)?.label;
  const isOwn = row.orgId === ownOrgId;

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-3 py-3"
    >
      <div className="mb-2 flex items-center gap-2">
        <p className="text-xs font-semibold tracking-wide uppercase">
          {row.orgName}
          {colLabel ? <span className="text-muted-foreground"> · {colLabel}</span> : null}
        </p>
        <span className="font-mono text-xs text-muted-foreground">({items.length})</span>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <Icon icon="tabler:x" width={13} height={13} aria-hidden />
          Zwiń
        </button>
      </div>

      <ul className="grid gap-1.5 md:grid-cols-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex flex-wrap items-center gap-2 rounded-sm border bg-surface px-3 py-2"
          >
            <Icon
              icon={CATEGORY_ICONS[item.category]}
              width={14}
              height={14}
              aria-hidden
              className="shrink-0 text-muted-foreground"
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{item.description}</span>
              <span className="block text-xs text-muted-foreground">
                {CATEGORY_LABELS[item.category]}
                {item.quantity ? ` · ${item.quantity}` : ""} ·{" "}
                {AVAILABILITY_LABELS[item.availability_window]}
              </span>
            </span>
            <AvailabilityDot status={item.status} />
            {isOwn ? (
              <button
                type="button"
                onClick={() => onToggleStatus(item)}
                className="rounded-sm border px-2 py-1 text-xs font-medium hover:bg-muted"
              >
                {item.status === "available" ? "Oznacz niedostępny" : "Oznacz dostępny"}
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

function AvailabilityDot({ status }: { status: "available" | "unavailable" }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium",
        status === "available"
          ? "border-sev-low/30 bg-sev-low/10 text-sev-low"
          : "border-border bg-muted text-muted-foreground",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "inline-block size-1.5 rounded-full",
          status === "available" ? "bg-sev-low" : "bg-muted-foreground",
        )}
      />
      {status === "available" ? "Dostępny" : "Niedostępny"}
    </span>
  );
}

/* ------------------------------------------------------------ flat table */

type SortKey = "description" | "org" | "category" | "window" | "status";

function ResourceTable({
  rows,
  ownOrgId,
  onToggleStatus,
}: {
  rows: ResourceMapItem[];
  ownOrgId?: string | undefined;
  onToggleStatus: (row: ResourceMapItem) => void;
}) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "org", dir: 1 });

  const sorted = useMemo(() => {
    const value = (row: ResourceMapItem): string | number => {
      switch (sort.key) {
        case "description":
          return row.description.toLowerCase();
        case "org":
          return orgNameOf(row).toLowerCase();
        case "category":
          return CATEGORY_LABELS[row.category];
        case "window":
          return AVAILABILITY_ORDER[row.availability_window];
        case "status":
          return row.status;
      }
    };
    return [...rows].sort((a, b) => {
      const av = value(a);
      const bv = value(b);
      if (av === bv) return orgNameOf(a).localeCompare(orgNameOf(b), "pl");
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * sort.dir;
      return String(av).localeCompare(String(bv), "pl") * sort.dir;
    });
  }, [rows, sort]);

  const headers: { key: SortKey; label: string; className?: string }[] = [
    { key: "description", label: "Zasób" },
    { key: "org", label: "Organizacja" },
    { key: "category", label: "Kategoria" },
    { key: "window", label: "Dostępność" },
    { key: "status", label: "Status" },
  ];

  const toggleSort = (key: SortKey) =>
    setSort((prev) => ({ key, dir: prev.key === key && prev.dir === 1 ? -1 : 1 }));

  return (
    <div className="overflow-hidden rounded-md border bg-surface">
      <div className="max-h-[62vh] overflow-auto">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              {headers.map((h) => (
                <th
                  key={h.key}
                  scope="col"
                  aria-sort={
                    sort.key === h.key ? (sort.dir === 1 ? "ascending" : "descending") : "none"
                  }
                  className="sticky top-0 z-10 border-b bg-surface px-3 py-2.5 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase"
                >
                  <button
                    type="button"
                    onClick={() => toggleSort(h.key)}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    {h.label}
                    <Icon
                      icon={
                        sort.key === h.key
                          ? sort.dir === 1
                            ? "tabler:chevron-up"
                            : "tabler:chevron-down"
                          : "tabler:selector"
                      }
                      width={12}
                      height={12}
                      aria-hidden
                      className={sort.key === h.key ? "" : "opacity-40"}
                    />
                  </button>
                </th>
              ))}
              <th
                scope="col"
                className="sticky top-0 z-10 border-b bg-surface px-3 py-2.5 text-right text-xs font-semibold tracking-wide text-muted-foreground uppercase"
              >
                Akcja
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => {
              const isOwn = row.organization_id === ownOrgId;
              return (
                <tr key={row.id} className="hover:bg-muted/40">
                  <td className="border-b px-3 py-2">
                    <span className="block font-medium">{row.description}</span>
                    {row.quantity ? (
                      <span className="block text-xs text-muted-foreground">{row.quantity}</span>
                    ) : null}
                  </td>
                  <td className="border-b px-3 py-2">
                    <span className="block">{orgNameOf(row)}</span>
                    <span className="block text-xs text-muted-foreground">
                      {row.organizations?.municipality ?? "—"}
                    </span>
                  </td>
                  <td className="border-b px-3 py-2">
                    <span className="inline-flex items-center gap-1.5">
                      <Icon
                        icon={CATEGORY_ICONS[row.category]}
                        width={14}
                        height={14}
                        aria-hidden
                        className="text-muted-foreground"
                      />
                      {CATEGORY_LABELS[row.category]}
                    </span>
                  </td>
                  <td className="border-b px-3 py-2">
                    <span className="rounded-sm bg-muted px-2 py-0.5 font-mono text-xs font-medium">
                      {AVAILABILITY_SHORT[row.availability_window]}
                    </span>
                  </td>
                  <td className="border-b px-3 py-2">
                    <AvailabilityDot status={row.status} />
                  </td>
                  <td className="border-b px-3 py-2 text-right">
                    {isOwn ? (
                      <button
                        type="button"
                        onClick={() => onToggleStatus(row)}
                        className="rounded-sm border px-2 py-1 text-xs font-medium hover:bg-muted"
                      >
                        {row.status === "available" ? "Oznacz niedostępny" : "Oznacz dostępny"}
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
