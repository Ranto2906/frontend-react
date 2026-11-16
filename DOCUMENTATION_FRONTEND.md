# Documentation technique et fonctionnelle du frontend

## 1. Présentation générale

Ce projet est le frontend React/TypeScript de l’application SEIMAD de gestion du patrimoine foncier. Il fournit :

- l’authentification des utilisateurs et le maintien de session ;
- le tableau de bord et les statistiques ;
- le suivi des demandes/dossiers ;
- la gestion du patrimoine foncier (villes, lieux, propriétés, parcelles et prix au m²) ;
- la carte interactive et la saisie de géométries ;
- le suivi des notifications d’occupation et des avertissements ;
- la gestion des personnes, documents, suivis et assignations ;
- la gestion mobile des descentes terrain et des signalements ;
- la gestion administrative des utilisateurs, rôles, sessions, journal, audit et corbeille.

Le frontend ne contient pas la logique métier serveur. Il orchestre les interactions utilisateur, valide les saisies immédiates, appelle les services HTTP et projette les DTO retournés par le backend Spring Boot.

### Flux général

```text
Utilisateur
   │ interaction avec une page React
   ▼
État local React / formulaire / modal
   │ validation puis appel d’un service
   ▼
src/services/*.ts
   │ instance Axios /api
   ▼
Backend Spring Boot
   │ DTO JSON, fichier ou erreur HTTP
   ▼
Mise à jour d’état React
   │
   ▼
Rendu, toast, message d’erreur, navigation
```

## 2. Architecture et organisation des dossiers

```text
src/
├── App.tsx                         Composition racine
├── main.tsx                        Bootstrap React et StrictMode
├── routes/
│   └── AppRoutes.tsx               Déclaration de toutes les routes
├── context/
│   └── AuthContext.tsx             Session et utilisateur courant
├── components/                     Composants partagés
├── pages/                          Écrans fonctionnels, regroupés par domaine
├── services/                       Accès HTTP et contrats de requête
├── types/                          DTO, modèles et requêtes TypeScript
├── utils/                          Formatage, erreurs, conversion et constantes
└── hooks/
    └── useToast.ts                 Notification temporaire réutilisable
```

### Entrée de l’application

- `src/main.tsx` récupère `#root`, active `StrictMode` et rend `App`.
- `src/App.tsx` installe `BrowserRouter`, `AuthProvider` puis `AppRoutes`.
- `src/routes/AppRoutes.tsx` distingue la route publique `/login` et l’ensemble des routes protégées sous `/`.
- `src/components/Layout.tsx` fournit la barre latérale, le bouton de déconnexion et le `<Outlet />` des pages.

## 3. Technologies et bibliothèques

Les dépendances principales sont déclarées dans `package.json` :

- React 19 et React DOM ;
- TypeScript 6 en mode bundler ;
- Vite 8 ;
- React Router 7 ;
- Axios pour HTTP ;
- Tailwind CSS via `@tailwindcss/vite` ;
- Leaflet et `@types/leaflet` pour les cartes ;
- Turf.js pour le calcul de superficie et de centroïde ;
- `proj4` pour la conversion WGS84/Laborde ;
- Oxlint pour le lint.

Scripts disponibles :

```text
npm run dev       Vite avec proxy /api
npm run build     tsc -b puis vite build
npm run lint      oxlint
npm run preview   prévisualisation du build
```

`vite.config.ts` redirige `/api` vers `API_PROXY_TARGET`, ou vers `http://127.0.0.1:8094` par défaut. Le frontend utilise donc des URLs relatives `/api/...` et reste compatible avec le backend Spring Boot.

## 4. Routage et navigation

Le routage est centralisé dans `src/routes/AppRoutes.tsx`.

### Routes publiques

| Route | Composant | Fonction |
|---|---|---|
| `/login` | `pages/auth/Login.tsx` | Connexion utilisateur |
| `*` | `Navigate` vers `/` | Fallback |

### Demandes et dossiers

| Route | Composant |
|---|---|
| `/` | `pages/dashboard/Dashboard.tsx` |
| `/demandes` | `pages/demandes/SuiviDossier.tsx` |
| `/demandes/liste` | `pages/demandes/Demandes.tsx` |
| `/demandes/nouveau` | `pages/demandes/DemandeForm.tsx` |
| `/demandes/:id` | `pages/demandes/DetailDemande.tsx` |
| `/demandes/:id/modifier` | `pages/demandes/DemandeForm.tsx` |
| `/demandes/etapes` | `pages/demandes/GestionEtapes.tsx` |
| `/demandes/types-dossier` | `pages/demandes/GestionTypesDossier.tsx` |

### Patrimoine et terrain

