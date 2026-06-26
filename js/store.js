// ═══════════════════════════════════════════════════
// store.js — Persistance des données (localStorage)
//
// Structure d'une demande :
// {
//   id:               string  — identifiant unique
//   module:           string  — 'fiche-action' | …
//   statut:           string  — voir STATUTS ci-dessous
//   responsable:      string  — nom enseignant
//   emailResponsable: string  — email enseignant
//   intitule:         string  — titre de l'action
//   dateCreation:     string  — ISO
//   dateMaj:          string  — ISO
//   dateAction:       string  — YYYY-MM-DD
//   data:             object  — données formulaire
//   commentaire:      string  — note direction
//   visas: [                  — circuit de validation
//     {
//       role:    string  — 'cpe' | 'gestionnaire' | 'chef'
//       label:   string  — 'CPE' | 'Gestionnaire' | "Chef d'établissement"
//       statut:  string  — 'en_attente' | 'valide' | 'refuse'
//       date:    string  — ISO date de décision
//       motif:   string  — motif si refus
//     }
//   ]
// }
//
// Statuts possibles :
//   brouillon   — saisie en cours, non soumis
//   en_attente  — soumis, en circuit de validation
//   accordee    — tous les visas accordés
//   refusee     — refusé par un validateur
// ═══════════════════════════════════════════════════

const Store = (() => {

  const KEY = 'joliot_demandes_v1';

  function _readAll() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
    catch { return []; }
  }

  function _writeAll(d) { localStorage.setItem(KEY, JSON.stringify(d)); }

  function _newId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  // ── Initialise les visas depuis config ────────────

  function _initVisas() {
    return APP_CONFIG.validateurs.map(v => ({
      role:   v.role,
      label:  v.label,
      statut: 'en_attente',
      date:   null,
      motif:  null,
    }));
  }

  // ── Quel validateur doit agir maintenant ? ────────

  function prochainValidateur(demande) {
    if (!demande.visas) return null;
    const idx = demande.visas.findIndex(v => v.statut === 'en_attente');
    if (idx === -1) return null;
    return { index: idx, config: APP_CONFIG.validateurs[idx], visa: demande.visas[idx] };
  }

  // ── Sauvegarde (création ou mise à jour) ──────────

  function save(demande) {
    const all = _readAll();
    const now = new Date().toISOString();

    if (demande.id) {
      const idx = all.findIndex(d => d.id === demande.id);
      if (idx !== -1) {
        all[idx] = { ...all[idx], ...demande, dateMaj: now };
      } else {
        all.push({ ...demande, dateMaj: now });
      }
      _writeAll(all);
      return demande.id;
    } else {
      const newD = {
        ...demande,
        id:           _newId(),
        statut:       demande.statut || 'brouillon',
        visas:        demande.statut === 'en_attente' ? _initVisas() : [],
        dateCreation: now,
        dateMaj:      now,
      };
      demande.id = newD.id;
      all.push(newD);
      _writeAll(all);
      return newD.id;
    }
  }

  // ── Enregistre la décision d'un validateur ────────

  function enregistrerVisa(id, roleValidateur, decision, motif) {
    const all = _readAll();
    const idx = all.findIndex(d => d.id === id);
    if (idx === -1) return { ok: false, erreur: 'Demande introuvable' };

    const demande   = all[idx];
    const visaIdx   = demande.visas?.findIndex(v => v.role === roleValidateur);
    if (visaIdx === -1 || visaIdx === undefined) {
      return { ok: false, erreur: 'Rôle validateur inconnu' };
    }

    const visa = demande.visas[visaIdx];
    if (visa.statut !== 'en_attente') {
      return { ok: false, erreur: 'Ce visa a déjà été traité' };
    }

    // Enregistre le visa
    demande.visas[visaIdx] = {
      ...visa,
      statut: decision, // 'valide' ou 'refuse'
      date:   new Date().toISOString(),
      motif:  motif || null,
    };

    if (decision === 'refuse') {
      demande.statut = 'refusee';
      demande.commentaire = motif || '';
    } else {
      // Tous les visas accordés ?
      const tousValides = demande.visas.every(v => v.statut === 'valide');
      demande.statut = tousValides ? 'accordee' : 'en_attente';
    }

    demande.dateMaj = new Date().toISOString();
    all[idx] = demande;
    _writeAll(all);

    // Renvoie l'index du prochain validateur (null si fin)
    const prochainIdx = demande.visas.findIndex(v => v.statut === 'en_attente');
    return {
      ok:          true,
      statut:      demande.statut,
      prochainIdx: prochainIdx === -1 ? null : prochainIdx,
      demande,
    };
  }

  function getAll(filtres = {}) {
    let all = _readAll();
    if (filtres.module)      all = all.filter(d => d.module === filtres.module);
    if (filtres.statut)      all = all.filter(d => d.statut === filtres.statut);
    if (filtres.responsable) all = all.filter(d =>
      d.responsable?.toLowerCase().includes(filtres.responsable.toLowerCase())
    );
    return all.sort((a, b) => new Date(b.dateMaj) - new Date(a.dateMaj));
  }

  function getById(id) { return _readAll().find(d => d.id === id) || null; }

  function remove(id) { _writeAll(_readAll().filter(d => d.id !== id)); }

  function stats() {
    const all = _readAll();
    return {
      total:      all.length,
      brouillon:  all.filter(d => d.statut === 'brouillon').length,
      en_attente: all.filter(d => d.statut === 'en_attente').length,
      accordee:   all.filter(d => d.statut === 'accordee').length,
      refusee:    all.filter(d => d.statut === 'refusee').length,
    };
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify(_readAll(), null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `joliot_demandes_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJSON(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const data = JSON.parse(e.target.result);
          if (!Array.isArray(data)) throw new Error('Format invalide');
          const existing    = _readAll();
          const existingIds = new Set(existing.map(d => d.id));
          let added = 0;
          data.forEach(d => { if (!existingIds.has(d.id)) { existing.push(d); added++; } });
          _writeAll(existing);
          resolve(added);
        } catch (err) { reject(err); }
      };
      reader.readAsText(file);
    });
  }

  return { save, getAll, getById, remove, stats,
           exportJSON, importJSON,
           enregistrerVisa, prochainValidateur };

})();
