import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import * as turf from '@turf/turf';
import SelecteurEntiteCarte from '../../components/SelecteurEntiteCarte';
import { geometrieService } from '../../services';
import { wgs84VersLaborde } from '../../utils';
import type { EntiteSelectionnee, GeometrieCarte, CoucheCarte } from '../../types';

// ══════════════════════════════════════════════════════════════
// Carte interactive (module 4.6.1) — Leaflet + OpenStreetMap
// ══════════════════════════════════════════════════════════════

const COUCHES: CoucheCarte[] = [
  { key: 'propriete',        label: 'Propriétés',             couleur: '#2563eb', forme: 'cercle' },
  { key: 'propriete_dossier', label: 'Propriétés liées à un dossier', couleur: '#f59e0b', forme: 'cercle' },
  { key: 'dossier_cloture',  label: 'Dossiers clôturés',      couleur: '#dc2626', forme: 'triangle' },
  { key: 'parcelle',         label: 'Parcelles',              couleur: '#16a34a', forme: 'carre' },
  { key: 'dossier_parcelle', label: 'Parcelles de dossier',   couleur: '#f59e0b', forme: 'carre' },
  { key: 'signalement',      label: 'Signalements',           couleur: '#a13a2c', forme: 'cercle' },
  { key: 'descente_terrain', label: 'Descentes terrain',      couleur: '#7c3aed', forme: 'cercle' },
];

type ModeDessin = 'aucun' | 'point' | 'polygone';

