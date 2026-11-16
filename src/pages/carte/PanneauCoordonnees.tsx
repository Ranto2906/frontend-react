import { useMemo, useState } from 'react';
import SelecteurEntiteCarte from '../../components/SelecteurEntiteCarte';
import { geometrieService } from '../../services';
import type { EntiteSelectionnee } from '../../types';
import { axiosMsg, parserPoints } from './carteHelpers';
import type { FormatSaisi } from './carteTypes';

interface PanneauCoordonneesProps {
  onClose: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
}

export default function PanneauCoordonnees({ onClose, onSaved, onError }: PanneauCoordonneesProps) {
  const [typeGeom, setTypeGeom] = useState<'Point' | 'Polygon' | 'LineString'>('Point');
  const [texte, setTexte] = useState('');
  const [format, setFormat] = useState<FormatSaisi>('auto');
  const [entiteSelectionnee, setEntiteSelectionnee] = useState<EntiteSelectionnee | null>(null);
  const [remplacer, setRemplacer] = useState(false);
  const [saving, setSaving] = useState(false);

  const formatDetecte: FormatSaisi = useMemo(() => {
    const pts = parserPoints(texte);
    if (pts.length === 0) return 'auto';
    const maxAbs = Math.max(...pts.flatMap((p) => [Math.abs(p.x), Math.abs(p.y)]));
    return maxAbs > 1000 ? 'laborde' : 'latlon';
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
    if (!entiteSelectionnee) { onError('Choisissez l’entité cible'); return; }
    if (formatActif === 'auto') { onError('Format des coordonnées non détecté'); return; }
    setSaving(true);
    try {
      await geometrieService.enregistrerCoordonnees({
        typeGeometrie: typeGeom, points: pts, entiteType: entiteSelectionnee.type, entiteId: entiteSelectionnee.id,
        laborde: formatActif === 'laborde', lonLat: formatActif === 'lonlat', remplacer, source: 'Saisie coordonnées',
      });
      onSaved();
    } catch (e) {
      onError(axiosMsg(e) || 'Erreur lors de l’enregistrement');
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
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Type de géométrie</label>
            <div className="flex gap-2">
              {(['Point', 'Polygon', 'LineString'] as const).map((t) => (
                <button key={t} onClick={() => setTypeGeom(t)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${typeGeom === t ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                  {t === 'Point' ? 'Point' : t === 'Polygon' ? 'Polygone' : 'Ligne'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Coordonnées — une paire par ligne
              {typeGeom === 'Point' ? ' (lat, lon ou X Y Laborde)' : ' (lat, lon · lon, lat · X Y Laborde)'}
            </label>
            <textarea value={texte} onChange={(e) => setTexte(e.target.value)} rows={typeGeom === 'Point' ? 2 : 6} placeholder={typeGeom === 'Point' ? '-18.8792, 47.5079' : '-18.8792, 47.5079\n-18.8801, 47.5091\n-18.8810, 47.5102'} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <div className="flex items-center gap-2 mt-1">
              <select value={format} onChange={(e) => setFormat(e.target.value as FormatSaisi)} className="px-2 py-1 border border-gray-300 rounded text-xs">
                <option value="auto">Détection auto : {formatDetecte === 'laborde' ? 'Laborde' : 'lat, lon'}</option>
                <option value="latlon">lat, lon (WGS84)</option>
                <option value="lonlat">lon, lat (WGS84)</option>
                <option value="laborde">X Y Laborde</option>
              </select>
              {formatActif === 'laborde' && <span className="text-[11px] text-amber-600">Conversion Laborde → WGS84 côté serveur (PostGIS)</span>}
              {apercuWgs84 && <span className="text-[11px] text-gray-500">Aperçu WGS84 : {apercuWgs84[0].toFixed(6)}, {apercuWgs84[1].toFixed(6)}</span>}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Entité cible</label>
            <SelecteurEntiteCarte value={entiteSelectionnee} onChange={setEntiteSelectionnee} />
          </div>
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <input type="checkbox" checked={remplacer} onChange={(e) => setRemplacer(e.target.checked)} className="accent-blue-600" />
            Remplacer la géométrie existante
          </label>
          <div className="flex gap-2 pt-2">
            <button onClick={enregistrer} disabled={saving} className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium transition-colors">{saving ? 'Enregistrement…' : 'Enregistrer la géométrie'}</button>
            <button onClick={onClose} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors">Annuler</button>
          </div>
        </div>
      </div>
    </div>
  );
}
