import { http, HttpResponse } from 'msw';
import {
  users, equipes, impacts, urgences, priorites, slas, actifs,
  incidents, gestions, prestations, commentaires, notifications,
  articles, rapportsResolution, rapportsPrestation,
  tokenMap, emailTokenMap,
  getPrioriteForValues, getSlaForPriorite,
  type User, type Incident, type GestionIncident, type Prestation,
  type Commentaire, type Notification, type ArticleConnaissance,
  type RapportResolution, type RapportPrestation, type Actif, type Equipe,
} from './data';

// Mutable in-memory state
let _users = users.map(u => ({ ...u }));
let _equipes = equipes.map(e => ({ ...e, membres: [...e.membres] }));
let _actifs = actifs.map(a => ({ ...a }));
let _incidents = incidents.map(i => ({ ...i, mots_clefs: [...i.mots_clefs] }));
let _gestions = gestions.map(g => ({ ...g }));
let _prestations = prestations.map(p => ({ ...p }));
let _commentaires = commentaires.map(c => ({ ...c }));
let _notifications = notifications.map(n => ({ ...n }));
let _articles = articles.map(a => ({ ...a, mots_clefs: [...a.mots_clefs], actifs_lies: [...a.actifs_lies] }));
let _rapportsResolution = rapportsResolution.map(r => ({ ...r }));
let _rapportsPrestation = rapportsPrestation.map(r => ({ ...r, documents_lies: [...(r.documents_lies ?? [])] }));

let _nextId = 1000;
const uid = () => `${++_nextId}`;

function getUserFromRequest(request: Request): User | null {
  const auth = request.headers.get('Authorization') ?? '';
  const token = auth.replace('Bearer ', '').trim();
  const userId = tokenMap[token];
  return _users.find(u => u.id === userId) ?? null;
}

function paginate<T>(items: T[], page = 1, perPage = 20) {
  const total = items.length;
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const start = (page - 1) * perPage;
  return {
    data: items.slice(start, start + perPage),
    meta: { current_page: page, last_page: lastPage, per_page: perPage, total },
  };
}

const BASE = 'http://localhost:8000/api/v1';

