import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Logowanie — Koordynacja Kryzysowa" },
      {
        name: "description",
        content: "Zaloguj się do panelu koordynacji kryzysowej dla zweryfikowanych organizacji.",
      },
      { property: "og:title", content: "Logowanie — Koordynacja Kryzysowa" },
      {
        property: "og:description",
        content: "Panel koordynacji kryzysowej dla zweryfikowanych organizacji.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError || !data.user) {
      setError("Nieprawidłowy e-mail lub hasło.");
      setBusy(false);
      return;
    }

    const { data: appUser } = await supabase
      .from("app_users")
      .select("organization_id, active")
      .eq("id", data.user.id)
      .maybeSingle();

    let status: string | null = null;
    if (appUser?.organization_id) {
      const { data: org } = await supabase
        .from("organizations")
        .select("status")
        .eq("id", appUser.organization_id)
        .maybeSingle();
      status = org?.status ?? null;
    }

    if (status === "pending" || status === null) {
      await supabase.auth.signOut();
      setError("Twoje konto oczekuje na weryfikację przez administratora.");
      setBusy(false);
      return;
    }
    if (status === "rejected" || appUser?.active === false) {
      await supabase.auth.signOut();
      setError("Twoje konto zostało odrzucone. Skontaktuj się z administratorem.");
      setBusy(false);
      return;
    }

    void navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <motion.main
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="mx-auto max-w-md px-4 py-10"
      >
        <h1 className="text-2xl font-bold tracking-tight">Logowanie</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Dostęp wyłącznie dla zweryfikowanych organizacji.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-md border bg-surface p-5">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-sm border bg-background px-3 py-2.5 text-base outline-none focus:border-primary"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium">
              Hasło
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-sm border bg-background px-3 py-2.5 text-base outline-none focus:border-primary"
            />
          </div>

          {error ? (
            <p className="rounded-sm border border-sev-high/30 bg-sev-high/10 px-3 py-2 text-sm text-sev-high">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-sm bg-primary px-4 py-3 text-base font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {busy ? "Logowanie…" : "Zaloguj się"}
          </button>
        </form>

        <p className="mt-4 text-sm text-muted-foreground">
          Nie masz konta?{" "}
          <Link to="/register" className="font-medium text-primary underline">
            Zarejestruj organizację
          </Link>
        </p>
      </motion.main>
    </div>
  );
}
