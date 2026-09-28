import { useCallback, useEffect, useState } from 'react';
import { statistiqueService } from '../../services';
import type { TableauBord } from '../../types';

export default function Finances() {
  const [stats, setStats] = useState<TableauBord | null>(null);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [filtresAppliques, setFiltresAppliques] = useState({ dateDebut: '', dateFin: '' });

  const charger = useCallback(async () => {
    setLoading(true);
    setErreur(null);
    try {
      setStats(await statistiqueService.tableauBord({
        dateDebut: filtresAppliques.dateDebut || undefined,
        dateFin: filtresAppliques.dateFin || undefined,
      }));
    } catch {
      setErreur('Impossible de charger la synthèse financière');
    } finally {
      setLoading(false);
    }
  }, [filtresAppliques]);

  useEffect(() => { charger(); }, [charger]);

  function appliquerFiltre(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (dateDebut && dateFin && dateDebut > dateFin) {
      setErreur('La date de début doit être antérieure ou égale à la date de fin');
      return;
    }
    setFiltresAppliques({ dateDebut, dateFin });
  }

  function reinitialiserFiltre() {
    setDateDebut('');
    setDateFin('');
    setFiltresAppliques({ dateDebut: '', dateFin: '' });
  }

  const periodeActive = Boolean(filtresAppliques.dateDebut || filtresAppliques.dateFin);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">💰 Synthèse Financière</h1>
        {periodeActive && (
          <p className="text-sm text-blue-600 mt-1">
            Période {[filtresAppliques.dateDebut && `du ${dateCourte(filtresAppliques.dateDebut)}`,
              filtresAppliques.dateFin && `au ${dateCourte(filtresAppliques.dateFin)}`]
              .filter(Boolean).join(' ')}
          </p>
        )}
      </div>

      <form onSubmit={appliquerFiltre} className="bg-white border border-gray-200 rounded-lg p-4 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="date-debut-finances" className="block text-xs font-medium text-gray-600 mb-1">Du</label>
          <input
            id="date-debut-finances"
            type="date"
            value={dateDebut}
            onChange={(event) => setDateDebut(event.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700"
          />
        </div>
        <div>
          <label htmlFor="date-fin-finances" className="block text-xs font-medium text-gray-600 mb-1">Au</label>
          <input
            id="date-fin-finances"
            type="date"
            value={dateFin}
            onChange={(event) => setDateFin(event.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium text-sm transition-colors"
        >
          Appliquer
        </button>
        <button
          type="button"
          onClick={reinitialiserFiltre}
          disabled={loading && !stats}
          className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 text-gray-700 rounded-lg font-medium text-sm transition-colors"
        >
          Réinitialiser
        </button>
      </form>

      {erreur && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {erreur}
        </div>
      )}

      {loading && !stats && !erreur && (
        <div className="p-16 text-center text-gray-400">
          <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-blue-600 mx-auto mb-3" />
          Chargement de la synthèse financière…
        </div>
      )}

      {stats && <SectionFinances stats={stats} periodeActive={periodeActive} />}
    </div>
  );
}

function SectionFinances({ stats, periodeActive }: { stats: TableauBord; periodeActive: boolean }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-4">
          <p className="text-xs text-emerald-700 font-medium">💰 CA réel — dossiers terminés</p>
          <p className="text-2xl font-bold text-emerald-800 mt-1">{monnaie(stats.finances.caReel)}</p>
          <p className="text-[11px] text-emerald-600 mt-1">
            statuts terminés uniquement · {periodeActive ? 'sur la période' : 'au total'}
          </p>
        </div>
        <div className="rounded-lg bg-blue-50 border border-blue-100 p-4">
          <p className="text-xs text-blue-700 font-medium">📊 CA théorique — tous statuts</p>
          <p className="text-2xl font-bold text-blue-800 mt-1">
            {monnaie(stats.finances.caTheorique ?? stats.finances.montantTotal)}
          </p>
          <p className="text-[11px] text-blue-600 mt-1">
            tous statuts confondus · {nombre(stats.kpi.nbDossiers)} dossier(s)
          </p>
        </div>
        <div className="rounded-lg bg-amber-50 border border-amber-100 p-4">
          <p className="text-xs text-amber-700 font-medium">🎯 Taux de réalisation du CA</p>
          <p className="text-2xl font-bold text-amber-800 mt-1">
            {(stats.finances.tauxRealisation ?? 0).toLocaleString('fr-FR')} %
          </p>
          <p className="text-[11px] text-amber-600 mt-1">
            écart (en cours de traitement) : {monnaie(stats.finances.ecart)}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Montants titre="Par ville" items={stats.finances.parVille ?? []} />
        <Montants titre="Par année" items={stats.finances.parAnnee ?? []} />
      </div>
    </div>
  );
}

function Montants({ titre, items }: {
  titre: string;
  items: { libelle: string; montant: number; nombre: number }[];
}) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-2">{titre}</p>
      {items.length === 0 ? (
        <p className="text-gray-400 text-sm italic">Aucune donnée</p>
      ) : (
        <ul className="space-y-1.5 text-xs">
          {items.map((item, index) => (
            <li key={`${item.libelle}-${index}`} className="flex items-center justify-between gap-3">
              <span className="truncate text-gray-700" title={item.libelle}>{item.libelle}</span>
              <span className="font-semibold text-gray-800 shrink-0">{monnaie(item.montant)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function nombre(n?: number): string {
  return (n ?? 0).toLocaleString('fr-FR');
}

function monnaie(n?: number): string {
  return `${Math.round(n ?? 0).toLocaleString('fr-FR')} Ar`;
}

function dateCourte(iso?: string): string {
  if (!iso) return '—';
  const partie = iso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(partie)) return iso;
  return partie.split('-').reverse().join('/');
}