| Route | Composant |
|---|---|
| `/patrimoine` | `pages/patrimoine/Patrimoine.tsx` |
| `/suivi` | `pages/suivi/SuiviTerrain.tsx` |
| `/suivi/villes` | `pages/suivi/terrain/GestionVille.tsx` |
| `/suivi/lieux` | `pages/suivi/terrain/GestionLieu.tsx` |
| `/suivi/proprietes` | `pages/suivi/terrain/GestionPropriete.tsx` |
| `/suivi/proprietes/:id` | `pages/suivi/terrain/DetailPropriete.tsx` |
| `/suivi/prix-m2` | `pages/suivi/terrain/GestionPrixM2.tsx` |
| `/suivi/prix-m2/:id` | `pages/suivi/terrain/DetailPrixM2.tsx` |
| `/suivi/parcelles` | `pages/suivi/terrain/GestionParcelle.tsx` |
| `/carte` | `pages/carte/Carte.tsx` |

### Notifications et personnes

| Route | Composant |
|---|---|
| `/suivi-notifications` | `SuiviNotificationsHub.tsx` |
| `/suivi-notifications/personnes` | `personne/GestionPersonne.tsx` |
| `/suivi-notifications/personnes/nouvelle` | `personne/CreatePersonne.tsx` |
| `/suivi-notifications/personnes/:id` | `personne/DetailPersonne.tsx` |
| `/suivi-notifications/occupation` | `notification/NotificationOccupation.tsx` |
| `/suivi-notifications/occupation/nouvelle` | `notification/NotificationOccupationForm.tsx` |
| `/suivi-notifications/occupation/:id` | `notification/DetailNotificationOccupation.tsx` |
| `/suivi-notifications/occupation/:id/modifier` | `notification/NotificationOccupationForm.tsx` |
| `/suivi-notifications/avertissements` | `avertissement/Avertissement.tsx` |
| `/suivi-notifications/avertissements/nouvelle` | `avertissement/AvertissementForm.tsx` |
| `/suivi-notifications/avertissements/:id` | `avertissement/DetailAvertissement.tsx` |
| `/suivi-notifications/avertissements/:id/modifier` | `avertissement/AvertissementForm.tsx` |
| `/suivi-notifications/suivi` | `suivi/SuiviNotifications.tsx` |
| `/suivi-notifications/suivi/nouvelle` | `suivi/SuiviForm.tsx` |
| `/suivi-notifications/suivi/:id` | `notification/DetailSuiviNotification.tsx` |
| `/suivi-notifications/suivi/:id/modifier` | `suivi/SuiviForm.tsx` |
| `/suivi-notifications/config-etapes` | `suivi/GestionEtapesNotification.tsx` |
| `/suivi-notifications/assignations` | `assignation/Assignations.tsx` |
| `/suivi-notifications/assignations/nouvelle` | `assignation/AssignationForm.tsx` |
| `/suivi-notifications/assignations/:id` | `assignation/DetailAssignation.tsx` |

### Mobile, signalements et administration

| Route | Composant |
|---|---|
| `/gestion-mobile` | `pages/gestion-mobile/descente/GestionMobile.tsx` |
| `/descentes-terrain` | `pages/gestion-mobile/descente/DescentesTerrain.tsx` |
| `/descentes-terrain/nouveau` | `descente/DescenteTerrainForm.tsx` |
| `/descentes-terrain/:id` | `descente/DetailDescenteTerrain.tsx` |
| `/descentes-terrain/:id/modifier` | `descente/DescenteTerrainForm.tsx` |
| `/signalements` | `pages/gestion-mobile/signalements/Signalements.tsx` |
| `/signalements/nouveau` | `signalements/SignalementForm.tsx` |
| `/signalements/:id` | `signalements/DetailSignalement.tsx` |
| `/signalements/:id/modifier` | `signalements/SignalementForm.tsx` |
| `/finances` | `pages/finances/Finances.tsx` |
| `/utilisateurs` | `pages/utilisateurs/Utilisateurs.tsx` |
| `/roles` | `pages/roles/Roles.tsx` |
| `/admin` | `pages/admin/Admin.tsx` |
| `/journal` | `pages/journal/Journal.tsx` |
| `/sessions` | `pages/sessions/Sessions.tsx` |
| `/audit` | `pages/audit/Audit.tsx` |
| `/corbeille` | `pages/corbeille/Corbeille.tsx` |

Toutes les routes sous `/` sont enveloppées par `ProtectedRoute`. La protection vérifie l’état d’authentification, affiche un chargement pendant `AuthProvider.loadUser`, puis redirige vers `/login` si aucun utilisateur n’est disponible.

## 5. Authentification et autorisations

### Connexion

1. `pages/auth/Login.tsx` conserve `nomUtilisateur`, `motDePasse`, `error` et `loading`.
2. `handleSubmit` appelle `useAuth().login`.
3. `AuthContext.login` appelle `authService.login`, soit `POST /api/auth/login`.
4. Les tokens sont enregistrés via `setTokens` dans `services/api.ts`.
5. L’utilisateur retourné est conservé dans le contexte et dans `localStorage.user`.
6. La page navigue vers `/`.

