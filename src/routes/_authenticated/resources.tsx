import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { VerifiedGate } from "@/components/VerifiedGate";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  AVAILABILITY_LABELS,
  CATEGORY_LABELS,
  MUNICIPALITIES,
  type AvailabilityWindow,
  type ResourceCategory,
} from "@/lib/crisis";

export const Route = createFileRoute("/_authenticated/resources")({
  head: () => ({
    meta: [
      { title: "Zasoby — Koordynacja Kryzysowa" },
      {
        name: "description",
        content: "Rejestr zasobów ludzkich, materialnych i logistycznych zweryfikowanych organizacji.",
      },
      { property: "og:title", content: "Zasoby — Koordynacja Kryzysowa" },
      {
        property: "og:description",
        content: "Rejestr zasobów zweryfikowanych organizacji.",
      },
    ],
  }),
  component: ResourcesPage,
});

interface ResourceRow {
  id: string;
  organization_id: string;
  category: ResourceCategory;
  description: string;
  quantity: string | null;
  availability_window: AvailabilityWindow;
  status: "available" | "unavailable";
  created_at: string;
  organizations: { name: string; municipality: string } | null;
}

const categories: ResourceCategory[] = ["human", "material", "logistics"];
const windows: AvailabilityWindow[] = ["24h", "48h", "72h", "1week"];

function ResourcesPage() {
  const { organization, isVerified } = useAuth();
  const [rows, setRows] = useState<ResourceRow[]>([]);
  const [filters, setFilters] = useState({ category: "", window: "", municipality: "" });
  const [form, setForm] = useState({
    category: "material" as ResourceCategory,
    description: "",
    quantity: "",
    availability_window: "24h" as AvailabilityWindow,
  });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("resources")
      .select("*, organizations(name, municipality)")
      .order("created_at", { ascending: false });
    setRows((data ?? []) as unknown as ResourceRow[]);
  }, []);

  useEffect(() => {
    if (isVerified) void load();
  }, [isVerified, load]);

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
    setForm({ ...form, description: "", quantity: "" });
    void load();
  };

  const toggleStatus = async (row: ResourceRow) => {
    const next = row.status === "available" ? "unavailable" : "available";
    const { error } = await supabase.from("resources").update({ status: next }).eq("id", row.id);
    if (error) {
      toast.error("Nie udało się zmienić statusu.");
      return;
    }
    void load();
  };

  const visible = rows.filter(
    (r) =>
      (!filters.category || r.category === filters.category) &&
      (!filters.window || r.availability_window === filters.window) &&
      (!filters.municipality || r.organizations?.municipality === filters.municipality),
  );

  return (
    <VerifiedGate title="Zasoby">
      <div className="space-y-6">
        <section className="rounded-md border bg-surface p-5">
          <h2 className="text-lg font-semibold">Dodaj zasób</h2>
          <form onSubmit={addResource} className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="cat" className="mb-1 block text-sm font-medium">
                Kategoria
              </label>
              <select
                id="cat"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as ResourceCategory })}
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
                  setForm({ ...form, availability_window: e.target.value as AvailabilityWindow })
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
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-sm bg-primary px-4 py-3 font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                Dodaj zasób
              </button>
            </div>
          </form>
        </section>

        <section>
          <div className="mb-3 grid gap-2 sm:grid-cols-3">
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
              aria-label="Filtruj po dostępności"
              value={filters.window}
              onChange={(e) => setFilters({ ...filters, window: e.target.value })}
              className="input-base"
            >
              <option value="">Każda dostępność</option>
              {windows.map((w) => (
                <option key={w} value={w}>
                  {AVAILABILITY_LABELS[w]}
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

          <div className="space-y-2">
            {visible.length === 0 ? (
              <p className="rounded-md border bg-surface p-6 text-center text-sm text-muted-foreground">
                Brak zasobów spełniających kryteria.
              </p>
            ) : (
              visible.map((row) => (
                <motion.div
                  key={row.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-wrap items-center gap-3 rounded-md border bg-surface p-4"
                >
                  <div className="min-w-56 flex-1">
                    <p className="font-medium">{row.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.organizations?.name} · {row.organizations?.municipality} ·{" "}
                      {CATEGORY_LABELS[row.category]}
                      {row.quantity ? ` · ${row.quantity}` : ""}
                    </p>
                  </div>
                  <span className="rounded-sm bg-muted px-2 py-1 text-xs font-medium">
                    {AVAILABILITY_LABELS[row.availability_window]}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      row.status === "available"
                        ? "bg-sev-low text-sev-low-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {row.status === "available" ? "Dostępny" : "Niedostępny"}
                  </span>
                  {row.organization_id === organization?.id ? (
                    <button
                      onClick={() => void toggleStatus(row)}
                      className="rounded-sm border px-3 py-2 text-sm font-medium hover:bg-muted"
                    >
                      {row.status === "available"
                        ? "Oznacz jako niedostępny"
                        : "Oznacz jako dostępny"}
                    </button>
                  ) : null}
                </motion.div>
              ))
            )}
          </div>
        </section>
      </div>
    </VerifiedGate>
  );
}
