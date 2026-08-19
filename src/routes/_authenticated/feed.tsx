import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@iconify/react";
import { VerifiedGate } from "@/components/VerifiedGate";
import { OperationalCard } from "@/components/feed/OperationalCard";
import {
  MOCK_FEED_CARDS,
  type FeedCard,
  type FeedCardType,
  type FeedStatus,
  type FeedUrgency,
} from "@/lib/mockFeedData";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/feed")({
  head: () => ({
    meta: [
      { title: "Strumień operacyjny — Koordynacja Kryzysowa" },
      {
        name: "description",
        content: "Operacyjny strumień zgłoszeń z wątkami komentarzy dla koordynacji kryzysowej.",
      },
    ],
  }),
  component: FeedPage,
});

/* ------------------------------------------------------------------ */
/*  Filter helpers                                                     */
/* ------------------------------------------------------------------ */

type TypeFilter = "ALL" | FeedCardType;
type UrgencyFilter = "ALL" | FeedUrgency;

const TYPE_PILLS: { value: TypeFilter; label: string; icon: string }[] = [
  { value: "ALL", label: "Wszystkie", icon: "mdi:view-list" },
  { value: "POTRZEBA", label: "Potrzeby", icon: "mdi:hand-heart-outline" },
  { value: "ZASÓB", label: "Zasoby", icon: "ph:package-fill" },
  { value: "ALERT", label: "Alerty", icon: "mdi:alarm-light" },
  { value: "ZADANIE", label: "Zadania", icon: "mdi:clipboard-check-outline" },
];

const URGENCY_PILLS: { value: UrgencyFilter; label: string }[] = [
  { value: "ALL", label: "Dowolna" },
  { value: "24H", label: "24h — Krytyczne" },
  { value: "48H", label: "48h — Pilne" },
];

/* ------------------------------------------------------------------ */
/*  New-post modal types                                               */
/* ------------------------------------------------------------------ */

interface NewPostForm {
  type: FeedCardType;
  title: string;
  urgency: FeedUrgency;
  description: string;
  location: string;
}

const EMPTY_FORM: NewPostForm = {
  type: "POTRZEBA",
  title: "",
  urgency: "48H",
  description: "",
  location: "",
};

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

