// The Leaflet map behind Marketing → Map. Kept in its own file so Leaflet and the county
// shapes are only downloaded when the Map tab is opened (it is lazy-loaded by MapPanel).
import { useCallback, useEffect, useRef } from "react";
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Pane, Tooltip, useMapEvents } from "react-leaflet";
import { RotateCcw } from "lucide-react";
import "leaflet/dist/leaflet.css";
import "./kenyaMap.css";
import counties from "@/data/kenyaCounties.json";
import { MAP_INK as INK, MAP_PIN as PIN } from "./shared";

const KENYA = [[-4.75, 33.85], [5.5, 41.95]];
const ROOM = [[-7.5, 30.5], [8, 45.5]]; // how far you can drag away from Kenya
const BORDER = "#A89A8C";

/** Scrolling the page shouldn't zoom the map by accident: the wheel zooms only after you click the map. */
function WheelGate() {
  const map = useMapEvents({
    click: () => map.scrollWheelZoom.enable(),
    mouseout: () => map.scrollWheelZoom.disable(),
  });
  return null;
}

// Tooltip built with textContent so place names can never be read as HTML
function tip(lines) {
  const el = document.createElement("div");
  lines.forEach((text, i) => {
    const row = document.createElement("div");
    row.textContent = text;
    if (i === 0) row.className = "kenya-tip-title";
    el.appendChild(row);
  });
  return el;
}

/**
 * fills           Map of county → colour, for counties that have a value
 * targetCounties  Set of county names drawn with a dashed outline
 * selected        county name with a heavy outline
 * towns           [{ key, name, county, lat, lng, radius, filled, targeted, lines }]
 * countyLines     (county) → tooltip lines, first one is the title
 * onCounty        (county, { lat, lng }) when a county is clicked
 * onTown          (town) when a pin is clicked
 * picking         crosshair cursor while placing a pin or choosing targets
 */
export default function KenyaMap({ fills, targetCounties, selected, towns, countyLines, onCounty, onTown, picking }) {
  const mapRef = useRef(null);
  const layerRef = useRef(null);

  const style = useCallback((feature) => {
    const name = feature.properties.name;
    const fill = fills.get(name);
    const target = targetCounties.has(name), active = selected === name;
    return {
      fillColor: fill || "#FFFFFF",
      fillOpacity: fill ? 0.88 : 0.35,
      color: target || active ? INK : BORDER,
      weight: active ? 3 : target ? 2.25 : 0.8,
      dashArray: target ? "6 5" : null,
    };
  }, [fills, targetCounties, selected]);

  // Layers are created once, so their handlers read the latest props from here
  const live = useRef({});
  live.current = { style, countyLines, onCounty };

  const onEachFeature = useCallback((feature, layer) => {
    const name = feature.properties.name;
    layer.bindTooltip(() => tip(live.current.countyLines(name)), { sticky: true, direction: "top", offset: [0, -8] });
    layer.on({
      click: (e) => live.current.onCounty(name, { lat: e.latlng.lat, lng: e.latlng.lng }),
      mouseover: () => layer.setStyle({ weight: 3, color: INK }),
      mouseout: () => layer.setStyle(live.current.style(feature)),
    });
  }, []);

  // Outlined counties are raised so neighbours don't draw over their borders
  useEffect(() => {
    const layers = layerRef.current?.getLayers() ?? [];
    layers.filter((l) => targetCounties.has(l.feature.properties.name)).forEach((l) => l.bringToFront());
    layers.find((l) => l.feature.properties.name === selected)?.bringToFront();
  }, [targetCounties, selected]);

  return (
    <div className={`kenya-map h-full ${picking ? "is-picking" : ""}`}>
      <MapContainer ref={mapRef} bounds={KENYA} maxBounds={ROOM} maxBoundsViscosity={0.8} minZoom={5} maxZoom={14}
        zoomSnap={0.25} scrollWheelZoom={false} attributionControl>
        <WheelGate />
        <TileLayer className="kenya-tiles" opacity={0.6} url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors · boundaries: geoBoundaries' />
        <GeoJSON ref={layerRef} data={counties} style={style} onEachFeature={onEachFeature} />
        <Pane name="towns" style={{ zIndex: 450 }}>
          {towns.map((t) => (
            <CircleMarker key={t.key} center={[t.lat, t.lng]} radius={t.radius}
              pathOptions={{
                color: t.targeted ? INK : t.filled ? "#FFFFFF" : "#6B5F55",
                weight: t.targeted ? 2.25 : t.filled ? 2 : 1,
                fillColor: t.filled ? PIN : "#FFFFFF",
                fillOpacity: t.filled ? 0.92 : 0.95,
              }}
              eventHandlers={{ click: () => onTown(t) }}>
              <Tooltip direction="top" offset={[0, -t.radius]}>
                {t.lines.map((text, i) => <div key={i} className={i === 0 ? "kenya-tip-title" : ""}>{text}</div>)}
              </Tooltip>
            </CircleMarker>
          ))}
        </Pane>
      </MapContainer>
      <button type="button" onClick={() => mapRef.current?.fitBounds(KENYA)} title="Show the whole of Kenya"
        className="absolute top-3 right-3 z-[500] inline-flex items-center gap-1.5 rounded-md border border-black/15 bg-white px-2.5 py-1.5 text-xs font-medium text-obsidian shadow-sm hover:bg-muted">
        <RotateCcw className="w-3.5 h-3.5" /> Whole Kenya
      </button>
    </div>
  );
}
