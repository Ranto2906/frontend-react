import proj4 from 'proj4';

// ══════════════════════════════════════════════════════════════
// Grille Laborde malgache (SRID 900914) — conversion inverse
// ══════════════════════════════════════════════════════════════

/**
 * Définition identique à celle enregistrée côté PostGIS (migration V20) :
 * LCC, lat_0 = lat_1 = 18°58' S, lon_0 = 46°30' E, k_0 = 0.9995,
 * x_0 = 400 000 m, y_0 = 800 000 m, ellipsoïde international.
 * Approximation métrique à décamétrique utilisée par la communauté géomatique
 * malgache — cohérente avec la conversion appliquée à l'enregistrement.
 */
const LABORDE_PROJ4 =
  '+proj=lcc +lat_1=-18.96666666666667 +lat_0=-18.96666666666667 +lon_0=46.5 '
  + '+k_0=0.9995 +x_0=400000 +y_0=800000 +ellps=intl +towgs84=-189,-242,-91,0,0,0,0 '
  + '+units=m +no_defs';

const CODE_LABORDE = 'LABORDE:900914';

proj4.defs(CODE_LABORDE, LABORDE_PROJ4);

/** Coordonnées projetées Laborde (mètres). */
export interface PointLaborde {
  x: number;
  y: number;
}

/**
 * Convertit un couple longitude / latitude (WGS84) en X/Y Laborde.
 * Renvoie `null` si la conversion échoue (point hors domaine, proj4 indisponible).
 */
export function wgs84VersLaborde(lon: number, lat: number): PointLaborde | null {
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
  try {
    const [x, y] = proj4('EPSG:4326', CODE_LABORDE, [lon, lat]);
    return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
  } catch {
    return null;
  }
}
