export type Role = 'admin' | 'manager' | 'agent' | 'client';
export type IncidentStatut = 'ouvert' | 'en_cours' | 'resolu' | 'en_attente_cloture' | 'cloture';
export type ActifStatut = 'actif' | 'hors_service' | 'maintenance';
export type ArticleStatut = 'brouillon' | 'publie' | 'archive';

export interface User {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: Role;
  actif: boolean;
  disponible: boolean;
  id_equipe: string | null;
  date_derniere_connexion: string;
}

export interface Impact {
  id: string;
  nom: string;
  valeur: number;
}

export interface Urgence {
  id: string;
  nom: string;
  valeur: number;
}

export interface Priorite {
  id: string;
  nom: string;
  valeur: number;
}

export interface SLA {
  id: string;
  nom: string;
  priorite_ids: string[];
  temps_reponse: number;
  temps_resolution: number;
}

export interface Equipe {
  id: string;
  nom: string;
  description: string;
  membres: string[];
}

export interface Actif {
  id: string;
  nom: string;
  type: string;
  description: string;
  proprietaire_id: string | null;
  statut: ActifStatut;
}

export interface Incident {
  id: string;
  num_id: string;
  date_creation: string;
  date_prise_en_charge: string | null;
  date_cloture: string | null;
  demandeur_id: string;
  statut: IncidentStatut;
  mots_clefs: string[];
  description: string;
  resume: string | null;
  actif_concerne_id: string | null;
  impact_id: string;
  urgence_id: string;
  priorite_id: string;
  sla_id: string;
  delai_reponse: number;
  delai_resolution: number;
}

export interface GestionIncident {
  id: string;
  incident_id: string;
  manager_id: string;
  date_debut: string;
  date_fin: string | null;
  active: boolean;
  motif: string | null;
}

export interface Prestation {
  id: string;
  incident_id: string;
  prestataire_id: string;
  equipe_id: string | null;
  date_debut: string;
  date_fin: string | null;
  active: boolean;
  commentaire: string | null;
}

export interface Commentaire {
  id: string;
  incident_id: string;
  auteur_id: string;
  contenu: string;
  est_interne: boolean;
  date_creation: string;
}

export interface Notification {
  id: string;
  destinataire_id: string;
  type: string;
  message: string;
  lien: string;
  date_lecture: string | null;
  supprimee: boolean;
}

export interface ArticleConnaissance {
  id: string;
  titre: string;
  contenu: string;
  mots_clefs: string[];
  auteur_id: string;
  statut: ArticleStatut;
  actifs_lies: string[];
  date_creation: string;
}

export interface RapportResolution {
  incident_id: string;
  auteur_id: string;
  cause_racine: string;
  solution_apportee: string;
  actions_prises: string;
}

export interface RapportPrestation {
  incident_id: string;
  prestataire_id: string;
  commentaires: string;
  actions_menees: string;
  cause_racine: string;
  solution_apportee: string;
  documents_lies: string[];
}

// ─── Reference data ────────────────────────────────────────────────────────

export const users: User[] = [
  { id: 'u1', nom: 'Martin', prenom: 'Sophie', email: 'sophie.martin@eim.tg', role: 'admin', actif: true, disponible: true, id_equipe: null, date_derniere_connexion: '2026-08-15T08:23:00Z' },
  { id: 'u2', nom: 'Agbeko', prenom: 'Koffi', email: 'koffi.agbeko@eim.tg', role: 'manager', actif: true, disponible: true, id_equipe: null, date_derniere_connexion: '2026-08-15T09:10:00Z' },
  { id: 'u3', nom: 'Sena', prenom: 'Ama', email: 'ama.sena@eim.tg', role: 'manager', actif: true, disponible: false, id_equipe: null, date_derniere_connexion: '2026-08-14T17:45:00Z' },
  { id: 'u4', nom: 'Mensah', prenom: 'Kofi', email: 'kofi.mensah@eim.tg', role: 'agent', actif: true, disponible: true, id_equipe: 't1', date_derniere_connexion: '2026-08-15T09:30:00Z' },
  { id: 'u5', nom: 'Sarpong', prenom: 'Ama', email: 'ama.sarpong@eim.tg', role: 'agent', actif: true, disponible: true, id_equipe: 't2', date_derniere_connexion: '2026-08-15T08:55:00Z' },
  { id: 'u6', nom: 'Koudjo', prenom: 'Yao', email: 'yao.koudjo@eim.tg', role: 'agent', actif: true, disponible: false, id_equipe: 't1', date_derniere_connexion: '2026-08-13T16:00:00Z' },
  { id: 'u7', nom: 'Dupont', prenom: 'Jean', email: 'jean.dupont@client.tg', role: 'client', actif: true, disponible: true, id_equipe: null, date_derniere_connexion: '2026-08-15T07:12:00Z' },
];

