import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/crisis";
import type { FeedCard, FeedCardType, FeedStatus, FeedUrgency } from "@/lib/mockFeedData";
import { CardThread } from "@/components/feed/CardThread";

/* ------------------------------------------------------------------ */
/*  Type config — icon, label & color per card type                    */
/* ------------------------------------------------------------------ */

const TYPE_CONFIG: Record<FeedCardType, { icon: string; label: string; cls: string }> = {
  POTRZEBA: {
    icon: "mdi:hand-heart-outline",
    label: "Potrzeba",
    cls: "border-sev-high/40 bg-sev-high/10 text-sev-high",
  },
  ZASÓB: {
    icon: "ph:package-fill",
    label: "Zasób",
    cls: "border-sev-low/40 bg-sev-low/10 text-sev-low",
  },
  ALERT: {
    icon: "mdi:alarm-light",
    label: "Alert",
    cls: "border-sev-critical/40 bg-sev-critical/10 text-sev-critical",
  },
  ZADANIE: {
    icon: "mdi:clipboard-check-outline",
    label: "Zadanie",
    cls: "border-primary/30 bg-primary/10 text-primary",
  },
};

const URGENCY_CONFIG: Record<FeedUrgency, { label: string; cls: string }> = {
  "24H": { label: "24h — Krytyczne", cls: "bg-sev-critical text-sev-critical-foreground animate-pulse" },
  "48H": { label: "48h — Pilne", cls: "bg-sev-high text-sev-high-foreground" },
  "1 TYDZIEŃ": { label: "1 tydzień", cls: "bg-primary text-primary-foreground" },
};

const STATUS_CONFIG: Record<FeedStatus, { label: string; cls: string }> = {
  OTWARTE: { label: "Otwarte", cls: "border-sev-low/30 bg-sev-low/10 text-sev-low" },
  "W TRAKCIE": { label: "W trakcie", cls: "border-primary/30 bg-primary/10 text-primary" },
  ZAKOŃCZONE: { label: "Zakończone", cls: "border-border bg-muted text-muted-foreground" },
  ANULOWANE: { label: "Anulowane", cls: "border-border bg-muted text-muted-foreground" },
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface OperationalCardProps {
  card: FeedCard;
  onStatusChange: (id: string, status: FeedStatus) => void;
}

export function OperationalCard({ card, onStatusChange }: OperationalCardProps) {
  const [threadOpen, setThreadOpen] = useState(false);
  const typeConf = TYPE_CONFIG[card.type];
  const urgConf = URGENCY_CONFIG[card.urgency];
  const statConf = STATUS_CONFIG[card.status];

  const isDone = card.status === "ZAKOŃCZONE" || card.status === "ANULOWANE";

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className={cn(
        "rounded-md border bg-surface shadow-sm transition-all",
        isDone && "opacity-60",
        card.isPinned && !isDone && "ring-1 ring-primary/30",
      )}
    >
      <div className="p-4">
        {/* ---- Badge row ---- */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Type badge */}
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-xs font-semibold",
              typeConf.cls,
            )}
          >
            <Icon icon={typeConf.icon} width={13} height={13} aria-hidden />
            {typeConf.label}
          </span>

          {/* Urgency badge */}
          <span
            className={cn(
              "inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-semibold uppercase tracking-wide",
              urgConf.cls,
            )}
          >
            {urgConf.label}
          </span>

          {/* Status pill */}
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
              statConf.cls,
            )}
          >
            {statConf.label}
          </span>

          {/* Pinned icon */}
          {card.isPinned && (
            <Icon
              icon="mdi:pin"
              width={14}
              height={14}
              className="text-primary"
              aria-label="Przypięte"
            />
          )}

          {/* Timestamp */}
          <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Icon icon="solar:clock-circle-linear" width={14} height={14} aria-hidden />
            {timeAgo(card.createdAt)}
          </span>
        </div>

        {/* ---- Title ---- */}
        <h3
          className={cn(
            "mt-3 text-lg leading-snug font-semibold",
            isDone && "line-through decoration-1",
          )}
        >
          {card.title}
        </h3>

        {/* ---- Location & Organization ---- */}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Icon icon="mdi:map-marker" width={14} height={14} aria-hidden />
            {card.location}
          </span>
          <span className="inline-flex items-center gap-1">
            <Icon icon="tabler:building-community" width={14} height={14} aria-hidden />
            {card.organization}
          </span>
        </div>

        {/* ---- Description ---- */}
        <p className="mt-2 text-[15px] leading-relaxed text-foreground/80">{card.description}</p>

        {/* ---- Action bar ---- */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {/* Comments toggle */}
          <button
            type="button"
            onClick={() => setThreadOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-sm border bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Icon icon="mdi:comment-outline" width={14} height={14} aria-hidden />
            Komentarze ({card.commentsCount})
            <Icon
              icon="tabler:chevron-down"
              width={12}
              height={12}
              className={cn("transition-transform", threadOpen && "rotate-180")}
              aria-hidden
            />
          </button>

          {/* Quick status actions */}
          {!isDone && (
            <>
              <button
                type="button"
                onClick={() => onStatusChange(card.id, "ZAKOŃCZONE")}
                className="ml-auto inline-flex items-center gap-1.5 rounded-sm bg-sev-low px-3 py-1.5 text-xs font-semibold text-sev-low-foreground transition-colors hover:bg-sev-low/80"
              >
                <Icon icon="mdi:check-circle-outline" width={14} height={14} aria-hidden />
                Oznacz jako wykonane
              </button>
              <button
                type="button"
                onClick={() => onStatusChange(card.id, "ANULOWANE")}
                className="inline-flex items-center gap-1.5 rounded-sm border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Icon icon="mdi:close-circle-outline" width={14} height={14} aria-hidden />
                Anuluj
              </button>
            </>
          )}
        </div>
      </div>

      {/* ---- Expandable thread ---- */}
      <AnimatePresence initial={false}>
        {threadOpen && (
          <motion.div
            key="thread"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t">
              <CardThread cardId={card.id} locked={isDone} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}
