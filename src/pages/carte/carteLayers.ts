import L from 'leaflet';
import * as turf from '@turf/turf';
import { wgs84VersLaborde } from '../../utils';
import type { GeometrieCarte } from '../../types';
import { escapeHtml, formatCoord, formatDateHeure, formatM2, idLisible, labelEntite } from './carteHelpers';
import type { CoordonneesGeom, SommetCoord } from './carteTypes';

export function ajouterGeometrie(groupe: L.LayerGroup, g: GeometrieCarte, couleur: string, onZoom: (g: GeometrieCarte) => void, registre?: Map<string, L.Layer>) {
  let parsed: GeoJSON.GeoJsonObject;
  try { parsed = JSON.parse(g.geojson); } catch { return; }
  const coords = coordonneesDe(parsed);
  const couche = L.geoJSON(parsed, {
    style: (feature) => feature?.geometry?.type === 'Point' ? {} : { color: couleur, weight: 3, fillOpacity: 0.30, fillColor: couleur },
    pointToLayer: (_f, latlng) => L.circleMarker(latlng, { radius: 5, color: '#ffffff', fillColor: couleur, fillOpacity: 0.95, weight: 2 }),
    onEachFeature: (_f, layer) => {
      registre?.set(g.idGeometrie, layer);
      layer.bindPopup(popupDetailHtml(g, couleur, coords), { minWidth: 250, maxWidth: 320, autoPanPadding: [24, 24] });
      layer.on('popupopen', (e: L.PopupEvent) => {
        const el = e.popup.getElement();
        if (!el) return;
        const copier = el.querySelector<HTMLButtonElement>('[data-action="copier"]');
        if (copier) copier.onclick = (ev) => { ev.stopPropagation(); const texte = texteCoordonnees(coords); if (texte) copierTexte(texte).then((ok) => retourBouton(copier, ok ? '✅ Copié' : '⚠️ Copie refusée')); };
        const zoom = el.querySelector<HTMLButtonElement>('[data-action="zoom"]');
        if (zoom) zoom.onclick = (ev) => { ev.stopPropagation(); onZoom(g); };
      });
      layer.on('click', () => onZoom(g));
    },
  });
  couche.addTo(groupe);
}

function coordonneesDe(parsed: GeoJSON.GeoJsonObject): CoordonneesGeom {
  const geom = parsed as GeoJSON.Geometry;
  let bruts: [number, number][] = [];
  if (geom.type === 'Point') bruts = [geom.coordinates as [number, number]];
  else if (geom.type === 'LineString') bruts = geom.coordinates as [number, number][];
  else if (geom.type === 'Polygon') bruts = (geom.coordinates as [number, number][][])[0] ?? [];
  else if (geom.type === 'MultiLineString') bruts = (geom.coordinates as [number, number][][]).flat();
  else if (geom.type === 'MultiPolygon') bruts = (geom.coordinates as [number, number][][][]).flat(2);
  else return { sommets: [], centre: null };
  if (bruts.length > 1) {
    const [x0, y0] = bruts[0]; const [xn, yn] = bruts[bruts.length - 1];
    if (x0 === xn && y0 === yn) bruts = bruts.slice(0, -1);
  }
  const sommets = bruts.filter((c) => Array.isArray(c) && c.length >= 2).map(([lon, lat]) => ({ lat, lon })).filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon));
  return { sommets, centre: centroide(parsed, sommets) };
}

function centroide(parsed: GeoJSON.GeoJsonObject, sommets: SommetCoord[]): SommetCoord | null {
  if (sommets.length === 0) return null;
  if (sommets.length === 1) return sommets[0];
  try {
    const c = turf.centroid(parsed as GeoJSON.Feature | GeoJSON.Geometry);
    const [lon, lat] = c.geometry.coordinates;
    if (Number.isFinite(lon) && Number.isFinite(lat)) return { lat, lon };
  } catch { /* repli sur la moyenne */ }
  return {
    lat: sommets.reduce((s, p) => s + p.lat, 0) / sommets.length,
    lon: sommets.reduce((s, p) => s + p.lon, 0) / sommets.length,
  };
}

