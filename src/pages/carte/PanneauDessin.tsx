import SelecteurEntiteCarte from '../../components/SelecteurEntiteCarte';
import { formatM2 } from './carteHelpers';
import type { PanneauDessinProps } from './carteTypes';

export default function PanneauDessin({
  modeDessin, pointsDessin, superficieDessin, entiteSelectionnee, remplacer,
  onDemarrer, onAnnuler, onEntiteChange, onEntiteCreee, onRemplacerChange, onEnregistrer,
}: PanneauDessinProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <h2 className="font-semibold text-gray-800 text-sm mb-3">Dessiner un terrain</h2>
      <div className="flex gap-2 mb-3">
        <button onClick={() => onDemarrer('polygone')} className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${modeDessin === 'polygone' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
          ⬠ Polygone
        </button>
        <button onClick={() => onDemarrer('point')} className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${modeDessin === 'point' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
          ● Point
        </button>
      </div>
      {modeDessin !== 'aucun' && (
        <div className="text-xs text-gray-500 mb-2">
          {modeDessin === 'point' ? 'Cliquez sur la carte pour placer le point.' : `Cliquez pour ajouter des sommets (${pointsDessin.length}).`}
          {superficieDessin != null && <div className="mt-1 font-medium text-gray-700">Superficie : {formatM2(superficieDessin)}</div>}
        </div>
      )}
      <div className="space-y-2">
        <SelecteurEntiteCarte value={entiteSelectionnee} onChange={onEntiteChange} onEntiteCreee={onEntiteCreee} />
        <label className="flex items-center gap-2 text-xs text-gray-600">
          <input type="checkbox" checked={remplacer} onChange={(e) => onRemplacerChange(e.target.checked)} className="accent-blue-600" />
          Remplacer la géométrie existante
        </label>
        <div className="flex gap-2">
          <button onClick={onEnregistrer} disabled={modeDessin === 'aucun' || !entiteSelectionnee} className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-lg text-xs font-medium transition-colors">
            💾 Enregistrer
          </button>
          <button onClick={onAnnuler} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors">Annuler</button>
        </div>
      </div>
    </div>
  );
}
