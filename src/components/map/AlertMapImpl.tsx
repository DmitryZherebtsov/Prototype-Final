import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { NeedStatusBadge, NeedUrgencyBadge, SeverityBadge, StatusPill } from "@/components/badges";
import type { MapLayers } from "@/components/map/MapLayerToggle";
import type { ResourceMapItem } from "@/hooks/useMapResources";
import { getPinPosition } from "@/lib/geo";
import {
  AVAILABILITY_LABELS,
  ALERT_TYPE_LABELS,
  CATEGORY_LABELS,
  NEED_STATUS_LABELS,
  formatDateTime,
  type Alert,
  type Need,
} from "@/lib/crisis";
import {
  createAlertPin,
  createNeedPin,
  createResourcePin,
  preloadAlertPinIcons,
} from "@/lib/mapPins";

L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

function MapController({
  points,
  focus,
}: {
  points: [number, number][];
  focus: { lat: number; lng: number } | null;
}) {
  const map = useMap();
  const key = points.map((p) => p.join(",")).join("|");

  useEffect(() => {
    if (points.length > 0) {
      map.fitBounds(L.latLngBounds(points).pad(0.25), { maxZoom: 12 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (focus) map.flyTo([focus.lat, focus.lng], Math.max(map.getZoom(), 12), { duration: 0.6 });
  }, [focus, map]);

  return null;
}

export default function AlertMapImpl({
  alerts,
  needs = [],
  resources = [],
  layers,
  focus,
  onSelect,
}: {
  alerts: Alert[];
  needs?: (Need & { organizations?: { name: string } | null })[];
  resources?: ResourceMapItem[];
  layers: MapLayers;
  focus: { lat: number; lng: number } | null;
  onSelect?: (id: string) => void;
}) {
  const alertMarkers = useMemo(
    () => alerts.filter((a) => a.latitude != null && a.longitude != null),
    [alerts],
  );

  const needMarkers = useMemo(
    () =>
      needs
        .filter((n) => n.status === "open")
        .map((need) => {
          const pos =
            need.latitude != null && need.longitude != null
              ? { lat: need.latitude, lng: need.longitude }
              : getPinPosition(need.id, need.municipality);
          return { need, ...pos };
        }),
    [needs],
  );

  const resourceMarkers = useMemo(
    () =>
      resources.map((resource) => {
        const municipality = resource.organizations?.municipality ?? "Nowa Dęba";
        const pos = getPinPosition(resource.id, municipality);
        return { resource, ...pos };
      }),
    [resources],
  );

  const fitPoints = useMemo(() => {
    const pts: [number, number][] = [];
    if (layers.alerts) {
      alertMarkers
        .filter((a) => a.status !== "cancelled")
        .forEach((a) => pts.push([a.latitude as number, a.longitude as number]));
    }
    if (layers.needs) needMarkers.forEach((n) => pts.push([n.lat, n.lng]));
    if (layers.resources) resourceMarkers.forEach((r) => pts.push([r.lat, r.lng]));
    return pts;
  }, [layers, alertMarkers, needMarkers, resourceMarkers]);

  const [iconsReady, setIconsReady] = useState(false);
  useEffect(() => {
    let mounted = true;
    void preloadAlertPinIcons().finally(() => {
      if (mounted) setIconsReady(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <MapContainer center={[52.0, 19.0]} zoom={6} scrollWheelZoom className="h-full w-full">
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <MapController points={fitPoints} focus={focus} />

      {layers.alerts
        ? alertMarkers.map((alert) => (
            <Marker
              key={`alert-${alert.id}-${iconsReady ? "ready" : "pending"}`}
              position={[alert.latitude as number, alert.longitude as number]}
              icon={createAlertPin(alert)}
              eventHandlers={{ click: () => onSelect?.(alert.id) }}
            >
              <Popup>
                <div className="min-w-52 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <SeverityBadge severity={alert.severity} muted={alert.status === "cancelled"} />
                    <StatusPill status={alert.status} />
                    <span className="text-xs text-muted-foreground">
                      {ALERT_TYPE_LABELS[alert.alert_type]}
                    </span>
                  </div>
                  <p className="text-base font-semibold text-foreground">{alert.title}</p>
                  <p className="text-xs text-muted-foreground">{alert.municipality}</p>
                  <p className="text-sm text-foreground/80">{alert.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(alert.created_at)}
                  </p>
                </div>
              </Popup>
            </Marker>
          ))
        : null}

      {layers.needs
        ? needMarkers.map(({ need, lat, lng }) => (
            <Marker
              key={`need-${need.id}`}
              position={[lat, lng]}
              icon={createNeedPin(need.urgency, need.category)}
              zIndexOffset={-100}
            >
              <Popup>
                <div className="min-w-48 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <NeedUrgencyBadge urgency={need.urgency} />
                    <NeedStatusBadge status={need.status} />
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">
                    {need.organizations?.name ?? "Organizacja"} · {need.municipality}
                  </p>
                  <p className="text-sm font-semibold">{CATEGORY_LABELS[need.category]}</p>
                  <p className="text-sm text-foreground/80">
                    {need.description} · {need.quantity}
                  </p>
                  <p className="text-xs text-muted-foreground">{NEED_STATUS_LABELS[need.status]}</p>
                </div>
              </Popup>
            </Marker>
          ))
        : null}

      {layers.resources
        ? resourceMarkers.map(({ resource, lat, lng }) => (
            <Marker
              key={`resource-${resource.id}`}
              position={[lat, lng]}
              icon={createResourcePin(resource.category, resource.status === "available")}
              zIndexOffset={-200}
            >
              <Popup>
                <div className="min-w-48 space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">
                    {resource.organizations?.name ?? "Organizacja"} ·{" "}
                    {resource.organizations?.municipality}
                  </p>
                  <p className="text-sm font-semibold">{CATEGORY_LABELS[resource.category]}</p>
                  <p className="text-sm text-foreground/80">
                    {resource.description}
                    {resource.quantity ? ` · ${resource.quantity}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {AVAILABILITY_LABELS[resource.availability_window]} ·{" "}
                    {resource.status === "available" ? "Dostępny" : "Niedostępny"}
                  </p>
                </div>
              </Popup>
            </Marker>
          ))
        : null}
    </MapContainer>
  );
}