export default function Carte() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const coucheRefs = useRef<Map<string, L.LayerGroup>>(new Map());
  const dessinRef = useRef<L.LayerGroup | null>(null);

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
  const [filtreType, setFiltreType] = useState<string>('tous');
  const [rechercheOuverte, setRechercheOuverte] = useState(false);
  /** Couches Leaflet par id de géométrie : permet d'ouvrir la popup d'un résultat de recherche. */
  const layersRef = useRef<Map<string, L.Layer>>(new Map());

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Initialisation de la carte ──
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [-18.8792, 47.5079], // Antananarivo par défaut
      zoom: 12,
      minZoom: 3,
      maxZoom: 19,
    });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);
    // Groupes de couches (un par type d'entité)
    COUCHES.forEach((c) => {
      const g = L.layerGroup();
      g.addTo(map);
      coucheRefs.current.set(c.key, g);
    });
    dessinRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      try { map.remove(); } catch { /* déjà retirée */ }
      mapRef.current = null;
      coucheRefs.current.clear();
      dessinRef.current = null;
    };
  }, []);

  // ── Chargement des géométries ──
  const charger = useCallback(async () => {
    setLoading(true);
    setErreur(null);
    try {
      const data = await geometrieService.lister();
      setGeometries(data);
    } catch {
      setErreur('Erreur lors du chargement des géométries');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { charger(); }, [charger]);

  // ── Rendu des couches ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    layersRef.current.clear();
    COUCHES.forEach((c) => {
      const groupe = coucheRefs.current.get(c.key);
      if (!groupe) return;
      groupe.clearLayers();
      geometries
        .filter((g) => coucheDe(g) === c.key)
        .forEach((g) => ajouterGeometrie(groupe, g, c.couleur, () => setZoomCible(g), layersRef.current));
      if (couchesActives[c.key]) {
        if (!map.hasLayer(groupe)) groupe.addTo(map);
      } else if (map.hasLayer(groupe)) {
        map.removeLayer(groupe);
      }
    });
  }, [geometries, couchesActives]);

  // ── Zoom sur une géométrie ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !zoomCible) return;
    try {
      const parsed = JSON.parse(zoomCible.geojson);
      const couche = L.geoJSON(parsed);
      const b = couche.getBounds();
      if (b.isValid()) {
        map.fitBounds(b, { padding: [40, 40], maxZoom: zoomCible.typeGeometrie === 'Point' ? 17 : 18 });
      }
    } catch { /* geojson invalide */ }
    // Ouvre la popup du résultat de recherche : la popup reste ancrée sur sa
    // couche et suit le zoom/panoramique de la carte.
    const layer = layersRef.current.get(zoomCible.idGeometrie);
    (layer as (L.Layer & { openPopup?: () => void }) | undefined)?.openPopup?.();
    setZoomCible(null);
  }, [zoomCible]);

  // ── Dessin : clic sur la carte ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const onClic = (e: L.LeafletMouseEvent) => {
      if (modeDessin === 'aucun') return;
      // Un clic dans une popup (bouton Copier/Zoom, liste des sommets) ne doit
      // pas ajouter de sommet au tracé en cours.
      const cible = e.originalEvent.target as HTMLElement | null;
      if (cible?.closest('.leaflet-popup')) return;
      if (modeDessin === 'point') {
        setPointsDessin([e.latlng]);
        return;
      }
      setPointsDessin((pts) => [...pts, e.latlng]);
    };
    map.on('click', onClic);
    return () => { map.off('click', onClic); };
  }, [modeDessin]);

  // ── Superficie du polygone en cours (turf.js) ──
  useEffect(() => {
    if (modeDessin !== 'polygone' || pointsDessin.length < 3) {
      setSuperficieDessin(null);
      return;
    }
    const ring = [...pointsDessin.map((p) => [p.lng, p.lat] as [number, number])];
    ring.push(ring[0]);
    try {
      const poly = turf.polygon([ring]);
      setSuperficieDessin(turf.area(poly));
    } catch {
      setSuperficieDessin(null);
    }
  }, [pointsDessin, modeDessin]);

  // ── Aperçu du dessin en cours ──
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
      if (pointsDessin.length >= 3) {
        L.polygon(pointsDessin, { color: '#0ea5e9', weight: 2, fillOpacity: 0.15 }).addTo(groupe);
      }
    }
  }, [pointsDessin, modeDessin]);

  const coucheDe = (g: GeometrieCarte): string => {
    // Propriétés liées à un dossier (dossier_parcelle) → couche orange dédiée.
    if (g.entiteType === 'propriete' && g.lieeADossier) return 'propriete_dossier';
    // Dossiers clôturés (statut final) → couche rouge dédiée ; les autres
    // parcelles de dossier restent dans la couche orange.
    if (g.entiteType === 'dossier_parcelle' && g.dossierCloture) return 'dossier_cloture';
    return g.entiteType;
  };

  const demarrerDessin = (mode: ModeDessin) => {
    setModeDessin(mode);
    setPointsDessin([]);
    setSuperficieDessin(null);
    setRemplacer(false);
  };

  const annulerDessin = () => {
    setModeDessin('aucun');
    setPointsDessin([]);
    setSuperficieDessin(null);
  };

  const geojsonDessin = (): string | null => {
    if (modeDessin === 'point' && pointsDessin.length === 1) {
      return JSON.stringify({ type: 'Point', coordinates: [pointsDessin[0].lng, pointsDessin[0].lat] });
    }
    if (modeDessin === 'polygone' && pointsDessin.length >= 3) {
      const ring = pointsDessin.map((p) => [p.lng, p.lat] as [number, number]);
      ring.push(ring[0]);
      return JSON.stringify({ type: 'Polygon', coordinates: [ring] });
    }
    return null;
  };

  /** Enregistre le tracé en cours pour l'entité donnée (utilisé aussi juste après une création). */
  const enregistrerGeometrie = async (entite: EntiteSelectionnee) => {
    const geojson = geojsonDessin();
    if (!geojson) {
      showToast('Dessinez un terrain (point ou polygone) avant d\u2019enregistrer', false);
      return;
    }
    try {
      const enregistree = await geometrieService.enregistrer({
        typeGeometrie: modeDessin === 'point' ? 'Point' : 'Polygon',
        geojson,
        entiteType: entite.type,
        entiteId: entite.id,
        superficieCalculeeM2: superficieDessin ?? undefined,
        remplacer,
        source: 'Tracé manuel',
      });
      showToast(`Géométrie enregistrée pour « ${entite.label} » (Tracé manuel)`);
      annulerDessin();
      setEntiteSelectionnee(null);
      await charger();
      setZoomCible(enregistree);
    } catch (e) {
      const msg = e instanceof Error && e.message ? e.message : 'Erreur lors de l\u2019enregistrement';
      showToast(axiosMsg(e) || msg, false);
    }
  };

  const enregistrerDessin = async () => {
    if (!entiteSelectionnee) {
      showToast('Dessinez un terrain et choisissez l\u2019entité cible', false);
      return;
    }
    await enregistrerGeometrie(entiteSelectionnee);
  };

  /** Sélection d'une entité cible : recentre la carte si elle est déjà localisée. */
  const choisirEntiteCible = (sel: EntiteSelectionnee | null) => {
    setEntiteSelectionnee(sel);
    if (!sel) return;
    const idAttendu = sel.type === 'propriete' ? uuidPropriete(sel.id) : sel.id;
    const cible = geometries.find((g) =>
      g.entiteType === sel.type && g.entiteId.toLowerCase() === idAttendu.toLowerCase(),
    );
    if (cible) setZoomCible(cible);
  };

  /**
   * Après la création d'une propriété / parcelle : si un tracé valide est déjà en
   * cours on l'enregistre aussitôt, sinon on invite à dessiner son emplacement.
   */
  const apresCreationEntite = async (sel: EntiteSelectionnee) => {
    if (geojsonDessin()) {
      await enregistrerGeometrie(sel);
    } else {
      showToast(`« ${sel.label} » créée — dessinez son emplacement puis enregistrez`);
    }
  };

  const activerCouche = (key: string) => {
    setCouchesActives((c) => ({ ...c, [key]: !c[key] }));
  };

  const totalParCouche = useMemo(() => {
    const t: Record<string, number> = {};
    geometries.forEach((g) => { const k = coucheDe(g); t[k] = (t[k] ?? 0) + 1; });
    return t;
  }, [geometries]);

  // ── Recherche d'entité sur la carte (libellé, type, identifiant, source) ──
  const resultats = useMemo(() => {
    const q = normaliserTexte(recherche.trim());
    if (!q) return [];
    return geometries.filter((g) => {
      if (filtreType !== 'tous' && g.entiteType !== filtreType) return false;
      const fouille = normaliserTexte(
        [g.libelleEntite ?? '', labelEntite(g.entiteType), idLisible(g.entiteId), g.entiteId, g.source ?? ''].join(' '),
      );
      return fouille.includes(q);
    });
  }, [geometries, recherche, filtreType]);

  /** Sélection d'un résultat : activation de sa couche si besoin, zoom + popup. */
  const choisirResultat = (g: GeometrieCarte) => {
    const couche = coucheDe(g);
    if (!couchesActives[couche]) setCouchesActives((c) => ({ ...c, [couche]: true }));
    setRecherche('');
    setZoomCible(g);
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col p-6 gap-4">
      {toast && (
        <div className={`fixed top-4 right-4 z-[1200] px-4 py-3 rounded-lg shadow-lg text-white text-sm ${toast.ok ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">📍 Carte Interactive</h1>
          <p className="text-gray-500 text-sm mt-1">
            {loading ? 'Chargement…' : `${geometries.length} géométrie${geometries.length > 1 ? 's' : ''} enregistrée${geometries.length > 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPanneauCoord(true)}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white rounded-lg font-medium text-sm transition-colors"
          >
            📝 Saisir des coordonnées
          </button>
        </div>
      </div>

      {erreur && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{erreur}</div>
      )}

      <div className="flex-1 flex gap-4 min-h-0">
        {/* ── Panneau latéral ── */}
        <div className="w-80 flex flex-col gap-4 overflow-y-auto shrink-0">
          {/* Légende / couches */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h2 className="font-semibold text-gray-800 text-sm mb-3">Couches</h2>
            <div className="space-y-2">
              {COUCHES.map((c) => (
                <label key={c.key} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={!!couchesActives[c.key]}
                    onChange={() => activerCouche(c.key)}
                    className="accent-blue-600"
                  />
                  <span
                    className="inline-block shrink-0"
                    style={{
                      width: 12, height: 12,
                      borderRadius: c.forme === 'cercle' ? '50%' : c.forme === 'triangle' ? 0 : 3,
                      background: c.couleur,
                      clipPath: c.forme === 'triangle' ? 'polygon(50% 0, 100% 100%, 0 100%)' : undefined,
                    }}
                  />
                  <span className="flex-1">{c.label}</span>
                  <span className="text-gray-400 text-xs">{totalParCouche[c.key] ?? 0}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Dessin */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h2 className="font-semibold text-gray-800 text-sm mb-3">Dessiner un terrain</h2>
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => demarrerDessin('polygone')}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  modeDessin === 'polygone' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                ⬠ Polygone
              </button>
              <button
                onClick={() => demarrerDessin('point')}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  modeDessin === 'point' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                ● Point
              </button>
            </div>
            {modeDessin !== 'aucun' && (
              <div className="text-xs text-gray-500 mb-2">
                {modeDessin === 'point'
                  ? 'Cliquez sur la carte pour placer le point.'
                  : `Cliquez pour ajouter des sommets (${pointsDessin.length}).`}
                {superficieDessin != null && (
                  <div className="mt-1 font-medium text-gray-700">
                    Superficie : {formatM2(superficieDessin)}
                  </div>
                )}
              </div>
            )}

            {/* Choix de l'entité cible : entité existante sans géométrie ou création */}
            <div className="space-y-2">
              <SelecteurEntiteCarte
                value={entiteSelectionnee}
                onChange={choisirEntiteCible}
                onEntiteCreee={apresCreationEntite}
              />
              <label className="flex items-center gap-2 text-xs text-gray-600">
                <input type="checkbox" checked={remplacer} onChange={(e) => setRemplacer(e.target.checked)} className="accent-blue-600" />
                Remplacer la géométrie existante
              </label>
              <div className="flex gap-2">
                <button
                  onClick={enregistrerDessin}
                  disabled={modeDessin === 'aucun' || !entiteSelectionnee}
                  className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-lg text-xs font-medium transition-colors"
                >
                  💾 Enregistrer
                </button>
                <button
                  onClick={annulerDessin}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Carte ── */}
        <div className="flex-1 relative min-w-0">
          <div ref={containerRef} className="absolute inset-0 rounded-xl border border-gray-200 shadow-sm z-0" />
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 rounded-xl z-[500]">
              <div className="text-gray-500 text-sm">Chargement des géométries…</div>
            </div>
          )}

          {/* ── Recherche d'entité (propriété, signalement, descente…) ── */}
          <div className="absolute top-3 right-3 z-[600] w-80">
            <select
              value={filtreType}
              onChange={(e) => setFiltreType(e.target.value)}
              className="w-full mb-1.5 px-2 py-1.5 border border-gray-300 bg-white rounded-lg shadow-sm text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="tous">Toutes les entités</option>
              <option value="propriete">Propriétés</option>
              <option value="parcelle">Parcelles</option>
              <option value="dossier_parcelle">Parcelles de dossier</option>
              <option value="signalement">Signalements</option>
              <option value="descente_terrain">Descentes terrain</option>
            </select>
            <div className="relative">
              <input
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                onFocus={() => setRechercheOuverte(true)}
                onBlur={() => window.setTimeout(() => setRechercheOuverte(false), 150)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && resultats.length > 0) choisirResultat(resultats[0]);
                  if (e.key === 'Escape') setRecherche('');
                }}
                placeholder="Rechercher une propriété, un signalement…"
                aria-label="Rechercher un terrain sur la carte"
                className="w-full pl-8 pr-8 py-2.5 bg-white border border-gray-300 rounded-lg shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">🔍</span>
              {recherche && (
                <button
                  onClick={() => setRecherche('')}
                  aria-label="Effacer la recherche"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-base leading-none"
                >
                  ×
                </button>
              )}
              {rechercheOuverte && recherche.trim() !== '' && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                  {resultats.length === 0 ? (
                    <div className="px-3 py-2.5 text-xs text-gray-500">
                      Aucun résultat pour « {recherche.trim()} »
                    </div>
                  ) : (
                    resultats.map((g) => (
                      <button
                        key={g.idGeometrie}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => choisirResultat(g)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-blue-50 border-b border-gray-100 last:border-0"
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ background: COUCHES.find((c) => c.key === coucheDe(g))?.couleur ?? '#64748b' }}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs font-medium text-gray-800 truncate">
                            {g.libelleEntite || idLisible(g.entiteId)}
                          </span>
                          <span className="block text-[11px] text-gray-500 truncate">
                            {labelEntite(g.entiteType)}
                            {g.superficieCalculeeM2 != null ? ` · ${formatM2(g.superficieCalculeeM2)}` : ''}
                          </span>
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Formulaire « Saisir des coordonnées » ── */}
      {panneauCoord && (
        <PanneauCoordonnees
          onClose={() => setPanneauCoord(false)}
          onSaved={async () => {
            setPanneauCoord(false);
            await charger();
          }}
          onError={(m) => showToast(m, false)}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Formulaire « Saisir des coordonnées »
// ══════════════════════════════════════════════════════════════

type FormatSaisi = 'auto' | 'laborde' | 'latlon' | 'lonlat';

function PanneauCoordonnees({
  onClose, onSaved, onError,
}: {
  onClose: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const [typeGeom, setTypeGeom] = useState<'Point' | 'Polygon' | 'LineString'>('Point');
  const [texte, setTexte] = useState('');
  const [format, setFormat] = useState<FormatSaisi>('auto');
  const [entiteSelectionnee, setEntiteSelectionnee] = useState<EntiteSelectionnee | null>(null);
  const [remplacer, setRemplacer] = useState(false);
  const [saving, setSaving] = useState(false);

  // Détection automatique du format des paires saisies
  const formatDetecte: FormatSaisi = useMemo(() => {
    const pts = parserPoints(texte);
    if (pts.length === 0) return 'auto';
    const maxAbs = Math.max(...pts.flatMap((p) => [Math.abs(p.x), Math.abs(p.y)]));
    if (maxAbs > 1000) return 'laborde';
    return 'latlon';
  }, [texte]);

  const formatActif: FormatSaisi = format === 'auto' ? formatDetecte : format;

  const apercuWgs84 = useMemo(() => {
    const pts = parserPoints(texte);
    if (pts.length === 0 || formatActif === 'laborde') return null;
    const first = pts[0];
    return formatActif === 'lonlat' ? [first.x, first.y] : [first.y, first.x];
  }, [texte, formatActif]);

  const enregistrer = async () => {
    const pts = parserPoints(texte);
    if (pts.length === 0) { onError('Aucune coordonnée valide saisie'); return; }
    if (typeGeom === 'Point' && pts.length !== 1) { onError('Un point nécessite une seule paire'); return; }
    if (typeGeom !== 'Point' && pts.length < 3) { onError('Un polygone ou une ligne nécessite au moins 3 points'); return; }
    if (!entiteSelectionnee) { onError('Choisissez l\u2019entité cible'); return; }
    if (formatActif === 'auto') { onError('Format des coordonnées non détecté'); return; }

    setSaving(true);
    try {
      await geometrieService.enregistrerCoordonnees({
        typeGeometrie: typeGeom,
        points: pts,
        entiteType: entiteSelectionnee.type,
        entiteId: entiteSelectionnee.id,
        laborde: formatActif === 'laborde',
        lonLat: formatActif === 'lonlat',
        remplacer,
        source: 'Saisie coordonnées',
      });
      onSaved();
    } catch (e) {
      onError(axiosMsg(e) || 'Erreur lors de l\u2019enregistrement');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1100] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-800">📝 Saisir des coordonnées</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <div className="p-5 space-y-4">
          {/* Type de géométrie */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Type de géométrie</label>
            <div className="flex gap-2">
              {(['Point', 'Polygon', 'LineString'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeGeom(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    typeGeom === t ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {t === 'Point' ? 'Point' : t === 'Polygon' ? 'Polygone' : 'Ligne'}
                </button>
              ))}
            </div>
          </div>

          {/* Coordonnées */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Coordonnées — une paire par ligne
              {typeGeom === 'Point' ? ' (lat, lon ou X Y Laborde)' : ' (lat, lon · lon, lat · X Y Laborde)'}
            </label>
            <textarea
              value={texte}
              onChange={(e) => setTexte(e.target.value)}
              rows={typeGeom === 'Point' ? 2 : 6}
              placeholder={typeGeom === 'Point' ? '-18.8792, 47.5079' : '-18.8792, 47.5079\n-18.8801, 47.5091\n-18.8810, 47.5102'}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex items-center gap-2 mt-1">
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as FormatSaisi)}
                className="px-2 py-1 border border-gray-300 rounded text-xs"
              >
                <option value="auto">Détection auto : {formatDetecte === 'laborde' ? 'Laborde' : 'lat, lon'}</option>
                <option value="latlon">lat, lon (WGS84)</option>
                <option value="lonlat">lon, lat (WGS84)</option>
                <option value="laborde">X Y Laborde</option>
              </select>
              {formatActif === 'laborde' && (
                <span className="text-[11px] text-amber-600">Conversion Laborde → WGS84 côté serveur (PostGIS)</span>
              )}
              {apercuWgs84 && (
                <span className="text-[11px] text-gray-500">
                  Aperçu WGS84 : {apercuWgs84[0].toFixed(6)}, {apercuWgs84[1].toFixed(6)}
                </span>
              )}
            </div>
          </div>

          {/* Entité cible : entité existante sans géométrie, ou création directe */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Entité cible</label>
            <SelecteurEntiteCarte value={entiteSelectionnee} onChange={setEntiteSelectionnee} />
          </div>

          <label className="flex items-center gap-2 text-xs text-gray-600">
            <input type="checkbox" checked={remplacer} onChange={(e) => setRemplacer(e.target.checked)} className="accent-blue-600" />
            Remplacer la géométrie existante
          </label>

          <div className="flex gap-2 pt-2">
            <button
              onClick={enregistrer}
              disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {saving ? 'Enregistrement…' : 'Enregistrer la géométrie'}
            </button>
            <button onClick={onClose} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors">
              Annuler
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════════════════════

/** Ajoute une géométrie à un groupe de couche (style par type + popup détaillée + clic = zoom). */
function ajouterGeometrie(
  groupe: L.LayerGroup,
  g: GeometrieCarte,
  couleur: string,
  onZoom: (g: GeometrieCarte) => void,
  registre?: Map<string, L.Layer>,
) {
  let parsed: GeoJSON.GeoJsonObject;
  try { parsed = JSON.parse(g.geojson); } catch { return; }

  const coords = coordonneesDe(parsed);
  const couche = L.geoJSON(parsed, {
    // Les polygones (surfaces de terrain) dominent visuellement : contour
    // épais + remplissage marqué. Attention : L.geoJSON applique `style` à
    // toutes les couches Path, y compris les circleMarkers — on renvoie donc
    // un style vide pour les Points afin de garder leur propre rendu.
    style: (feature) =>
      feature?.geometry?.type === 'Point'
        ? {}
        : { color: couleur, weight: 3, fillOpacity: 0.30, fillColor: couleur },
    // Points volontairement compacts (petit disque teinté + liseré blanc) :
    // repérables sans écraser les polygones (rayon 5 px au lieu de 7).
    pointToLayer: (_f, latlng) =>
      L.circleMarker(latlng, { radius: 5, color: '#ffffff', fillColor: couleur, fillOpacity: 0.95, weight: 2 }),
    onEachFeature: (_f, layer) => {
      registre?.set(g.idGeometrie, layer);
      layer.bindPopup(popupDetailHtml(g, couleur, coords), {
        minWidth: 250,
        maxWidth: 320,
        autoPanPadding: [24, 24],
      });
      // Les boutons de la popup ne sont pas des éléments React : on les câble
      // à l'ouverture (le contenu est recréé à chaque affichage).
      layer.on('popupopen', (e: L.PopupEvent) => {
        const el = e.popup.getElement();
        if (!el) return;
        const copier = el.querySelector<HTMLButtonElement>('[data-action="copier"]');
        if (copier) {
          copier.onclick = (ev) => {
            ev.stopPropagation();
            const texte = texteCoordonnees(coords);
            if (!texte) return;
            copierTexte(texte)
              .then((ok) => retourBouton(copier, ok ? '✅ Copié' : '⚠️ Copie refusée'));
          };
        }
        const zoom = el.querySelector<HTMLButtonElement>('[data-action="zoom"]');
        if (zoom) {
          zoom.onclick = (ev) => { ev.stopPropagation(); onZoom(g); };
        }
      });
      layer.on('click', () => onZoom(g));
    },
  });
  couche.addTo(groupe);
}

// ──────────────────────────────────────────────────────────────
// Popup de détail : identité de l'entité + coordonnées géographiques
// ──────────────────────────────────────────────────────────────

interface SommetCoord { lat: number; lon: number }
interface CoordonneesGeom { sommets: SommetCoord[]; centre: SommetCoord | null }

/** Sommets exploitables d'un GeoJSON (anneau de fermeture retiré) + centroïde. */
function coordonneesDe(parsed: GeoJSON.GeoJsonObject): CoordonneesGeom {
  const geom = parsed as GeoJSON.Geometry;
  let bruts: [number, number][] = [];
  if (geom.type === 'Point') bruts = [geom.coordinates as [number, number]];
  else if (geom.type === 'LineString') bruts = geom.coordinates as [number, number][];
  else if (geom.type === 'Polygon') bruts = (geom.coordinates as [number, number][][])[0] ?? [];
  else if (geom.type === 'MultiLineString') bruts = (geom.coordinates as [number, number][][]).flat();
  else if (geom.type === 'MultiPolygon') bruts = (geom.coordinates as [number, number][][][]).flat(2);
  else return { sommets: [], centre: null };

  // Les anneaux de polygone sont fermés : on retire le dernier point s'il duplique le premier.
  if (bruts.length > 1) {
    const [x0, y0] = bruts[0];
    const [xn, yn] = bruts[bruts.length - 1];
    if (x0 === xn && y0 === yn) bruts = bruts.slice(0, -1);
  }
  const sommets = bruts
    .filter((c) => Array.isArray(c) && c.length >= 2)
    .map(([lon, lat]) => ({ lat, lon }))
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon));
  return { sommets, centre: centroide(parsed, sommets) };
}

/** Centroïde (turf.js) du GeoJSON, avec repli sur la moyenne des sommets. */
function centroide(parsed: GeoJSON.GeoJsonObject, sommets: SommetCoord[]): SommetCoord | null {
  if (sommets.length === 0) return null;
  if (sommets.length === 1) return sommets[0];
  try {
    const c = turf.centroid(parsed as GeoJSON.Feature | GeoJSON.Geometry);
    const [lon, lat] = c.geometry.coordinates;
    if (Number.isFinite(lon) && Number.isFinite(lat)) return { lat, lon };
  } catch { /* géométrie non prise en charge : repli sur la moyenne */ }
  const lat = sommets.reduce((s, p) => s + p.lat, 0) / sommets.length;
  const lon = sommets.reduce((s, p) => s + p.lon, 0) / sommets.length;
  return { lat, lon };
}

/** Construit le contenu HTML de la popup : détails métier + coordonnées WGS84 / Laborde. */
function popupDetailHtml(g: GeometrieCarte, couleur: string, coords: CoordonneesGeom): string {
  const nom = g.libelleEntite || g.entiteId;
  const badge = g.lieeADossier
    ? ' · liée à un dossier'
    : g.dossierCloture ? ' · dossier clôturé' : '';

  const lignes: Array<[string, string | null, string | null]> = [
    ['Identifiant', idLisible(g.entiteId), g.entiteId],
    ['Superficie', g.superficieCalculeeM2 != null ? formatM2(g.superficieCalculeeM2) : null, null],
    ['Source', g.source ?? null, null],
    ['Précision', g.precisionM != null ? `${g.precisionM} m` : null, null],
    ['Créée le', g.dateCreation ? formatDateHeure(g.dateCreation) : null, null],
    ['Modifiée le', g.dateModification ? formatDateHeure(g.dateModification) : null, null],
    ['Créée par', g.utilisateur ?? null, null],
  ];
  const lignesHtml = lignes
    .filter(([, v]) => v != null && v !== '')
    .map(([label, v, title]) => lignePopup(label, v as string, title, 'inline'))
    .join('');

  const centre = coords.centre;
  const lab = centre ? wgs84VersLaborde(centre.lon, centre.lat) : null;
  const titreCoords = coords.sommets.length > 1 ? 'Centre' : 'Coordonnées';

  const lignesCoords = centre
    ? [
        lignePopup('Latitude', `${centre.lat.toFixed(6)}°`, null, 'block'),
        lignePopup('Longitude', `${centre.lon.toFixed(6)}°`, null, 'block'),
        lignePopup('X Laborde', lab ? `${lab.x.toFixed(2)} m` : '—', null, 'block'),
        lignePopup('Y Laborde', lab ? `${lab.y.toFixed(2)} m` : '—', null, 'block'),
      ].join('')
    : `<div style="font-size:11.5px;color:#94a3b8">Coordonnées indisponibles</div>`;

  const sommetsHtml = coords.sommets.length > 1
    ? `<details style="margin-top:4px">
         <summary style="cursor:pointer;font-size:11px;color:#2563eb">Sommets (${coords.sommets.length})</summary>
         <ol style="margin:4px 0 0;padding-left:16px;font-size:11px;color:#475569;max-height:110px;overflow:auto">
           ${coords.sommets.map((p) => `<li>${escapeHtml(formatCoord(p.lat, p.lon))}${labLigneSous(p)}</li>`).join('')}
         </ol>
       </details>`
    : '';

  return `
    <div style="min-width:250px;max-width:300px;font-family:inherit">
      <div style="display:flex;align-items:center;gap:6px">
        <span style="width:10px;height:10px;flex:none;border-radius:50%;background:${couleur}"></span>
        <span style="font-weight:600;font-size:13px;color:#0f172a">${escapeHtml(nom)}</span>
      </div>
      <div style="font-size:11px;color:#64748b;margin:2px 0 6px">
        ${escapeHtml(labelEntite(g.entiteType))} · ${escapeHtml(g.typeGeometrie)}${escapeHtml(badge)}
      </div>
      <div style="border-top:1px solid #e2e8f0;padding-top:4px">${lignesHtml}</div>
      <div style="margin-top:6px;padding-top:6px;border-top:1px solid #e2e8f0">
        <div style="font-size:10px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.04em;margin-bottom:2px">
          ${titreCoords} — WGS84 / Laborde
        </div>
        ${lignesCoords}
        ${sommetsHtml}
      </div>
      <div style="display:flex;gap:6px;margin-top:8px">
        <button data-action="copier" type="button" style="flex:1;padding:4px 6px;font-size:11px;border:1px solid #cbd5e1;border-radius:6px;background:#f8fafc;color:#334155;cursor:pointer">📋 Copier</button>
        <button data-action="zoom" type="button" style="flex:1;padding:4px 6px;font-size:11px;border:1px solid #cbd5e1;border-radius:6px;background:#f8fafc;color:#334155;cursor:pointer">🔍 Zoom</button>
      </div>
    </div>`;
}

/** Ligne « libellé / valeur » de la popup (disposition en ligne ou empilée). */
function lignePopup(label: string, valeur: string, title: string | null, disposition: 'inline' | 'block'): string {
  const styleLabel = 'color:#64748b;font-size:11px';
  const styleValeur = 'color:#0f172a;font-size:11.5px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace';
  const attributTitle = title ? ` title="${escapeHtml(title)}"` : '';
  if (disposition === 'block') {
    return `<div style="display:flex;justify-content:space-between;gap:8px;padding:1px 0">
      <span style="${styleLabel}">${escapeHtml(label)}</span>
      <span style="${styleValeur}"${attributTitle}>${escapeHtml(valeur)}</span>
    </div>`;
  }
  return `<div style="display:flex;justify-content:space-between;gap:8px;padding:1px 0">
    <span style="${styleLabel}">${escapeHtml(label)}</span>
    <span style="color:#0f172a;font-size:11.5px;text-align:right;word-break:break-word"${attributTitle}>${escapeHtml(valeur)}</span>
  </div>`;
}

/** Coordonnées Laborde d'un sommet, affichées en gris sous la ligne lat/lon. */
function labLigneSous(p: SommetCoord): string {
  const lab = wgs84VersLaborde(p.lon, p.lat);
  return lab ? ` <span style="color:#94a3b8">— X ${lab.x.toFixed(0)} · Y ${lab.y.toFixed(0)}</span>` : '';
}

/** Texte copié par le bouton « Copier » : un couple lat, lon par sommet. */
function texteCoordonnees(coords: CoordonneesGeom): string {
  if (coords.sommets.length === 0) return '';
  return coords.sommets.map((p) => formatCoord(p.lat, p.lon)).join('\n');
}

/**
 * Copie un texte dans le presse-papiers : API Clipboard d'abord, puis repli
 * historique (textarea + execCommand) pour les contextes non sécurisés
 * (application servie en http:// sur le réseau local, iframe…).
 */
async function copierTexte(texte: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(texte);
      return true;
    }
  } catch { /* refusé : repli ci-dessous */ }
  try {
    const zone = document.createElement('textarea');
    zone.value = texte;
    zone.setAttribute('readonly', '');
    zone.style.position = 'fixed';
    zone.style.left = '-1000px';
    document.body.appendChild(zone);
    zone.select();
    const ok = document.execCommand('copy');
    zone.remove();
    return ok;
  } catch {
    return false;
  }
}

/** Rétablit le libellé d'un bouton après un retour utilisateur temporaire. */
function retourBouton(bouton: HTMLButtonElement, texte: string) {
  const initial = bouton.textContent ?? '';
  bouton.textContent = texte;
  setTimeout(() => { bouton.textContent = initial; }, 1600);
}

/** Identifiant lisible : n° entier d'une propriété, sinon UUID raccourci. */
function idLisible(entiteId: string): string {
  const m = /^00000000-0000-0000-0000-(\d{12})$/.exec(entiteId);
  if (m) return String(Number(m[1]));
  return entiteId.length > 13 ? `${entiteId.slice(0, 8)}…` : entiteId;
}

/** Coordonnée lat/lon lisible (6 décimales ≈ 10 cm). */
function formatCoord(lat: number, lon: number): string {
  return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
}

/** Horodatage local lisible (les dates backend sont sans fuseau). */
function formatDateHeure(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

/** UUID conventionnel d'une propriété côté base : 00000000-0000-0000-0000-{id:012d}. */
function uuidPropriete(id: string): string {
  const n = Number(id);
  return Number.isFinite(n) ? `00000000-0000-0000-0000-${String(n).padStart(12, '0')}` : id;
}

/** Libellé lisible d'un type d'entité. */
function labelEntite(entiteType: string): string {
  return ({
    propriete: 'Propriété',
    parcelle: 'Parcelle',
    dossier_parcelle: 'Parcelle de dossier',
    signalement: 'Signalement',
    descente_terrain: 'Descente terrain',
  } as Record<string, string>)[entiteType] ?? entiteType;
}

/** Normalise un texte pour la recherche (insensible casse + accents). */
function normaliserTexte(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/** Échappe le HTML d'un texte inséré dans une popup. */
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Parse les paires « lat, lon » / « lon, lat » / « X Y » (une par ligne ; ; ou espace). */
function parserPoints(texte: string): Array<{ x: number; y: number }> {
  const pts: Array<{ x: number; y: number }> = [];
  for (const ligne of texte.split(/\r?\n/)) {
    const nettoye = ligne.replace(/[,;]+/g, ' ').trim();
    if (!nettoye) continue;
    const morceaux = nettoye.split(/\s+/).map(Number);
    if (morceaux.length !== 2 || morceaux.some((n) => !Number.isFinite(n))) continue;
    pts.push({ x: morceaux[0], y: morceaux[1] });
  }
  return pts;
}

/** Formate une superficie m² en lisible (ha si > 10 000 m²). */
function formatM2(m2: number): string {
  if (m2 >= 10000) return `${(m2 / 10000).toFixed(2)} ha (${Math.round(m2).toLocaleString('fr-FR')} m²)`;
  return `${Math.round(m2).toLocaleString('fr-FR')} m²`;
}

/** Extrait le message d'erreur d'une réponse axios/backend. */
function axiosMsg(e: unknown): string {
  if (e && typeof e === 'object' && 'response' in e) {
    const data = (e as { response?: { data?: { message?: string; error?: string } } }).response?.data;
    if (data?.message) return data.message;
    if (data?.error) return data.error;
  }
  return '';
}