### Reprise de session

Au montage de `AuthProvider` :

1. `getAccessToken()` lit `localStorage.accessToken`.
2. Sans token, `isLoading` passe à `false`.
3. Avec token, l’utilisateur stocké est affiché immédiatement s’il existe.
4. `authService.getMe()` appelle `GET /api/auth/me`.
5. Le profil serveur remplace le profil local.
6. En cas d’échec, `clearTokens()` supprime tokens et utilisateur.

### Déconnexion et renouvellement

- `AuthContext.logout` appelle `POST /api/auth/logout`, puis nettoie la session même si l’appel échoue.
- L’intercepteur Axios de `services/api.ts` ajoute `Authorization: Bearer <accessToken>` à chaque requête.
- Sur `401`, hors login/refresh/logout, il appelle `/api/auth/refresh`.
- Une file `failedQueue` évite plusieurs refresh simultanés.
- Si le refresh échoue ou si le refresh token est absent, la session est supprimée et le navigateur est redirigé vers `/login`.

### Autorisations

Les rôles sont chargés dans `UtilisateurDTO.roles` et utilisés par les écrans administratifs, notamment `Utilisateurs.tsx`. `ProtectedRoute` protège l’authentification, mais la protection par rôle est principalement appliquée dans les interfaces et validations de pages ; il ne s’agit pas d’un garde global distinct dans le routeur. Le backend reste l’autorité finale.

## 6. Modules fonctionnels

## 6.1 Tableau de bord et finances

### Fichiers

- `pages/dashboard/Dashboard.tsx`
- `pages/dashboard/Graphiques.tsx`
- `pages/finances/Finances.tsx`
- `services/statistiqueService.ts`
- `types/tableau-bord.ts`

### Fonctionnement

1. `Dashboard` initialise les dates et les filtres appliqués.
2. `charger` appelle `statistiqueService.tableauBord`.
3. Le service exécute `GET /api/statistiques/tableau-bord` avec `dateDebut` et `dateFin`.
4. Les KPI, répartitions, séries mensuelles, alertes et dossiers récents sont stockés dans `stats`.
5. `Graphiques.tsx` rend `Section`, `BarresRepartition`, `Donut`, `GraphiqueMensuel` et `Jauge`.
6. L’utilisateur peut appliquer une période, la réinitialiser ou naviguer depuis les cartes KPI.
7. Une période incohérente (`dateDebut > dateFin`) est refusée côté client.

`Finances.tsx` utilise le même service et le même tableau de bord, mais rend les montants financiers, répartitions et synthèses spécifiques.

`pages/patrimoine/Patrimoine.tsx` est actuellement une page d’accueil informative : elle indique que le module patrimoine est en cours de développement. Les écrans opérationnels correspondants sont ceux de `pages/suivi/terrain`.

## 6.2 Suivi des demandes et dossiers

### Fichiers principaux

- `pages/demandes/SuiviDossier.tsx` : vue d’entrée du suivi.
- `pages/demandes/Demandes.tsx` : liste, filtres, pagination locale et import.
- `pages/demandes/DemandeForm.tsx` : création/modification.
- `pages/demandes/DetailDemande.tsx` : détail, suivi, audit et export.
- `pages/demandes/DocumentsDemandeur.tsx` : documents d’un demandeur.
- `pages/demandes/GestionEtapes.tsx` : référentiel des étapes.
- `pages/demandes/GestionTypesDossier.tsx` : types de dossier et dossiers fournis.

### Services et endpoints

`services/dossierService.ts` appelle notamment :

- `GET /dossiers`, `/dossiers/search`, `/dossiers/{id}`;
- `POST /dossiers`, `PUT /dossiers/{id}`, `DELETE /dossiers/{id}`;
- `GET /dossiers/etapes`, `POST/PUT/DELETE /dossiers/etapes/{id}`;
- `GET /dossiers/statuts`, `/dossiers/statuts-couleur`, `/dossiers/stats`;
- `POST /dossiers/{id}/suivi`, `DELETE /dossiers/{id}/suivi/{idSuivi}`;
- `GET /dossiers/{id}/historique`, `/dossiers/{id}/modifications`;
- `GET /dossiers/{id}/pdf`;
- recherches de propriétés, parcelles, demandeurs et prix par ville.

`referentielDossierService.ts` gère les lieux, types de dossier et dossiers fournis :

- `/lieux`, `/lieux/ville/{id}`, `/lieux/{id}`;
- `/types-dossier`, `/types-dossier/{id}`;
- `/dossiers-fournis`, `/dossiers-fournis/{id}`.

### Liste et filtres

