import type { GestionCouchesProps } from './carteTypes';
import { COUCHES } from './carteTypes';

export default function GestionCouches({ couchesActives, totalParCouche, onActiver }: GestionCouchesProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <h2 className="font-semibold text-gray-800 text-sm mb-3">Couches</h2>
      <div className="space-y-2">
        {COUCHES.map((c) => (
          <label key={c.key} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
            <input type="checkbox" checked={!!couchesActives[c.key]} onChange={() => onActiver(c.key)} className="accent-blue-600" />
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
  );
}
