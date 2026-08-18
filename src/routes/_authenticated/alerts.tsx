import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import { AlertCard } from "@/components/AlertCard";
import { PickerMap } from "@/components/map";
import { VerifiedGate } from "@/components/VerifiedGate";
import { useAlerts } from "@/hooks/useAlerts";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  ALERT_TYPE_ICONS,
  ALERT_TYPE_LABELS,
  MUNICIPALITIES,
  SEVERITY_LABELS,
  STATUS_LABELS,
  type Alert,
  type AlertStatus,
  type AlertType,
  type Severity,
} from "@/lib/crisis";

export const Route = createFileRoute("/_authenticated/alerts")({
  head: () => ({
    meta: [
      { title: "Zarządzanie alertami, Koordynacja Kryzysowa" },
      {
        name: "description",
        content: "Twórz, aktualizuj i odwołuj alerty kryzysowe dla swojej gminy.",
      },
      { property: "og:title", content: "Zarządzanie alertami, Koordynacja Kryzysowa" },
      {
        property: "og:description",
        content: "Twórz, aktualizuj i odwołuj alerty kryzysowe.",
      },
    ],
  }),
  component: AlertsPage,
});

const severities: Severity[] = ["low", "medium", "high", "critical"];
const statuses: AlertStatus[] = ["active", "updated", "cancelled"];
const alertTypes: AlertType[] = [
  "general",
  "flood",
  "evacuation",
  "infrastructure",
  "power",
  "weather",
  "security",
];