`Demandes.tsx` charge jusqu’à 500 dossiers via `dossierService.lister(0, 500)`, puis applique côté client :

- texte libre sur dossier, demandeurs et parcelles ;
- statut ;
- ville ;
- année ;
- dates début/fin.

La liste filtrée est découpée localement par blocs de 15. Les lieux absents des parcelles sont complétés par des appels à `proprieteService.trouverParId`.

### Création et modification

`DemandeForm.tsx` compose un `DemandeDossierRequest` avec :

- informations du dossier ;
- ville ;
- type et pièce fournie ;
- demandeurs ;
- parcelles ;
- documents en attente.

Les recherches de demandeurs, propriétés, parcelles et prix utilisent `dossierService`, `personService`, `proprieteService` et `parcelleService`. La soumission appelle `dossierService.creer` ou `modifier`, puis envoie les documents via `documentDemandeurService`.

### Détail et progression

`DetailDemande.tsx` :

- charge le dossier ;
- charge les références de propriétés et prix ;
- affiche les parcelles et demandeurs ;
- exporte le PDF via `dossierService.exporterPdf` ;
- enregistre une étape via `enregistrerEtape` ;
- supprime une étape via `supprimerEtape` ;
- affiche l’historique via `historique` et `listerModifications`.

Les étapes réalisées sont comparées aux étapes du référentiel pour calculer l’avancement affiché.

## 6.3 Patrimoine foncier

### Fichiers

- `pages/patrimoine/Patrimoine.tsx`
- `pages/suivi/SuiviTerrain.tsx`
- `pages/suivi/terrain/GestionVille.tsx`
- `GestionLieu.tsx`
- `GestionPropriete.tsx`
- `DetailPropriete.tsx`
- `GestionPrixM2.tsx`
- `DetailPrixM2.tsx`
- `GestionParcelle.tsx`

### Services

`services/terrainService.ts` centralise :

- villes : `/villes`, `/villes/all`, `/villes/search`, CRUD ;
- propriétés : `/proprietes`, recherche, filtrage par ville, CRUD, historique et dossiers ;
- types de propriété : `/types-propriete` et `/types-propriete/par-defaut` ;
- prix au m² : `/prix-m2`, par ville, CRUD et historique ;
- parcelles : `/parcelles`, par propriété, CRUD.

### Fonctionnement commun des écrans de gestion

Les écrans de gestion utilisent un état local pour :

- la page et la taille de pagination ;
- la recherche et les filtres ;
- les données affichées ;
- la modale active ;
- l’état de chargement ;
- les messages toast.

Les opérations CRUD suivent le cycle :

```text
Ouverture page → chargement service → état local
→ ouverture modal → validation formulaire
→ service creer/modifier/supprimer
→ toast → rechargement de la liste
```

`GestionPropriete.tsx` est le plus riche : filtres ville, numéro, localisation et superficie ; chargement parallèle des villes, lieux et types ; création/modification ; suppression ; navigation vers le détail.

`DetailPropriete.tsx` ajoute :

- parcelles de la propriété ;
- prix au m² ;
- dossiers rattachés ;
- historique d’audit ;
- superficie restante calculée à partir des données serveur.

La gestion des lieux et villes est utilisée par les formulaires de propriétés et de prix.

## 6.4 Carte interactive

### Fichiers

- `pages/carte/Carte.tsx`
- `pages/carte/GestionCouches.tsx`
- `pages/carte/PanneauDessin.tsx`
- `pages/carte/PanneauCoordonnees.tsx`
- `pages/carte/RechercheCarte.tsx`
- `pages/carte/carteLayers.ts`
- `pages/carte/carteHelpers.ts`
- `pages/carte/carteTypes.ts`
- `components/SelecteurEntiteCarte.tsx`
- `components/MiniMap.tsx`

### Chargement et rendu

1. `Carte.tsx` crée la carte Leaflet centrée sur Antananarivo.
2. Les groupes Leaflet sont créés pour chaque couche.
3. `geometrieService.lister` appelle `GET /api/geometries`.
4. `coucheDe` classe les géométries dans les couches métier.
5. `ajouterGeometrie` parse le GeoJSON, applique les styles, crée les popups et enregistre chaque layer dans `layersRef`.
6. Un clic sur une géométrie ou une recherche déclenche le zoom et l’ouverture de la popup.

Les popups sont produites par `carteLayers.ts` et affichent identité, superficie, source, dates, utilisateur, coordonnées WGS84 et conversion Laborde. Le bouton Copier utilise l’API Clipboard puis un fallback `execCommand`.

### Dessin

`PanneauDessin.tsx` pilote l’interface ; `Carte.tsx` conserve l’état :

- `modeDessin` : aucun, point ou polygone ;
- `pointsDessin` ;
- `superficieDessin` ;
- cible sélectionnée ;
- remplacement de géométrie.

