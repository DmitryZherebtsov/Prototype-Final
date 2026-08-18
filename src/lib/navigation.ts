import type { AppRole } from "@/lib/crisis";

export interface NavAuth {
  isVerified: boolean;
  isAdmin: boolean;
  canManageAlerts: boolean;
  canManageTasks: boolean;
  role: AppRole | null;
}

export interface NavItem {
  to: string;
  label: string;
  icon: string;
  /** When omitted, link is shown to every authenticated user. */
  visible?: (auth: NavAuth) => boolean;
}

/** Links shown in the authenticated panel (VerifiedGate pages). */
export const panelNavItems: NavItem[] = [
  { to: "/dashboard", label: "Pulpit", icon: "solar:widget-5-bold" },
  {
    to: "/alerts",
    label: "Alerty",
    icon: "mdi:alarm-light",
    visible: (a) => a.isVerified,
  },
  {
    to: "/tasks",
    label: "Zadania",
    icon: "mdi:clipboard-check-outline",
    visible: (a) => a.isVerified,
  },
  {
    to: "/needs",
    label: "Potrzeby",
    icon: "mdi:hand-heart-outline",
    visible: (a) => a.isVerified,
  },
  {
    to: "/resources",
    label: "Zasoby",
    icon: "ph:package-fill",
    visible: (a) => a.isVerified,
  },
  {
    to: "/organizations",
    label: "Organizacje",
    icon: "tabler:building-community",
    visible: (a) => a.isVerified,
  },
];

export const adminNavItem: NavItem = {
  to: "/admin",
  label: "Administracja",
  icon: "solar:shield-user-bold",
  visible: (a) => a.isAdmin,
};

export const publicNavItems: NavItem[] = [
  { to: "/", label: "Alerty", icon: "mdi:bell-outline" },
  { to: "/map", label: "Mapa", icon: "mdi:map-outline" },
];

export function filterNavItems(items: NavItem[], auth: NavAuth): NavItem[] {
  return items.filter((item) => (item.visible ? item.visible(auth) : true));
}