function AlertsPage() {
  const { alerts, reload } = useAlerts();
  const { organization, canManageAlerts, user } = useAuth();

  const [filters, setFilters] = useState({ municipality: "", severity: "", status: "" });
  const [form, setForm] = useState({
    title: "",
    description: "",
    severity: "medium" as Severity,
    alertType: "general" as AlertType,
    municipality: organization?.municipality ?? MUNICIPALITIES[0]!,
  });
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Alert | null>(null);
  const [editText, setEditText] = useState("");
  const [confirmCancel, setConfirmCancel] = useState<Alert | null>(null);

  const visible = alerts.filter(
    (a) =>
      (!filters.municipality || a.municipality === filters.municipality) &&
      (!filters.severity || a.severity === filters.severity) &&
      (!filters.status || a.status === filters.status),
  );

  const createAlert = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("alerts").insert({
      title: form.title.trim(),
      description: form.description.trim(),
      severity: form.severity,
      alert_type: form.alertType,
      municipality: form.municipality,
      latitude: coords?.lat ?? null,
      longitude: coords?.lng ?? null,
      status: "active",
      created_by: user.id,
    });
    setBusy(false);
    if (error) {
      toast.error("Nie udało się utworzyć alertu.");
      return;
    }
    toast.success("Alert opublikowany.");
    setForm({ ...form, title: "", description: "" });
    setCoords(null);
    void reload();
  };

  const saveUpdate = async () => {
    if (!editing) return;
    const { error } = await supabase
      .from("alerts")
      .update({ description: editText.trim(), status: "updated" })
      .eq("id", editing.id);
    if (error) {
      toast.error("Nie udało się zaktualizować alertu.");
      return;
    }
    toast.success("Alert zaktualizowany.");
    setEditing(null);
    void reload();
  };

  const cancelAlert = async (alert: Alert) => {
    const { error } = await supabase
      .from("alerts")
      .update({ status: "cancelled" })
      .eq("id", alert.id);
    setConfirmCancel(null);
    if (error) {
      toast.error("Nie udało się odwołać alertu.");
      return;
    }
    toast.success("Alert odwołany.");
    void reload();
  };

  return (
    <VerifiedGate title="Alerty">
      <div className="space-y-6">
        {canManageAlerts ? (
          <section className="rounded-md border bg-surface p-5">
            <h2 className="text-lg font-semibold">Nowy alert</h2>
            <form onSubmit={createAlert} className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <label htmlFor="title" className="mb-1 block text-sm font-medium">
                    Tytuł
                  </label>
                  <input
                    id="title"
                    required
                    maxLength={140}
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="input-base"
                  />
                </div>
                <div>
                  <label htmlFor="desc" className="mb-1 block text-sm font-medium">
                    Opis
                  </label>
                  <textarea
                    id="desc"
                    required
                    rows={4}
                    maxLength={1000}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="input-base"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="sev" className="mb-1 block text-sm font-medium">
                      Poziom zagrożenia
                    </label>
                    <select
                      id="sev"
                      value={form.severity}
                      onChange={(e) => setForm({ ...form, severity: e.target.value as Severity })}
                      className="input-base"
                    >
                      {severities.map((s) => (
                        <option key={s} value={s}>
                          {SEVERITY_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="alertType" className="mb-1 block text-sm font-medium">
                      Typ alertu
                    </label>
                    <select
                      id="alertType"
                      value={form.alertType}
                      onChange={(e) => setForm({ ...form, alertType: e.target.value as AlertType })}
                      className="input-base"
                    >
                      {alertTypes.map((t) => (
                        <option key={t} value={t}>
                          {ALERT_TYPE_LABELS[t]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label htmlFor="gmina" className="mb-1 block text-sm font-medium">
                    Gmina
                  </label>
                  <select
                    id="gmina"
                    value={form.municipality}
                    onChange={(e) => setForm({ ...form, municipality: e.target.value })}
                    className="input-base"
                  >
                    {MUNICIPALITIES.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2 rounded-sm border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                  <Icon
                    icon={ALERT_TYPE_ICONS[form.alertType]}
                    width={16}
                    height={16}
                    aria-hidden
                  />
                  Pinezka na mapie będzie oznaczona tą ikoną i kolorem poziomu zagrożenia.
                </div>
              </div>

              <div>
                <p className="mb-1 text-sm font-medium">
                  Lokalizacja — kliknij na mapie, aby ustawić pinezkę
                </p>
                <div className="h-64 overflow-hidden rounded-sm border">
                  <PickerMap
                    value={coords}
                    severity={form.severity}
                    onPick={(lat, lng) => setCoords({ lat, lng })}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {coords
                    ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`
                    : "Brak współrzędnych"}
                </p>
                <button
                  type="submit"
                  disabled={busy}
                  className="mt-3 w-full rounded-sm bg-primary px-4 py-3 font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  {busy ? "Publikowanie…" : "Opublikuj alert"}
                </button>
              </div>
            </form>
          </section>
        ) : null}

        <section>
          <div className="mb-3 grid gap-2 sm:grid-cols-3">
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
              aria-label="Filtruj po poziomie"
              value={filters.severity}
              onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
              className="input-base"
            >
              <option value="">Każdy poziom</option>
              {severities.map((s) => (
                <option key={s} value={s}>
                  {SEVERITY_LABELS[s]}
                </option>
              ))}
            </select>
            <select
              aria-label="Filtruj po statusie"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="input-base"
            >
              <option value="">Każdy status</option>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>

          <motion.div layout className="space-y-3">
            <AnimatePresence initial={false}>
              {visible.map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  actions={
                    canManageAlerts && alert.status !== "cancelled" ? (
                      <>
                        <button
                          onClick={() => {
                            setEditing(alert);
                            setEditText(alert.description);
                          }}
                          className="rounded-sm border px-3 py-2 text-sm font-medium hover:bg-muted"
                        >
                          Zaktualizuj alert
                        </button>
                        <button
                          onClick={() => setConfirmCancel(alert)}
                          className="rounded-sm bg-sev-high px-3 py-2 text-sm font-medium text-sev-high-foreground hover:opacity-90"
                        >
                          Odwołaj alert
                        </button>
                      </>
                    ) : null
                  }
                />
              ))}
            </AnimatePresence>
          </motion.div>
        </section>
      </div>

      {editing ? (
        <Modal onClose={() => setEditing(null)} title="Zaktualizuj alert">
          <textarea
            rows={5}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="input-base"
          />
          <div className="mt-3 flex justify-end gap-2">
            <button
              onClick={() => setEditing(null)}
              className="rounded-sm border px-4 py-2 text-sm"
            >
              Anuluj
            </button>
            <button
              onClick={() => void saveUpdate()}
              className="rounded-sm bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              Zapisz aktualizację
            </button>
          </div>
        </Modal>
      ) : null}

      {confirmCancel ? (
        <Modal onClose={() => setConfirmCancel(null)} title="Odwołać alert?">
          <p className="text-sm text-muted-foreground">
            Alert „{confirmCancel.title}” zostanie oznaczony jako odwołany i wyszarzony na mapie.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => setConfirmCancel(null)}
              className="rounded-sm border px-4 py-2 text-sm"
            >
              Anuluj
            </button>
            <button
              onClick={() => void cancelAlert(confirmCancel)}
              className="rounded-sm bg-sev-high px-4 py-2 text-sm font-semibold text-sev-high-foreground"
            >
              Odwołaj alert
            </button>
          </div>
        </Modal>
      ) : null}
    </VerifiedGate>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.15 }}
        className="w-full max-w-md rounded-md border bg-surface p-5"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-sm text-muted-foreground">
            Zamknij
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}
