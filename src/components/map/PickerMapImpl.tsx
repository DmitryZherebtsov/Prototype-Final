import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { createPickerPin } from "@/lib/mapPins";
import type { Severity } from "@/lib/crisis";

function ClickCatcher({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (event) => onPick(event.latlng.lat, event.latlng.lng),
  });
  return null;
}

export default function PickerMapImpl({
  value,
  severity,
  onPick,
}: {
  value: { lat: number; lng: number } | null;
  severity: Severity;
  onPick: (lat: number, lng: number) => void;
}) {
  return (
    <MapContainer
      center={value ? [value.lat, value.lng] : [50.43, 21.8]}
      zoom={value ? 12 : 9}
      scrollWheelZoom
      className="h-full w-full"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <ClickCatcher onPick={onPick} />
      {value ? <Marker position={[value.lat, value.lng]} icon={createPickerPin(severity)} /> : null}
    </MapContainer>
  );
}
