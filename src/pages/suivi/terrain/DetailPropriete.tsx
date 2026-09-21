import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { parcelleService, prixM2Service, proprieteService } from '../../../services';
import type { Parcelle, PrixM2, Propriete } from '../../../types';

const formatNumber = (value?: number) => value != null ? value.toLocaleString('fr-FR', { maximumFractionDigits: 2 }) : '—';
const formatPrice = (value?: number) => value != null ? `${value.toLocaleString('fr-FR')} Ar` : '—';

export default function DetailPropriete() {
  const { id } = useParams<{ id: string }>();
  const [propriete, setPropriete] = useState<Propriete | null>(null);
  const [parcelles, setParcelles] = useState<Parcelle[]>([]);
  const [prixM2, setPrixM2] = useState<PrixM2 | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;

    const loadData = async () => {
      try {
        const property = await proprieteService.trouverParId(Number(id));
        const [propertyParcelles, cityPrices] = await Promise.all([
          parcelleService.listerParPropriete(property.idPropriete),
          property.idVille ? prixM2Service.listerParVille(property.idVille) : Promise.resolve([]),
        ]);

        const latestPrice = cityPrices
          .filter((price) => price.dateMaj)
          .sort((a, b) => new Date(b.dateMaj).getTime() - new Date(a.dateMaj).getTime())[0] ?? cityPrices[0] ?? null;

        setPropriete(property);
        setParcelles(propertyParcelles);
        setPrixM2(latestPrice);
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">📋 Informations de la propriété</h2>
          {prixM2 && <Link to={`/suivi/prix-m2/${prixM2.idPrix}`} className="text-sm text-purple-600 hover:text-purple-700 font-medium">Voir le détail du prix →</Link>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 p-6">
          <Info label="Numéro" value={propriete.numero} />
          <Info label="Localisation" value={propriete.localisation} />
          <Info label="Lieu" value={propriete.libelleLieu} />
          <Info label="Ville" value={propriete.nomVille || (propriete.idVille ? `Ville #${propriete.idVille}` : undefined)} />
        </div>
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
