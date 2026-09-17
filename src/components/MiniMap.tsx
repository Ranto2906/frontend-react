import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/**
 * Carte Leaflet minimaliste pour le frontend web (OSM en ligne — le web est
 * toujours connecté, contrairement au mobile). Affiche un marqueur pour un
 * point GeoJSON, ou un polygone pour un tracé.
 */
export default function MiniMap({
  geojson,
  height = 260,
}: {
  /** GeoJSON texte : {"type":"Point","coordinates":[lng,lat]} ou Polygon. */
  geojson: string;
  height?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const coucheRef = useRef<L.Layer | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: true,
      center: [-18.8792, 47.5079], // Madagascar par défaut
      zoom: 15,
      minZoom: 3,
      maxZoom: 19,
    });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;
    return () => {
      try { map.remove(); } catch { /* déjà retirée */ }
      mapRef.current = null;
      coucheRef.current = null;
    };
  }, []);

  // Affichage de la géométrie (Point ou Polygon).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !geojson) return;
    let parsed: any;
    try { parsed = JSON.parse(geojson); } catch { return; }

    if (coucheRef.current) {
      map.removeLayer(coucheRef.current);
      coucheRef.current = null;
    }

    try {
      if (parsed.type === 'Point' && Array.isArray(parsed.coordinates)) {
        const [lng, lat] = parsed.coordinates as [number, number];
        const marker = L.marker([lat, lng], {
          icon: L.divIcon({
            className: '',
            iconSize: [30, 40],
            iconAnchor: [15, 38],
            html: `<div style="width:30px;height:40px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))">
              <svg viewBox="0 0 24 24" width="30" height="40" style="display:block">
                <path d="M12 0C7 0 3 4 3 9c0 6.2 9 15 9 15s9-8.8 9-15c0-5-4-9-9-9z" fill="#c53030" stroke="#fff" stroke-width="1.5"/>
                <circle cx="12" cy="9" r="4" fill="#fff"/>
              </svg></div>`,
          }),
        }).addTo(map);
        coucheRef.current = marker;
        map.setView([lat, lng], Math.max(map.getZoom(), 15));
      } else {
        const couche = L.geoJSON(parsed, {
          style: { color: '#c53030', weight: 2, fillOpacity: 0.15 },
        }).addTo(map);
        coucheRef.current = couche;
        map.fitBounds(couche.getBounds(), { padding: [24, 24] });
      }
      // La carte est créée dans un conteneur parfois caché (onglet) → invalider.
      setTimeout(() => map.invalidateSize(), 150);
    } catch {
      // GeoJSON invalide : rien à afficher
    }
  }, [geojson]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height,
        borderRadius: 12,
        border: '1px solid #e2e8f0',
        zIndex: 0,
        overflow: 'hidden',
      }}
    />
  );
}
