import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DEMO_ALERTS } from "@/lib/demoData";
import { mergeAlerts } from "@/lib/mergeDemoData";
import { sortAlerts, type Alert } from "@/lib/crisis";

export function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase.from("alerts").select("*");
    const rows = (data ?? []).map((row) => ({
      ...row,
      alert_type: row.alert_type ?? "general",
    })) as Alert[];
    setAlerts(sortAlerts(mergeAlerts(rows, DEMO_ALERTS)));
    setLoading(false);
  };

  useEffect(() => {
    void load();
    const channel = supabase
      .channel("alerts-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "alerts" }, () => {
        void load();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  return { alerts, loading, reload: load };
}
