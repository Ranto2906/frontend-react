import { useState, useEffect, useCallback } from 'react';
import { photoService } from '../../services';
import type { PhotoDTO } from '../../types';

const TYPE_LABELS: Record<string, string> = {
  date_notification: '📷 Photos à la date de notification',
  photo_suivi: '📷 Photos à la date de suivi',
  constatation: '📷 Photo à la date de constatation',
  satellite_apres: '🛰️ Photo satellitaire après construction',
  satellite_avant: '🛰️ Photo satellitaire avant construction',
};

const ORDER: string[] = [
  'date_notification',
  'photo_suivi',
  'constatation',
  'satellite_apres',
  'satellite_avant',
];

function PhotoFigure({ photo }: { photo: PhotoDTO }) {
  return (
    <figure className="w-40">
      <PhotoMiniature photo={photo} />
      {photo.observation && (
        <figcaption
          className="mt-1 text-[11px] leading-snug text-gray-500 break-words line-clamp-3"
          title={photo.observation}
        >
          {photo.observation}
        </figcaption>
      )}
    </figure>
  );
}

function PhotoMiniature({ photo }: { photo: PhotoDTO }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let annule = false;
    let objUrl: string | null = null;
    photoService
      .contenu(photo.idPhoto)
      .then((blob) => {
        if (annule) return;
        objUrl = URL.createObjectURL(blob);
        setUrl(objUrl);
      })
      .catch(() => {
        // photo illisible — simplement masquée
      });
    return () => {
      annule = true;
      if (objUrl) URL.revokeObjectURL(objUrl);
    };
  }, [photo.idPhoto]);

  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="group relative block rounded-lg overflow-hidden border border-gray-200 bg-gray-50"
      title="Ouvrir en grand"
    >
      <img
        src={url}
        alt={`Photo ${photo.typePhoto || ''}`}
        className="w-40 h-32 object-cover group-hover:scale-105 transition-transform"
      />
    </a>
  );
}

export default function PhotosSection({
  entiteType,
  entiteId,
}: {
  entiteType: string;
  entiteId?: string;
}) {
  const [photos, setPhotos] = useState<PhotoDTO[]>([]);
  const [loading, setLoading] = useState(false);

  const charger = useCallback(() => {
    if (!entiteId) return;
    setLoading(true);
    photoService
      .lister(entiteType, entiteId)
      .then(setPhotos)
      .catch(() => setPhotos([]))
      .finally(() => setLoading(false));
  }, [entiteType, entiteId]);

  useEffect(() => {
    charger();
  }, [charger]);

  if (photos.length === 0) return null;

  // Groupement par type (ordre stable)
  const groupes = ORDER.map((t) => ({ type: t, liste: photos.filter((p) => p.typePhoto === t) }))
    .filter((g) => g.liste.length > 0);
  const autres = photos.filter((p) => !ORDER.includes(p.typePhoto || ''));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
        <h2 className="text-lg font-bold text-gray-800">🖼️ Photos</h2>
        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
          {photos.length}
        </span>
      </div>
      <div className="p-6 space-y-4">
        {groupes.map((g) => (
          <div key={g.type}>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              {TYPE_LABELS[g.type] || '📷 Photo'}
            </p>
            <div className="flex flex-wrap gap-3">
              {g.liste.map((p) => (
                <PhotoFigure key={p.idPhoto} photo={p} />
              ))}
            </div>
          </div>
        ))}
        {autres.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Autres</p>
            <div className="flex flex-wrap gap-3">
              {autres.map((p) => (
                <PhotoFigure key={p.idPhoto} photo={p} />
              ))}
            </div>
          </div>
        )}
      </div>
      {loading && photos.length === 0 && null}
    </div>
  );
}
