/**
 * Message d'erreur lisible renvoyé par l'API.
 * <p>
 * Le backend répond aux refus métier (suppression d'un élément encore
 * utilisé, contrainte de base…) sous la forme {@code { message: "..." }} :
 * ce helper extrait ce texte pour l'afficher tel quel dans un toast, au lieu
 * d'un « Erreur lors de la suppression » générique.
 */
export function msgErreur(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string; error?: string } } };
  const data = e?.response?.data;
  if (data?.message) return data.message;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
