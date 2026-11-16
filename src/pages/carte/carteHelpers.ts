import type L from 'leaflet';
import type { CoordPoint } from './carteTypes';
import type { GeometrieCarte } from '../../types';

export function coucheDe(g: GeometrieCarte): string {
  if (g.entiteType === 'propriete' && g.lieeADossier) return 'propriete_dossier';
  if (g.entiteType === 'dossier_parcelle' && g.dossierCloture) return 'dossier_cloture';
  return g.entiteType;
}

export function parserPoints(texte: string): CoordPoint[] {
  const pts: CoordPoint[] = [];
  for (const ligne of texte.split(/\r?\n/)) {
    const nettoye = ligne.replace(/[,;]+/g, ' ').trim();
    if (!nettoye) continue;
    const morceaux = nettoye.split(/\s+/).map(Number);
    if (morceaux.length !== 2 || morceaux.some((n) => !Number.isFinite(n))) continue;
    pts.push({ x: morceaux[0], y: morceaux[1] });
  }
  return pts;
}

export function idLisible(entiteId: string): string {
  const m = /^00000000-0000-0000-0000-(\d{12})$/.exec(entiteId);
  if (m) return String(Number(m[1]));
  return entiteId.length > 13 ? `${entiteId.slice(0, 8)}…` : entiteId;
}

export function formatCoord(lat: number, lon: number): string {
  return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
}

export function formatDateHeure(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function uuidPropriete(id: string): string {
  const n = Number(id);
  return Number.isFinite(n) ? `00000000-0000-0000-0000-${String(n).padStart(12, '0')}` : id;
}

export function labelEntite(entiteType: string): string {
  return ({
    propriete: 'Propriété',
    parcelle: 'Parcelle',
    dossier_parcelle: 'Parcelle de dossier',
    signalement: 'Signalement',
    descente_terrain: 'Descente terrain',
  } as Record<string, string>)[entiteType] ?? entiteType;
}

export function normaliserTexte(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function formatM2(m2: number): string {
  if (m2 >= 10000) return `${(m2 / 10000).toFixed(2)} ha (${Math.round(m2).toLocaleString('fr-FR')} m²)`;
  return `${Math.round(m2).toLocaleString('fr-FR')} m²`;
}

export function axiosMsg(e: unknown): string {
  if (e && typeof e === 'object' && 'response' in e) {
    const data = (e as { response?: { data?: { message?: string; error?: string } } }).response?.data;
    if (data?.message) return data.message;
    if (data?.error) return data.error;
  }
  return '';
}

export function geojsonDessin(mode: 'aucun' | 'point' | 'polygone', points: L.LatLng[]): string | null {
  if (mode === 'point' && points.length === 1) {
    return JSON.stringify({ type: 'Point', coordinates: [points[0].lng, points[0].lat] });
  }
  if (mode === 'polygone' && points.length >= 3) {
    const ring = points.map((p) => [p.lng, p.lat] as [number, number]);
    ring.push(ring[0]);
    return JSON.stringify({ type: 'Polygon', coordinates: [ring] });
  }
  return null;
}
