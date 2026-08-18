export type Severity = "low" | "medium" | "high" | "critical";
export type AlertType =
  | "flood"
  | "evacuation"
  | "infrastructure"
  | "power"
  | "weather"
  | "security"
  | "general";
export type AlertStatus = "active" | "updated" | "cancelled";
export type TaskPriority = "low" | "medium" | "high";
export type TaskStatus = "new" | "in_progress" | "completed";
export type NeedUrgency = "urgent" | "medium" | "low";
export type NeedStatus = "open" | "satisfied";
export type OrgType = "ngo_humanitarian" | "ngo_local" | "municipality" | "emergency" | "admin";
export type OrgStatus = "pending" | "active" | "rejected";
export type ResourceCategory = "human" | "material" | "logistics";
export type AvailabilityWindow = "24h" | "48h" | "72h" | "1week";
export type FeedTag = "resource_update" | "situation_update" | "request" | "info";
export type AppRole =
  | "super_admin"
  | "municipality"
  | "emergency"
  | "ngo_humanitarian"
  | "ngo_local";

export interface Alert {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  alert_type: AlertType;
  municipality: string;
  latitude: number | null;
  longitude: number | null;
  status: AlertStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  assigned_organization_id: string;
  created_by: string | null;
  related_alert_id: string | null;
  municipality: string;
  deadline: string;
  created_at: string;
  updated_at: string;
}

export interface Need {
  id: string;
  organization_id: string;
  category: ResourceCategory;
  description: string;
  quantity: string;
  urgency: NeedUrgency;
  status: NeedStatus;
  municipality: string;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at: string;
}

export const SEVERITY_LABELS: Record<Severity, string> = {
  low: "Niski",
  medium: "Średni",
  high: "Wysoki",
  critical: "Krytyczny",
};

export const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

/** Hex values mirror the --sev-* tokens; green → yellow → orange → red. */
export const SEVERITY_HEX: Record<Severity, string> = {
  low: "#16a34a",
  medium: "#eab308",
  high: "#f97316",
  critical: "#ef4444",
};

export const STATUS_LABELS: Record<AlertStatus, string> = {
  active: "Aktywny",
  updated: "Zaktualizowany",
  cancelled: "Odwołany",
};

export const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  flood: "Podtopienia / powódź",
  evacuation: "Ewakuacja",
  infrastructure: "Infrastruktura",
  power: "Brak prądu / media",
  weather: "Warunki pogodowe",
  security: "Bezpieczeństwo",
  general: "Ogólny",
};

/** Iconify icon names per alert type (used for map pins and forms). */
export const ALERT_TYPE_ICONS: Record<AlertType, string> = {
  flood: "mdi:waves",
  evacuation: "mdi:run-fast",
  infrastructure: "mdi:road-variant",
  power: "mdi:flash-off",
  weather: "mdi:weather-pouring",
  security: "mdi:shield-alert",
  general: "mdi:alert-circle",
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Niski",
  medium: "Średni",
  high: "Wysoki",
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  new: "Nowe",
  in_progress: "W trakcie",
  completed: "Zakończone",
};

export const NEED_URGENCY_LABELS: Record<NeedUrgency, string> = {
  urgent: "Pilne",
  medium: "Średnie",
  low: "Niskie",
};

export const NEED_STATUS_LABELS: Record<NeedStatus, string> = {
  open: "Otwarte",
  satisfied: "Zaspokojone",
};

export const ORG_TYPE_LABELS: Record<OrgType, string> = {
  ngo_humanitarian: "NGO humanitarna",
  ngo_local: "NGO lokalna",
  municipality: "Samorząd",
  emergency: "Służby mundurowe",
  admin: "Administracja",
};

export const ORG_STATUS_LABELS: Record<OrgStatus, string> = {
  pending: "Oczekuje na weryfikację",
  active: "Zweryfikowana",
  rejected: "Odrzucona",
};

export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: "Administrator systemu",
  municipality: "Koordynator gminy",
  emergency: "Służby mundurowe",
  ngo_humanitarian: "NGO humanitarna",
  ngo_local: "NGO lokalna",
};

export const CATEGORY_LABELS: Record<ResourceCategory, string> = {
  human: "Ludzkie",
  material: "Materialne",
  logistics: "Logistyczne",
};

export const AVAILABILITY_LABELS: Record<AvailabilityWindow, string> = {
  "24h": "Dostępne w ciągu 24h",
  "48h": "Dostępne w ciągu 48h",
  "72h": "Dostępne w ciągu 72h",
  "1week": "Dostępne w ciągu tygodnia",
};

export const TAG_LABELS: Record<FeedTag, string> = {
  resource_update: "Aktualizacja zasobów",
  situation_update: "Sytuacja",
  request: "Zapytanie",
  info: "Informacja",
};

export const ORG_TYPE_TO_ROLE: Record<Exclude<OrgType, "admin">, AppRole> = {
  ngo_humanitarian: "ngo_humanitarian",
  ngo_local: "ngo_local",
  municipality: "municipality",
  emergency: "emergency",
};

export const MUNICIPALITIES = [
  "Nowa Dęba",
  "Tarnobrzeg",
  "Stalowa Wola",
  "Baranów Sandomierski",
  "Gorzyce",
  "Grębów",
  "Bojanów",
];

export function sortAlerts<T extends { severity: Severity; status: AlertStatus; created_at: string }>(
  alerts: T[],
): T[] {
  return [...alerts].sort((a, b) => {
    const aCancelled = a.status === "cancelled" ? 1 : 0;
    const bCancelled = b.status === "cancelled" ? 1 : 0;
    if (aCancelled !== bCancelled) return aCancelled - bCancelled;
    const sev = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (sev !== 0) return sev;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "przed chwilą";
  if (min < 60) return `${min} min temu`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} godz. temu`;
  const d = Math.round(h / 24);
  if (d < 31) return `${d} dni temu`;
  return new Date(iso).toLocaleDateString("pl-PL");
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
