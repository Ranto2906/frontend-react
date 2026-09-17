import { useState, useEffect, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { suiviNotificationService, notificationOccupationService } from '../../../services';
import type { NotificationOccupation, SuiviNotification } from '../../../types';

export default function SuiviForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();

  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    idNotification: '',
    dateSuivi: '',
    constats: '',
    actionsASuivre: '',
  });

  const [notifications, setNotifications] = useState<NotificationOccupation[]>([]);
  const [suivi, setSuivi] = useState<SuiviNotification | null>(null);

  const set = (field: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  // ── Charger les notifications (pour le choix en création) ──
  useEffect(() => {
    notificationOccupationService
      .lister(0, 500)
      .then((d) => setNotifications(d.content))
      .catch(() => setError('Impossible de charger les notifications'));
  }, []);

  // ── Mode édition : charger le suivi ──
  useEffect(() => {
    if (!isEdit || !id) return;
    setLoading(true);
    suiviNotificationService
      .trouverParId(id)
      .then((s) => {
        setSuivi(s);
        setForm({
          idNotification: s.idNotification || '',
          dateSuivi: s.dateSuivi || '',
          constats: s.constats || '',
          actionsASuivre: s.actionsASuivre || '',
        });
      })
      .catch(() => setError("Impossible de charger le suivi"))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!isEdit && !form.idNotification) {
      return setError('La notification est obligatoire');
    }

    const payload = {
      ...(isEdit ? {} : { idNotification: form.idNotification }),
      dateSuivi: form.dateSuivi || undefined,
      constats: form.constats.trim() || undefined,
      actionsASuivre: form.actionsASuivre.trim() || undefined,
    };

    setSaving(true);
    try {
      if (isEdit && id) {
        await suiviNotificationService.modifier(id, payload);
        navigate(`/suivi-notifications/suivi/${id}`, {
          state: { toast: { msg: 'Suivi mis à jour', ok: true } },
        });
      } else {
        await suiviNotificationService.creer(payload);
        navigate('/suivi-notifications/suivi', {
          state: { toast: { msg: 'Suivi créé avec succès', ok: true } },
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors de l'enregistrement";
      setError(msg);
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="p-12 text-center text-gray-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-3"></div>
          Chargement...
        </div>
      </div>
    );
  }

  const champCls =
    'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none disabled:bg-gray-100';
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* Fil d'Ariane */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        <Link
          to="/suivi-notifications"
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          Suivi & Notifications
        </Link>
        <span className="text-gray-300">/</span>
        <Link
          to="/suivi-notifications/suivi"
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          Suivi des Notifications
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-700 font-medium">
          {isEdit ? `Modifier le suivi n° ${suivi?.ordre ?? ''}` : 'Nouveau suivi'}
        </span>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* En-tête de page */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-800">
                {isEdit ? `✏️ Modifier le suivi n° ${suivi?.ordre ?? ''}` : '➕ Nouveau suivi de notification'}
              </h1>
              <p className="text-gray-500 text-sm mt-0.5">
                {isEdit
                  ? "Corrigez les informations puis enregistrez — l'historique gardera la trace."
                  : 'Renseignez la notification suivie, la date et les constats du passage.'}
              </p>
            </div>
            <Link
              to={isEdit ? `/suivi-notifications/suivi/${id}` : '/suivi-notifications/suivi'}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 border border-gray-300 rounded-lg transition-colors"
            >
              ← Annuler
            </Link>
          </div>

          <div className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm border border-red-200">
                {error}
              </div>
            )}

            {/* ── Notification ── */}
            <section>
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">
                🏠 Notification concernée
              </h2>
              {isEdit ? (
                suivi?.idNotification ? (
                  <Link
                    to={`/suivi-notifications/occupation/${suivi.idNotification}`}
                    className="inline-flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-2.5 text-sm hover:bg-green-100 transition-colors"
                  >
                    <span className="text-lg">📄</span>
                    <span>
                      <span className="font-medium text-gray-800">
                        Propriété n° {suivi.numeroPropriete || '—'} · Lot n° {suivi.numeroLot || '—'}
                      </span>
                      {suivi.dateNotification && (
                        <span className="block text-xs text-gray-500">
                          Notification du{' '}
                          {new Date(suivi.dateNotification + 'T00:00:00').toLocaleDateString('fr-FR')}
                        </span>
                      )}
                    </span>
                  </Link>
                ) : (
                  <p className="text-sm text-gray-400 italic">Notification introuvable.</p>
                )
              ) : (
                <div className="max-w-xl">
                  <label className={labelCls}>Notification *</label>
                  <select
                    value={form.idNotification}
                    onChange={(e) => set('idNotification', e.target.value)}
                    className={champCls}
                  >
                    <option value="">— Sélectionner une notification —</option>
                    {notifications.map((n) => (
                      <option key={n.idNotification} value={n.idNotification}>
                        Propriété n° {n.numeroPropriete || '—'} · Lot n° {n.numeroLot || '—'}
                        {n.dateNotification
                          ? ` — ${new Date(n.dateNotification + 'T00:00:00').toLocaleDateString('fr-FR')}`
                          : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </section>

            {/* ── Date ── */}
            <section>
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">
                📅 Date du suivi
              </h2>
              <div className="max-w-md">
                <label className={labelCls}>Date du passage</label>
                <input
                  type="date"
                  value={form.dateSuivi}
                  onChange={(e) => set('dateSuivi', e.target.value)}
                  className={champCls}
                />
              </div>
            </section>

            {/* ── Constats ── */}
            <section>
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">
                📝 Constats & actions
              </h2>
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Constats du suivi</label>
                  <textarea
                    rows={4}
                    value={form.constats}
                    onChange={(e) => set('constats', e.target.value)}
                    placeholder="Ce qui a été constaté lors du suivi..."
                    className={champCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Actions à suivre</label>
                  <textarea
                    rows={3}
                    value={form.actionsASuivre}
                    onChange={(e) => set('actionsASuivre', e.target.value)}
                    placeholder="Prochaines actions / recommandations..."
                    className={champCls}
                  />
                </div>
              </div>
            </section>

            {/* ── Actions ── */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Link
                to={isEdit ? `/suivi-notifications/suivi/${id}` : '/suivi-notifications/suivi'}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Annuler
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 text-sm bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg font-medium transition-colors"
              >
                {saving
                  ? 'Enregistrement...'
                  : isEdit
                  ? '💾 Enregistrer les modifications'
                  : '💾 Créer le suivi'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
