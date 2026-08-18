import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Icon } from "@iconify/react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { MUNICIPALITIES, ORG_TYPE_LABELS, ORG_TYPE_TO_ROLE, type OrgType } from "@/lib/crisis";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Rejestracja organizacji — Koordynacja Kryzysowa" },
      {
        name: "description",
        content:
          "Zgłoś organizację do sieci koordynacji kryzysowej. Konto aktywuje administrator po weryfikacji.",
      },
      { property: "og:title", content: "Rejestracja organizacji — Koordynacja Kryzysowa" },
      {
        property: "og:description",
        content: "Zgłoś organizację do sieci koordynacji kryzysowej.",
      },
    ],
  }),
  component: RegisterPage,
});

const orgTypes: OrgType[] = ["ngo_humanitarian", "ngo_local", "municipality", "emergency"];

function RegisterPage() {
  const [form, setForm] = useState({
    name: "",
    type: "ngo_local" as OrgType,
    contact_person: "",
    email: "",
    phone: "",
    municipality: MUNICIPALITIES[0] as string,
    password: "",
  });
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: { emailRedirectTo: window.location.origin },
    });

    if (signUpError) {
      setError(
        signUpError.message.includes("already")
          ? "Konto z tym adresem e-mail już istnieje."
          : "Nie udało się utworzyć konta. Spróbuj ponownie.",
      );
      setBusy(false);
      return;
    }

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert({
        name: form.name.trim(),
        type: form.type,
        contact_person: form.contact_person.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        municipality: form.municipality,
        status: "pending",
      })
      .select("id")
      .single();

    if (orgError || !org) {
      setError("Nie udało się zapisać zgłoszenia organizacji.");
      setBusy(false);
      return;
    }

    const userId = signUpData.user?.id;
    if (userId && signUpData.session) {
      await supabase.from("app_users").insert({ id: userId, organization_id: org.id });
      await supabase.from("user_roles").insert({
        user_id: userId,
        role: ORG_TYPE_TO_ROLE[form.type as keyof typeof ORG_TYPE_TO_ROLE],
      });
      await supabase.auth.signOut();
    }

    setDone(true);
    setBusy(false);
  };

  if (done) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <motion.main
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto max-w-md px-4 py-12 text-center"
        >
          <Icon
            icon="solar:check-circle-bold"
            className="mx-auto size-12 text-sev-low"
            aria-hidden
          />
          <h1 className="mt-4 text-2xl font-bold">Zgłoszenie przyjęte</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Twoje konto oczekuje na weryfikację przez administratora. Powiadomimy Cię e-mailem po
            zatwierdzeniu organizacji.
          </p>
          <Link
            to="/"
            className="mt-6 inline-block rounded-sm bg-primary px-4 py-3 font-semibold text-primary-foreground"
          >
            Wróć do alertów
          </Link>
        </motion.main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-lg px-4 py-8">
        <h1 className="text-2xl font-bold tracking-tight">Rejestracja organizacji</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Nie zbieramy danych wrażliwych. Konto wymaga zatwierdzenia przez administratora.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-md border bg-surface p-5">
          <Field label="Nazwa organizacji" id="name">
            <input
              id="name"
              required
              value={form.name}
              onChange={(e) => set("name")(e.target.value)}
              className="input-base"
            />
          </Field>

          <Field label="Typ organizacji" id="type">
            <select
              id="type"
              value={form.type}
              onChange={(e) => set("type")(e.target.value)}
              className="input-base"
            >
              {orgTypes.map((type) => (
                <option key={type} value={type}>
                  {ORG_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Osoba kontaktowa" id="contact">
            <input
              id="contact"
              required
              value={form.contact_person}
              onChange={(e) => set("contact_person")(e.target.value)}
              className="input-base"
            />
          </Field>

          <Field label="E-mail" id="email">
            <input
              id="email"
              type="email"
              required
              value={form.email}
              onChange={(e) => set("email")(e.target.value)}
              className="input-base"
            />
          </Field>

          <Field label="Numer telefonu" id="phone">
            <input
              id="phone"
              value={form.phone}
              onChange={(e) => set("phone")(e.target.value)}
              className="input-base"
            />
          </Field>

          <Field label="Gmina" id="municipality">
            <select
              id="municipality"
              value={form.municipality}
              onChange={(e) => set("municipality")(e.target.value)}
              className="input-base"
            >
              {MUNICIPALITIES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Hasło (min. 8 znaków)" id="password">
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => set("password")(e.target.value)}
              className="input-base"
            />
          </Field>

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
            {busy ? "Wysyłanie…" : "Wyślij zgłoszenie"}
          </button>
        </form>
      </main>
    </div>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}