export const equipes: Equipe[] = [
  { id: 't1', nom: 'Support N1', description: 'Support de premier niveau', membres: ['u4', 'u6'] },
  { id: 't2', nom: 'Infrastructure', description: 'Gestion infrastructure et réseau', membres: ['u5'] },
];

export const impacts: Impact[] = [
  { id: 'imp1', nom: 'Faible', valeur: 1 },
  { id: 'imp2', nom: 'Moyen', valeur: 2 },
  { id: 'imp3', nom: 'Élevé', valeur: 3 },
];

export const urgences: Urgence[] = [
  { id: 'urg1', nom: 'Faible', valeur: 1 },
  { id: 'urg2', nom: 'Moyen', valeur: 2 },
  { id: 'urg3', nom: 'Élevé', valeur: 3 },
];

export const priorites: Priorite[] = [
  { id: 'p1', nom: 'Basse', valeur: 1 },
  { id: 'p2', nom: 'Basse', valeur: 2 },
  { id: 'p3', nom: 'Moyenne', valeur: 3 },
  { id: 'p4', nom: 'Moyenne', valeur: 4 },
  { id: 'p6', nom: 'Haute', valeur: 6 },
  { id: 'p9', nom: 'Critique', valeur: 9 },
];

export const slas: SLA[] = [
  { id: 'sla1', nom: 'SLA Basse', priorite_ids: ['p1', 'p2'], temps_reponse: 240, temps_resolution: 2880 },
  { id: 'sla3', nom: 'SLA Moyenne', priorite_ids: ['p3', 'p4'], temps_reponse: 120, temps_resolution: 1440 },
  { id: 'sla6', nom: 'SLA Haute', priorite_ids: ['p6'], temps_reponse: 60, temps_resolution: 480 },
  { id: 'sla9', nom: 'SLA Critique', priorite_ids: ['p9'], temps_reponse: 15, temps_resolution: 240 },
];

export const actifs: Actif[] = [
  { id: 'a1', nom: 'Serveur Web Principal', type: 'Serveur', description: 'Héberge le site public', proprietaire_id: 'u1', statut: 'actif' },
  { id: 'a2', nom: 'Switch Réseau Salle A', type: 'Réseau', description: 'Switch Cisco salle A', proprietaire_id: 'u1', statut: 'actif' },
  { id: 'a3', nom: 'Poste Jean Dupont', type: 'Poste de travail', description: 'PC bureau', proprietaire_id: 'u7', statut: 'actif' },
  { id: 'a4', nom: 'Imprimante Direction', type: 'Périphérique', description: 'HP LaserJet', proprietaire_id: 'u1', statut: 'maintenance' },
  { id: 'a5', nom: 'Base de données RH', type: 'Logiciel', description: 'PostgreSQL 15', proprietaire_id: 'u1', statut: 'actif' },
];

// ─── Utility functions ──────────────────────────────────────────────────────

export function getPrioriteForValues(impactVal: number, urgenceVal: number): Priorite {
  const target = impactVal * urgenceVal;
  return priorites.find(p => p.valeur === target) ?? priorites[0];
}

export function getSlaForPriorite(prioriteId: string): SLA {
  return slas.find(s => s.priorite_ids.includes(prioriteId)) ?? slas[0];
}

// ─── Seed incidents ─────────────────────────────────────────────────────────

