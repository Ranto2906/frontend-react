import type { Repartition, SerieMensuelle } from '../../types';

// ══════════════════════════════════════════════════════════════
// Graphiques du tableau de bord — SVG natif (aucune librairie)
// ══════════════════════════════════════════════════════════════

const COULEUR_DEFAUT = '#94a3b8';

/** Cadre commun d'une section du tableau de bord. */
export function Section({
  titre,
  icone,
  action,
  children,
  className = '',
}: {
  titre: string;
  icone?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`bg-white rounded-xl shadow-sm border border-gray-200 p-5 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-800 text-sm">
          {icone && <span className="mr-1.5">{icone}</span>}
          {titre}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Répartition horizontale : libellé, barre proportionnelle, valeur et %. */
export function BarresRepartition({
  items,
  couleur,
  hauteur = 'h-2.5',
}: {
  items: Repartition[];
  couleur?: string;
  hauteur?: string;
}) {
  if (!items.length) {
    return <p className="text-gray-400 text-sm italic">Aucune donnée</p>;
  }
  const max = Math.max(...items.map((i) => i.valeur), 1);
  return (
    <ul className="space-y-2.5">
      {items.map((it, idx) => (
        <li key={`${it.libelle}-${idx}`} title={`${it.libelle} : ${it.valeur} (${it.pourcent} %)`}>
          <div className="flex items-center gap-2 text-xs mb-1">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
              style={{ background: it.couleur || couleur || COULEUR_DEFAUT }}
            />
            <span className="flex-1 truncate text-gray-700">{it.libelle}</span>
            <span className="font-semibold text-gray-800">{it.valeur.toLocaleString('fr-FR')}</span>
            <span className="text-gray-400 w-11 text-right">{it.pourcent} %</span>
          </div>
          <div className={`w-full ${hauteur} bg-gray-100 rounded-full overflow-hidden`}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.max((it.valeur / max) * 100, it.valeur > 0 ? 2 : 0)}%`,
                background: it.couleur || couleur || COULEUR_DEFAUT,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Anneau (donut) d'une répartition, avec total au centre et légende. */
export function Donut({
  items,
  couleur = COULEUR_DEFAUT,
  taille = 150,
}: {
  items: Repartition[];
  couleur?: string;
  taille?: number;
}) {
  const total = items.reduce((s, i) => s + i.valeur, 0);
  const rayon = (taille - 26) / 2;
  const circonference = 2 * Math.PI * rayon;

  let offset = 0;
  const arcs = items
    .filter((i) => i.valeur > 0)
    .map((it, idx) => {
      const fraction = it.valeur / total;
      const dash = fraction * circonference;
      const arc = (
        <circle
          key={`${it.libelle}-${idx}`}
          cx={taille / 2}
          cy={taille / 2}
          r={rayon}
          fill="none"
          stroke={it.couleur || couleur}
          strokeWidth={22}
          strokeDasharray={`${dash} ${circonference - dash}`}
          strokeDashoffset={-offset}
          transform={`rotate(-90 ${taille / 2} ${taille / 2})`}
        >
          <title>{`${it.libelle} : ${it.valeur} (${it.pourcent} %)`}</title>
        </circle>
      );
      offset += dash;
      return arc;
    });

  return (
    <div className="flex items-center gap-5 flex-wrap">
      <div className="relative shrink-0" style={{ width: taille, height: taille }}>
        <svg width={taille} height={taille}>
          <circle
            cx={taille / 2}
            cy={taille / 2}
            r={rayon}
            fill="none"
            stroke="#f1f5f9"
            strokeWidth={22}
          />
          {total > 0 && arcs}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-bold text-gray-800">{total.toLocaleString('fr-FR')}</span>
          <span className="text-[10px] text-gray-400 uppercase">total</span>
        </div>
      </div>
      <ul className="space-y-1.5 text-xs min-w-0">
        {items.map((it, idx) => (
          <li key={`${it.libelle}-${idx}`} className="flex items-center gap-2">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
              style={{ background: it.couleur || couleur }}
            />
            <span className="truncate text-gray-600">{it.libelle}</span>
            <span className="font-semibold text-gray-800">{it.valeur.toLocaleString('fr-FR')}</span>
          </li>
        ))}
        {total === 0 && <li className="text-gray-400 italic">Aucune donnée</li>}
      </ul>
    </div>
  );
}

/** Série mensuelle groupée (barres verticales, plusieurs séries superposées). */
export function GraphiqueMensuel({
  series,
}: {
  series: { label: string; couleur: string; points: SerieMensuelle[] }[];
}) {
  // Union des périodes triées (format « YYYY-MM » → tri lexicographique valide).
  const periodes = [...new Set(series.flatMap((s) => s.points.map((p) => p.periode)))].sort();
  const valeur = (s: { points: SerieMensuelle[] }, periode: string) =>
    s.points.find((p) => p.periode === periode)?.valeur ?? 0;

  const total = series.reduce(
    (somme, s) => somme + s.points.reduce((x, p) => x + p.valeur, 0),
    0,
  );
  const max = Math.max(1, ...series.flatMap((s) => s.points.map((p) => p.valeur)));

  const L = 720;
  const H = 240;
  const margeGauche = 40;
  const margeDroite = 10;
  const margeHaute = 12;
  const margeBasse = 30;
  const largeurPlot = L - margeGauche - margeDroite;
  const hauteurPlot = H - margeHaute - margeBasse;

  const groupe = periodes.length ? largeurPlot / periodes.length : largeurPlot;
  const barre = Math.min((groupe * 0.72) / Math.max(series.length, 1), 18);

  if (periodes.length === 0) {
    return <p className="text-gray-400 text-sm italic">Aucune donnée</p>;
  }

  return (
    <div>
      {/* Légende */}
      <div className="flex flex-wrap gap-4 mb-2 text-xs text-gray-600">
        {series.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: s.couleur }} />
            {s.label}
          </span>
        ))}
      </div>

      <svg viewBox={`0 0 ${L} ${H}`} className="w-full h-auto" role="img" aria-label="Série mensuelle">
        {/* Grille horizontale + échelle */}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => {
          const y = margeHaute + hauteurPlot * (1 - f);
          return (
            <g key={f}>
              <line
                x1={margeGauche}
                x2={L - margeDroite}
                y1={y}
                y2={y}
                stroke={f === 0 ? '#cbd5e1' : '#f1f5f9'}
                strokeWidth={1}
              />
              <text x={margeGauche - 6} y={y + 4} textAnchor="end" fontSize={10} fill="#94a3b8">
                {Math.round(max * f)}
              </text>
            </g>
          );
        })}

        {/* Barres */}
        {periodes.map((periode, i) => {
          const debutGroupe = margeGauche + i * groupe;
          const decalage = (groupe - barre * series.length) / 2;
          return (
            <g key={periode}>
              {series.map((s, si) => {
                const v = valeur(s, periode);
                const h = (v / max) * hauteurPlot;
                const x = debutGroupe + decalage + si * barre;
                const y = margeHaute + hauteurPlot - h;
                return (
                  <rect
                    key={s.label}
                    x={x}
                    y={v > 0 ? y : margeHaute + hauteurPlot}
                    width={Math.max(barre - 2, 2)}
                    height={Math.max(h, v > 0 ? 1.5 : 0)}
                    rx={1.5}
                    fill={s.couleur}
                    opacity={v > 0 ? 1 : 0}
                  >
                    <title>{`${periode} — ${s.label} : ${v}`}</title>
                  </rect>
                );
              })}
              <text
                x={debutGroupe + groupe / 2}
                y={H - margeBasse + 16}
                textAnchor="middle"
                fontSize={9.5}
                fill="#94a3b8"
              >
                {periode.slice(5)}
              </text>
              <text
                x={debutGroupe + groupe / 2}
                y={H - margeBasse + 27}
                textAnchor="middle"
                fontSize={8.5}
                fill="#cbd5e1"
              >
                {i === 0 || periode.slice(5) === '01' ? periode.slice(0, 4) : ''}
              </text>
            </g>
          );
        })}
      </svg>

      {total === 0 && (
        <p className="text-xs text-gray-400 italic -mt-6 text-center">Aucune activité sur 12 mois</p>
      )}
    </div>
  );
}

/** Jauge horizontale (taux de complétion, couverture…). */
export function Jauge({
  pourcent,
  couleur = '#2563eb',
  legende,
  detail,
}: {
  pourcent: number;
  couleur?: string;
  legende?: string;
  detail?: string;
}) {
  const p = Math.max(0, Math.min(100, pourcent));
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        {legende && <span className="text-xs text-gray-600">{legende}</span>}
        <span className="text-sm font-semibold text-gray-800">{p.toLocaleString('fr-FR')} %</span>
      </div>
      <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${p}%`, background: couleur }}
        />
      </div>
      {detail && <p className="text-[11px] text-gray-400 mt-1">{detail}</p>}
    </div>
  );
}
