import { createFileRoute, redirect } from "@tanstack/react-router";

/** Tablica koordynacji — ukryta w nawigacji; przekierowanie do panelu do czasu redesignu. */
export const Route = createFileRoute("/_authenticated/feed")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
});