export const incidents: Incident[] = [
  {
    id: 'inc1', num_id: 'INC-2026-0001',
    date_creation: '2026-08-10T08:00:00Z', date_prise_en_charge: '2026-08-10T08:20:00Z', date_cloture: null,
    demandeur_id: 'u7', statut: 'en_cours', mots_clefs: ['réseau', 'connexion'],
    description: 'Impossible de se connecter au réseau depuis ce matin. Toutes les tentatives échouent.',
    resume: 'Problème de connectivité réseau',
    actif_concerne_id: 'a2', impact_id: 'imp3', urgence_id: 'urg3', priorite_id: 'p9', sla_id: 'sla9',
    delai_reponse: 15, delai_resolution: 240,
  },
  {
    id: 'inc2', num_id: 'INC-2026-0002',
    date_creation: '2026-08-11T10:30:00Z', date_prise_en_charge: null, date_cloture: null,
    demandeur_id: 'u7', statut: 'ouvert', mots_clefs: ['imprimante', 'impression'],
    description: "L'imprimante de la direction n'imprime plus depuis la mise à jour du pilote.",
    resume: null,
    actif_concerne_id: 'a4', impact_id: 'imp1', urgence_id: 'urg2', priorite_id: 'p2', sla_id: 'sla1',
    delai_reponse: 240, delai_resolution: 2880,
  },
  {
    id: 'inc3', num_id: 'INC-2026-0003',
    date_creation: '2026-08-12T14:00:00Z', date_prise_en_charge: '2026-08-12T14:30:00Z', date_cloture: null,
    demandeur_id: 'u7', statut: 'resolu', mots_clefs: ['email', 'messagerie', 'outlook'],
    description: 'Impossible de recevoir ou envoyer des emails depuis Outlook.',
    resume: 'Problème de messagerie Outlook',
    actif_concerne_id: null, impact_id: 'imp2', urgence_id: 'urg2', priorite_id: 'p4', sla_id: 'sla3',
    delai_reponse: 120, delai_resolution: 1440,
  },
  {
    id: 'inc4', num_id: 'INC-2026-0004',
    date_creation: '2026-08-13T09:00:00Z', date_prise_en_charge: '2026-08-13T09:15:00Z', date_cloture: null,
    demandeur_id: 'u7', statut: 'en_attente_cloture', mots_clefs: ['serveur', 'lenteur'],
    description: 'Le serveur web est extrêmement lent depuis 9h ce matin.',
    resume: 'Lenteur serveur web — charge CPU anormale',
    actif_concerne_id: 'a1', impact_id: 'imp3', urgence_id: 'urg2', priorite_id: 'p6', sla_id: 'sla6',
    delai_reponse: 60, delai_resolution: 480,
  },
  {
    id: 'inc5', num_id: 'INC-2026-0005',
    date_creation: '2026-08-14T16:00:00Z', date_prise_en_charge: null, date_cloture: null,
    demandeur_id: 'u7', statut: 'ouvert', mots_clefs: ['base de données', 'erreur'],
    description: "Des erreurs de connexion à la base de données apparaissent dans l'application RH.",
    resume: null,
    actif_concerne_id: 'a5', impact_id: 'imp2', urgence_id: 'urg3', priorite_id: 'p6', sla_id: 'sla6',
    delai_reponse: 60, delai_resolution: 480,
  },
  {
    id: 'inc6', num_id: 'INC-2026-0006',
    date_creation: '2026-08-15T07:30:00Z', date_prise_en_charge: null, date_cloture: null,
    demandeur_id: 'u7', statut: 'ouvert', mots_clefs: ['accès', 'VPN'],
    description: 'Impossible de se connecter au VPN depuis le poste de travail.',
    resume: null,
    actif_concerne_id: 'a3', impact_id: 'imp2', urgence_id: 'urg2', priorite_id: 'p4', sla_id: 'sla3',
    delai_reponse: 120, delai_resolution: 1440,
  },
  {
    id: 'inc7', num_id: 'INC-2026-0007',
    date_creation: '2026-08-09T11:00:00Z', date_prise_en_charge: '2026-08-09T11:30:00Z', date_cloture: '2026-08-09T15:00:00Z',
    demandeur_id: 'u7', statut: 'cloture', mots_clefs: ['mot de passe', 'compte'],
    description: 'Mon compte est bloqué après plusieurs tentatives de connexion.',
    resume: 'Réinitialisation du compte',
    actif_concerne_id: null, impact_id: 'imp1', urgence_id: 'urg3', priorite_id: 'p3', sla_id: 'sla3',
    delai_reponse: 120, delai_resolution: 1440,
  },
  {
    id: 'inc8', num_id: 'INC-2026-0008',
    date_creation: '2026-08-15T11:00:00Z', date_prise_en_charge: null, date_cloture: null,
    demandeur_id: 'u7', statut: 'ouvert', mots_clefs: ['écran', 'affichage'],
    description: "L'écran du poste de travail scintille depuis ce matin.",
    resume: null,
    actif_concerne_id: 'a3', impact_id: 'imp1', urgence_id: 'urg1', priorite_id: 'p1', sla_id: 'sla1',
    delai_reponse: 240, delai_resolution: 2880,
  },
];

