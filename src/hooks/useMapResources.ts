import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DEMO_RESOURCES } from "@/lib/demoData";
import { mergeResources } from "@/lib/mergeDemoData";
import type { AvailabilityWindow, ResourceCategory } from "@/lib/crisis";

export interface ResourceMapItem {
  id: string;
  organization_id: string;
  category: ResourceCategory;
  description: string;
  quantity: string | null;
  availability_window: AvailabilityWindow;
  status: "available" | "unavailable";
  created_at: string;
  organizations: { name: string; municipality: string } | null;
}

export function useMapResources() {
  const [resources, setResources] = useState<ResourceMapItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data, error } = await supabase
      .from("resources")
      .select(
        "id, organization_id, category, description, quantity, availability_window, status, created_at, organizations(name, municipality)",
      )
      .eq("status", "available")
      .order("created_at", { ascending: false });
    const rows = error ? [] : ((data ?? []) as unknown as ResourceMapItem[]);
    setResources(mergeResources(rows, DEMO_RESOURCES));
    setLoading(false);
  };

  useEffect(() => {
    void load();
    const channel = supabase
      .channel("resources-map-realtime")
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
