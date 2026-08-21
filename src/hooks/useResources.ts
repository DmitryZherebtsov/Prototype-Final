import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DEMO_RESOURCES } from "@/lib/demoData";
import { mergeResources } from "@/lib/mergeDemoData";
import type { ResourceMapItem } from "@/hooks/useMapResources";

/**
 * Full resource registry — unlike useMapResources this keeps unavailable rows,
 * because the registry table needs to show both sides of the availability split.
 */
export function useResources() {
  const [resources, setResources] = useState<ResourceMapItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data, error } = await supabase
      .from("resources")
      .select(
        "id, organization_id, category, description, quantity, availability_window, status, created_at, organizations(name, municipality)",
      )
      .order("created_at", { ascending: false });
    const rows = error ? [] : ((data ?? []) as unknown as ResourceMapItem[]);
    setResources(mergeResources(rows, DEMO_RESOURCES));
    setLoading(false);
  };

  useEffect(() => {
    void load();
    const channel = supabase
      .channel("resources-registry-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "resources" }, () => {
        void load();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  return { resources, loading, reload: load };
}
