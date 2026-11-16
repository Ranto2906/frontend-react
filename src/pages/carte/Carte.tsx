import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import * as turf from '@turf/turf';
import { geometrieService } from '../../services';
import type { EntiteSelectionnee, GeometrieCarte } from '../../types';
import GestionCouches from './GestionCouches';
import PanneauCoordonnees from './PanneauCoordonnees';
import PanneauDessin from './PanneauDessin';
import RechercheCarte from './RechercheCarte';
import { ajouterGeometrie } from './carteLayers';
import { axiosMsg, coucheDe, geojsonDessin, uuidPropriete } from './carteHelpers';
import { COUCHES } from './carteTypes';
import type { ModeDessin } from './carteTypes';

export default function Carte() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const coucheRefs = useRef<Map<string, L.LayerGroup>>(new Map());
  const dessinRef = useRef<L.LayerGroup | null>(null);
  const layersRef = useRef<Map<string, L.Layer>>(new Map());
  const [geometries, setGeometries] = useState<GeometrieCarte[]>([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [couchesActives, setCouchesActives] = useState<Record<string, boolean>>({
    propriete: true, propriete_dossier: true, dossier_cloture: true, parcelle: true,
    dossier_parcelle: false, signalement: true, descente_terrain: true,
  });
  const [modeDessin, setModeDessin] = useState<ModeDessin>('aucun');
  const [pointsDessin, setPointsDessin] = useState<L.LatLng[]>([]);
  const [superficieDessin, setSuperficieDessin] = useState<number | null>(null);
  const [entiteSelectionnee, setEntiteSelectionnee] = useState<EntiteSelectionnee | null>(null);
  const [remplacer, setRemplacer] = useState(false);
  const [panneauCoord, setPanneauCoord] = useState(false);
  const [zoomCible, setZoomCible] = useState<GeometrieCarte | null>(null);
  const [recherche, setRecherche] = useState('');
  const [filtreType, setFiltreType] = useState('tous');
  const [rechercheOuverte, setRechercheOuverte] = useState(false);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { center: [-18.8792, 47.5079], zoom: 12, minZoom: 3, maxZoom: 19 });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', maxZoom: 19 }).addTo(map);
    COUCHES.forEach((c) => { const g = L.layerGroup(); g.addTo(map); coucheRefs.current.set(c.key, g); });
    dessinRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      try { map.remove(); } catch { /* déjà retirée */ }
      mapRef.current = null; coucheRefs.current.clear(); dessinRef.current = null;
    };
  }, []);

  const charger = useCallback(async () => {
    setLoading(true); setErreur(null);
    try { setGeometries(await geometrieService.lister()); }
    catch { setErreur('Erreur lors du chargement des géométries'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { charger(); }, [charger]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    layersRef.current.clear();
    COUCHES.forEach((c) => {
      const groupe = coucheRefs.current.get(c.key);
      if (!groupe) return;
      groupe.clearLayers();
      geometries.filter((g) => coucheDe(g) === c.key).forEach((g) => ajouterGeometrie(groupe, g, c.couleur, setZoomCible, layersRef.current));
      if (couchesActives[c.key]) { if (!map.hasLayer(groupe)) groupe.addTo(map); }
      else if (map.hasLayer(groupe)) map.removeLayer(groupe);
    });
  }, [geometries, couchesActives]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !zoomCible) return;
    try {
      const couche = L.geoJSON(JSON.parse(zoomCible.geojson));
      const bounds = couche.getBounds();
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40], maxZoom: zoomCible.typeGeometrie === 'Point' ? 17 : 18 });
    } catch { /* geojson invalide */ }
    (layersRef.current.get(zoomCible.idGeometrie) as (L.Layer & { openPopup?: () => void }) | undefined)?.openPopup?.();
    setZoomCible(null);
  }, [zoomCible]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const onClic = (e: L.LeafletMouseEvent) => {
      if (modeDessin === 'aucun') return;
      if ((e.originalEvent.target as HTMLElement | null)?.closest('.leaflet-popup')) return;
      if (modeDessin === 'point') setPointsDessin([e.latlng]);
      else setPointsDessin((pts) => [...pts, e.latlng]);
    };
    map.on('click', onClic);
    return () => { map.off('click', onClic); };
  }, [modeDessin]);

  useEffect(() => {
    if (modeDessin !== 'polygone' || pointsDessin.length < 3) { setSuperficieDessin(null); return; }
    const ring = [...pointsDessin.map((p) => [p.lng, p.lat] as [number, number]), [pointsDessin[0].lng, pointsDessin[0].lat] as [number, number]];
    try { setSuperficieDessin(turf.area(turf.polygon([ring]))); } catch { setSuperficieDessin(null); }
  }, [pointsDessin, modeDessin]);

  useEffect(() => {
    const groupe = dessinRef.current;
    if (!groupe) return;
    groupe.clearLayers();
    if (pointsDessin.length === 0) return;
    if (modeDessin === 'point' && pointsDessin.length === 1) {
      L.circleMarker(pointsDessin[0], { radius: 8, color: '#0f172a', fillColor: '#38bdf8', fillOpacity: 0.9, weight: 2 }).addTo(groupe);
    } else if (modeDessin === 'polygone') {
      L.polyline(pointsDessin, { color: '#0f172a', weight: 2, dashArray: '6 4' }).addTo(groupe);
      pointsDessin.forEach((p) => L.circleMarker(p, { radius: 4, color: '#0f172a', fillColor: '#38bdf8', fillOpacity: 1 }).addTo(groupe));
      if (pointsDessin.length >= 3) L.polygon(pointsDessin, { color: '#0ea5e9', weight: 2, fillOpacity: 0.15 }).addTo(groupe);
    }
  }, [pointsDessin, modeDessin]);

  const demarrerDessin = (mode: ModeDessin) => { setModeDessin(mode); setPointsDessin([]); setSuperficieDessin(null); setRemplacer(false); };
  const annulerDessin = () => { setModeDessin('aucun'); setPointsDessin([]); setSuperficieDessin(null); };

  const enregistrerGeometrie = async (entite: EntiteSelectionnee) => {
    const geojson = geojsonDessin(modeDessin, pointsDessin);
    if (!geojson) { showToast('Dessinez un terrain (point ou polygone) avant d’enregistrer', false); return; }
    try {
      const enregistree = await geometrieService.enregistrer({
        typeGeometrie: modeDessin === 'point' ? 'Point' : 'Polygon', geojson, entiteType: entite.type, entiteId: entite.id,
        superficieCalculeeM2: superficieDessin ?? undefined, remplacer, source: 'Tracé manuel',
      });
      showToast(`Géométrie enregistrée pour « ${entite.label} » (Tracé manuel)`);
      annulerDessin(); setEntiteSelectionnee(null); await charger(); setZoomCible(enregistree);
    } catch (e) {
      const msg = e instanceof Error && e.message ? e.message : 'Erreur lors de l’enregistrement';
      showToast(axiosMsg(e) || msg, false);
    }
  };
  const enregistrerDessin = async () => {
    if (!entiteSelectionnee) { showToast('Dessinez un terrain et choisissez l’entité cible', false); return; }
    await enregistrerGeometrie(entiteSelectionnee);
  };
  const choisirEntiteCible = (sel: EntiteSelectionnee | null) => {
    setEntiteSelectionnee(sel);
    if (!sel) return;
    const idAttendu = sel.type === 'propriete' ? uuidPropriete(sel.id) : sel.id;
    const cible = geometries.find((g) => g.entiteType === sel.type && g.entiteId.toLowerCase() === idAttendu.toLowerCase());
    if (cible) setZoomCible(cible);
  };
  const apresCreationEntite = async (sel: EntiteSelectionnee) => {
    if (geojsonDessin(modeDessin, pointsDessin)) await enregistrerGeometrie(sel);
    else showToast(`« ${sel.label} » créée — dessinez son emplacement puis enregistrez`);
  };
  const totalParCouche = useMemo(() => {
    const total: Record<string, number> = {};
    geometries.forEach((g) => { const key = coucheDe(g); total[key] = (total[key] ?? 0) + 1; });
    return total;
  }, [geometries]);
  const choisirResultat = (g: GeometrieCarte) => {
    const couche = coucheDe(g);
    if (!couchesActives[couche]) setCouchesActives((c) => ({ ...c, [couche]: true }));
    setRecherche(''); setZoomCible(g);
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col p-6 gap-4">
      {toast && <div className={`fixed top-4 right-4 z-[1200] px-4 py-3 rounded-lg shadow-lg text-white text-sm ${toast.ok ? 'bg-green-600' : 'bg-red-600'}`}>{toast.msg}</div>}
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-800">📍 Carte Interactive</h1><p className="text-gray-500 text-sm mt-1">{loading ? 'Chargement…' : `${geometries.length} géométrie${geometries.length > 1 ? 's' : ''} enregistrée${geometries.length > 1 ? 's' : ''}`}</p></div>
        <button onClick={() => setPanneauCoord(true)} className="px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white rounded-lg font-medium text-sm transition-colors">📝 Saisir des coordonnées</button>
      </div>
      {erreur && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{erreur}</div>}
      <div className="flex-1 flex gap-4 min-h-0">
        <div className="w-80 flex flex-col gap-4 overflow-y-auto shrink-0">
          <GestionCouches couchesActives={couchesActives} totalParCouche={totalParCouche} onActiver={(key) => setCouchesActives((c) => ({ ...c, [key]: !c[key] }))} />
          <PanneauDessin modeDessin={modeDessin} pointsDessin={pointsDessin} superficieDessin={superficieDessin} entiteSelectionnee={entiteSelectionnee} remplacer={remplacer} onDemarrer={demarrerDessin} onAnnuler={annulerDessin} onEntiteChange={choisirEntiteCible} onEntiteCreee={apresCreationEntite} onRemplacerChange={setRemplacer} onEnregistrer={enregistrerDessin} />
        </div>
        <div className="flex-1 relative min-w-0">
          <div ref={containerRef} className="absolute inset-0 rounded-xl border border-gray-200 shadow-sm z-0" />
          {loading && <div className="absolute inset-0 flex items-center justify-center bg-white/60 rounded-xl z-[500]"><div className="text-gray-500 text-sm">Chargement des géométries…</div></div>}
          <RechercheCarte geometries={geometries} filtreType={filtreType} recherche={recherche} rechercheOuverte={rechercheOuverte} onFiltreTypeChange={setFiltreType} onRechercheChange={setRecherche} onRechercheOuverteChange={setRechercheOuverte} onChoisirResultat={choisirResultat} />
        </div>
      </div>
      {panneauCoord && <PanneauCoordonnees onClose={() => setPanneauCoord(false)} onSaved={async () => { setPanneauCoord(false); await charger(); }} onError={(m) => showToast(m, false)} />}
    </div>
  );
}
