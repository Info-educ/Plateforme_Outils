// ═══════════════════════════════════════════════════
// modules/annuaire/annuaire.js
//
// Module annuaire de l'établissement :
//   - Postes fixes de direction (modifiables)
//   - Liste des enseignants (ajout / suppression)
//   - Rattaché à l'année scolaire
//   - Alimente automatiquement config.js en mémoire
//     (validateurs, secrétariat, destinataires)
//   - Un enseignant qui saisit son nom + email
//     retrouve ses fiches et reçoit les notifications
// ═══════════════════════════════════════════════════

const Annuaire = (() => {

  const KEY = 'joliot_annuaire_v1';

  // ── Postes fixes de direction ─────────────────────
  // Ordre d'affichage et rôles dans le circuit de visa
  const POSTES_DIRECTION = [
    { role: 'principal',    label: 'Principal / Proviseur',   visaOrdre: null },
    { role: 'adjoint',      label: 'Principal adjoint',        visaOrdre: null },
    { role: 'secretaire',   label: 'Secrétaire général(e)',    visaOrdre: null },
    { role: 'cpe',          label: 'CPE',                      visaOrdre: 1    },
    { role: 'gestionnaire', label: 'Gestionnaire',             visaOrdre: 2    },
    { role: 'secretariat',  label: 'Secrétariat (impression)', visaOrdre: null },
  ];

  // ── Lecture / écriture ────────────────────────────

  function _read() {
    try { return JSON.parse(localStorage.getItem(KEY) || 'null'); }
    catch { return null; }
  }

  function _write(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
    // Met à jour APP_CONFIG en mémoire pour que tous les modules
    // bénéficient immédiatement des nouvelles coordonnées
    _syncConfig(data);
  }

  function _anneeScolaire() {
    const now = new Date();
    const y = now.getFullYear();
    return now.getMonth() >= 8 ? `${y}-${y+1}` : `${y-1}-${y}`;
  }

  // Données par défaut (première utilisation)
  function _defaut() {
    const direction = {};
    POSTES_DIRECTION.forEach(p => {
      direction[p.role] = { nom: '', email: '', pin: '' };
    });
    return {
      anneeScolaire: _anneeScolaire(),
      direction,
      enseignants: [],   // { id, nom, email, matieres, classes }
      dateMAJ: new Date().toISOString(),
    };
  }

  // Charge ou initialise
  function _load() {
    return _read() || _defaut();
  }

  // ── Synchronisation vers APP_CONFIG ───────────────
  // Permet à email.js et store.js d'utiliser les
  // données à jour sans rechargement de page

  function _syncConfig(data) {
    if (!window.APP_CONFIG) return;

    // Reconstruit le tableau des validateurs
    const validateurs = POSTES_DIRECTION
      .filter(p => p.visaOrdre !== null)
      .sort((a, b) => a.visaOrdre - b.visaOrdre)
      .map(p => {
        const personne = data.direction[p.role] || {};
        // Récupère le PIN existant depuis APP_CONFIG pour ne pas l'écraser
        const cfgExistant = APP_CONFIG.validateurs?.find(v => v.role === p.role);
        return {
          role:      p.role,
          label:     p.label,
          email:     personne.email || cfgExistant?.email || '',
          pin:       personne.pin   || cfgExistant?.pin   || '0000',
          notifierA: cfgExistant?.notifierA || [],
        };
      });

    if (validateurs.length) APP_CONFIG.validateurs = validateurs;

    // Secrétariat
    const sec = data.direction['secretariat'];
    if (sec?.email) {
      APP_CONFIG.secretariat = { label: 'Secrétariat', email: sec.email };
    }

    // Email chef d'établissement
    const chef = data.direction['principal'];
    if (chef?.email) {
      APP_CONFIG.etablissement.email = chef.email;
      APP_CONFIG.destinataires = [chef.email];
    }
  }

  // ── Render principal ──────────────────────────────

  function render() {
    const data = _load();
    const c    = document.getElementById('annuaire-content');
    if (!c) return;

    c.innerHTML = `
      ${_renderBanniere(data)}
      ${_renderDirection(data)}
      ${_renderEnseignants(data)}
      ${_renderExportImport()}
    `;

    // Sync immédiate vers APP_CONFIG
    _syncConfig(data);
  }

  // ── Bannière année scolaire ───────────────────────

  function _renderBanniere(data) {
    return `
      <div style="background:var(--blue);color:white;border-radius:10px;padding:1.1rem 1.4rem;
                  margin-bottom:1.5rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.75rem">
        <div>
          <div style="font-size:16px;font-weight:700">Annuaire ${data.anneeScolaire}</div>
          <div style="font-size:12px;opacity:.8;margin-top:.2rem">
            Dernière mise à jour : ${_fmtDate(data.dateMAJ)}
          </div>
        </div>
        <div style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap">
          <span style="font-size:12px;opacity:.75">Année scolaire :</span>
          <select id="ann-annee" style="border-radius:6px;border:1px solid rgba(255,255,255,.4);
            background:rgba(255,255,255,.15);color:white;padding:.3rem .6rem;font-size:13px;cursor:pointer">
            ${_anneesOptions(data.anneeScolaire)}
          </select>
          <button onclick="Annuaire.changerAnnee()"
            style="background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.4);color:white;
            border-radius:6px;padding:.3rem .75rem;font-size:12px;cursor:pointer;font-weight:600">
            Changer d'année
          </button>
        </div>
      </div>

      <div class="info-box" style="margin-bottom:1.5rem">
        💡 Cet annuaire alimente automatiquement le circuit de validation des fiches d'action.
        Les emails renseignés ici sont utilisés pour toutes les notifications.
        <strong>Les PIN restent configurés dans <code>js/config.js</code></strong> (usage interne uniquement).
      </div>`;
  }

  function _anneesOptions(courante) {
    const y = new Date().getFullYear();
    const annees = [`${y-1}-${y}`, `${y}-${y+1}`, `${y+1}-${y+2}`];
    return annees.map(a => `<option value="${a}" ${a===courante?'selected':''}>${a}</option>`).join('');
  }

  // ── Section direction ─────────────────────────────

  function _renderDirection(data) {
    const rows = POSTES_DIRECTION.map(p => {
      const personne = data.direction[p.role] || { nom: '', email: '' };
      const badge = p.visaOrdre
        ? `<span style="font-size:10px;background:var(--blue-light);color:var(--blue);
             padding:1px 7px;border-radius:10px;font-weight:700;margin-left:.4rem">
             Circuit visa n°${p.visaOrdre}</span>`
        : '';
      return `
        <tr>
          <td style="padding:.6rem .75rem;border:1px solid var(--border);font-weight:600;
                     font-size:13px;background:var(--cream);white-space:nowrap">
            ${p.label}${badge}
          </td>
          <td style="padding:0;border:1px solid var(--border)">
            <input type="text" value="${_esc(personne.nom)}"
              placeholder="Nom Prénom"
              onchange="Annuaire.majDirection('${p.role}','nom',this.value)"
              style="width:100%;border:none;padding:.55rem .75rem;font-size:13px;
                     font-family:var(--font);background:transparent">
          </td>
          <td style="padding:0;border:1px solid var(--border)">
            <input type="email" value="${_esc(personne.email)}"
              placeholder="prenom.nom@ac-versailles.fr"
              onchange="Annuaire.majDirection('${p.role}','email',this.value)"
              style="width:100%;border:none;padding:.55rem .75rem;font-size:13px;
                     font-family:var(--font);background:transparent">
          </td>
        </tr>`;
    }).join('');

    return `
      <div class="form-section" style="margin-bottom:1.5rem">
        <div class="form-section-header">🏛️ Équipe de direction et d'encadrement</div>
        <div class="form-section-body" style="padding:0">
          <table style="width:100%;border-collapse:collapse">
            <thead>
              <tr>
                <th style="padding:.5rem .75rem;background:var(--blue-light);color:var(--blue);
                           font-size:11px;font-weight:700;text-transform:uppercase;
                           border:1px solid var(--border);text-align:left;width:200px">Poste</th>
                <th style="padding:.5rem .75rem;background:var(--blue-light);color:var(--blue);
                           font-size:11px;font-weight:700;text-transform:uppercase;
                           border:1px solid var(--border);text-align:left">Nom</th>
                <th style="padding:.5rem .75rem;background:var(--blue-light);color:var(--blue);
                           font-size:11px;font-weight:700;text-transform:uppercase;
                           border:1px solid var(--border);text-align:left">Email</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <div style="padding:.75rem 1rem;display:flex;justify-content:flex-end">
            <button class="btn btn-primary" onclick="Annuaire.sauvegarderDirection()" style="font-size:13px">
              💾 Enregistrer l'équipe de direction
            </button>
          </div>
        </div>
      </div>`;
  }

  // ── Section enseignants ───────────────────────────

  function _renderEnseignants(data) {
    const liste = data.enseignants || [];

    const rows = liste.length ? liste.map((e, i) => `
      <tr style="background:${i%2===0?'var(--white)':'var(--cream)'}">
        <td style="padding:0;border:1px solid var(--border)">
          <input type="text" value="${_esc(e.nom)}"
            onchange="Annuaire.majEnseignant(${i},'nom',this.value)"
            style="width:100%;border:none;padding:.5rem .65rem;font-size:13px;
                   font-family:var(--font);background:transparent">
        </td>
        <td style="padding:0;border:1px solid var(--border)">
          <input type="email" value="${_esc(e.email)}"
            onchange="Annuaire.majEnseignant(${i},'email',this.value)"
            style="width:100%;border:none;padding:.5rem .65rem;font-size:13px;
                   font-family:var(--font);background:transparent">
        </td>
        <td style="padding:0;border:1px solid var(--border)">
          <input type="text" value="${_esc(e.matieres)}"
            placeholder="Français, Histoire…"
            onchange="Annuaire.majEnseignant(${i},'matieres',this.value)"
            style="width:100%;border:none;padding:.5rem .65rem;font-size:13px;
                   font-family:var(--font);background:transparent">
        </td>
        <td style="padding:0;border:1px solid var(--border)">
          <input type="text" value="${_esc(e.classes)}"
            placeholder="6A, 5B…"
            onchange="Annuaire.majEnseignant(${i},'classes',this.value)"
            style="width:100%;border:none;padding:.5rem .65rem;font-size:13px;
                   font-family:var(--font);background:transparent">
        </td>
        <td style="padding:.5rem .65rem;border:1px solid var(--border);text-align:center">
          <button onclick="Annuaire.supprimerEnseignant(${i})"
            style="background:none;border:none;cursor:pointer;color:#991b1b;font-size:14px"
            title="Supprimer">🗑</button>
        </td>
      </tr>`).join('')
    : `<tr><td colspan="5" style="padding:1.5rem;text-align:center;color:var(--slate-mid);
          border:1px solid var(--border);font-size:13px">
          Aucun enseignant enregistré — cliquez sur "Ajouter un enseignant"
        </td></tr>`;

    return `
      <div class="form-section" style="margin-bottom:1.5rem">
        <div class="form-section-header">
          📚 Enseignants
          <span style="margin-left:auto;font-size:11px;opacity:.8;font-weight:400">
            ${liste.length} enseignant${liste.length>1?'s':''} enregistré${liste.length>1?'s':''}
          </span>
        </div>
        <div class="form-section-body" style="padding:0">

          <div class="warn-box" style="margin:.75rem;font-size:12px">
            🔒 Un enseignant qui saisit son <strong>nom exact</strong> et son <strong>email</strong>
            dans le formulaire de fiche d'action sera automatiquement notifié à chaque étape
            du circuit de validation. Son email doit correspondre exactement à celui renseigné ici.
          </div>

          <table style="width:100%;border-collapse:collapse">
            <thead>
              <tr>
                <th style="padding:.5rem .75rem;background:var(--blue-light);color:var(--blue);
                           font-size:11px;font-weight:700;text-transform:uppercase;
                           border:1px solid var(--border);text-align:left">Nom</th>
                <th style="padding:.5rem .75rem;background:var(--blue-light);color:var(--blue);
                           font-size:11px;font-weight:700;text-transform:uppercase;
                           border:1px solid var(--border);text-align:left">Email académique</th>
                <th style="padding:.5rem .75rem;background:var(--blue-light);color:var(--blue);
                           font-size:11px;font-weight:700;text-transform:uppercase;
                           border:1px solid var(--border);text-align:left">Matières</th>
                <th style="padding:.5rem .75rem;background:var(--blue-light);color:var(--blue);
                           font-size:11px;font-weight:700;text-transform:uppercase;
                           border:1px solid var(--border);text-align:left">Classes</th>
                <th style="padding:.5rem .75rem;background:var(--blue-light);color:var(--blue);
                           font-size:11px;font-weight:700;text-transform:uppercase;
                           border:1px solid var(--border);text-align:left;width:40px"></th>
              </tr>
            </thead>
            <tbody id="enseignants-tbody">${rows}</tbody>
          </table>

          <div style="padding:.75rem 1rem;display:flex;justify-content:space-between;
                      align-items:center;flex-wrap:wrap;gap:.5rem">
            <button class="btn btn-secondary" onclick="Annuaire.ajouterEnseignant()" style="font-size:13px">
              ＋ Ajouter un enseignant
            </button>
            <button class="btn btn-primary" onclick="Annuaire.sauvegarderEnseignants()" style="font-size:13px">
              💾 Enregistrer les enseignants
            </button>
          </div>
        </div>
      </div>`;
  }

  // ── Export / Import ───────────────────────────────

  function _renderExportImport() {
    return `
      <div class="form-section">
        <div class="form-section-header">🗂️ Sauvegarde et restauration</div>
        <div class="form-section-body">
          <p style="font-size:13px;color:var(--slate-mid);margin-bottom:1rem">
            Exportez l'annuaire en début d'année pour le réimporter l'année suivante
            en mettant simplement à jour les personnes qui ont changé.
          </p>
          <div style="display:flex;gap:.75rem;flex-wrap:wrap">
            <button class="btn btn-secondary" onclick="Annuaire.exporter()" style="font-size:13px">
              ⬇ Exporter l'annuaire (JSON)
            </button>
            <label class="btn btn-secondary" style="font-size:13px;cursor:pointer">
              ⬆ Importer un annuaire
              <input type="file" accept=".json" onchange="Annuaire.importer(this.files[0])"
                style="display:none">
            </label>
          </div>
        </div>
      </div>`;
  }

  // ── Toast ─────────────────────────────────────────

  function _toast(msg, ok) {
    let el = document.getElementById('ann-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'ann-toast';
      el.style.cssText = `position:fixed;bottom:1.5rem;right:1.5rem;z-index:500;
        border-radius:8px;padding:.85rem 1.25rem;font-size:13.5px;font-weight:600;
        box-shadow:0 4px 16px rgba(0,0,0,.15);transition:opacity .3s`;
      document.body.appendChild(el);
    }
    el.style.background = ok ? '#dcfce7' : '#fee2e2';
    el.style.color      = ok ? '#15803d' : '#991b1b';
    el.style.border     = ok ? '1px solid #86efac' : '1px solid #fca5a5';
    el.style.opacity    = '1';
    el.textContent      = msg;
    setTimeout(() => { el.style.opacity = '0'; }, 3500);
  }

  // ── Helpers ───────────────────────────────────────

  function _esc(s) { return (s||'').replace(/"/g,'&quot;').replace(/</g,'&lt;'); }
  function _fmtDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric' });
  }

  // ── Actions publiques ─────────────────────────────

  function majDirection(role, champ, valeur) {
    const data = _load();
    if (!data.direction[role]) data.direction[role] = {};
    data.direction[role][champ] = valeur.trim();
    // Pas de _write() ici : sauvegardé par sauvegarderDirection()
    // On garde en mémoire temporaire
    window._annuaireTmp = data;
  }

  function sauvegarderDirection() {
    const data = window._annuaireTmp || _load();
    data.dateMAJ = new Date().toISOString();
    _write(data);
    window._annuaireTmp = null;
    _toast('✓ Équipe de direction enregistrée', true);
  }

  function majEnseignant(index, champ, valeur) {
    const data = window._annuaireTmp || _load();
    if (!data.enseignants[index]) data.enseignants[index] = {};
    data.enseignants[index][champ] = valeur.trim();
    window._annuaireTmp = data;
  }

  function ajouterEnseignant() {
    const data = window._annuaireTmp || _load();
    data.enseignants.push({ nom:'', email:'', matieres:'', classes:'' });
    window._annuaireTmp = data;
    render();
    // Focaliser le dernier champ nom
    const inputs = document.querySelectorAll('#enseignants-tbody input[type="text"]');
    if (inputs.length) inputs[inputs.length - 4]?.focus();
  }

  function supprimerEnseignant(index) {
    if (!confirm('Supprimer cet enseignant de l\'annuaire ?')) return;
    const data = window._annuaireTmp || _load();
    data.enseignants.splice(index, 1);
    window._annuaireTmp = data;
    render();
  }

  function sauvegarderEnseignants() {
    const data = window._annuaireTmp || _load();
    // Nettoie les lignes vides
    data.enseignants = data.enseignants.filter(e => e.nom || e.email);
    data.dateMAJ = new Date().toISOString();
    _write(data);
    window._annuaireTmp = null;
    render();
    _toast(`✓ ${data.enseignants.length} enseignant(s) enregistré(s)`, true);
  }

  function changerAnnee() {
    const sel = document.getElementById('ann-annee');
    if (!sel) return;
    const nouvelle = sel.value;
    if (!confirm(`Changer l'année scolaire pour ${nouvelle} ?\n\nLes données de l'équipe de direction et des enseignants seront conservées.`)) return;
    const data = _load();
    data.anneeScolaire = nouvelle;
    data.dateMAJ = new Date().toISOString();
    _write(data);
    render();
    _toast(`✓ Année scolaire mise à jour : ${nouvelle}`, true);
  }

  function exporter() {
    const data = _load();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type:'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `annuaire_joliot_${data.anneeScolaire}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importer(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.direction || !data.anneeScolaire) throw new Error('Format invalide');
        if (!confirm(`Importer l'annuaire ${data.anneeScolaire} ?\nCela remplacera les données actuelles.`)) return;
        _write(data);
        render();
        _toast(`✓ Annuaire ${data.anneeScolaire} importé`, true);
      } catch (err) {
        _toast('Erreur : fichier non reconnu', false);
      }
    };
    reader.readAsText(file);
  }

  // ── API publique pour les autres modules ──────────

  /**
   * Cherche un enseignant par nom (correspondance partielle).
   * Utilisé par fiche-action.js pour auto-remplir l'email.
   */
  function chercherEnseignant(nom) {
    const data = _load();
    const q    = (nom || '').toLowerCase().trim();
    return data.enseignants.find(e => e.nom.toLowerCase().includes(q)) || null;
  }

  /**
   * Retourne toutes les données de l'annuaire.
   */
  function getData() { return _load(); }

  // ── Init ──────────────────────────────────────────

  function init() {
    // Sync immédiate vers APP_CONFIG au chargement de la plateforme
    _syncConfig(_load());
    render();
  }

  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);

  return {
    render, init,
    majDirection, sauvegarderDirection,
    majEnseignant, ajouterEnseignant, supprimerEnseignant, sauvegarderEnseignants,
    changerAnnee, exporter, importer,
    chercherEnseignant, getData,
  };

})();
