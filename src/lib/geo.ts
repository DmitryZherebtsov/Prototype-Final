import { MUNICIPALITIES } from "@/lib/crisis";

/** Approximate municipality centers for synthetic pin placement. */
export const MUNICIPALITY_CENTERS: Record<string, { lat: number; lng: number }> = {
  "Nowa Dęba": { lat: 50.4229, lng: 21.7511 },
  Tarnobrzeg: { lat: 50.5732, lng: 21.6804 },
  "Stalowa Wola": { lat: 50.5645, lng: 22.0656 },
  "Baranów Sandomierski": { lat: 50.5071, lng: 21.5428 },
  Gorzyce: { lat: 50.401, lng: 21.835 },
  Grębów: { lat: 50.565, lng: 21.873 },
  Bojanów: { lat: 50.427, lng: 21.954 },
};

const fallbackCenter = MUNICIPALITY_CENTERS["Nowa Dęba"]!;

function hashSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Deterministic jittered position near a municipality center. Used when needs
 * or resources have no stored coordinates so pins don't stack on one dot.
 */
export function getPinPosition(id: string, municipality: string): { lat: number; lng: number } {
  const center = MUNICIPALITY_CENTERS[municipality] ?? fallbackCenter;
  const seed = hashSeed(id);
  const index = seed % 97;
  const angle = index * 137.5 * (Math.PI / 180);
  const radius = 0.006 + (index % 8) * 0.0028;
  return {
    lat: center.lat + Math.cos(angle) * radius,
    lng: center.lng + Math.sin(angle) * radius,
  };
}

/** Validates municipality keys against the app list (for seed scripts). */
export const KNOWN_MUNICIPALITIES = MUNICIPALITIES;