Un clic carte ajoute un point. `geojsonDessin` produit un GeoJSON Point ou Polygon. `turf.area` calcule la superficie du polygone. L’enregistrement appelle `POST /api/geometries`, puis recharge la carte et zoome sur la géométrie créée.

### Coordonnées manuelles

`PanneauCoordonnees.tsx` accepte Point, Polygon ou LineString. `parserPoints` accepte les paires séparées par virgule, point-virgule ou espaces. Le format est `auto`, `latlon`, `lonlat` ou `laborde`.

La validation vérifie :

- présence d’au moins une paire ;
- une seule paire pour un point ;
- au moins trois points pour une ligne ou un polygone ;
- présence d’une entité cible ;
- format déterminé.

L’enregistrement appelle `POST /api/geometries/coordonnees`.

### Sélection d’entité

`SelecteurEntiteCarte.tsx` :

- recherche avec debounce de 250 ms via `GET /geometries/entites-cibles` ;
- filtre les entités sans géométrie par défaut ;
- accepte directement un UUID pour `dossier_parcelle` ;
- permet de créer une propriété ou une parcelle depuis une modale ;
- réutilise `lieuService`, `typeProprieteService`, `proprieteService` et `parcelleService`.

## 6.5 Notifications d’occupation, avertissements et suivis

### Notifications d’occupation

Fichiers :

- `notification/NotificationOccupation.tsx`
- `notification/NotificationOccupationForm.tsx`
- `notification/DetailNotificationOccupation.tsx`
- `services/notificationService.ts`

Endpoints :

- `GET /notifications`, `/notifications/search`, `/notifications/{id}`;
- `GET /notifications/statut/{statut}`;
- `POST /notifications`, `PUT /notifications/{id}`, `DELETE /notifications/{id}`;
- `GET /notifications/{id}/historique`;
- `GET /notifications/{id}/derniere-modification`.

La liste recherche et pagine. Le formulaire gère création/édition et sélection de personnes. Le détail charge aussi les suivis associés, et peut naviguer vers un suivi.

### Avertissements

Fichiers :

- `avertissement/Avertissement.tsx`
- `avertissement/AvertissementForm.tsx`
- `avertissement/DetailAvertissement.tsx`
- `services/avertissementService.ts`

Les opérations couvrent liste, recherche, filtrage par année/personne, CRUD et historique. Les endpoints sont `/avertissements`, `/avertissements/search`, `/avertissements/annee/{annee}`, `/avertissements/personne/{idPersonne}`, `/avertissements/{id}` et `/avertissements/{id}/historique`.

### Suivi de notification

Fichiers :

- `suivi/SuiviNotificationsHub.tsx`
- `suivi/SuiviNotifications.tsx`
- `suivi/SuiviForm.tsx`
- `suivi/GestionEtapesNotification.tsx`
- `notification/DetailSuiviNotification.tsx`
- `services/suiviNotificationService.ts`

Le service gère :

- référentiel `/suivis/etapes` ;
- liste et recherche `/suivis`, `/suivis/search` ;
- lien avec une notification `/suivis/by-notification/{id}` ;
- CRUD `/suivis/{id}` ;
- historique `/suivis/{id}/historique`.

`SuiviForm` vérifie la notification et les champs obligatoires avant création/modification. Les navigations transmettent parfois un toast via `location.state`, consommé par la page de liste.

### Hub et import Excel

`pages/suivi-notifications/suivi/SuiviNotificationsHub.tsx` est la page d’entrée du domaine. Elle fournit les liens vers les sous-modules et l’import Excel des notifications et avertissements.

Le fichier est contrôlé côté client avant upload :

- extension `.xlsx` ou `.xls` ;
- taille maximale de 50 MB ;
- fichier non vide.

`importService.importerExcel` envoie le fichier en `multipart/form-data` vers `POST /api/import/excel`. Le callback `onUploadProgress` met à jour la progression. Le résultat affiche le nombre de lignes traitées et les erreurs retournées.

## 6.6 Personnes et documents

### Personnes

Fichiers :

- `personne/GestionPersonne.tsx`
- `personne/CreatePersonne.tsx`
- `personne/DetailPersonne.tsx`
- `services/personService.ts`

Le service appelle les types, listes, recherches générales, recherche par nom, recherche par rôle, détail, CRUD et historique :

```text
/personnes/types
/personnes
/personnes/search
/personnes/search/nom
/personnes/role/{role}
/personnes/{id}
/personnes/{id}/historique
/personnes/{id}/derniere-modification
```

`CreatePersonne.tsx` utilise `PersonneDocumentsPicker.tsx`. Les fichiers sélectionnés sont conservés dans `DocumentEnAttente`, puis envoyés après création de la personne par `documentDemandeurService`.

### Documents

