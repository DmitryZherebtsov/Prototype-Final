import { useState } from "react";
import { motion } from "framer-motion";
import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/crisis";
import { MOCK_FEED_COMMENTS, type FeedComment, type RoleBadge } from "@/lib/mockFeedData";

/* ------------------------------------------------------------------ */
/*  Role badge styling                                                 */
/* ------------------------------------------------------------------ */

const ROLE_STYLE: Record<RoleBadge, { cls: string; icon: string }> = {
  JST: {
    cls: "bg-primary/10 text-primary border-primary/30",
    icon: "mdi:account-tie",
  },
  NGO: {
    cls: "bg-sev-low/10 text-sev-low border-sev-low/30",
    icon: "mdi:hand-heart-outline",
  },
  "Służby mundurowe": {
    cls: "bg-sev-high/10 text-sev-high border-sev-high/30",
    icon: "mdi:shield-account",
  },
  Administrator: {
    cls: "bg-sev-critical/10 text-sev-critical border-sev-critical/30",
    icon: "mdi:shield-star",
  },
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface CardThreadProps {
  cardId: string;
  locked?: boolean;
}

export function CardThread({ cardId, locked = false }: CardThreadProps) {
  const [localComments, setLocalComments] = useState<FeedComment[]>([]);
  const [text, setText] = useState("");

  const seedComments = MOCK_FEED_COMMENTS.filter((c) => c.cardId === cardId);
  const allComments = [...seedComments, ...localComments];

  // Move pinned to top
  const sorted = [...allComments].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const newComment: FeedComment = {
      id: `local-${Date.now()}`,
      cardId,
      authorName: "Ty (demo)",
      organization: "Fundacja Q",
      roleBadge: "NGO",
      text: trimmed,
      createdAt: new Date().toISOString(),
      isPinned: false,
    };

    setLocalComments((prev) => [...prev, newComment]);
    setText("");
  };

  return (
    <div className="bg-muted/30 px-4 py-3">
      {sorted.length === 0 ? (
        <p className="py-2 text-center text-sm text-muted-foreground">
          Brak komentarzy w tym wątku.
        </p>
      ) : (
        <div className="space-y-2.5">
          {sorted.map((comment, idx) => (
            <CommentBubble key={comment.id} comment={comment} index={idx} />
          ))}
        </div>
      )}

      {/* ---- New comment form ---- */}
      {!locked ? (
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Napisz komentarz..."
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!text.trim()}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
          >
            <Icon icon="mdi:send" width={14} height={14} aria-hidden />
            Wyślij
          </button>
        </div>
      ) : (
        <p className="mt-3 rounded-sm border border-dashed p-2 text-center text-xs text-muted-foreground">
          <Icon icon="mdi:lock-outline" width={14} height={14} className="mr-1 inline" aria-hidden />
          Wątek zamknięty — zgłoszenie zakończone lub anulowane.
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Comment bubble                                                     */
/* ------------------------------------------------------------------ */

function CommentBubble({ comment, index }: { comment: FeedComment; index: number }) {
  const role = ROLE_STYLE[comment.roleBadge];

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, delay: index * 0.03 }}
      className={cn(
        "rounded-md border bg-surface p-3",
        comment.isPinned && "border-primary/40 bg-primary/5 ring-1 ring-primary/20",
      )}
    >
      {comment.isPinned && (
        <div className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-primary">
          <Icon icon="mdi:pin" width={12} height={12} aria-hidden />
          Przypięta wiadomość
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {/* Author */}
        <span className="text-sm font-medium">{comment.authorName}</span>

        {/* Role badge */}
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            role.cls,
          )}
        >
          <Icon icon={role.icon} width={11} height={11} aria-hidden />
          {comment.roleBadge}
        </span>

        {/* Organization */}
        <span className="text-xs text-muted-foreground">· {comment.organization}</span>

        {/* Timestamp */}
        <span className="ml-auto text-xs text-muted-foreground">
          {timeAgo(comment.createdAt)}
        </span>
      </div>

      <p className="mt-1.5 text-sm leading-relaxed text-foreground/85">{comment.text}</p>
    </motion.div>
  );
}
