import { useMemo } from 'react';
import { COUCHES } from './carteTypes';
import { coucheDe, formatM2, idLisible, labelEntite, normaliserTexte } from './carteHelpers';
import type { RechercheCarteProps } from './carteTypes';

export default function RechercheCarte({
  geometries, filtreType, recherche, rechercheOuverte, onFiltreTypeChange, onRechercheChange,
  onRechercheOuverteChange, onChoisirResultat,
}: RechercheCarteProps) {
  const resultats = useMemo(() => {
    const q = normaliserTexte(recherche.trim());
    if (!q) return [];
    return geometries.filter((g) => {
      if (filtreType !== 'tous' && g.entiteType !== filtreType) return false;
      const fouille = normaliserTexte([g.libelleEntite ?? '', labelEntite(g.entiteType), idLisible(g.entiteId), g.entiteId, g.source ?? ''].join(' '));
      return fouille.includes(q);
    });
  }, [geometries, recherche, filtreType]);

  return (
    <div className="absolute top-3 right-3 z-[600] w-80">
      <select value={filtreType} onChange={(e) => onFiltreTypeChange(e.target.value)} className="w-full mb-1.5 px-2 py-1.5 border border-gray-300 bg-white rounded-lg shadow-sm text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
        <option value="tous">Toutes les entités</option>
        <option value="propriete">Propriétés</option>
        <option value="parcelle">Parcelles</option>
        <option value="dossier_parcelle">Parcelles de dossier</option>
        <option value="signalement">Signalements</option>
        <option value="descente_terrain">Descentes terrain</option>
      </select>
      <div className="relative">
        <input value={recherche} onChange={(e) => onRechercheChange(e.target.value)} onFocus={() => onRechercheOuverteChange(true)} onBlur={() => window.setTimeout(() => onRechercheOuverteChange(false), 150)} onKeyDown={(e) => { if (e.key === 'Enter' && resultats.length > 0) onChoisirResultat(resultats[0]); if (e.key === 'Escape') onRechercheChange(''); }} placeholder="Rechercher une propriété, un signalement…" aria-label="Rechercher un terrain sur la carte" className="w-full pl-8 pr-8 py-2.5 bg-white border border-gray-300 rounded-lg shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">🔍</span>
        {recherche && <button onClick={() => onRechercheChange('')} aria-label="Effacer la recherche" className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-base leading-none">×</button>}
        {rechercheOuverte && recherche.trim() !== '' && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
            {resultats.length === 0 ? <div className="px-3 py-2.5 text-xs text-gray-500">Aucun résultat pour « {recherche.trim()} »</div> : resultats.map((g) => (
              <button key={g.idGeometrie} onMouseDown={(e) => e.preventDefault()} onClick={() => onChoisirResultat(g)} className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-blue-50 border-b border-gray-100 last:border-0">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COUCHES.find((c) => c.key === coucheDe(g))?.couleur ?? '#64748b' }} />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-medium text-gray-800 truncate">{g.libelleEntite || idLisible(g.entiteId)}</span>
                  <span className="block text-[11px] text-gray-500 truncate">{labelEntite(g.entiteType)}{g.superficieCalculeeM2 != null ? ` · ${formatM2(g.superficieCalculeeM2)}` : ''}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
