import { lazy, Suspense } from "react";
import { ClientOnly } from "@/components/ClientOnly";
import type { MapLayers } from "@/components/map/MapLayerToggle";
import type { ResourceMapItem } from "@/hooks/useMapResources";
import type { Alert, Need, Severity } from "@/lib/crisis";

const AlertMapImpl = lazy(() => import("./AlertMapImpl"));
const PickerMapImpl = lazy(() => import("./PickerMapImpl"));

function MapSkeleton() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-muted text-sm text-muted-foreground">
      Ładowanie mapy…
    </div>
  );
}

export function AlertMap(props: {
  alerts: Alert[];
  needs?: (Need & { organizations?: { name: string } | null })[];
  resources?: ResourceMapItem[];
  layers: MapLayers;
  focus: { lat: number; lng: number } | null;
  onSelect?: (id: string) => void;
}) {
  return (
    <ClientOnly fallback={<MapSkeleton />}>
      <Suspense fallback={<MapSkeleton />}>
        <AlertMapImpl {...props} />
      </Suspense>
    </ClientOnly>
  );
}

export function PickerMap(props: {
  value: { lat: number; lng: number } | null;
  severity: Severity;
  onPick: (lat: number, lng: number) => void;
}) {
  return (
    <ClientOnly fallback={<MapSkeleton />}>
      <Suspense fallback={<MapSkeleton />}>
        <PickerMapImpl {...props} />
      </Suspense>
    </ClientOnly>
  );
}

export type { MapLayers, MapLayerKey } from "@/components/map/MapLayerToggle";
export { MapLayerToggle } from "@/components/map/MapLayerToggle";