`pages/demandes/DocumentsDemandeur.tsx` et `components/PersonneDocumentsPicker.tsx` gèrent :

- types de documents ;
- filtrage image/PDF ;
- taille lisible ;
- upload multipart via `POST /personnes-documents` ;
- consultation via `GET /personnes-documents/{id}/contenu` ;
- suppression via `DELETE /personnes-documents/{id}`.

Les URLs de Blob sont créées avec `URL.createObjectURL` pour l’aperçu ou le téléchargement.

## 6.7 Assignations

Fichiers :

- `assignation/Assignations.tsx`
- `assignation/AssignationForm.tsx`
- `assignation/DetailAssignation.tsx`
- `services/assignationService.ts`

Le service utilise :

- `GET /signalements/assignations`;
- `GET /signalements/assignations/{id}`;
- `GET /signalements/{idSignalement}/assignations`;
- POST/DELETE d’assignation vers une notification ou un avertissement.

Les formulaires sélectionnent le signalement et la cible, puis rafraîchissent la liste ou le détail.

## 6.8 Gestion mobile : hub, descentes terrain et signalements

`pages/gestion-mobile/descente/GestionMobile.tsx` est un hub de navigation vers `/signalements` et `/descentes-terrain`. Il n’appelle pas d’API : il présente les deux flux remontés par l’application mobile.

Fichiers :

- `gestion-mobile/descente/GestionMobile.tsx`
- `DescentesTerrain.tsx`
- `DescenteTerrainForm.tsx`
- `DetailDescenteTerrain.tsx`
- `types/descente.ts`
- `services/descenteTerrainService.ts`

### Flux

1. La liste appelle `GET /descentes-terrain` ou `/search`.
2. Les filtres secondaires (statut, validation, dates) sont appliqués côté client.
3. La création/modification utilise `POST` ou `PUT /descentes-terrain`.
4. Le formulaire impose notamment la date et le statut du constat.
5. Le détail charge `/descentes-terrain/{id}` et `/historique-statuts`.
6. Le PDF est obtenu avec `/descentes-terrain/{id}/pdf` en `Blob`.

Les statuts métier autorisés sont centralisés dans `types/descente.ts` :

- constat : `Faisable`, `Non faisable`, `Sous réserve` ;
- validation : `Bon pour la suite`, `En instance`.

## 6.9 Signalements

Fichiers :

- `gestion-mobile/signalements/Signalements.tsx`
- `SignalementForm.tsx`
- `DetailSignalement.tsx`
- `services/signalementService.ts`
- `types/signalement.ts`

### Liste

`Signalements.tsx` charge les types, statuts et pages de signalements. Il offre recherche, filtres, suppression et navigation vers détail/création.

### Formulaire

`SignalementForm.tsx` :

- charge types, statuts, villes et propriétés ;
- recharge les parcelles lorsqu’une propriété change ;
- accepte une propriété manuelle pour le contexte mobile ;
- compose la description avec `composerDescriptionAvecProprieteManuelle` ;
- envoie les nouvelles photos après création/modification.

### Détail

`DetailSignalement.tsx` charge :

- le signalement ;
- la géométrie via `signalementService.geometrie` ;
- la parcelle liée ;
- les photos ;
- l’historique ;
- la carte `MiniMap`.

Les opérations métier utilisent :

- `POST /signalements` ;
- `PUT /signalements/{id}` ;
- `POST /signalements/{id}/traitement` pour le changement de statut ;
- `DELETE /signalements/{id}` ;
- `GET /signalements/{id}/historique`.

La propriété mobile est encodée dans la description avec le préfixe `[Propriété : ...]`, géré uniquement par `utils/proprieteManuelle.ts`.

## 6.10 Administration, rôles, sessions, audit et journal

### Utilisateurs

`pages/utilisateurs/Utilisateurs.tsx` propose liste paginée, recherche, création, édition, activation/désactivation, suppression, réinitialisation de mot de passe et gestion des rôles.

`services/utilisateurService.ts` appelle :

- `/utilisateurs` ;
- `/utilisateurs/{id}` ;
- `/utilisateurs/{id}/activer` ;
- `/utilisateurs/{id}/reinitialiser-mot-de-passe` ;
- `/utilisateurs/{id}/roles`.

Les validations de formulaire couvrent identifiant, mot de passe, confirmation et longueur minimale.

### Rôles

`pages/roles/Roles.tsx` utilise `roleService` pour les rôles, permissions, modules, entités et actions RBAC :

```text
/roles
/roles/{id}
/roles/permissions
/roles/{id}/permissions
/roles/modules
/roles/entites
/roles/actions
```

Les associations rôle-permission sont ajoutées ou retirées depuis la page.

### Administration