export const gestions: GestionIncident[] = [
  { id: 'g1', incident_id: 'inc1', manager_id: 'u2', date_debut: '2026-08-10T08:20:00Z', date_fin: null, active: true, motif: null },
  { id: 'g2', incident_id: 'inc3', manager_id: 'u2', date_debut: '2026-08-12T14:30:00Z', date_fin: null, active: true, motif: null },
  { id: 'g3', incident_id: 'inc4', manager_id: 'u2', date_debut: '2026-08-13T09:15:00Z', date_fin: null, active: true, motif: null },
];

export const prestations: Prestation[] = [
  { id: 'pr1', incident_id: 'inc1', prestataire_id: 'u4', equipe_id: 't1', date_debut: '2026-08-10T08:30:00Z', date_fin: null, active: true, commentaire: null },
  { id: 'pr2', incident_id: 'inc3', prestataire_id: 'u4', equipe_id: 't1', date_debut: '2026-08-12T14:45:00Z', date_fin: '2026-08-12T16:00:00Z', active: false, commentaire: 'Résolu — configuration SMTP reconfigurée' },
  { id: 'pr3', incident_id: 'inc4', prestataire_id: 'u5', equipe_id: 't2', date_debut: '2026-08-13T09:30:00Z', date_fin: null, active: true, commentaire: null },
];

export const commentaires: Commentaire[] = [
  { id: 'c1', incident_id: 'inc1', auteur_id: 'u7', contenu: 'Toujours pas de réseau ce matin.', est_interne: false, date_creation: '2026-08-10T09:00:00Z' },
  { id: 'c2', incident_id: 'inc1', auteur_id: 'u4', contenu: 'Investigation en cours — switch isolé en cause probable.', est_interne: true, date_creation: '2026-08-10T09:30:00Z' },
  { id: 'c3', incident_id: 'inc1', auteur_id: 'u2', contenu: 'Mise à jour : intervention sur site prévue à 11h.', est_interne: false, date_creation: '2026-08-10T10:00:00Z' },
  { id: 'c4', incident_id: 'inc3', auteur_id: 'u7', contenu: 'Toujours le problème de réception.', est_interne: false, date_creation: '2026-08-12T15:00:00Z' },
  { id: 'c5', incident_id: 'inc3', auteur_id: 'u4', contenu: 'SMTP reconfiguré — tests OK côté serveur.', est_interne: true, date_creation: '2026-08-12T15:45:00Z' },
];

export const notifications: Notification[] = [
  { id: 'n1', destinataire_id: 'u2', type: 'incident_ouvert', message: 'Nouvel incident INC-2026-0005 signalé', lien: '/incidents/inc5', date_lecture: null, supprimee: false },
  { id: 'n2', destinataire_id: 'u2', type: 'incident_ouvert', message: 'Nouvel incident INC-2026-0006 signalé', lien: '/incidents/inc6', date_lecture: null, supprimee: false },
  { id: 'n3', destinataire_id: 'u4', type: 'prestation_assignee', message: 'Vous avez été assigné à INC-2026-0001', lien: '/incidents/inc1', date_lecture: '2026-08-10T08:35:00Z', supprimee: false },
  { id: 'n4', destinataire_id: 'u7', type: 'statut_change', message: 'INC-2026-0004 est en attente de votre clôture', lien: '/incidents/inc4', date_lecture: null, supprimee: false },
  { id: 'n5', destinataire_id: 'u7', type: 'statut_change', message: 'INC-2026-0003 a été résolu', lien: '/incidents/inc3', date_lecture: null, supprimee: false },
  { id: 'n6', destinataire_id: 'u1', type: 'incident_ouvert', message: 'Nouvel incident critique INC-2026-0001', lien: '/incidents/inc1', date_lecture: '2026-08-10T08:05:00Z', supprimee: false },
];

