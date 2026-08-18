import { Icon } from "@iconify/react";

export type MapLayerKey = "alerts" | "needs" | "resources";

export type MapLayers = Record<MapLayerKey, boolean>;

const layerConfig: {
  key: MapLayerKey;
  label: string;
  icon: string;
  hint?: string;
}[] = [
  { key: "alerts", label: "Alerty", icon: "mdi:map-marker-alert" },
  { key: "needs", label: "Potrzeby", icon: "mdi:hand-heart-outline", hint: "Wymaga logowania" },
  { key: "resources", label: "Zasoby", icon: "ph:package-fill", hint: "Wymaga logowania" },
];

export function MapLayerToggle({
  layers,
  onToggle,
  authGated,
}: {
  layers: MapLayers;
  onToggle: (key: MapLayerKey) => void;
  /** When false, needs/resources toggles show a login hint. */
  authGated?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-md border bg-surface/95 p-1.5 shadow-sm backdrop-blur">
      {layerConfig.map(({ key, label, icon, hint }) => {
        const active = layers[key];
        const gated = authGated === false && key !== "alerts";
        return (
          <button
            key={key}
            type="button"
            title={gated ? hint : undefined}
            onClick={() => onToggle(key)}
            className={`flex items-center gap-1.5 rounded-sm border px-2.5 py-1.5 text-xs font-medium transition-colors ${
              active
                ? "border-primary bg-primary/10 text-primary"
                : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
            } ${gated ? "opacity-70" : ""}`}
          >
            <Icon icon={icon} width={14} height={14} aria-hidden />
            {label}
          </button>
        );
      })}
    </div>
  );
}
