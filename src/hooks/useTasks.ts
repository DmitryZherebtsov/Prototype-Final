import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DEMO_TASKS } from "@/lib/demoData";
import { mergeTasks } from "@/lib/mergeDemoData";
import type { Task } from "@/lib/crisis";

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false });
    const rows = error ? [] : ((data ?? []) as Task[]);
    setTasks(mergeTasks(rows, DEMO_TASKS));
    setLoading(false);
  };

  useEffect(() => {
    void load();
    const channel = supabase
      .channel("tasks-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => {
        void load();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  return { tasks, loading, reload: load };
}
