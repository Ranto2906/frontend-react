import { useEffect, useState, Fragment } from 'react';
import { Link, useParams } from 'react-router-dom';
import { parcelleService, prixM2Service, proprieteService } from '../../../services';
import type { Parcelle, PrixM2, Propriete, ProprieteOccupation, AuditDTO } from '../../../types';

const formatNumber = (value?: number) => value != null ? value.toLocaleString('fr-FR', { maximumFractionDigits: 2 }) : '—';
const formatPrice = (value?: number) => value != null ? `${value.toLocaleString('fr-FR')} Ar` : '—';

export default function DetailPropriete() {
  const { id } = useParams<{ id: string }>();
  const [propriete, setPropriete] = useState<Propriete | null>(null);
  const [parcelles, setParcelles] = useState<Parcelle[]>([]);
  const [prixM2, setPrixM2] = useState<PrixM2 | null>(null);
  const [historique, setHistorique] = useState<AuditDTO[]>([]);
  const [occupation, setOccupation] = useState<ProprieteOccupation | null>(null);
  const [expandedHist, setExpandedHist] = useState<number | null>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;

    const loadData = async () => {
      try {
        const property = await proprieteService.trouverParId(Number(id));
        const [propertyParcelles, cityPrices, history, dossiers] = await Promise.all([
          parcelleService.listerParPropriete(property.idPropriete),
          property.idVille ? prixM2Service.listerParVille(property.idVille) : Promise.resolve([]),
          proprieteService.historique(property.idPropriete),
          proprieteService.dossiers(property.idPropriete).catch(() => null),
        ]);

        const latestPrice = cityPrices
          .filter((price) => price.dateMaj)
          .sort((a, b) => new Date(b.dateMaj).getTime() - new Date(a.dateMaj).getTime())[0] ?? cityPrices[0] ?? null;

        setPropriete(property);
        setParcelles(propertyParcelles);
        setPrixM2(latestPrice);
        setHistorique(history);
        setOccupation(dossiers);
      } catch {
        setError('Propriété introuvable');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="p-12 text-center text-gray-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-3"></div>
          Chargement...
        </div>
      </div>
    );
  }

  if (error || !propriete) {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="p-12 text-center">
          <p className="text-lg text-gray-500 mb-4">{error || 'Propriété introuvable'}</p>
          <Link to="/suivi/proprietes" className="text-orange-600 hover:text-orange-700 text-sm font-medium">
            ← Retour aux propriétés
          </Link>
        </div>
      </div>
    );
  }

  const totalPrice = propriete.superficieTotale != null && prixM2?.prixTtc != null
    ? propriete.superficieTotale * prixM2.prixTtc
    : undefined;

  // ── Superficie restante : si le reste vaut 0, plus aucune demande possible ──
  const dossiersLies = occupation?.dossiers ?? [];
  const superficieRestante = occupation?.superficieRestante;
  const superficieRenseignee = occupation?.superficieTotale != null;
  const superficieLibre = !superficieRenseignee
    || (superficieRestante != null && superficieRestante > 0);

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center gap-2 mb-6 text-sm">
        <Link to="/suivi" className="text-gray-400 hover:text-gray-600 transition-colors">Suivi terrain</Link>
        <span className="text-gray-300">/</span>
        <Link to="/suivi/proprietes" className="text-gray-400 hover:text-gray-600 transition-colors">Propriétés</Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-700 font-medium">{propriete.nom}</span>
      </div>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 bg-orange-100 text-orange-700 rounded-xl flex items-center justify-center text-xl">🏘️</div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{propriete.nom}</h1>
              <p className="text-sm text-gray-500">{propriete.numero ? `Référence ${propriete.numero}` : `Propriété #${propriete.idPropriete}`}</p>
            </div>
          </div>
        </div>
        <Link to="/suivi/proprietes" className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 border border-gray-300 rounded-lg transition-colors">
          ← Retour liste
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <div className="bg-orange-50 border border-orange-100 rounded-xl p-5">
          <p className="text-sm font-medium text-orange-700">Superficie totale</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">{formatNumber(propriete.superficieTotale)} <span className="text-base font-medium text-gray-500">m²</span></p>
          <p className="text-xs text-gray-500 mt-2">Surface enregistrée de la propriété</p>
        </div>
        <div className="bg-purple-50 border border-purple-100 rounded-xl p-5">
          <p className="text-sm font-medium text-purple-700">Prix courant au m²</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">{formatPrice(prixM2?.prixTtc)}</p>
          <p className="text-xs text-gray-500 mt-2">
            {prixM2 ? `Prix TTC${prixM2.dateMaj ? ` · mis à jour le ${new Date(prixM2.dateMaj).toLocaleDateString('fr-FR')}` : ''}` : 'Aucun prix enregistré pour cette ville'}
          </p>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl p-5">
          <p className="text-sm font-medium text-green-700">Prix total estimé</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">{formatPrice(totalPrice)}</p>
          <p className="text-xs text-gray-500 mt-2">Superficie × prix au m²</p>
        </div>
        <div className={`${superficieLibre ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-200'} border rounded-xl p-5`}>
          <p className={`text-sm font-medium ${superficieLibre ? 'text-emerald-700' : 'text-red-700'}`}>Superficie restante</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">
            {superficieRenseignee ? formatNumber(superficieRestante) : '—'} <span className="text-base font-medium text-gray-500">m²</span>
          </p>
          <p className={`text-xs mt-2 ${superficieLibre ? 'text-gray-500' : 'text-red-600 font-medium'}`}>
            {!superficieRenseignee
              ? 'Superficie totale non renseignée — aucune limite de demande'
              : superficieLibre
                ? 'Superficie libre pour de nouvelles demandes'
                : '⛔ Aucune superficie libre : plus de demande possible'}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">📋 Informations de la propriété</h2>
          {prixM2 && <Link to={`/suivi/prix-m2/${prixM2.idPrix}`} className="text-sm text-purple-600 hover:text-purple-700 font-medium">Voir le détail du prix →</Link>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 p-6">
          <Info label="Numéro" value={propriete.numero} />
          <Info label="Type de propriété" value={propriete.typePropriete?.libelle} />
          <Info label="Localisation" value={propriete.localisation} />
          <Info label="Lieu" value={propriete.libelleLieu} />
          <Info label="Ville" value={propriete.nomVille || (propriete.idVille ? `Ville #${propriete.idVille}` : undefined)} />
        </div>
      </div>

      {/* ── Dossiers liés + superficie restante ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
          <h2 className="text-lg font-bold text-gray-800">📂 Dossiers liés à cette propriété</h2>
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
            {dossiersLies.length}
          </span>
          <span className={`ml-auto text-xs px-2.5 py-1 rounded-full font-medium ${
            superficieLibre ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
          }`}>
            Reste : {superficieRenseignee ? `${formatNumber(superficieRestante)} m²` : '—'}
          </span>
        </div>

        {dossiersLies.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">
            Aucun dossier n'est encore rattaché à cette propriété.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 font-medium text-gray-600">N° dossier</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-600">Demandeur</th>
                  <th className="text-right px-6 py-3 font-medium text-gray-600">Superficie</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {dossiersLies.map((d) => (
                  <tr key={d.idDossier} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3">
                      <Link to={`/demandes/${d.idDossier}`} className="font-medium text-blue-600 hover:text-blue-700">
                        {d.numeroDossier}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-gray-700">{d.demandeur || '—'}</td>
                    <td className="px-6 py-3 text-right text-gray-700">
                      {d.superficieM2 != null ? `${formatNumber(d.superficieM2)} m²` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t border-gray-200">
                  <td colSpan={2} className="px-6 py-3 font-medium text-gray-700">Total superficie occupée</td>
                  <td className="px-6 py-3 text-right font-semibold text-gray-800">
                    {formatNumber(occupation?.superficieUtilisee)} m²
                  </td>
                </tr>
                <tr className={`${superficieLibre ? 'bg-emerald-50' : 'bg-red-50'} border-t border-gray-200`}>
                  <td colSpan={2} className={`px-6 py-3 font-medium ${superficieLibre ? 'text-emerald-700' : 'text-red-700'}`}>
                    Superficie restante
                  </td>
                  <td className={`px-6 py-3 text-right font-bold ${superficieLibre ? 'text-emerald-700' : 'text-red-700'}`}>
                    {superficieRenseignee ? `${formatNumber(superficieRestante)} m²` : '—'}
                  </td>
                </tr>
              </tfoot>
            </table>
            {!superficieLibre && (
              <p className="px-6 py-3 bg-red-50 border-t border-red-100 text-red-700 text-xs font-medium">
                ⛔ Cette propriété n'a plus de superficie libre : aucune nouvelle demande ne peut y être rattachée.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
          <h2 className="text-lg font-bold text-gray-800">📜 Historique des modifications</h2>
          {historique.length > 0 && (
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
              {historique.length} modification{historique.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {historique.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-400 text-sm italic">Aucune modification enregistrée.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-8"></th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Action</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Numéro</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Superficie</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Lieu</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {historique.map((entry, idx) => {
                  const anciennes = entry.anciennesValeurs ? JSON.parse(entry.anciennesValeurs) : null;
                  const nouvelles = entry.nouvellesValeurs ? JSON.parse(entry.nouvellesValeurs) : null;
                  const isExpanded = expandedHist === idx;

                  return (
                    <Fragment key={entry.idAudit}>
                      <tr className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setExpandedHist(isExpanded ? null : idx)}
                            className="p-1 rounded hover:bg-gray-200 transition-colors"
                            title={isExpanded ? 'Masquer' : 'Voir les détails'}
                          >
                            <span className={`w-2.5 h-2.5 rounded-full inline-block ${idx === 0 ? 'bg-blue-500' : 'bg-gray-300'}`} />
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${entry.action === 'CREATE' ? 'bg-green-100 text-green-800' : entry.action === 'UPDATE' ? 'bg-blue-100 text-blue-800' : entry.action === 'DELETE' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                            {entry.action || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {entry.action === 'CREATE' ? nouvelles?.typePropriete : anciennes?.typePropriete || '—'}
                        </td>
                        <td className="px-4 py-3 text-xs\" style={{ color: '#6b7280' }}>
                          {entry.action === 'CREATE' ? nouvelles?.numero : anciennes?.numero || '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-right">
                          {entry.action === 'CREATE' ? nouvelles?.superficieTotale : anciennes?.superficieTotale || '—'}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {entry.action === 'CREATE' ? nouvelles?.libelleLieu : anciennes?.libelleLieu || '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{formatDate(entry.dateAction)}</td>
                      </tr>

                      {isExpanded && (
                        <tr key={`${entry.idAudit}-det`}>
                          <td colSpan={7} className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-3">
                              {entry.action === 'CREATE' ? 'Propriété créée' : entry.action === 'DELETE' ? 'Propriété supprimée' : 'Valeurs avant modification'}
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              {entry.action !== 'CREATE' && anciennes && (
                                <>
                                  <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Type</p>
                                    <p className="text-sm text-gray-800">{anciennes.typePropriete || '—'}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Numéro</p>
                                    <p className="text-sm text-gray-800">{anciennes.numero || '—'}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Superficie</p>
                                    <p className="text-sm text-gray-800">{anciennes.superficieTotale ? `${Number(anciennes.superficieTotale).toLocaleString('fr-FR')} m²` : '—'}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Lieu</p>
                                    <p className="text-sm text-gray-800">{anciennes.libelleLieu || '—'}</p>
                                  </div>
                                </>
                              )}
                              {nouvelles && (
                                <>
                                  <div className="border-t border-gray-200 pt-3 mt-1 col-span-full">
                                    <p className="text-xs font-medium text-blue-500 uppercase tracking-wide mb-1">Nouvelles valeurs</p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Type</p>
                                    <p className="text-sm text-blue-700">{nouvelles.typePropriete || '—'}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Numéro</p>
                                    <p className="text-sm text-blue-700">{nouvelles.numero || '—'}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Superficie</p>
                                    <p className="text-sm text-blue-700">{nouvelles.superficieTotale ? `${Number(nouvelles.superficieTotale).toLocaleString('fr-FR')} m²` : '—'}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Lieu</p>
                                    <p className="text-sm text-blue-700">{nouvelles.libelleLieu || '—'}</p>
                                  </div>
                                </>
                              )}
                            </div>
                            {entry.nomUtilisateur && (
                              <p className="text-xs text-gray-400 mt-3">
                                Par <span className="font-medium text-gray-600">{entry.nomUtilisateur}</span>
                                {entry.ipAdresse && <span className="ml-2">(IP: {entry.ipAdresse})</span>}
                              </p>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
          <h2 className="text-lg font-bold text-gray-800">🗺️ Parcelles rattachées</h2>
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">{parcelles.length}</span>
        </div>
        {parcelles.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">Aucune parcelle rattachée à cette propriété.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 font-medium text-gray-600">Numéro de lot</th>
                  <th className="text-right px-6 py-3 font-medium text-gray-600">Superficie</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-600">Observation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {parcelles.map((parcelle) => (
                  <tr key={parcelle.idParcelle} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 font-medium text-gray-800">{parcelle.numeroLot || '—'}</td>
                    <td className="px-6 py-3 text-right text-gray-700">{parcelle.superficieM2 != null ? `${formatNumber(parcelle.superficieM2)} m²` : '—'}</td>
                    <td className="px-6 py-3 text-gray-600">{parcelle.observation || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm text-gray-800">{value || '—'}</p>
    </div>
  );
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
