import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DEMO_NEEDS } from "@/lib/demoData";
import { mergeNeeds } from "@/lib/mergeDemoData";
import type { Need } from "@/lib/crisis";

export function useNeeds() {
  const [needs, setNeeds] = useState<Need[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data, error } = await supabase
      .from("needs")
      .select("*")
      .order("created_at", { ascending: false });
    const rows = error ? [] : ((data ?? []) as Need[]);
    setNeeds(mergeNeeds(rows, DEMO_NEEDS));
    setLoading(false);
  };

  useEffect(() => {
    void load();
    const channel = supabase
      .channel("needs-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "needs" }, () => {
        void load();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  return { needs, loading, reload: load };
}
