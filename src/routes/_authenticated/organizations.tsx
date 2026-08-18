import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Icon } from "@iconify/react";
import { VerifiedGate } from "@/components/VerifiedGate";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { MUNICIPALITIES, ORG_TYPE_LABELS, type OrgType } from "@/lib/crisis";
import type { OrgRecord } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/organizations")({
  head: () => ({
    meta: [
      { title: "Organizacje — Koordynacja Kryzysowa" },
      {
        name: "description",
        content: "Katalog zweryfikowanych organizacji, samorządów i służb wraz z kontaktami.",
      },
      { property: "og:title", content: "Organizacje — Koordynacja Kryzysowa" },
      {
        property: "og:description",
        content: "Katalog zweryfikowanych organizacji wraz z kontaktami.",
      },
    ],
  }),
  component: OrganizationsPage,
});

const types: OrgType[] = ["ngo_humanitarian", "ngo_local", "municipality", "emergency", "admin"];

function OrganizationsPage() {
  const { isVerified } = useAuth();
  const [orgs, setOrgs] = useState<OrgRecord[]>([]);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({ municipality: "", type: "" });

  useEffect(() => {
    if (!isVerified) return;
    void (async () => {
      const { data } = await supabase
        .from("organizations")
        .select("*")
        .eq("status", "active")
        .order("name");
      setOrgs((data ?? []) as OrgRecord[]);
    })();
  }, [isVerified]);

  const visible = orgs.filter(
    (o) =>
      o.name.toLowerCase().includes(query.trim().toLowerCase()) &&
      (!filters.municipality || o.municipality === filters.municipality) &&
      (!filters.type || o.type === filters.type),
  );

  return (
    <VerifiedGate title="Organizacje">
      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        <div className="relative">
          <Icon
            icon="tabler:search"
            width={16}
            height={16}
            className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            aria-label="Szukaj organizacji"
            placeholder="Szukaj po nazwie"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="input-base pl-9"
          />
        </div>
        <select
          aria-label="Filtruj po gminie"
          value={filters.municipality}
          onChange={(e) => setFilters({ ...filters, municipality: e.target.value })}
          className="input-base"
        >
          <option value="">Wszystkie gminy</option>
          {MUNICIPALITIES.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <select
          aria-label="Filtruj po typie"
          value={filters.type}
          onChange={(e) => setFilters({ ...filters, type: e.target.value })}
          className="input-base"
        >
          <option value="">Wszystkie typy</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {ORG_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {visible.map((org) => (
          <article key={org.id} className="rounded-md border bg-surface p-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-semibold">{org.name}</h2>
              <span className="rounded-sm bg-muted px-2 py-0.5 text-xs font-medium">
                {ORG_TYPE_LABELS[org.type]}
              </span>
              <span className="ml-auto text-xs text-muted-foreground">{org.municipality}</span>
            </div>
            <p className="mt-2 text-sm">{org.contact_person}</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Icon icon="mdi:email-outline" width={14} height={14} aria-hidden />
              {org.email}
            </p>
            {org.phone ? (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Icon icon="mdi:phone-outline" width={14} height={14} aria-hidden />
                {org.phone}
              </p>
            ) : null}
          </article>
        ))}
        {visible.length === 0 ? (
          <p className="rounded-md border bg-surface p-6 text-center text-sm text-muted-foreground md:col-span-2">
            Brak organizacji spełniających kryteria.
          </p>
        ) : null}
      </div>
    </VerifiedGate>
  );
}
