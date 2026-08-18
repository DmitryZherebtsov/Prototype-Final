import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Icon } from "@iconify/react";
import { AlertCard } from "@/components/AlertCard";
import { AlertMap, MapLayerToggle, type MapLayers } from "@/components/map";
import { SiteHeader } from "@/components/SiteHeader";
import { useAlerts } from "@/hooks/useAlerts";
import { useAuth } from "@/hooks/useAuth";
import { useMapResources } from "@/hooks/useMapResources";
import { useNeeds } from "@/hooks/useNeeds";
import { supabase } from "@/integrations/supabase/client";
import { getDemoOrgName } from "@/lib/demoData";
import type { Need } from "@/lib/crisis";

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "Mapa alertów — Koordynacja Kryzysowa" },
      {
        name: "description",
        content:
          "Interaktywna mapa alertów, potrzeb i zasobów kryzysowych w Polsce. Bez logowania dla alertów.",
      },
      { property: "og:title", content: "Mapa alertów — Koordynacja Kryzysowa" },
      {
        property: "og:description",
        content: "Interaktywna mapa alertów, potrzeb i zasobów kryzysowych.",
      },
    ],
  }),
  component: MapPage,
});

type NeedWithOrg = Need & { organizations?: { name: string } | null };

function MapPage() {
  const { alerts } = useAlerts();
  const { isVerified, session } = useAuth();
  const { needs: rawNeeds } = useNeeds();
  const { resources } = useMapResources();
  const [needsWithOrg, setNeedsWithOrg] = useState<NeedWithOrg[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [layers, setLayers] = useState<MapLayers>({
    alerts: true,
    needs: false,
    resources: false,
  });

  useEffect(() => {
    if (!isVerified || rawNeeds.length === 0) {
      setNeedsWithOrg([]);
      return;
    }
    void (async () => {
      const orgIds = [...new Set(rawNeeds.map((n) => n.organization_id))];
      const { data: orgs } = await supabase
        .from("organizations")
        .select("id, name")
        .in("id", orgIds);
      const names = new Map((orgs ?? []).map((o) => [o.id, o.name]));
      setNeedsWithOrg(
        rawNeeds.map((n) => ({
          ...n,
          organizations: names.has(n.organization_id)
            ? { name: names.get(n.organization_id)! }
            : getDemoOrgName(n.organization_id)
              ? { name: getDemoOrgName(n.organization_id)! }
              : null,
        })),
      );
    })();
  }, [rawNeeds, isVerified]);

  const toggleLayer = (key: keyof MapLayers) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const visibleNeeds = isVerified && layers.needs ? needsWithOrg : [];
  const visibleResources = isVerified && layers.resources ? resources : [];

  const layerHint = useMemo(() => {
    if (session && !isVerified) return "Potrzeby i zasoby widoczne po weryfikacji konta.";
    if (!session) return "Zaloguj się, aby włączyć warstwy potrzeb i zasobów.";
    return null;
  }, [session, isVerified]);

  const focusAlert = alerts.find((a) => a.id === selected) ?? null;
  const focus =
    focusAlert?.latitude != null && focusAlert.longitude != null
      ? { lat: focusAlert.latitude, lng: focusAlert.longitude }
      : null;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <div className="flex flex-1 flex-col lg:flex-row">
        <div className="relative h-[55vh] w-full lg:h-[calc(100dvh-4.25rem)] lg:w-[70%]">
          <div className="absolute top-3 right-3 z-[500] max-w-[calc(100%-1.5rem)]">
            <MapLayerToggle layers={layers} onToggle={toggleLayer} authGated={isVerified} />
            {layerHint && (layers.needs || layers.resources) ? (
              <p className="mt-1.5 max-w-xs rounded-sm bg-surface/95 px-2 py-1 text-xs text-muted-foreground shadow-sm backdrop-blur">
                {layerHint}
                {!session ? (
                  <>
                    {" "}
                    <Link to="/login" className="font-medium text-primary underline">
                      Zaloguj
                    </Link>
                  </>
                ) : null}
              </p>
            ) : null}
          </div>
          <AlertMap
            alerts={alerts}
            needs={visibleNeeds}
            resources={visibleResources}
            layers={layers}
            focus={focus}
            onSelect={setSelected}
          />
        </div>

        <aside className="w-full border-t lg:h-[calc(100dvh-4.25rem)] lg:w-[30%] lg:overflow-y-auto lg:border-t-0 lg:border-l">
          <button
            onClick={() => setListOpen((v) => !v)}
            className="flex w-full items-center justify-between bg-surface px-4 py-3 text-left font-semibold lg:hidden"
          >
            Alerty ({alerts.length})
            <Icon
              icon="tabler:chevron-down"
              width={16}
              height={16}
              className={`transition-transform ${listOpen ? "rotate-180" : ""}`}
              aria-hidden
            />
          </button>
          <div className={`${listOpen ? "block" : "hidden"} space-y-3 p-4 lg:block`}>
            <h2 className="hidden text-sm font-semibold tracking-wide text-muted-foreground uppercase lg:block">
              Alerty ({alerts.length})
            </h2>
            {alerts.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                active={selected === alert.id}
                onClick={() => setSelected(alert.id)}
              />
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
