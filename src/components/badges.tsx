import { cn } from "@/lib/utils";
import {
  NEED_STATUS_LABELS,
  NEED_URGENCY_LABELS,
  SEVERITY_LABELS,
  STATUS_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  type AlertStatus,
  type NeedStatus,
  type NeedUrgency,
  type Severity,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/crisis";

const severityClasses: Record<Severity, string> = {
  low: "bg-sev-low text-sev-low-foreground",
  medium: "bg-sev-medium text-sev-medium-foreground",
  high: "bg-sev-high text-sev-high-foreground",
  critical: "bg-sev-critical text-sev-critical-foreground",
};

export function SeverityBadge({
  severity,
  className,
  muted,
}: {
  severity: Severity;
  className?: string;
  muted?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-semibold uppercase tracking-wide",
        muted ? "bg-muted text-muted-foreground" : severityClasses[severity],
        className,
      )}
    >
      {SEVERITY_LABELS[severity]}
    </span>
  );
}

export function StatusPill({ status, className }: { status: AlertStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        status === "cancelled"
          ? "border-border bg-muted text-muted-foreground"
          : status === "updated"
            ? "border-primary/30 bg-primary/10 text-primary"
            : "border-sev-high/30 bg-sev-high/10 text-sev-high",
        className,
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

const taskPriorityClasses: Record<TaskPriority, string> = {
  low: "bg-sev-low text-sev-low-foreground",
  medium: "bg-sev-medium text-sev-medium-foreground",
  high: "bg-sev-high text-sev-high-foreground",
};

export function TaskPriorityBadge({
  priority,
  className,
}: {
  priority: TaskPriority;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-semibold uppercase tracking-wide",
        taskPriorityClasses[priority],
        className,
      )}
    >
      {TASK_PRIORITY_LABELS[priority]}
    </span>
  );
}

const taskStatusClasses: Record<TaskStatus, string> = {
  new: "border-border bg-muted text-foreground",
  in_progress: "border-primary/30 bg-primary/10 text-primary",
  completed: "border-sev-low/30 bg-sev-low/10 text-sev-low",
};

export function TaskStatusBadge({ status, className }: { status: TaskStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        taskStatusClasses[status],
        className,
      )}
    >
      {TASK_STATUS_LABELS[status]}
    </span>
  );
}

const needUrgencyClasses: Record<NeedUrgency, string> = {
  urgent: "bg-sev-critical text-sev-critical-foreground",
  medium: "bg-sev-medium text-sev-medium-foreground",
  low: "bg-sev-low text-sev-low-foreground",
};

export function NeedUrgencyBadge({
  urgency,
  className,
}: {
  urgency: NeedUrgency;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-semibold uppercase tracking-wide",
        needUrgencyClasses[urgency],
        className,
      )}
    >
      {NEED_URGENCY_LABELS[urgency]}
    </span>
  );
}

const needStatusClasses: Record<NeedStatus, string> = {
  open: "border-sev-high/30 bg-sev-high/10 text-sev-high",
  satisfied: "border-border bg-muted text-muted-foreground",
};

export function NeedStatusBadge({ status, className }: { status: NeedStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        needStatusClasses[status],
        className,
      )}
    >
      {NEED_STATUS_LABELS[status]}
    </span>
  );
}
