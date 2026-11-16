import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { COUNTIES, TOWNS, placeKey } from "@/data/kenyaPlaces";
import { Field, NativeSelect } from "../businessShared";

/** The built-in towns plus the pins you've added on the Map tab. */
export function usePlaces() {
  const custom = useQuery({ queryKey: ["mkt", "places"], queryFn: () => base44.entities.MktPlace.list(), staleTime: 5 * 60_000 });
  return useMemo(() => {
    const mine = (custom.data || []).map((p) => ({ id: p.id, name: p.name, county: p.county, lat: p.lat, lng: p.lng, custom: true }));
    const taken = new Set(mine.map((p) => placeKey(p.county, p.name)));
    return [...TOWNS.filter((t) => !taken.has(placeKey(t.county, t.name))), ...mine];
  }, [custom.data]);
}

/** County, then a town in that county. Changing the county clears the town. */
export default function LocationPicker({ county, town, onChange, required, emptyTown = "Whole county / not sure" }) {
  const places = usePlaces();
  const towns = places.filter((p) => p.county === county).sort((a, b) => a.name.localeCompare(b.name));
  // A saved town that has since been removed from the map still shows, so editing doesn't drop it
  const orphan = town && !towns.some((t) => t.name === town);
  return (
    <div className="grid grid-cols-2 gap-4">
      <Field label={`County${required ? " *" : ""}`}>
        <NativeSelect value={county} onChange={(v) => onChange({ county: v, town: "" })}>
          <option value="">—</option>
          {COUNTIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </NativeSelect>
      </Field>
      <Field label="Town / estate">
        <NativeSelect value={town} onChange={(v) => onChange({ county, town: v })}>
          <option value="">{county ? emptyTown : "Pick a county first"}</option>
          {orphan && <option value={town}>{town}</option>}
          {towns.map((t) => <option key={t.name} value={t.name}>{t.name}</option>)}
        </NativeSelect>
      </Field>
    </div>
  );
}
