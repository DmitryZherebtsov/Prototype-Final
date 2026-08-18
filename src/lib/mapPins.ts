import L from "leaflet";
import {
  ALERT_TYPE_ICONS,
  SEVERITY_HEX,
  type Alert,
  type NeedUrgency,
  type ResourceCategory,
  type Severity,
} from "@/lib/crisis";

const FLAG_WRAP = 54;
const LAYER_SIZE = 30;

const NEED_URGENCY_HEX: Record<NeedUrgency, string> = {
  urgent: "#ef4444",
  medium: "#eab308",
  low: "#16a34a",
};

const CATEGORY_ICONS: Record<ResourceCategory, string> = {
  human: "mdi:account-group",
  material: "mdi:package-variant",
  logistics: "mdi:truck",
};

function iconUrl(iconName: string, color = "#ffffff", size = 14): string {
  const [set, name] = iconName.split(":");
  return `https://api.iconify.design/${set}/${name}.svg?color=${encodeURIComponent(color)}&width=${size}&height=${size}`;
}

function glowClass(severity: Severity, cancelled: boolean): string {
  if (cancelled) return "flag-pin--muted";
  if (severity === "critical") return "flag-pin--glow flag-pin--glow-fast";
  if (severity === "high") return "flag-pin--glow";
  return "";
}

/** Warm the browser cache for pin badge icons before markers mount. */
export function preloadAlertPinIcons(): Promise<void> {
  const names = Array.from(new Set(Object.values(ALERT_TYPE_ICONS)));
  return Promise.all(
    names.map(
      (icon) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = iconUrl(icon);
        }),
    ),
  ).then(() => undefined);
}

/**
 * Signal-flag marker: slim pole + colored pennant with type icon.
 * Anchor sits on the ground dot at the map coordinate.
 */
export function createAlertPin(alert: Alert): L.DivIcon {
  const cancelled = alert.status === "cancelled";
  const color = cancelled ? "#9aa0a6" : SEVERITY_HEX[alert.severity];
  const iconName = ALERT_TYPE_ICONS[alert.alert_type] ?? ALERT_TYPE_ICONS.general;
  const animClass = glowClass(alert.severity, cancelled);
  const iconSrc = iconUrl(iconName);
  const muted = cancelled ? ' style="opacity:0.55"' : "";

  const html =
    `<div class="flag-pin ${animClass}" style="--pin-color:${color}">` +
    `<div class="flag-pin__halo" aria-hidden="true"></div>` +
    `<div class="flag-pin__pole"${muted}></div>` +
    `<div class="flag-pin__pennant"${muted}>` +
    `<span class="flag-pin__tab"></span>` +
    `<img class="flag-pin__icon" src="${iconSrc}" width="14" height="14" alt="" loading="eager" />` +
    `</div>` +
    `<div class="flag-pin__ground"${muted}></div>` +
    `</div>`;

  return L.divIcon({
    html,
    className: "",
    iconSize: [FLAG_WRAP, FLAG_WRAP],
    iconAnchor: [FLAG_WRAP / 2, FLAG_WRAP - 1],
    popupAnchor: [0, -FLAG_WRAP + 8],
  });
}

/** Diamond chip for open needs on the map. */
export function createNeedPin(urgency: NeedUrgency, category: ResourceCategory): L.DivIcon {
  const color = NEED_URGENCY_HEX[urgency];
  const iconSrc = iconUrl(CATEGORY_ICONS[category], color, 12);

  const html =
    `<div class="chip-pin chip-pin--need" style="--pin-color:${color}">` +
    `<div class="chip-pin__diamond"></div>` +
    `<img class="chip-pin__icon" src="${iconSrc}" width="12" height="12" alt="" loading="lazy" />` +
    `</div>`;

  return L.divIcon({
    html,
    className: "",
    iconSize: [LAYER_SIZE, LAYER_SIZE],
    iconAnchor: [LAYER_SIZE / 2, LAYER_SIZE / 2],
    popupAnchor: [0, -LAYER_SIZE / 2],
  });
}

/** Rounded chip for resources on the map. */
export function createResourcePin(category: ResourceCategory, available: boolean): L.DivIcon {
  const color = available ? "#16a34a" : "#9aa0a6";
  const iconSrc = iconUrl(CATEGORY_ICONS[category], available ? "#ffffff" : color, 12);

  const html =
    `<div class="chip-pin chip-pin--resource${available ? "" : " chip-pin--muted"}" style="--pin-color:${color}">` +
    `<div class="chip-pin__square"></div>` +
    `<img class="chip-pin__icon" src="${iconSrc}" width="12" height="12" alt="" loading="lazy" />` +
    `</div>`;

  return L.divIcon({
    html,
    className: "",
    iconSize: [LAYER_SIZE, LAYER_SIZE],
    iconAnchor: [LAYER_SIZE / 2, LAYER_SIZE / 2],
    popupAnchor: [0, -LAYER_SIZE / 2],
  });
}

/** Preview pin for the alert coordinate picker. */
export function createPickerPin(severity: Severity): L.DivIcon {
  const color = SEVERITY_HEX[severity];
  const html =
    `<div class="flag-pin" style="--pin-color:${color}">` +
    `<div class="flag-pin__pole"></div>` +
    `<div class="flag-pin__pennant"><span class="flag-pin__tab"></span></div>` +
    `<div class="flag-pin__ground"></div>` +
    `</div>`;

  return L.divIcon({
    html,
    className: "",
    iconSize: [FLAG_WRAP, FLAG_WRAP],
    iconAnchor: [FLAG_WRAP / 2, FLAG_WRAP - 1],
  });
}