export const handlers = [

  // ── Auth ─────────────────────────────────────────────────────────────────

  http.post(`${BASE}/login`, async ({ request }) => {
    const body = await request.json() as { email: string; password: string };
    const token = emailTokenMap[body.email?.toLowerCase()];
    if (!token || body.password !== 'password') {
      return HttpResponse.json({ success: false, message: 'Identifiants invalides.' }, { status: 401 });
    }
    const userId = tokenMap[token];
    const user = _users.find(u => u.id === userId);
    if (!user) return HttpResponse.json({ success: false, message: 'Utilisateur introuvable.' }, { status: 404 });
    if (!user.actif) return HttpResponse.json({ success: false, message: 'Ce compte est désactivé.' }, { status: 403 });
    _users = _users.map(u => u.id === userId ? { ...u, date_derniere_connexion: new Date().toISOString() } : u);
    return HttpResponse.json({ success: true, data: { token, user: _users.find(u => u.id === userId) } });
  }),

  http.post(`${BASE}/logout`, () => {
    return HttpResponse.json({ success: true });
  }),

  // ── Profile ───────────────────────────────────────────────────────────────

  http.get(`${BASE}/profile`, ({ request }) => {
    const me = getUserFromRequest(request);
    if (!me) return HttpResponse.json({ success: false, message: 'Non authentifié.' }, { status: 401 });
    return HttpResponse.json({ success: true, data: me });
  }),

  http.put(`${BASE}/profile`, async ({ request }) => {
    const me = getUserFromRequest(request);
    if (!me) return HttpResponse.json({ success: false, message: 'Non authentifié.' }, { status: 401 });
    const body = await request.json() as Partial<User>;
    _users = _users.map(u => u.id === me.id ? { ...u, ...body, id: me.id, role: me.role } : u);
    return HttpResponse.json({ success: true, data: _users.find(u => u.id === me.id) });
  }),

  // ── Users ─────────────────────────────────────────────────────────────────

  http.get(`${BASE}/users`, ({ request }) => {
    const me = getUserFromRequest(request);
    if (!me) return HttpResponse.json({ success: false, message: 'Non authentifié.' }, { status: 401 });
    if (me.role !== 'admin') return HttpResponse.json({ success: false, message: 'Accès refusé.' }, { status: 403 });
    const url = new URL(request.url);
    const role = url.searchParams.get('role');
    const dispo = url.searchParams.get('disponible');
    let list = [..._users];
    if (role) list = list.filter(u => u.role === role);
    if (dispo !== null) list = list.filter(u => u.disponible === (dispo === 'true'));
    const page = parseInt(url.searchParams.get('page') ?? '1');
    return HttpResponse.json({ success: true, data: paginate(list, page) });
  }),

  http.post(`${BASE}/users`, async ({ request }) => {
    const me = getUserFromRequest(request);
    if (!me || me.role !== 'admin') return HttpResponse.json({ success: false, message: 'Accès refusé.' }, { status: 403 });
    const body = await request.json() as Partial<User> & { password?: string };
    const newUser: User = {
      id: `u${uid()}`, nom: body.nom ?? '', prenom: body.prenom ?? '', email: body.email ?? '',
      role: body.role ?? 'client', actif: true, disponible: true,
      id_equipe: body.id_equipe ?? null, date_derniere_connexion: new Date().toISOString(),
    };
    _users.push(newUser);
    return HttpResponse.json({ success: true, data: newUser }, { status: 201 });
  }),

  http.put(`${BASE}/users/:id`, async ({ request, params }) => {
    const me = getUserFromRequest(request);
    if (!me || me.role !== 'admin') return HttpResponse.json({ success: false, message: 'Accès refusé.' }, { status: 403 });
    const body = await request.json() as Partial<User>;
    const idx = _users.findIndex(u => u.id === params.id);
    if (idx < 0) return HttpResponse.json({ success: false, message: 'Utilisateur introuvable.' }, { status: 404 });
    _users[idx] = { ..._users[idx], ...body, id: _users[idx].id };
    return HttpResponse.json({ success: true, data: _users[idx] });
  }),

  http.delete(`${BASE}/users/:id`, ({ request, params }) => {
    const me = getUserFromRequest(request);
    if (!me || me.role !== 'admin') return HttpResponse.json({ success: false, message: 'Accès refusé.' }, { status: 403 });
    const hasActive = _incidents.some(i => i.demandeur_id === params.id && !['cloture'].includes(i.statut));
    if (hasActive) return HttpResponse.json({ success: false, message: 'Impossible de supprimer : cet utilisateur a des incidents actifs.' }, { status: 422 });
    _users = _users.filter(u => u.id !== params.id);
    return HttpResponse.json({ success: true });
  }),

  http.put(`${BASE}/users/:id/disponibilite`, async ({ request, params }) => {
    const me = getUserFromRequest(request);
    if (!me) return HttpResponse.json({ success: false, message: 'Non authentifié.' }, { status: 401 });
    const body = await request.json() as { disponible: boolean };
    const idx = _users.findIndex(u => u.id === params.id);
    if (idx < 0) return HttpResponse.json({ success: false, message: 'Introuvable.' }, { status: 404 });
    _users[idx] = { ..._users[idx], disponible: body.disponible };
    return HttpResponse.json({ success: true, data: _users[idx] });
  }),

  http.put(`${BASE}/users/:id/activer`, async ({ request, params }) => {
    const me = getUserFromRequest(request);
    if (!me || me.role !== 'admin') return HttpResponse.json({ success: false, message: 'Accès refusé.' }, { status: 403 });
    const body = await request.json() as { actif: boolean };
    const idx = _users.findIndex(u => u.id === params.id);
    if (idx < 0) return HttpResponse.json({ success: false, message: 'Introuvable.' }, { status: 404 });
    _users[idx] = { ..._users[idx], actif: body.actif };
    return HttpResponse.json({ success: true, data: _users[idx] });
  }),

  // ── Équipes ───────────────────────────────────────────────────────────────

  http.get(`${BASE}/equipes`, ({ request }) => {
    const me = getUserFromRequest(request);
    if (!me) return HttpResponse.json({ success: false, message: 'Non authentifié.' }, { status: 401 });
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') ?? '1');
    const enriched = _equipes.map(e => ({
      ...e,
      membres: e.membres.map(mid => _users.find(u => u.id === mid)).filter(Boolean),
    }));
    return HttpResponse.json({ success: true, data: paginate(enriched, page) });
  }),

  http.post(`${BASE}/equipes`, async ({ request }) => {
    const me = getUserFromRequest(request);
    if (!me || me.role !== 'admin') return HttpResponse.json({ success: false, message: 'Accès refusé.' }, { status: 403 });
    const body = await request.json() as Partial<Equipe>;
    const newEquipe: Equipe = { id: `t${uid()}`, nom: body.nom ?? '', description: body.description ?? '', membres: body.membres ?? [] };
    _equipes.push(newEquipe);
    return HttpResponse.json({ success: true, data: newEquipe }, { status: 201 });
  }),

  http.put(`${BASE}/equipes/:id`, async ({ request, params }) => {
    const me = getUserFromRequest(request);
    if (!me || me.role !== 'admin') return HttpResponse.json({ success: false, message: 'Accès refusé.' }, { status: 403 });
    const body = await request.json() as Partial<Equipe>;
    const idx = _equipes.findIndex(e => e.id === params.id);
    if (idx < 0) return HttpResponse.json({ success: false, message: 'Équipe introuvable.' }, { status: 404 });
    _equipes[idx] = { ..._equipes[idx], ...body, id: _equipes[idx].id };
    if (body.membres) {
      _users = _users.map(u => {
        if ((body.membres as string[]).includes(u.id)) return { ...u, id_equipe: params.id as string };
        if (u.id_equipe === params.id) return { ...u, id_equipe: null };
        return u;
      });
    }
    return HttpResponse.json({ success: true, data: _equipes[idx] });
  }),

  http.delete(`${BASE}/equipes/:id`, ({ request, params }) => {
    const me = getUserFromRequest(request);
    if (!me || me.role !== 'admin') return HttpResponse.json({ success: false, message: 'Accès refusé.' }, { status: 403 });
    const hasActive = _prestations.some(p => p.equipe_id === params.id && p.active);
    if (hasActive) return HttpResponse.json({ success: false, message: 'Impossible de supprimer : des prestations actives sont liées à cette équipe.' }, { status: 422 });
    _equipes = _equipes.filter(e => e.id !== params.id);
    return HttpResponse.json({ success: true });
  }),

  http.put(`${BASE}/equipes/:id/membres`, async ({ request, params }) => {
    const me = getUserFromRequest(request);
    if (!me || me.role !== 'admin') return HttpResponse.json({ success: false, message: 'Accès refusé.' }, { status: 403 });
    const body = await request.json() as { membres: string[] };
    const idx = _equipes.findIndex(e => e.id === params.id);
    if (idx < 0) return HttpResponse.json({ success: false, message: 'Équipe introuvable.' }, { status: 404 });
    _equipes[idx] = { ..._equipes[idx], membres: body.membres };
    return HttpResponse.json({ success: true, data: _equipes[idx] });
  }),

  // ── Actifs ────────────────────────────────────────────────────────────────

  http.get(`${BASE}/actifs`, ({ request }) => {
    const me = getUserFromRequest(request);
    if (!me) return HttpResponse.json({ success: false, message: 'Non authentifié.' }, { status: 401 });
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') ?? '1');
    return HttpResponse.json({ success: true, data: paginate(_actifs, page) });
  }),

  http.post(`${BASE}/actifs`, async ({ request }) => {
    const me = getUserFromRequest(request);
    if (!me || me.role !== 'admin') return HttpResponse.json({ success: false, message: 'Accès refusé.' }, { status: 403 });
    const body = await request.json() as Partial<Actif>;
    const newActif: Actif = { id: `a${uid()}`, nom: body.nom ?? '', type: body.type ?? '', description: body.description ?? '', proprietaire_id: body.proprietaire_id ?? null, statut: body.statut ?? 'actif' };
    _actifs.push(newActif);
    return HttpResponse.json({ success: true, data: newActif }, { status: 201 });
  }),

  http.put(`${BASE}/actifs/:id`, async ({ request, params }) => {
    const me = getUserFromRequest(request);
    if (!me || me.role !== 'admin') return HttpResponse.json({ success: false, message: 'Accès refusé.' }, { status: 403 });
    const body = await request.json() as Partial<Actif>;
    const idx = _actifs.findIndex(a => a.id === params.id);
    if (idx < 0) return HttpResponse.json({ success: false, message: 'Actif introuvable.' }, { status: 404 });
    _actifs[idx] = { ..._actifs[idx], ...body, id: _actifs[idx].id };
    return HttpResponse.json({ success: true, data: _actifs[idx] });
  }),

  http.delete(`${BASE}/actifs/:id`, ({ request, params }) => {
    const me = getUserFromRequest(request);
    if (!me || me.role !== 'admin') return HttpResponse.json({ success: false, message: 'Accès refusé.' }, { status: 403 });
    const hasOpen = _incidents.some(i => i.actif_concerne_id === params.id && !['cloture'].includes(i.statut));
    if (hasOpen) return HttpResponse.json({ success: false, message: 'Impossible de supprimer : des incidents ouverts sont liés à cet actif.' }, { status: 422 });
    _actifs = _actifs.filter(a => a.id !== params.id);
    return HttpResponse.json({ success: true });
  }),

  http.get(`${BASE}/actifs/:id/incidents`, ({ request, params }) => {
    const me = getUserFromRequest(request);
    if (!me) return HttpResponse.json({ success: false, message: 'Non authentifié.' }, { status: 401 });
    const list = _incidents.filter(i => i.actif_concerne_id === params.id);
    return HttpResponse.json({ success: true, data: list });
  }),

  // ── Incidents ─────────────────────────────────────────────────────────────

  http.get(`${BASE}/incidents`, ({ request }) => {
    const me = getUserFromRequest(request);
    if (!me) return HttpResponse.json({ success: false, message: 'Non authentifié.' }, { status: 401 });
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') ?? '1');
    const perPage = parseInt(url.searchParams.get('per_page') ?? '20');
    let list = [..._incidents];
    if (me.role === 'client') list = list.filter(i => i.demandeur_id === me.id);
    if (me.role === 'agent') {
      const myPrestationIncidents = _prestations.filter(p => p.prestataire_id === me.id && p.active).map(p => p.incident_id);
      list = list.filter(i => myPrestationIncidents.includes(i.id));
    }
    const statut = url.searchParams.get('statut');
    const prioriteId = url.searchParams.get('priorite_id');
    const search = url.searchParams.get('search');
    if (statut) list = list.filter(i => i.statut === statut);
    if (prioriteId) list = list.filter(i => i.priorite_id === prioriteId);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(i => i.num_id.toLowerCase().includes(q) || i.description.toLowerCase().includes(q) || (i.resume ?? '').toLowerCase().includes(q));
    }
    list.sort((a, b) => new Date(b.date_creation).getTime() - new Date(a.date_creation).getTime());
    return HttpResponse.json({ success: true, data: paginate(list, page, perPage) });
  }),

  http.post(`${BASE}/incidents`, async ({ request }) => {
    const me = getUserFromRequest(request);
    if (!me) return HttpResponse.json({ success: false, message: 'Non authentifié.' }, { status: 401 });
    const body = await request.json() as Partial<Incident>;
    const impact = (body as any).impact_id;
    const urgence = (body as any).urgence_id;
    const impactObj = impacts.find(i => i.id === impact);
    const urgenceObj = urgences.find(u => u.id === urgence);
    if (!impactObj || !urgenceObj) return HttpResponse.json({ success: false, message: 'Impact ou urgence invalide.' }, { status: 422 });
    const priorite = getPrioriteForValues(impactObj.valeur, urgenceObj.valeur);
    const sla = getSlaForPriorite(priorite.id);
    const count = _incidents.length + 1;
    const newIncident: Incident = {
      id: `inc${uid()}`,
      num_id: `INC-2026-${String(count).padStart(4, '0')}`,
      date_creation: new Date().toISOString(),
      date_prise_en_charge: null,
      date_cloture: null,
      demandeur_id: me.id,
      statut: 'ouvert',
      mots_clefs: body.mots_clefs ?? [],
      description: body.description ?? '',
      resume: null,
      actif_concerne_id: body.actif_concerne_id ?? null,
      impact_id: impact,
      urgence_id: urgence,
      priorite_id: priorite.id,
      sla_id: sla.id,
      delai_reponse: sla.temps_reponse,
      delai_resolution: sla.temps_resolution,
    };
    _incidents.push(newIncident);
    // Notify managers
    _users.filter(u => u.role === 'manager' || u.role === 'admin').forEach(u => {
      _notifications.push({
        id: `notif${uid()}`,
        destinataire_id: u.id,
        type: 'incident_ouvert',
        message: `Nouvel incident ${newIncident.num_id} signalé`,
        lien: `/incidents/${newIncident.id}`,
        date_lecture: null,
        supprimee: false,
      });
    });
    return HttpResponse.json({ success: true, data: newIncident }, { status: 201 });
  }),

  http.get(`${BASE}/incidents/:id`, ({ request, params }) => {
    const me = getUserFromRequest(request);
    if (!me) return HttpResponse.json({ success: false, message: 'Non authentifié.' }, { status: 401 });
    const incident = _incidents.find(i => i.id === params.id);
    if (!incident) return HttpResponse.json({ success: false, message: 'Incident introuvable.' }, { status: 404 });
    if (me.role === 'client' && incident.demandeur_id !== me.id) {
      return HttpResponse.json({ success: false, message: 'Accès refusé.' }, { status: 403 });
    }
    const gestion = _gestions.find(g => g.incident_id === incident.id && g.active);
    const prestation = _prestations.find(p => p.incident_id === incident.id && p.active);
    const allGestions = _gestions.filter(g => g.incident_id === incident.id);
    const allPrestations = _prestations.filter(p => p.incident_id === incident.id);
    const enrichGestion = (g: GestionIncident) => ({ ...g, manager: _users.find(u => u.id === g.manager_id) });
    const enrichPrestation = (p: Prestation) => ({ ...p, prestataire: _users.find(u => u.id === p.prestataire_id), equipe: p.equipe_id ? _equipes.find(e => e.id === p.equipe_id) : null });
    return HttpResponse.json({
      success: true,
      data: {
        ...incident,
        demandeur: _users.find(u => u.id === incident.demandeur_id),
        impact: impacts.find(i => i.id === incident.impact_id),
        urgence: urgences.find(u => u.id === incident.urgence_id),
        priorite: _users.find(() => true) ? priorites.find(p => p.id === incident.priorite_id) : null,
        sla: slas.find(s => s.id === incident.sla_id),
        actif: incident.actif_concerne_id ? _actifs.find(a => a.id === incident.actif_concerne_id) : null,
        gestion_active: gestion ? enrichGestion(gestion) : null,
        prestation_active: prestation ? enrichPrestation(prestation) : null,
        historique_gestions: allGestions.map(enrichGestion),
        historique_prestations: allPrestations.map(enrichPrestation),
      },
    });
  }),

  http.put(`${BASE}/incidents/:id`, async ({ request, params }) => {
    const me = getUserFromRequest(request);
    if (!me) return HttpResponse.json({ success: false, message: 'Non authentifié.' }, { status: 401 });
    const incident = _incidents.find(i => i.id === params.id);
    if (!incident) return HttpResponse.json({ success: false, message: 'Incident introuvable.' }, { status: 404 });
    if (me.role === 'client') {
      const hasActive = _gestions.some(g => g.incident_id === incident.id && g.active);
      if (hasActive) return HttpResponse.json({ success: false, message: 'Modification impossible : l\'incident est déjà pris en charge.' }, { status: 422 });
    }
    const body = await request.json() as Partial<Incident>;
    const idx = _incidents.findIndex(i => i.id === params.id);
    _incidents[idx] = { ..._incidents[idx], ...body, id: _incidents[idx].id };
    return HttpResponse.json({ success: true, data: _incidents[idx] });
  }),

  // ── Actions incident ──────────────────────────────────────────────────────

  http.post(`${BASE}/incidents/:id/prise-en-charge`, async ({ request, params }) => {
    const me = getUserFromRequest(request);
    if (!me || !['manager', 'admin'].includes(me.role)) return HttpResponse.json({ success: false, message: 'Accès refusé.' }, { status: 403 });
    const body = await request.json() as { resume?: string; agent_id?: string; equipe_id?: string; motif?: string };
    const idx = _incidents.findIndex(i => i.id === params.id);
    if (idx < 0) return HttpResponse.json({ success: false, message: 'Incident introuvable.' }, { status: 404 });
    // Close any existing active gestion
    _gestions = _gestions.map(g => g.incident_id === params.id && g.active ? { ...g, active: false, date_fin: new Date().toISOString() } : g);
    const newGestion: GestionIncident = {
      id: `g${uid()}`, incident_id: params.id as string, manager_id: me.id,
      date_debut: new Date().toISOString(), date_fin: null, active: true, motif: body.motif ?? null,
    };
    _gestions.push(newGestion);
    _incidents[idx] = { ..._incidents[idx], statut: 'en_cours', date_prise_en_charge: new Date().toISOString(), resume: body.resume ?? _incidents[idx].resume };
    if (body.agent_id || body.equipe_id) {
      const agentId = body.agent_id;
      const equipeId = body.equipe_id;
      _prestations = _prestations.map(p => p.incident_id === params.id && p.active ? { ...p, active: false, date_fin: new Date().toISOString() } : p);
      const newPrestation: Prestation = {
        id: `pr${uid()}`, incident_id: params.id as string,
        prestataire_id: agentId ?? (equipeId ? (_equipes.find(e => e.id === equipeId)?.membres[0] ?? '') : ''),
        equipe_id: equipeId ?? null, date_debut: new Date().toISOString(), date_fin: null, active: true, commentaire: null,
      };
      _prestations.push(newPrestation);
      if (agentId) {
        _notifications.push({
          id: `notif${uid()}`, destinataire_id: agentId, type: 'prestation_assignee',
          message: `Vous avez été assigné à ${_incidents[idx].num_id}`, lien: `/incidents/${params.id}`,
          date_lecture: null, supprimee: false,
        });
      }
    }
    return HttpResponse.json({ success: true, data: _incidents[idx] });
  }),

  http.post(`${BASE}/incidents/:id/passer`, async ({ request, params }) => {
    const me = getUserFromRequest(request);
    if (!me || !['manager', 'admin'].includes(me.role)) return HttpResponse.json({ success: false, message: 'Accès refusé.' }, { status: 403 });
    const body = await request.json() as { manager_id: string; motif: string };
    const targetManager = _users.find(u => u.id === body.manager_id);
    if (!targetManager) return HttpResponse.json({ success: false, message: 'Manager introuvable.' }, { status: 404 });
    if (!targetManager.disponible && me.role !== 'admin') return HttpResponse.json({ success: false, message: 'Ce manager est indisponible.' }, { status: 422 });
    _gestions = _gestions.map(g => g.incident_id === params.id && g.active ? { ...g, active: false, date_fin: new Date().toISOString() } : g);
    const newGestion: GestionIncident = {
      id: `g${uid()}`, incident_id: params.id as string, manager_id: body.manager_id,
      date_debut: new Date().toISOString(), date_fin: null, active: true, motif: body.motif,
    };
    _gestions.push(newGestion);
    return HttpResponse.json({ success: true });
  }),

  http.post(`${BASE}/incidents/:id/reassigner`, async ({ request, params }) => {
    const me = getUserFromRequest(request);
    if (!me || !['manager', 'admin'].includes(me.role)) return HttpResponse.json({ success: false, message: 'Accès refusé.' }, { status: 403 });
    const body = await request.json() as { agent_id?: string; equipe_id?: string };
    _prestations = _prestations.map(p => p.incident_id === params.id && p.active ? { ...p, active: false, date_fin: new Date().toISOString() } : p);
    const agentId = body.agent_id ?? (_equipes.find(e => e.id === body.equipe_id)?.membres[0] ?? '');
    const newPrestation: Prestation = {
      id: `pr${uid()}`, incident_id: params.id as string, prestataire_id: agentId,
      equipe_id: body.equipe_id ?? null, date_debut: new Date().toISOString(), date_fin: null, active: true, commentaire: null,
    };
    _prestations.push(newPrestation);
    if (body.agent_id) {
      _notifications.push({
        id: `notif${uid()}`, destinataire_id: body.agent_id, type: 'prestation_assignee',
        message: `Vous avez été réassigné à INC`, lien: `/incidents/${params.id}`,
        date_lecture: null, supprimee: false,
      });
    }
    return HttpResponse.json({ success: true });
  }),

  http.post(`${BASE}/incidents/:id/assigner-force`, async ({ request, params }) => {
    const me = getUserFromRequest(request);
    if (!me || me.role !== 'admin') return HttpResponse.json({ success: false, message: 'Accès refusé.' }, { status: 403 });
    const body = await request.json() as { manager_id?: string; agent_id?: string; equipe_id?: string; resume?: string };
    if (!body.manager_id && !body.agent_id) return HttpResponse.json({ success: false, message: 'Choisissez au moins un manager ou un agent.' }, { status: 422 });
    const idx = _incidents.findIndex(i => i.id === params.id);
    if (idx < 0) return HttpResponse.json({ success: false, message: 'Incident introuvable.' }, { status: 404 });
    _gestions = _gestions.map(g => g.incident_id === params.id && g.active ? { ...g, active: false, date_fin: new Date().toISOString() } : g);
    if (body.manager_id) {
      _gestions.push({ id: `g${uid()}`, incident_id: params.id as string, manager_id: body.manager_id, date_debut: new Date().toISOString(), date_fin: null, active: true, motif: 'Assignation forcée' });
    }
    if (body.agent_id) {
      _prestations = _prestations.map(p => p.incident_id === params.id && p.active ? { ...p, active: false, date_fin: new Date().toISOString() } : p);
      _prestations.push({ id: `pr${uid()}`, incident_id: params.id as string, prestataire_id: body.agent_id, equipe_id: body.equipe_id ?? null, date_debut: new Date().toISOString(), date_fin: null, active: true, commentaire: null });
    }
    _incidents[idx] = { ..._incidents[idx], statut: 'en_cours', date_prise_en_charge: _incidents[idx].date_prise_en_charge ?? new Date().toISOString(), resume: body.resume ?? _incidents[idx].resume };
    return HttpResponse.json({ success: true, data: _incidents[idx] });
  }),

  http.post(`${BASE}/incidents/:id/cloturer`, ({ request, params }) => {
    const me = getUserFromRequest(request);
    if (!me || !['manager', 'admin'].includes(me.role)) return HttpResponse.json({ success: false, message: 'Accès refusé.' }, { status: 403 });
    const idx = _incidents.findIndex(i => i.id === params.id);
    if (idx < 0) return HttpResponse.json({ success: false, message: 'Incident introuvable.' }, { status: 404 });
    _incidents[idx] = { ..._incidents[idx], statut: 'en_attente_cloture' };
    const inc = _incidents[idx];
    _notifications.push({
      id: `notif${uid()}`, destinataire_id: inc.demandeur_id, type: 'statut_change',
      message: `${inc.num_id} est en attente de votre clôture`, lien: `/incidents/${inc.id}`,
      date_lecture: null, supprimee: false,
    });
    return HttpResponse.json({ success: true, data: _incidents[idx] });
  }),

  http.post(`${BASE}/incidents/:id/cloture-utilisateur`, ({ request, params }) => {
    const me = getUserFromRequest(request);
    if (!me) return HttpResponse.json({ success: false, message: 'Non authentifié.' }, { status: 401 });
    const idx = _incidents.findIndex(i => i.id === params.id);
    if (idx < 0) return HttpResponse.json({ success: false, message: 'Incident introuvable.' }, { status: 404 });
    const inc = _incidents[idx];
    if (!['resolu', 'en_attente_cloture'].includes(inc.statut)) {
      return HttpResponse.json({ success: false, message: 'Cet incident ne peut pas être clôturé.' }, { status: 422 });
    }
    _incidents[idx] = { ...inc, statut: 'cloture', date_cloture: new Date().toISOString() };
    _gestions = _gestions.map(g => g.incident_id === params.id && g.active ? { ...g, active: false, date_fin: new Date().toISOString() } : g);
    _prestations = _prestations.map(p => p.incident_id === params.id && p.active ? { ...p, active: false, date_fin: new Date().toISOString() } : p);
    return HttpResponse.json({ success: true, data: _incidents[idx] });
  }),

  // ── Commentaires ──────────────────────────────────────────────────────────

  http.get(`${BASE}/incidents/:id/commentaires`, ({ request, params }) => {
    const me = getUserFromRequest(request);
    if (!me) return HttpResponse.json({ success: false, message: 'Non authentifié.' }, { status: 401 });
    let list = _commentaires.filter(c => c.incident_id === params.id);
    if (me.role === 'client') list = list.filter(c => !c.est_interne);
    return HttpResponse.json({ success: true, data: list.map(c => ({ ...c, auteur: _users.find(u => u.id === c.auteur_id) })) });
  }),

  http.post(`${BASE}/incidents/:id/commentaires`, async ({ request, params }) => {
    const me = getUserFromRequest(request);
    if (!me) return HttpResponse.json({ success: false, message: 'Non authentifié.' }, { status: 401 });
    const body = await request.json() as { contenu: string; est_interne?: boolean };
    if (!body.contenu?.trim()) return HttpResponse.json({ success: false, message: 'Le contenu est requis.', errors: { contenu: ['Le contenu est requis.'] } }, { status: 422 });
    const newComment: Commentaire = {
      id: `c${uid()}`, incident_id: params.id as string, auteur_id: me.id,
      contenu: body.contenu, est_interne: me.role === 'client' ? false : (body.est_interne ?? false),
      date_creation: new Date().toISOString(),
    };
    _commentaires.push(newComment);
    return HttpResponse.json({ success: true, data: { ...newComment, auteur: me } }, { status: 201 });
  }),

  // ── Rapports ──────────────────────────────────────────────────────────────

  http.get(`${BASE}/incidents/:id/rapport-resolution`, ({ request, params }) => {
    const me = getUserFromRequest(request);
    if (!me) return HttpResponse.json({ success: false, message: 'Non authentifié.' }, { status: 401 });
    const rapport = _rapportsResolution.find(r => r.incident_id === params.id);
    if (!rapport) return HttpResponse.json({ success: false, message: 'Rapport introuvable.' }, { status: 404 });
    return HttpResponse.json({ success: true, data: rapport });
  }),

  http.post(`${BASE}/incidents/:id/rapport-resolution`, async ({ request, params }) => {
    const me = getUserFromRequest(request);
    if (!me || !['agent', 'manager', 'admin'].includes(me.role)) return HttpResponse.json({ success: false, message: 'Accès refusé.' }, { status: 403 });
    const inc = _incidents.find(i => i.id === params.id);
    if (!inc) return HttpResponse.json({ success: false, message: 'Incident introuvable.' }, { status: 404 });
    const body = await request.json() as RapportResolution;
    const existing = _rapportsResolution.findIndex(r => r.incident_id === params.id);
    const rapport: RapportResolution = { incident_id: params.id as string, auteur_id: me.id, ...body };
    if (existing >= 0) { _rapportsResolution[existing] = rapport; } else { _rapportsResolution.push(rapport); }
    // Mark incident resolu
    const idx = _incidents.findIndex(i => i.id === params.id);
    if (idx >= 0 && _incidents[idx].statut === 'en_cours') {
      _incidents[idx] = { ..._incidents[idx], statut: 'resolu' };
    }
    return HttpResponse.json({ success: true, data: rapport });
  }),

  http.get(`${BASE}/incidents/:id/rapport-prestation`, ({ request, params }) => {
    const me = getUserFromRequest(request);
    if (!me) return HttpResponse.json({ success: false, message: 'Non authentifié.' }, { status: 401 });
    const rapport = _rapportsPrestation.find(r => r.incident_id === params.id);
    if (!rapport) return HttpResponse.json({ success: false, message: 'Rapport introuvable.' }, { status: 404 });
    return HttpResponse.json({ success: true, data: rapport });
  }),

  http.post(`${BASE}/incidents/:id/rapport-prestation`, async ({ request, params }) => {
    const me = getUserFromRequest(request);
    if (!me || !['agent', 'manager', 'admin'].includes(me.role)) return HttpResponse.json({ success: false, message: 'Accès refusé.' }, { status: 403 });
    const body = await request.json() as RapportPrestation;
    const existing = _rapportsPrestation.findIndex(r => r.incident_id === params.id);
    const rapport: RapportPrestation = { incident_id: params.id as string, prestataire_id: me.id, ...body };
    if (existing >= 0) { _rapportsPrestation[existing] = rapport; } else { _rapportsPrestation.push(rapport); }
    return HttpResponse.json({ success: true, data: rapport });
  }),

  // ── Articles ──────────────────────────────────────────────────────────────

  http.get(`${BASE}/articles`, ({ request }) => {
    const me = getUserFromRequest(request);
    if (!me) return HttpResponse.json({ success: false, message: 'Non authentifié.' }, { status: 401 });
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') ?? '1');
    const search = url.searchParams.get('search');
    const mots = url.searchParams.get('mots_clefs');
    let list: ArticleConnaissance[] = [..._articles];
    if (me.role === 'client') list = list.filter(a => a.statut === 'publie');
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(a => a.titre.toLowerCase().includes(q) || a.contenu.toLowerCase().includes(q));
    }
    if (mots) {
      const keywords = mots.toLowerCase().split(',').map(k => k.trim());
      list = list.filter(a => keywords.some(k => a.mots_clefs.some(m => m.toLowerCase().includes(k))));
    }
    return HttpResponse.json({ success: true, data: paginate(list, page) });
  }),

  http.post(`${BASE}/articles`, async ({ request }) => {
    const me = getUserFromRequest(request);
    if (!me || !['agent', 'manager', 'admin'].includes(me.role)) return HttpResponse.json({ success: false, message: 'Accès refusé.' }, { status: 403 });
    const body = await request.json() as Partial<ArticleConnaissance>;
    const newArticle: ArticleConnaissance = {
      id: `art${uid()}`, titre: body.titre ?? '', contenu: body.contenu ?? '',
      mots_clefs: body.mots_clefs ?? [], auteur_id: me.id,
      statut: body.statut ?? 'brouillon', actifs_lies: body.actifs_lies ?? [],
      date_creation: new Date().toISOString(),
    };
    _articles.push(newArticle);
    return HttpResponse.json({ success: true, data: newArticle }, { status: 201 });
  }),

  http.put(`${BASE}/articles/:id`, async ({ request, params }) => {
    const me = getUserFromRequest(request);
    if (!me || !['agent', 'manager', 'admin'].includes(me.role)) return HttpResponse.json({ success: false, message: 'Accès refusé.' }, { status: 403 });
    const body = await request.json() as Partial<ArticleConnaissance>;
    const idx = _articles.findIndex(a => a.id === params.id);
    if (idx < 0) return HttpResponse.json({ success: false, message: 'Article introuvable.' }, { status: 404 });
    _articles[idx] = { ..._articles[idx], ...body, id: _articles[idx].id };
    return HttpResponse.json({ success: true, data: _articles[idx] });
  }),

  http.delete(`${BASE}/articles/:id`, ({ request, params }) => {
    const me = getUserFromRequest(request);
    if (!me || !['manager', 'admin'].includes(me.role)) return HttpResponse.json({ success: false, message: 'Accès refusé.' }, { status: 403 });
    _articles = _articles.filter(a => a.id !== params.id);
    return HttpResponse.json({ success: true });
  }),

  // ── Notifications ─────────────────────────────────────────────────────────

  http.get(`${BASE}/notifications`, ({ request }) => {
    const me = getUserFromRequest(request);
    if (!me) return HttpResponse.json({ success: false, message: 'Non authentifié.' }, { status: 401 });
    const list = _notifications.filter(n => n.destinataire_id === me.id && !n.supprimee);
    return HttpResponse.json({ success: true, data: list });
  }),

  http.put(`${BASE}/notifications/:id/lire`, ({ request, params }) => {
    const me = getUserFromRequest(request);
    if (!me) return HttpResponse.json({ success: false, message: 'Non authentifié.' }, { status: 401 });
    _notifications = _notifications.map(n =>
      n.id === params.id && n.destinataire_id === me.id
        ? { ...n, date_lecture: new Date().toISOString() }
        : n
    );
    return HttpResponse.json({ success: true });
  }),

  http.delete(`${BASE}/notifications/:id`, ({ request, params }) => {
    const me = getUserFromRequest(request);
    if (!me) return HttpResponse.json({ success: false, message: 'Non authentifié.' }, { status: 401 });
    if (params.id === 'all') {
      _notifications = _notifications.map(n => n.destinataire_id === me.id ? { ...n, supprimee: true } : n);
    } else {
      _notifications = _notifications.map(n => n.id === params.id && n.destinataire_id === me.id ? { ...n, supprimee: true } : n);
    }
    return HttpResponse.json({ success: true });
  }),

  http.delete(`${BASE}/notifications`, ({ request }) => {
    const me = getUserFromRequest(request);
    if (!me) return HttpResponse.json({ success: false, message: 'Non authentifié.' }, { status: 401 });
    _notifications = _notifications.map(n => n.destinataire_id === me.id ? { ...n, supprimee: true } : n);
    return HttpResponse.json({ success: true });
  }),

  // ── SLAs ─────────────────────────────────────────────────────────────────

  http.get(`${BASE}/slas`, ({ request }) => {
    const me = getUserFromRequest(request);
    if (!me) return HttpResponse.json({ success: false, message: 'Non authentifié.' }, { status: 401 });
    return HttpResponse.json({ success: true, data: slas });
  }),

  http.put(`${BASE}/slas`, async ({ request }) => {
    const me = getUserFromRequest(request);
    if (!me || me.role !== 'admin') return HttpResponse.json({ success: false, message: 'Accès refusé.' }, { status: 403 });
    const body = await request.json() as typeof slas;
    for (const item of body) {
      if (item.temps_resolution < item.temps_reponse) {
        return HttpResponse.json({ success: false, message: 'Le temps de résolution doit être supérieur ou égal au temps de réponse.' }, { status: 422 });
      }
    }
    return HttpResponse.json({ success: true, data: body });
  }),

  // ── Impacts / Urgences / Priorités ────────────────────────────────────────

  http.get(`${BASE}/impacts`, ({ request }) => {
    const me = getUserFromRequest(request);
    if (!me) return HttpResponse.json({ success: false, message: 'Non authentifié.' }, { status: 401 });
    return HttpResponse.json({ success: true, data: impacts });
  }),

  http.get(`${BASE}/urgences`, ({ request }) => {
    const me = getUserFromRequest(request);
    if (!me) return HttpResponse.json({ success: false, message: 'Non authentifié.' }, { status: 401 });
    return HttpResponse.json({ success: true, data: urgences });
  }),

  http.get(`${BASE}/priorites`, ({ request }) => {
    const me = getUserFromRequest(request);
    if (!me) return HttpResponse.json({ success: false, message: 'Non authentifié.' }, { status: 401 });
    return HttpResponse.json({ success: true, data: priorites });
  }),

  // ── Rapports performance ──────────────────────────────────────────────────

  http.get(`${BASE}/rapports/performance`, ({ request }) => {
    const me = getUserFromRequest(request);
    if (!me || !['admin', 'manager'].includes(me.role)) return HttpResponse.json({ success: false, message: 'Accès refusé.' }, { status: 403 });
    const url = new URL(request.url);
    const dateDebut = url.searchParams.get('date_debut');
    const dateFin = url.searchParams.get('date_fin');
    let list = [..._incidents];
    if (dateDebut) list = list.filter(i => new Date(i.date_creation) >= new Date(dateDebut));
    if (dateFin) list = list.filter(i => new Date(i.date_creation) <= new Date(dateFin));
    const total = list.length;
    const cloturesCount = list.filter(i => i.statut === 'cloture').length;
    const en_cours = list.filter(i => i.statut === 'en_cours').length;
    const ouverts = list.filter(i => i.statut === 'ouvert').length;
    const byPriorite = priorites.map(p => ({ ...p, count: list.filter(i => i.priorite_id === p.id).length }));
    const byStatut = [
      { statut: 'ouvert', count: ouverts },
      { statut: 'en_cours', count: en_cours },
      { statut: 'resolu', count: list.filter(i => i.statut === 'resolu').length },
      { statut: 'en_attente_cloture', count: list.filter(i => i.statut === 'en_attente_cloture').length },
      { statut: 'cloture', count: cloturesCount },
    ];
    const tauxResolution = total > 0 ? Math.round((cloturesCount / total) * 100) : 0;
    const byAgent = _users.filter(u => u.role === 'agent').map(u => ({
      agent: u,
      prestations: _prestations.filter(p => p.prestataire_id === u.id).length,
      resolus: _incidents.filter(i => {
        const prest = _prestations.find(p => p.prestataire_id === u.id && p.incident_id === i.id);
        return prest && ['cloture', 'resolu'].includes(i.statut);
      }).length,
    }));
    return HttpResponse.json({
      success: true,
      data: { total, cloturesCount, tauxResolution, byPriorite, byStatut, byAgent, periode: { debut: dateDebut, fin: dateFin } },
    });
  }),
];