- `pages/admin/Admin.tsx` regroupe l’accès aux fonctions administratives.
- `pages/journal/Journal.tsx` utilise `adminService` et `/admin/journal`.
- `pages/sessions/Sessions.tsx` utilise `/admin/sessions`, la révocation et l’expiration.
- `pages/audit/Audit.tsx` utilise `/admin/audit` et `/admin/audit/stats`.

### Corbeille

`pages/corbeille/Corbeille.tsx` utilise `corbeilleService` :

- `GET /corbeille/{id}` ;
- `GET /corbeille/stats` ;
- `GET /corbeille/count` ;
- `POST /corbeille/{id}/restaurer` ;
- `DELETE /corbeille/{id}`.

`Layout.tsx` recharge le compteur lors des changements de route et écoute l’événement global `corbeille:refresh`.

## 7. Services API et communication backend

Tous les services importent l’instance Axios de `services/api.ts`. Le barrel `services/index.ts` fournit une API d’import homogène aux pages.

| Service | Domaine principal |
|---|---|
| `authService` | login, refresh, profil, mot de passe |
| `utilisateurService` | utilisateurs et rôles affectés |
| `roleService` | RBAC |
| `adminService` | journal, sessions, audit |
| `dossierService` | demandes, étapes, suivi, PDF |
| `terrainService` | villes, lieux, propriétés, prix, parcelles |
| `referentielDossierService` | lieux, types dossier, pièces |
| `personService` | personnes |
| `documentDemandeurService` | fichiers personnes |
| `notificationOccupationService` | notifications d’occupation |
| `avertissementService` | avertissements |
| `suiviNotificationService` | suivis et étapes |
| `assignationService` | assignations aux signalements |
| `signalementService` | signalements, géométrie, photos |
| `descenteTerrainService` | descentes terrain |
| `geometrieService` | carte et géométries |
| `photoService` | fichiers photo |
| `importService` | imports Excel |
| `statistiqueService` | tableau de bord |
| `corbeilleService` | éléments supprimés |

Les types correspondants se trouvent dans `src/types/`. `types/index.ts` sert de barrel de DTO, ce qui évite aux pages de dépendre directement de chaque fichier de type.

## 8. Gestion des états, erreurs et notifications

### États React

Les pages utilisent principalement :

- `useState` pour données, filtres, formulaires, modales et messages ;
- `useEffect` pour chargements initiaux et rechargements déclenchés par filtres ;
- `useCallback` pour stabiliser les fonctions de chargement ;
- `useMemo` pour totaux, résultats filtrés et valeurs dérivées ;
- `useRef` pour inputs fichier, cartes Leaflet et timers ;
- `useContext` via `useAuth` pour la session.

Le serveur reste la source de vérité ; les listes locales sont rechargées après les mutations.

### Erreurs

- `utils/erreurs.ts` expose `msgErreur` pour extraire les messages Axios/backend.
- Plusieurs pages affichent un toast rouge ou une erreur inline.
- Les services propagent les erreurs HTTP ; les pages décident du texte utilisateur.
- Les erreurs de référentiels secondaires sont parfois tolérées pour permettre à la page principale de rester utilisable.

### Toast

`hooks/useToast.ts` centralise désormais l’état et le timer des notifications temporaires. Il annule le timer précédent et nettoie le timer au démontage. Il est déjà utilisé par les écrans de gestion terrain.

### Validations

Les validations sont majoritairement dans les composants de formulaire :

- champs obligatoires ;
- longueur minimale des mots de passe ;
- cohérence dates ;
- nombres positifs et superficies ;
- présence d’une relation (propriété, parcelle, personne, notification) ;
- nombre et format de coordonnées ;
- extensions et types de fichiers ;
- UUID de parcelle de dossier.

Les validations métier définitives restent côté backend.

## 9. Relations entre composants

### Hiérarchie principale

```text
App
└── BrowserRouter
    └── AuthProvider
        └── AppRoutes
            └── ProtectedRoute
                └── Layout
                    └── Outlet
                        └── Page métier
                            ├── composant de formulaire/modal
                            ├── service API
                            └── types DTO
```

### Exemple : création d’une propriété depuis la carte

```text
Carte
└── PanneauDessin
    └── SelecteurEntiteCarte
        └── ModaleCreationEntite
            └── FormulairePropriete
                └── proprieteService.creer()
                    └── onEntiteCreee()
                        └── Carte.enregistrerGeometrie()
                            └── geometrieService.enregistrer()
```

### Exemple : signalement

```text
SignalementForm
├── signalementService.listerTypes/listerStatuts
├── villeService / proprieteService / parcelleService
├── photoService
└── signalementService.creer/modifier
    └── photoService.enregistrer

DetailSignalement
├── signalementService.trouverParId
├── signalementService.geometrie
├── signalementService.historique
├── signalementService.parcelle
├── photoService.lister
└── MiniMap
```