function popupDetailHtml(g: GeometrieCarte, couleur: string, coords: CoordonneesGeom): string {
  const nom = g.libelleEntite || g.entiteId;
  const badge = g.lieeADossier ? ' · liée à un dossier' : g.dossierCloture ? ' · dossier clôturé' : '';
  const lignes: Array<[string, string | null, string | null]> = [
    ['Identifiant', idLisible(g.entiteId), g.entiteId], ['Superficie', g.superficieCalculeeM2 != null ? formatM2(g.superficieCalculeeM2) : null, null],
    ['Source', g.source ?? null, null], ['Précision', g.precisionM != null ? `${g.precisionM} m` : null, null],
    ['Créée le', g.dateCreation ? formatDateHeure(g.dateCreation) : null, null], ['Modifiée le', g.dateModification ? formatDateHeure(g.dateModification) : null, null], ['Créée par', g.utilisateur ?? null, null],
  ];
  const lignesHtml = lignes.filter(([, v]) => v != null && v !== '').map(([label, v, title]) => lignePopup(label, v as string, title, 'inline')).join('');
  const centre = coords.centre;
  const lab = centre ? wgs84VersLaborde(centre.lon, centre.lat) : null;
  const lignesCoords = centre ? [lignePopup('Latitude', `${centre.lat.toFixed(6)}°`, null, 'block'), lignePopup('Longitude', `${centre.lon.toFixed(6)}°`, null, 'block'), lignePopup('X Laborde', lab ? `${lab.x.toFixed(2)} m` : '—', null, 'block'), lignePopup('Y Laborde', lab ? `${lab.y.toFixed(2)} m` : '—', null, 'block')].join('') : '<div style="font-size:11.5px;color:#94a3b8">Coordonnées indisponibles</div>';
  const sommetsHtml = coords.sommets.length > 1 ? `<details style="margin-top:4px"><summary style="cursor:pointer;font-size:11px;color:#2563eb">Sommets (${coords.sommets.length})</summary><ol style="margin:4px 0 0;padding-left:16px;font-size:11px;color:#475569;max-height:110px;overflow:auto">${coords.sommets.map((p) => `<li>${escapeHtml(formatCoord(p.lat, p.lon))}${labLigneSous(p)}</li>`).join('')}</ol></details>` : '';
  return `<div style="min-width:250px;max-width:300px;font-family:inherit"><div style="display:flex;align-items:center;gap:6px"><span style="width:10px;height:10px;flex:none;border-radius:50%;background:${couleur}"></span><span style="font-weight:600;font-size:13px;color:#0f172a">${escapeHtml(nom)}</span></div><div style="font-size:11px;color:#64748b;margin:2px 0 6px">${escapeHtml(labelEntite(g.entiteType))} · ${escapeHtml(g.typeGeometrie)}${escapeHtml(badge)}</div><div style="border-top:1px solid #e2e8f0;padding-top:4px">${lignesHtml}</div><div style="margin-top:6px;padding-top:6px;border-top:1px solid #e2e8f0"><div style="font-size:10px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.04em;margin-bottom:2px">${coords.sommets.length > 1 ? 'Centre' : 'Coordonnées'} — WGS84 / Laborde</div>${lignesCoords}${sommetsHtml}</div><div style="display:flex;gap:6px;margin-top:8px"><button data-action="copier" type="button" style="flex:1;padding:4px 6px;font-size:11px;border:1px solid #cbd5e1;border-radius:6px;background:#f8fafc;color:#334155;cursor:pointer">📋 Copier</button><button data-action="zoom" type="button" style="flex:1;padding:4px 6px;font-size:11px;border:1px solid #cbd5e1;border-radius:6px;background:#f8fafc;color:#334155;cursor:pointer">🔍 Zoom</button></div></div>`;
}

function lignePopup(label: string, valeur: string, title: string | null, disposition: 'inline' | 'block'): string {
  const styleLabel = 'color:#64748b;font-size:11px'; const styleValeur = 'color:#0f172a;font-size:11.5px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace'; const attributTitle = title ? ` title="${escapeHtml(title)}"` : '';
  if (disposition === 'block') return `<div style="display:flex;justify-content:space-between;gap:8px;padding:1px 0"><span style="${styleLabel}">${escapeHtml(label)}</span><span style="${styleValeur}"${attributTitle}>${escapeHtml(valeur)}</span></div>`;
  return `<div style="display:flex;justify-content:space-between;gap:8px;padding:1px 0"><span style="${styleLabel}">${escapeHtml(label)}</span><span style="color:#0f172a;font-size:11.5px;text-align:right;word-break:break-word"${attributTitle}>${escapeHtml(valeur)}</span></div>`;
}

function labLigneSous(p: SommetCoord): string {
  const lab = wgs84VersLaborde(p.lon, p.lat);
  return lab ? ` <span style="color:#94a3b8">— X ${lab.x.toFixed(0)} · Y ${lab.y.toFixed(0)}</span>` : '';
}

function texteCoordonnees(coords: CoordonneesGeom): string {
  return coords.sommets.map((p) => formatCoord(p.lat, p.lon)).join('\n');
}

async function copierTexte(texte: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(texte); return true; }
  } catch { /* repli historique */ }
  try {
    const zone = document.createElement('textarea'); zone.value = texte; zone.setAttribute('readonly', ''); zone.style.position = 'fixed'; zone.style.left = '-1000px';
    document.body.appendChild(zone); zone.select(); const ok = document.execCommand('copy'); zone.remove(); return ok;
  } catch { return false; }
}

function retourBouton(bouton: HTMLButtonElement, texte: string) {
  const initial = bouton.textContent ?? ''; bouton.textContent = texte; setTimeout(() => { bouton.textContent = initial; }, 1600);
}
