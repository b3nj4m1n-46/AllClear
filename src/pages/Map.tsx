import { useEffect, useState, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Popup,
  useMap,
} from "react-leaflet";
import { QRCodeSVG } from "qrcode.react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface ParcelProperties {
  ACCOUNT: string;
  FEEOWNER: string;
  SITEADD: string;
  MAPLOT: string;
  ACREAGE: number;
  YEARBLT: number;
  BUILDCODE: number;
  PROPCLASS: string;
  evac_zone: string | null;
  evac_zone_seq: string | null;
  evac_city: string | null;
  evac_url: string | null;
}

// Generate a consistent color from a zone string
function zoneColor(zone: string | null): string {
  if (!zone) return "#555";
  // Hash the string to pick a hue
  let hash = 0;
  for (let i = 0; i < zone.length; i++) {
    hash = zone.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 75%, 55%)`;
}

const ASHLAND_CENTER: [number, number] = [42.195, -122.71];
const SURVEY_BASE = window.location.origin;

// Hash lookup cache
let hashCache: Record<string, string> = {};

function Legend({ zones }: { zones: string[] }) {
  const map = useMap();

  useEffect(() => {
    const legend = new L.Control({ position: "bottomright" });
    legend.onAdd = () => {
      const div = L.DomUtil.create("div", "map-legend");
      // Show ASH zones first, then JAC zones
      const ashZones = zones.filter(z => z.startsWith("ASH")).sort();
      const otherZones = zones.filter(z => !z.startsWith("ASH")).sort().slice(0, 5);
      const items = [...ashZones, ...otherZones].map(
        z => `<div class="legend-item"><span class="legend-swatch" style="background:${zoneColor(z)}"></span>${z}</div>`
      ).join("");
      const more = zones.length - ashZones.length - otherZones.length;
      const moreLabel = more > 0 ? `<div class="legend-item" style="color:#888">+${more} county zones</div>` : "";
      div.innerHTML = `<h4>Evacuation Zones</h4>${items}${moreLabel}<div class="legend-item"><span class="legend-swatch" style="background:#555"></span>Unzoned</div>`;
      return div;
    };
    legend.addTo(map);
    return () => { legend.remove(); };
  }, [map, zones]);

  return null;
}

export default function MapPage() {
  const [parcels, setParcels] = useState<GeoJSON.FeatureCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ParcelProperties | null>(null);
  const [hashCode, setHashCode] = useState<string>("");
  const popupRef = useRef<L.Popup | null>(null);

  useEffect(() => {
    fetch("/data/ashland_parcels_with_zones.geojson")
      .then((r) => r.json())
      .then((p) => {
        setParcels(p);
        setLoading(false);
    });
  }, []);

  const lookupHash = async (account: string) => {
    if (hashCache[account]) {
      setHashCode(hashCache[account]);
      return;
    }
    try {
      const res = await fetch(`/api/parcels?search=${account}&role=owner&limit=1`);
      const data = await res.json();
      if (data.parcels.length > 0) {
        hashCache[account] = data.parcels[0].hash_code;
        setHashCode(data.parcels[0].hash_code);
      }
    } catch {
      setHashCode("");
    }
  };

  const uniqueZones = parcels
    ? [...new Set(parcels.features.map((f: GeoJSON.Feature) => f.properties?.evac_zone).filter(Boolean))] as string[]
    : [];

  const parcelStyle = (feature: GeoJSON.Feature | undefined) => {
    const zone = feature?.properties?.evac_zone;
    return {
      fillColor: zoneColor(zone),
      weight: 0.8,
      color: "#fff",
      fillOpacity: 0.7,
    };
  };

  const onEachParcel = (feature: GeoJSON.Feature, layer: L.Layer) => {
    layer.on("click", () => {
      const props = feature.properties as ParcelProperties;
      setSelected(props);
      lookupHash(String(props.ACCOUNT));
    });
  };

  if (loading) {
    return (
      <div className="map-loading">
        <p>Loading 11,473 parcels...</p>
      </div>
    );
  }

  return (
    <div className="map-page">
      <MapContainer
        center={ASHLAND_CENTER}
        zoom={13}
        className="map-container"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a> &copy; <a href="https://carto.com">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        {parcels && (
          <GeoJSON
            data={parcels}
            style={parcelStyle}
            onEachFeature={onEachParcel}
          />
        )}

        <Legend zones={uniqueZones} />
      </MapContainer>

      {selected && (
        <div className="map-sidebar">
          <button className="sidebar-close" onClick={() => setSelected(null)}>
            x
          </button>
          <h3>{selected.SITEADD || "No address"}</h3>
          <p className="sidebar-owner">{selected.FEEOWNER}</p>

          {selected.evac_zone && (
            <div
              className="sidebar-zone"
              style={{ borderColor: zoneColor(selected.evac_zone) }}
            >
              <span
                className="zone-dot"
                style={{ background: zoneColor(selected.evac_zone) }}
              />
              {selected.evac_zone}
            </div>
          )}

          <div className="sidebar-details">
            <div className="sidebar-row">
              <span>Account</span>
              <span>{selected.ACCOUNT}</span>
            </div>
            <div className="sidebar-row">
              <span>Map/Taxlot</span>
              <span>{selected.MAPLOT}</span>
            </div>
            {selected.YEARBLT ? (
              <div className="sidebar-row">
                <span>Year Built</span>
                <span>{selected.YEARBLT}</span>
              </div>
            ) : null}
            {selected.ACREAGE ? (
              <div className="sidebar-row">
                <span>Acreage</span>
                <span>{selected.ACREAGE}</span>
              </div>
            ) : null}
            {selected.evac_city && (
              <div className="sidebar-row">
                <span>District</span>
                <span>{selected.evac_city}</span>
              </div>
            )}
          </div>

          {hashCode && (
            <div className="sidebar-qr">
              <QRCodeSVG
                value={`${SURVEY_BASE}/s/${hashCode}`}
                size={100}
                level="M"
                fgColor="#c44d2a"
                bgColor="white"
              />
              <a
                href={`${SURVEY_BASE}/s/${hashCode}`}
                target="_blank"
                rel="noopener"
                className="sidebar-survey-link"
              >
                Open Survey
              </a>
            </div>
          )}

          {selected.evac_url && (
            <a
              href={selected.evac_url}
              target="_blank"
              rel="noopener"
              className="sidebar-pdf-link"
            >
              View Zone Evacuation Map
            </a>
          )}
        </div>
      )}
    </div>
  );
}