## 10. Organisation, problèmes identifiés et refactorisations

### Refactorisations déjà effectuées

1. **Carte interactive**
   - `Carte.tsx` a été séparé en panneaux, recherche, gestion des couches, helpers, types et rendu Leaflet.
   - Le comportement de dessin, recherche, popup, zoom, superficie et conversion est conservé.

2. **Routage**
   - Le routage a été extrait vers `routes/AppRoutes.tsx`.
   - `App.tsx` est désormais limité à la composition racine.

3. **Notifications toast**
   - `hooks/useToast.ts` évite la duplication des timers et garantit leur nettoyage.
   - Le hook a été appliqué aux écrans terrain.

4. **Chemins des signalements**
   - Les écrans ayant été regroupés sous `pages/gestion-mobile/signalements`, les imports et routes ont été alignés sur l’arborescence réelle.

### Points de maintenance identifiés

- `Demandes.tsx`, `DemandeForm.tsx`, `GestionPropriete.tsx`, `GestionPersonne.tsx` et `Utilisateurs.tsx` concentrent beaucoup d’états, modales et traitements.
- Plusieurs pages répètent encore les mêmes structures de liste, pagination, confirmation, toast et chargement.
- Certains filtres sont appliqués côté client après chargement d’un volume important, notamment les demandes et les descentes terrain.
- Les types DTO sont bien centralisés, mais certains services contiennent encore des types de requête locaux et des réponses peu explicites.
- Le lint signale des mises à jour d’état synchrones dans des effets et quelques dépendances de hooks à surveiller.
- Les imports restent relatifs et peuvent devenir fragiles lors d’un déplacement de dossiers.
- Le bundle Vite est supérieur à 500 kB minifié ; une séparation par chargement différé pourrait améliorer le démarrage, mais changerait la stratégie de chargement.
- Aucun script de tests automatisés n’est déclaré dans `package.json`.

### Refactorisations à privilégier ensuite

Ces changements doivent rester progressifs :

1. extraire les composants de modales des pages les plus volumineuses ;
2. standardiser les listes paginées sans masquer les règles métier ;
3. centraliser les composants de confirmation et de feedback ;
4. ajouter des tests ciblés sur les helpers, validations et flux critiques ;
5. introduire le lazy loading des routes seulement après vérification des contraintes de déploiement ;
6. remplacer progressivement les imports relatifs par un alias TypeScript si le build Spring/Vite le permet.

## 11. Guide pour modifier ou ajouter une fonctionnalité

### Ajouter un endpoint

1. Ajouter ou compléter le DTO dans `src/types/<domaine>.ts`.
2. Ajouter la méthode dans le service métier correspondant à `src/services`.
3. Réexporter le service ou le type dans les barrels si nécessaire.
4. Appeler le service depuis une page ou un hook de domaine.
5. Gérer explicitement chargement, erreur, succès et rechargement.
6. Ne pas appeler Axios directement depuis un composant si le service existant couvre déjà le domaine.

### Ajouter une page

1. Créer la page dans le dossier du domaine.
2. Ajouter la route dans `src/routes/AppRoutes.tsx`.
3. Ajouter le lien de navigation dans `components/Layout.tsx` si elle doit apparaître dans la barre latérale.
4. Réutiliser les types et services existants.
5. Protéger les mutations par validation locale et laisser le backend valider les règles finales.

### Modifier un formulaire

Vérifier systématiquement :

- le type de requête envoyé ;
- les champs conditionnels ;
- la conversion string/nombre/date ;
- le comportement création versus édition ;
- le rechargement des référentiels ;
- les messages de succès et d’erreur ;
- les fichiers ou relations associés ;
- les routes de retour après sauvegarde.

### Modifier une fonctionnalité cartographique

Respecter la séparation :

- orchestration et état : `pages/carte/Carte.tsx` ;
- affichage des panneaux : composants `Panneau*`, `RechercheCarte`, `GestionCouches` ;
- rendu Leaflet et popup : `carteLayers.ts` ;
- parsing, formatage et conversion : `carteHelpers.ts` ;
- types spécifiques : `carteTypes.ts`.

## 12. Vérification et limites de l’analyse

L’inventaire a été réalisé sur le code présent dans `src/`, comprenant les pages, composants, contextes, services, types, hooks et utilitaires. Les contrats backend sont documentés à partir des chemins effectivement appelés par les services frontend ; les règles exécutées exclusivement par Spring Boot ne peuvent pas être déduites au-delà des types, validations et libellés présents côté client.

Commandes de validation recommandées après toute refactorisation :

```powershell
npm run build
npm run lint
```

Le projet ne déclare actuellement aucun script `test`. Les tests à ajouter en priorité concernent `utils/proprieteManuelle.ts`, `utils/erreurs.ts`, les helpers de carte, les validations de formulaires et les transformations de filtres.