export const articles: ArticleConnaissance[] = [
  {
    id: 'art1', titre: 'Résoudre les problèmes de connexion réseau',
    contenu: '## Diagnostic réseau\n\n1. Vérifiez que le câble est branché\n2. Redémarrez l\'adaptateur réseau\n3. Vérifiez les paramètres IP\n4. Testez avec `ping 8.8.8.8`\n\nSi le problème persiste, contactez le support.',
    mots_clefs: ['réseau', 'connexion', 'ping'],
    auteur_id: 'u4', statut: 'publie', actifs_lies: ['a2'],
    date_creation: '2026-08-01T10:00:00Z',
  },
  {
    id: 'art2', titre: 'Configuration Outlook et messagerie',
    contenu: '## Configuration SMTP/IMAP\n\nServeur entrant : imap.eim.tg:993\nServeur sortant : smtp.eim.tg:587\n\nEn cas d\'erreur d\'authentification, réinitialisez votre mot de passe.',
    mots_clefs: ['email', 'outlook', 'messagerie', 'smtp'],
    auteur_id: 'u4', statut: 'publie', actifs_lies: [],
    date_creation: '2026-08-02T14:00:00Z',
  },
  {
    id: 'art3', titre: 'Procédure de réinitialisation de compte',
    contenu: '## Réinitialisation\n\nContactez l\'administrateur ou utilisez le lien "Mot de passe oublié" sur la page de connexion.',
    mots_clefs: ['mot de passe', 'compte', 'réinitialisation'],
    auteur_id: 'u2', statut: 'publie', actifs_lies: [],
    date_creation: '2026-07-15T09:00:00Z',
  },
  {
    id: 'art4', titre: 'Guide dépannage imprimantes HP',
    contenu: '## Problèmes courants\n\n- Pilote obsolète : mettre à jour depuis le site HP\n- File d\'attente bloquée : redémarrer le spooler d\'impression\n- Connectivité réseau : vérifier l\'IP de l\'imprimante',
    mots_clefs: ['imprimante', 'impression', 'pilote', 'hp'],
    auteur_id: 'u4', statut: 'publie', actifs_lies: ['a4'],
    date_creation: '2026-07-20T11:00:00Z',
  },
  {
    id: 'art5', titre: 'Optimisation des performances serveur',
    contenu: '## Diagnostic performances\n\n1. Vérifiez l\'utilisation CPU : `top` ou `htop`\n2. Analysez les logs Apache/Nginx\n3. Vérifiez l\'espace disque : `df -h`\n\n[BROUILLON — en cours de rédaction]',
    mots_clefs: ['serveur', 'performance', 'cpu', 'lenteur'],
    auteur_id: 'u5', statut: 'brouillon', actifs_lies: ['a1'],
    date_creation: '2026-08-14T16:00:00Z',
  },
];

export const rapportsResolution: RapportResolution[] = [
  {
    incident_id: 'inc3',
    auteur_id: 'u4',
    cause_racine: 'Configuration SMTP incorrecte suite à une migration serveur.',
    solution_apportee: 'Reconfiguration des paramètres SMTP et redémarrage du service de messagerie.',
    actions_prises: 'Documentation de la configuration mise à jour. Vérification planifiée à 72h.',
  },
];

export const rapportsPrestation: RapportPrestation[] = [
  {
    incident_id: 'inc3',
    prestataire_id: 'u4',
    commentaires: 'Intervention rapide — client satisfait de la résolution.',
    actions_menees: 'Diagnostic → reconfiguration SMTP → tests de validation.',
    cause_racine: 'Migration serveur sans mise à jour des paramètres SMTP.',
    solution_apportee: 'Reconfiguration et validation end-to-end.',
    documents_lies: [],
  },
];

// ─── Token → user map ───────────────────────────────────────────────────────

export const tokenMap: Record<string, string> = {
  'mock-token-admin': 'u1',
  'mock-token-manager': 'u2',
  'mock-token-manager2': 'u3',
  'mock-token-agent': 'u4',
  'mock-token-agent2': 'u5',
  'mock-token-agent3': 'u6',
  'mock-token-client': 'u7',
};

export const emailTokenMap: Record<string, string> = {
  'sophie.martin@eim.tg': 'mock-token-admin',
  'koffi.agbeko@eim.tg': 'mock-token-manager',
  'ama.sena@eim.tg': 'mock-token-manager2',
  'kofi.mensah@eim.tg': 'mock-token-agent',
  'ama.sarpong@eim.tg': 'mock-token-agent2',
  'yao.koudjo@eim.tg': 'mock-token-agent3',
  'jean.dupont@client.tg': 'mock-token-client',
};
