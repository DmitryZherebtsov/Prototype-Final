import { motion } from "framer-motion";
import { Icon } from "@iconify/react";
import { SeverityBadge, StatusPill } from "@/components/badges";
import { cn } from "@/lib/utils";
import { ALERT_TYPE_ICONS, ALERT_TYPE_LABELS, timeAgo, type Alert } from "@/lib/crisis";

export function AlertCard({
  alert,
  onClick,
  active,
  actions,
}: {
  alert: Alert;
  onClick?: () => void;
  active?: boolean;
  actions?: React.ReactNode;
}) {
  const cancelled = alert.status === "cancelled";
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className={cn(
        "rounded-md border bg-surface p-4 text-left shadow-sm transition-colors",
        onClick && "cursor-pointer hover:border-primary/50",
        active && "border-primary ring-1 ring-primary",
        cancelled && "opacity-60",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="inline-flex items-center gap-1 rounded-sm border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
          title={ALERT_TYPE_LABELS[alert.alert_type]}
        >
          <Icon icon={ALERT_TYPE_ICONS[alert.alert_type]} width={13} height={13} aria-hidden />
          {ALERT_TYPE_LABELS[alert.alert_type]}
        </span>
        <SeverityBadge severity={alert.severity} muted={cancelled} />
        <StatusPill status={alert.status} />
        <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Icon icon="solar:clock-circle-linear" width={14} height={14} aria-hidden />
          {timeAgo(alert.created_at)}
        </span>
      </div>
      <h3
        className={cn(
          "mt-3 text-lg leading-snug font-semibold",
          cancelled && "line-through decoration-1",
        )}
      >
        {alert.title}
      </h3>
      <p className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground">
        <Icon icon="mdi:map-marker" width={14} height={14} aria-hidden />
        {alert.municipality}
      </p>
      <p className="mt-2 text-[15px] leading-relaxed text-foreground/80">{alert.description}</p>
      {actions ? <div className="mt-3 flex flex-wrap gap-2">{actions}</div> : null}
    </motion.article>
  );
}
