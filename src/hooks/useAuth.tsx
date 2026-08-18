import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole, OrgStatus, OrgType } from "@/lib/crisis";

export interface OrgRecord {
  id: string;
  name: string;
  type: OrgType;
  contact_person: string;
  email: string;
  phone: string | null;
  municipality: string;
  status: OrgStatus;
  created_at: string;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  organization: OrgRecord | null;
  role: AppRole | null;
  loading: boolean;
  isVerified: boolean;
  isAdmin: boolean;
  canManageAlerts: boolean;
  canManageTasks: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [organization, setOrganization] = useState<OrgRecord | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (userId: string | undefined) => {
    if (!userId) {
      setOrganization(null);
      setRole(null);
      return;
    }
    const [{ data: appUser }, { data: roles }] = await Promise.all([
      supabase.from("app_users").select("organization_id, active").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);
    setRole(((roles?.[0]?.role as AppRole) ?? null) || null);
    if (appUser?.organization_id) {
      const { data: org } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", appUser.organization_id)
        .maybeSingle();
      setOrganization((org as OrgRecord) ?? null);
    } else {
      setOrganization(null);
    }
  };

  useEffect(() => {
    let mounted = true;
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      setTimeout(() => {
        void loadProfile(newSession?.user?.id);
      }, 0);
    });
    void supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      await loadProfile(data.session?.user?.id);
      setLoading(false);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value: AuthState = {
    session,
    user: session?.user ?? null,
    organization,
    role,
    loading,
    isVerified: organization?.status === "active",
    isAdmin: role === "super_admin",
    canManageAlerts:
      organization?.status === "active" &&
      (role === "super_admin" || role === "municipality" || role === "emergency"),
    canManageTasks:
      organization?.status === "active" &&
      (role === "super_admin" || role === "municipality" || role === "emergency"),
    refresh: async () => {
      await loadProfile(session?.user?.id);
    },
    signOut: async () => {
      await supabase.auth.signOut();
      setOrganization(null);
      setRole(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
