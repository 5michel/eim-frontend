Mets à jour la maquette existante d'EIM (Efficient Issues Manager) pour qu'elle
reflète la nouvelle configuration du système décrite ci-dessous. Cette version
remplace intégralement les hypothèses de la maquette précédente sur les rôles,
le modèle de données et le périmètre fonctionnel — ne les mélange pas.

> ⚠️ Le code source généré doit être réellement câblé à une API REST (Axios +
> intercepteurs + AuthContext + hooks par ressource), pas seulement des
> tableaux mockés en dur dans les composants. Voir section "Architecture
> technique" ci-dessous — c'est la partie la plus importante de ce prompt.

════════════════════════════════════════
RÔLES (4 — remplacent intégralement l'ancien modèle à 3 rôles)
════════════════════════════════════════

- **Client** : signale des incidents, les suit, les modifie tant qu'ils ne
  sont pas pris en charge, commente, clôture.
- **Agent** : exécute les incidents qui lui sont assignés (« prestations »),
  peut accepter/refuser une assignation, commente, produit des rapports de
  résolution et des articles de connaissance. Peut être `disponible` ou non.
- **Manager** : prend en charge les incidents signalés (« gestions »),
  affecte un agent ou une équipe, peut passer un incident à un autre manager,
  réassigner l'agent, lancer la clôture. Peut être `disponible` ou non.
- **Administrateur** : tout ce que peuvent faire Manager et Agent, plus la
  gestion des comptes, équipes, actifs, SLA, matrice de priorité, et
  l'assignation forcée (outrepasse la disponibilité).

════════════════════════════════════════
MODÈLE DE DONNÉES (résumé — pour que les objets mockés et les types
correspondent exactement à ce que l'API réelle renverra)
════════════════════════════════════════

**User** : id, nom, prenom, email, role (admin|manager|agent|client), actif
(bool), disponible (bool, managers/agents seulement), id_equipe (nullable),
date_derniere_connexion.

**Incident** : id, num_id (ex. "INC-2026-0042"), date_creation,
date_prise_en_charge, date_cloture, demandeur_id, statut (ouvert | en_cours |
resolu | en_attente_cloture | cloture), mots_clefs (array), description,
resume, actif_concerne_id, impact_id, urgence_id, priorite_id, sla_id,
delai_reponse, delai_resolution.

**GestionIncident** : id, incident_id, manager_id, date_debut, date_fin,
active (bool — une seule ligne active par incident), motif.

**Prestation** : id, incident_id, prestataire_id (agent), equipe_id
(nullable, si assignation par équipe), date_debut, date_fin, active (bool),
commentaire.

**Impact / Urgence** : id, nom (ex. "Faible", "Élevé"), valeur (entier).
**Priorite** : id, nom (ex. "Critique"), valeur (= produit Impact × Urgence).
Exemple de mapping à utiliser pour les données mockées :

| Impact × Urgence (valeur) | Priorité |
|---|---|
| 1 | Basse |
| 2 | Basse |
| 3 | Moyenne |
| 4 | Moyenne |
| 6 | Haute |
| 9 | Critique |

**SLA** : id, nom, priorite_id, temps_reponse (minutes), temps_resolution
(minutes). Exemple de mock :

| Priorité | Temps de réponse | Temps de résolution |
|---|---|---|
| Basse | 240 min (4h) | 2880 min (48h) |
| Moyenne | 120 min (2h) | 1440 min (24h) |
| Haute | 60 min (1h) | 480 min (8h) |
| Critique | 15 min | 240 min (4h) |

**Actif** : id, nom, type, description, proprietaire_id, statut (actif |
hors_service | maintenance).

**Equipe** : id, nom, description, membres (Users de rôle agent).

**Commentaire** : id, incident_id, auteur_id, contenu, est_interne (bool —
invisible pour le client si vrai).

**Notification** : id, destinataire_id, type, message, lien, date_lecture
(nullable), supprimee (bool).

**ArticleConnaissance** : id, titre, contenu, mots_clefs, auteur_id, statut
(brouillon | publie | archive), actifs liés (many-to-many).

**RapportResolution** : incident_id, auteur_id, cause_racine,
solution_apportee, actions_prises.

**RapportPrestation** : incident_id, prestataire_id, commentaires,
actions_menees, cause_racine, solution_apportee, documents_lies.

════════════════════════════════════════
ARCHITECTURE TECHNIQUE (obligatoire — c'est le point le plus important)
════════════════════════════════════════

N'écris pas de données mockées directement dans les composants. Construis une
vraie couche service :

**`src/services/api.js`** — instance Axios pointant vers
`import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'`, avec :
- un intercepteur de requête qui ajoute `Authorization: Bearer <token>`
  depuis `localStorage`
- un intercepteur de réponse qui déconnecte automatiquement sur 401

**`src/context/AuthContext.jsx`** — expose `{ user, token, login, logout }`,
`login(email, password)` appelle `POST /login`, stocke le token, redirige
selon `user.role`.

**Un hook par ressource** (`useIncidents`, `useUsers`, `useEquipes`,
`useActifs`, `useArticles`, `useNotifications`, `useSlas`, etc.), chacun
exposant au minimum `{ data, loading, error }` + les mutations pertinentes
(`create`, `update`, `remove`, actions spécifiques comme
`prendreEnCharge(id)`, `reassigner(id, agentId)`), qui appellent les
endpoints listés ci-dessous.

**Mock Service Worker (MSW)** : comme l'aperçu Figma Make n'a pas de backend
réel, mets en place des handlers MSW qui interceptent exactement ces mêmes
routes `/api/v1/...` et renvoient les données mockées définies plus haut,
avec les mêmes formes de réponse (`{ success, data, message }`, pagination
`{ data, links, meta }`). Le code applicatif (composants, hooks, services)
ne doit connaître aucune différence entre "mode maquette" et "mode connecté
au vrai backend" — seul le fait que MSW soit activé ou non change.

**Endpoints à respecter exactement** (extrait, respecte les méthodes HTTP et
les chemins tels quels) :

| Méthode | Endpoint | Usage |
|---|---|---|
| POST | `/login` | Authentification, retourne `{ token, user }` |
| POST | `/logout` | Déconnexion |
| GET | `/incidents` | Liste (filtres `statut`, `priorite_id`, `equipe_id`, `date_debut`, `date_fin`, `search`, `page`, `per_page`) |
| POST | `/incidents` | Créer (Client) |
| GET | `/incidents/{id}` | Détail complet |
| PUT | `/incidents/{id}` | Modifier (Client avant prise en charge ; Manager/Admin) |
| POST | `/incidents/{id}/prise-en-charge` | Manager prend en charge |
| POST | `/incidents/{id}/passer` | Manager transfère à un autre manager |
| POST | `/incidents/{id}/reassigner` | Manager réassigne l'agent |
| POST | `/incidents/{id}/assigner-force` | Admin, outrepasse la disponibilité |
| POST | `/incidents/{id}/cloturer` | Manager lance la demande de clôture |
| POST | `/incidents/{id}/cloture-utilisateur` | Client clôture définitivement |
| GET/POST | `/incidents/{id}/commentaires` | Commentaires |
| GET/POST | `/incidents/{id}/rapport-resolution` | Rapport de résolution |
| GET/POST | `/incidents/{id}/rapport-prestation` | Rapport de prestation |
| GET | `/users`, POST/PUT/DELETE `/users/{id}` | CRUD utilisateurs (admin) |
| PUT | `/users/{id}/disponibilite` | Bascule disponibilité |
| PUT | `/users/{id}/activer` | Active/désactive un compte |
| GET/PUT | `/profile` | Profil de l'utilisateur connecté |
| GET/POST/PUT/DELETE | `/equipes`, `/equipes/{id}/membres` | CRUD équipes |
| GET/POST/PUT/DELETE | `/actifs` | CRUD actifs |
| GET | `/actifs/{id}/incidents` | Incidents liés à un actif |
| GET/POST/PUT/DELETE | `/articles` | Base de connaissances |
| GET | `/notifications` | Notifications de l'utilisateur connecté |
| PUT | `/notifications/{id}/lire` | Marquer comme lue |
| DELETE | `/notifications` ou `/notifications/{id}` | Supprimer tout / une notification |
| GET | `/rapports/performance` | Rapport agrégé (admin, avec critères en query params) |
| GET/PUT | `/slas` | Configuration SLA (admin) |
| GET/POST/PUT/DELETE | `/impacts`, `/urgences`, `/priorites` | Matrice de priorité (admin) |

Codes d'erreur à respecter : 400/422 (validation, réponse
`{ success:false, message, errors:{champ:[...]} }`), 401 (non authentifié),
403 (rôle insuffisant), 404, 500.

════════════════════════════════════════
DESIGN SYSTEM
════════════════════════════════════════

Conserve le système « Meridian » déjà utilisé dans la maquette précédente :
IBM Plex Sans (UI) / IBM Plex Mono (identifiants, dates, compte à rebours
SLA), palette desaturée (cobalt comme seule couleur d'action, signaux de
statut en brique/ambre/sauge), rail de sévérité 3px sur les lignes/cartes
d'incident, pas de dégradés, ombres légères uniquement.

**Changement par rapport à la version précédente** : la cloche de
notifications revient dans le header (elle avait été explicitement exclue
avant — ce n'est plus le cas). Panneau flottant listant les notifications,
clic → marque comme lue et redirige vers `lien`, bouton croix par
notification (suppression individuelle), bouton « Tout effacer ».

════════════════════════════════════════
COMPTES DE DÉMONSTRATION (mock, via MSW)
════════════════════════════════════════

- Admin : Sophie Martin — admin, actif
- Manager : Koffi Agbeko — manager, disponible
- Manager : Ama Sena — manager, indisponible (pour tester SA1 de « Passer un incident »)
- Agent : Kofi Mensah — agent, équipe Support N1, disponible
- Agent : Ama Sarpong — agent, équipe Infrastructure, disponible
- Agent : Yao Koudjo — agent, équipe Support N1, indisponible (pour tester SA1/SA2 de « Prendre en charge »)
- Client : Jean Dupont — client, actif

════════════════════════════════════════
ÉCRANS PAR RÔLE
════════════════════════════════════════

**Communs à tous les rôles**
- Connexion (`POST /login`), avec gestion des cas SA1 (compte inactif) et SE1 (identifiants invalides)
- Activation de compte via lien d'invitation (jeton, formulaire nom/prénom/mot de passe, expire à 5h — gérer SE1 lien invalide/expiré)
- Profil (modifier ses infos, `PUT /profile`)
- Déconnexion **avec modale de confirmation** (SA1 : annulation)
- Cloche de notifications (panneau flottant, voir plus haut)

**Client**
- Tableau de bord : mes incidents (`GET /incidents` filtré sur son id)
- Signaler un incident : impact, urgence, description, actif concerné, mots-clés → priorité et délais SLA calculés et affichés après soumission → redirection vers articles de connaissance correspondant aux mots-clés (SA2 : aucun article, redirection directe vers la liste)
- Modifier un incident **tant qu'aucune `GestionIncident.active` n'existe** — au-delà, bouton désactivé avec message explicite (SE1)
- Détail d'un incident : infos, historique (gestions + prestations), commentaires (visibles = non internes), statut, priorité, SLA
- Commenter (champ vide bloqué, SA1)
- Clôturer (uniquement si statut `resolu` ou `en_attente_cloture`, confirmation requise, SA1 annulation)

**Agent**
- Tableau de bord : incidents où il a une prestation active
- Répondre à une demande de prestation : accepter/refuser une nouvelle assignation
- Détail incident (vue agent, avec accès aux commentaires internes)
- Produire un rapport de résolution (cause racine, solution, actions — bloqué si incident non résolu, SE1)
- Base de connaissances : consulter + créer un article (brouillon/publié)

**Manager**
- Tableau de bord : incidents à traiter (générale ou filtrée par équipe)
- Prendre en charge un incident : résumé + choix agent ou équipe (SA1 aucun agent dispo → proposer équipe par défaut ; SA2 équipe sans agent dispo → erreur)
- Passer un incident à un autre manager (liste des managers disponibles uniquement, SA1 cible indisponible)
- Réassigner l'agent d'un incident (liste agents/équipes disponibles, SA1 aucun agent dispo)
- Lancer la clôture (notifie le client, passe l'incident en `en_attente_cloture`)
- Produire un rapport de résolution, créer un article de connaissance (mêmes écrans que pour l'agent)

**Administrateur**
- Tout ce que voit un Manager et un Agent, plus :
- Assigner de force (choix manager ET/OU agent sans contrainte de disponibilité, SA1 si aucun des deux n'est choisi)
- Gestion des utilisateurs : créer (invitation email, lien 5h), activer/désactiver, changer la disponibilité, supprimer (bloqué si incidents actifs liés, SE1)
- Gestion des équipes : CRUD (bloqué à la suppression si prestations actives liées, SE1)
- Gestion des actifs : CRUD (bloqué à la suppression si incidents ouverts liés, SE1)
- Configuration SLA : temps de réponse/résolution par priorité (validation temps_resolution ≥ temps_reponse)
- Configuration de la matrice de priorité : CRUD Impact/Urgence/Priorite, avec vérification de complétude (toute combinaison Impact×Urgence doit avoir une Priorité correspondante — lister les combinaisons manquantes si incomplet)
- Rapport de performance : sélection de critères (période, équipe, priorité...) → génération → export/impression

════════════════════════════════════════
CONTRAINTES QUALITÉ
════════════════════════════════════════

- Toute action destructrice ou irréversible (suppression, désactivation,
  déconnexion, assignation forcée) passe par une confirmation explicite.
- Chaque écran gère les scénarios alternatifs et d'exception listés ci-dessus
  (messages d'erreur, blocages) — ce ne sont pas des détails optionnels, ils
  font partie de la spécification.
- Pas de fonctionnalité en dehors de ce qui est listé ici (pas de chat en
  direct, pas de facturation, pas d'intégrations tierces).
- Toutes les listes sont paginées (`page`, `per_page`), format de réponse
  respecté tel que documenté plus haut.
- Formulaires : validation React Hook Form + affichage des erreurs
  `422` renvoyées par l'API sous chaque champ concerné.