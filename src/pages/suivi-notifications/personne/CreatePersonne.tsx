import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { documentDemandeurService, personService } from '../../../services';
import type { CreatePersonneRequest, TypePersonne } from '../../../types';

const TYPES_DOCUMENT = [
  { value: 'photo_demandeur', label: 'Photo de la personne' },
  { value: 'photo_identite', label: "Pièce d'identité (image)" },
  { value: 'pdf_piece', label: 'Pièce justificative (PDF)' },
  { value: 'Autre', label: 'Autre document' },
];

function tailleLisible(octets: number) {
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${(octets / 1024).toFixed(0)} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`;
}

function messageErreur(error: unknown, fallback: string) {
  const response = error as { response?: { data?: { message?: string } } };
  return response.response?.data?.message || (error instanceof Error ? error.message : fallback);
}

export default function CreatePersonne() {
  const navigate = useNavigate();
  const [types, setTypes] = useState<TypePersonne[]>([]);
  const [form, setForm] = useState<CreatePersonneRequest>({
    nom: '', contact: '', email: '', adresse: '', idTypePersonne: undefined,
  });
  const [fichiers, setFichiers] = useState<File[]>([]);
  const [typeDocument, setTypeDocument] = useState('Autre');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    personService.listerTypes().then(setTypes).catch(() => undefined);
  }, []);

  const set = (field: keyof CreatePersonneRequest, value: string | number | undefined) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const ajouterFichiers = (event: ChangeEvent<HTMLInputElement>) => {
    const selection = Array.from(event.target.files || []);
    event.target.value = '';
    const acceptes = selection.filter((file) =>
      file.type.startsWith('image/') || file.type === 'application/pdf',
    );
    setFichiers((current) => [...current, ...acceptes]);
    if (selection.length !== acceptes.length) {
      setError('Seuls les fichiers image et PDF sont autorisés.');
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.nom.trim()) {
      setError('Le nom est requis.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const personne = await personService.creer({
        ...form,
        nom: form.nom.trim(),
        contact: form.contact?.trim() || undefined,
        email: form.email?.trim() || undefined,
        adresse: form.adresse?.trim() || undefined,
      });

      for (const fichier of fichiers) {
        await documentDemandeurService.ajouter({
          fichier,
          idPersonne: personne.idPersonne,
          typeDocument: typeDocument === 'Autre'
            ? (fichier.type === 'application/pdf' ? 'pdf_piece' : 'photo_demandeur')
            : typeDocument,
        });
      }

      navigate(`/suivi-notifications/personnes/${personne.idPersonne}`);
    } catch (err) {
      setError(messageErreur(err, 'Erreur lors de la création de la personne.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-2 mb-6 text-sm">
          <Link to="/suivi-notifications/personnes" className="text-gray-400 hover:text-gray-600">← Personnes</Link>
          <span className="text-gray-300">/</span>
          <span className="text-gray-700 font-medium">Nouvelle personne</span>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Créer une personne</h1>
          <p className="text-gray-500 text-sm mt-1">Renseignez les informations et joignez ses documents.</p>
        </div>

        <form onSubmit={submit} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {error && <div className="mx-6 mt-6 bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm border border-red-200">{error}</div>}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6 lg:p-8">
            <section className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Informations personnelles</h2>
                <p className="text-xs text-gray-400 mt-1">Les champs marqués d’un astérisque sont obligatoires.</p>
              </div>
              <Field label="Nom *" value={form.nom} onChange={(value) => set('nom', value)} placeholder="ex. Rakoto" />
              <Field label="Contact" value={form.contact || ''} onChange={(value) => set('contact', value)} placeholder="ex. +261 34 00 000" />
              <Field label="Email" type="email" value={form.email || ''} onChange={(value) => set('email', value)} placeholder="ex. jean@email.mg" />
              <Field label="Adresse" value={form.adresse || ''} onChange={(value) => set('adresse', value)} placeholder="ex. Analakely, Antananarivo" />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type de personne</label>
                <select value={form.idTypePersonne ?? ''} onChange={(event) => set('idTypePersonne', event.target.value ? Number(event.target.value) : undefined)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Sélectionner un type</option>
                  {types.map((type) => <option key={type.idTypePersonne} value={type.idTypePersonne}>{type.libelle}</option>)}
                </select>
              </div>
            </section>

            <section className="border-t lg:border-t-0 lg:border-l border-gray-200 pt-8 lg:pt-0 lg:pl-8">
              <h2 className="text-lg font-bold text-gray-800">Documents liés</h2>
              <p className="text-sm text-gray-500 mt-1 mb-5">Ajoutez des images ou des fichiers PDF. Ils seront rattachés automatiquement à cette personne.</p>
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <select value={typeDocument} onChange={(event) => setTypeDocument(event.target.value)} className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
                  {TYPES_DOCUMENT.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                </select>
                <label className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium text-center cursor-pointer transition-colors">
                  📎 Joindre des fichiers
                  <input type="file" multiple accept="image/*,.pdf" className="hidden" onChange={ajouterFichiers} />
                </label>
              </div>
              <div className="min-h-32 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
                {fichiers.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">Aucun fichier sélectionné</p>
                ) : (
                  <div className="space-y-2">
                    {fichiers.map((fichier, index) => (
                      <div key={`${fichier.name}-${index}`} className="flex items-center justify-between gap-3 bg-white border border-gray-200 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2 min-w-0"><span>{fichier.type === 'application/pdf' ? '📄' : '🖼️'}</span><span className="text-sm text-gray-700 truncate">{fichier.name}</span><span className="text-xs text-gray-400 shrink-0">{tailleLisible(fichier.size)}</span></div>
                        <button type="button" onClick={() => setFichiers((current) => current.filter((_, fileIndex) => fileIndex !== index))} className="text-red-500 hover:text-red-700 text-sm" title="Retirer le fichier">✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>

          <div className="flex justify-end gap-3 px-6 py-4 lg:px-8 border-t border-gray-200 bg-gray-50">
            <Link to="/suivi-notifications/personnes" className="px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-200 rounded-lg">Annuler</Link>
            <button type="submit" disabled={saving} className="px-5 py-2.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium">{saving ? 'Création et envoi...' : 'Créer la personne'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, type = 'text', value, onChange, placeholder }: { label: string; type?: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
    </div>
  );
}