function FeedPage() {
  // State
  const [cards, setCards] = useState<FeedCard[]>(MOCK_FEED_CARDS);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyFilter>("ALL");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<NewPostForm>(EMPTY_FORM);

  // Derived filtered list
  const filtered = useMemo(() => {
    let result = [...cards];

    // Pinned first, then by date
    result.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    if (typeFilter !== "ALL") {
      result = result.filter((c) => c.type === typeFilter);
    }
    if (urgencyFilter !== "ALL") {
      result = result.filter((c) => c.urgency === urgencyFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.location.toLowerCase().includes(q) ||
          c.organization.toLowerCase().includes(q),
      );
    }
    return result;
  }, [cards, typeFilter, urgencyFilter, search]);

  // Handlers
  const handleStatusChange = (id: string, status: FeedStatus) => {
    setCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status } : c)),
    );
  };

  const handleAddPost = () => {
    if (!form.title.trim() || !form.description.trim()) return;

    const newCard: FeedCard = {
      id: `user-${Date.now()}`,
      type: form.type,
      title: form.title,
      description: form.description,
      urgency: form.urgency,
      status: "OTWARTE",
      location: form.location || "Nowa Dęba",
      organization: "Fundacja Q (demo)",
      createdAt: new Date().toISOString(),
      isPinned: false,
      commentsCount: 0,
    };

    setCards((prev) => [newCard, ...prev]);
    setForm(EMPTY_FORM);
    setModalOpen(false);
  };

  const activeCount = cards.filter((c) => c.status === "OTWARTE" || c.status === "W TRAKCIE").length;
  const criticalCount = cards.filter((c) => c.urgency === "24H" && c.status !== "ZAKOŃCZONE" && c.status !== "ANULOWANE").length;

  return (
    <VerifiedGate title="Strumień operacyjny">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="space-y-4"
      >
        {/* ---- Stats row ---- */}
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="inline-flex items-center gap-1.5 rounded-sm bg-primary/10 px-2.5 py-1 font-medium text-primary">
            <Icon icon="mdi:bulletin-board" width={16} height={16} aria-hidden />
            {activeCount} aktywnych zgłoszeń
          </span>
          {criticalCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-sm bg-sev-critical/10 px-2.5 py-1 font-medium text-sev-critical animate-pulse">
              <Icon icon="solar:danger-triangle-bold" width={16} height={16} aria-hidden />
              {criticalCount} krytycznych (24h)
            </span>
          )}
        </div>

        {/* ---- Filter bar ---- */}
        <div className="flex flex-col gap-3 rounded-md border bg-surface p-3 sm:flex-row sm:items-center">
          {/* Type pills */}
          <div className="flex flex-wrap gap-1.5">
            {TYPE_PILLS.map((pill) => (
              <button
                key={pill.value}
                type="button"
                onClick={() => setTypeFilter(pill.value)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-sm px-2.5 py-1.5 text-xs font-medium transition-colors",
                  typeFilter === pill.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground",
                )}
              >
                <Icon icon={pill.icon} width={13} height={13} aria-hidden />
                {pill.label}
              </button>
            ))}
          </div>

          {/* Urgency pills */}
          <div className="hidden h-5 w-px bg-border sm:block" />
          <div className="flex flex-wrap gap-1.5">
            <span className="mr-1 self-center text-xs text-muted-foreground">Pilność:</span>
            {URGENCY_PILLS.map((pill) => (
              <button
                key={pill.value}
                type="button"
                onClick={() => setUrgencyFilter(pill.value)}
                className={cn(
                  "inline-flex items-center rounded-sm px-2.5 py-1.5 text-xs font-medium transition-colors",
                  urgencyFilter === pill.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground",
                )}
              >
                {pill.label}
              </button>
            ))}
          </div>
        </div>

        {/* ---- Search + Add button ---- */}
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Icon
              icon="mdi:magnify"
              width={16}
              height={16}
              className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Szukaj po lokalizacji lub tytule..."
              className="flex h-9 w-full rounded-md border border-input bg-transparent py-1 pr-3 pl-9 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow transition-colors hover:bg-primary/90"
          >
            <Icon icon="mdi:plus-circle-outline" width={16} height={16} aria-hidden />
            Dodaj zgłoszenie
          </button>
        </div>

        {/* ---- Feed list ---- */}
        <motion.div layout className="space-y-3">
          <AnimatePresence mode="popLayout" initial={false}>
            {filtered.length === 0 ? (
              <motion.p
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-md border bg-surface p-8 text-center text-sm text-muted-foreground"
              >
                Brak zgłoszeń pasujących do wybranych filtrów.
              </motion.p>
            ) : (
              filtered.map((card) => (
                <OperationalCard
                  key={card.id}
                  card={card}
                  onStatusChange={handleStatusChange}
                />
              ))
            )}
          </AnimatePresence>
        </motion.div>

        {/* ---- Add-post modal ---- */}
        <AnimatePresence>
          {modalOpen && (
            <motion.div
              key="modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
              onClick={(e) => {
                if (e.target === e.currentTarget) setModalOpen(false);
              }}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="w-full max-w-lg rounded-lg border bg-background p-6 shadow-xl"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Nowe zgłoszenie</h2>
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="rounded-sm p-1 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Icon icon="mdi:close" width={18} height={18} aria-hidden />
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  {/* Type */}
                  <div>
                    <label className="mb-1 block text-sm font-medium">Typ zgłoszenia</label>
                    <div className="flex flex-wrap gap-1.5">
                      {(["POTRZEBA", "ZASÓB", "ALERT", "ZADANIE"] as FeedCardType[]).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, type: t }))}
                          className={cn(
                            "rounded-sm px-3 py-1.5 text-xs font-medium transition-colors",
                            form.type === t
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground hover:bg-muted/80",
                          )}
                        >
                          {t === "POTRZEBA" ? "Potrzeba" : t === "ZASÓB" ? "Zasób" : t === "ALERT" ? "Alert" : "Zadanie"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="mb-1 block text-sm font-medium">Tytuł</label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                      placeholder="Krótki tytuł zgłoszenia..."
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>

                  {/* Urgency */}
                  <div>
                    <label className="mb-1 block text-sm font-medium">Pilność</label>
                    <div className="flex gap-1.5">
                      {(["24H", "48H", "1 TYDZIEŃ"] as FeedUrgency[]).map((u) => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, urgency: u }))}
                          className={cn(
                            "rounded-sm px-3 py-1.5 text-xs font-medium transition-colors",
                            form.urgency === u
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground hover:bg-muted/80",
                          )}
                        >
                          {u === "24H" ? "24h — Krytyczne" : u === "48H" ? "48h — Pilne" : "1 tydzień"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="mb-1 block text-sm font-medium">Opis</label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="Szczegółowy opis sytuacji..."
                      rows={3}
                      className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>

                  {/* Location */}
                  <div>
                    <label className="mb-1 block text-sm font-medium">Lokalizacja</label>
                    <input
                      type="text"
                      value={form.location}
                      onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                      placeholder="np. Nowa Dęba, ul. Mickiewicza 5"
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>
                </div>

                {/* Modal actions */}
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="inline-flex items-center rounded-md border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
                  >
                    Anuluj
                  </button>
                  <button
                    type="button"
                    onClick={handleAddPost}
                    disabled={!form.title.trim() || !form.description.trim()}
                    className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
                  >
                    <Icon icon="mdi:send" width={14} height={14} aria-hidden />
                    Dodaj zgłoszenie
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </VerifiedGate>
  );
}
