// ═══════════════════════════════════════════════════
// modules/suivi/suivi.js
//
// TROIS MODES D'ACCÈS :
//
// 1. Vue enseignant (défaut)
//    L'enseignant saisit son email → voit uniquement
//    ses propres fiches avec l'état détaillé du circuit.
//    Garde-fou affiché tant que non accordé + signé.
//
// 2. Vue validateur (✍️ Saisir mon visa)
//    Le CPE / Gestionnaire / Chef saisit son PIN →
//    voit les fiches qui attendent son bon pour accord.
//
// 3. Vue direction (🔐)
//    PIN direction → toutes les fiches, tous les filtres.
// ═══════════════════════════════════════════════════

const Suivi = (() => {

  // ── Statuts ───────────────────────────────────────

  const STATUTS = {
    brouillon:  { label: 'Brouillon',   color: '#64748b', bg: '#f1f5f9', icon: '📝' },
    en_attente: { label: 'En attente',  color: '#1a4f8a', bg: '#e8f0fa', icon: '⏳' },
    accordee:   { label: 'Accordée',    color: '#15803d', bg: '#dcfce7', icon: '✅' },
    refusee:    { label: 'Refusée',     color: '#991b1b', bg: '#fee2e2', icon: '✖' },
  };

  const VISA_STATUTS = {
    en_attente: { label: 'En attente',     color: '#64748b', icon: '⏳' },
    valide:     { label: 'Bon pour accord',color: '#15803d', icon: '✅' },
    refuse:     { label: 'Refusé',         color: '#991b1b', icon: '✖' },
  };

  // ── État interne ──────────────────────────────────

  let _mode             = 'accueil'; // 'accueil' | 'enseignant' | 'direction'
  let _emailEnseignant  = '';
  let _profilConnecte   = null;  // profil UserProfiles actif
  let _filtreStatut  = 'tous';
  let _filtreNom     = '';
  let _modeDirection = false;

  // ── Helpers ───────────────────────────────────────

  function _badge(statut) {
    const s = STATUTS[statut] || STATUTS.brouillon;
    return `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;
      border-radius:12px;font-size:11px;font-weight:700;background:${s.bg};color:${s.color};
      border:1px solid ${s.color}33">${s.icon} ${s.label}</span>`;
  }

  function _fmtDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric' });
  }

  function _fmtDateHeure(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('fr-FR', {
      day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'
    });
  }

  // ── Render principal ──────────────────────────────

  function render() {
    const c = document.getElementById('suivi-content');
    if (!c) return;

    if (_mode === 'accueil' && !_modeDirection) {
      c.innerHTML = _renderAccueil();
      return;
    }

    if (_modeDirection) {
      _renderDirection(c);
      return;
    }

    // Mode enseignant
    _renderEnseignant(c);
  }

  // ══════════════════════════════════════════════════
  // PAGE D'ACCUEIL — choix du mode
  // ══════════════════════════════════════════════════

  function _renderAccueil() {
    return `
      <div style="max-width:560px;margin:0 auto;padding-top:1rem">

        <h2 style="font-size:20px;font-weight:700;color:var(--blue);margin-bottom:.4rem">
          📋 Suivi des demandes
        </h2>
        <p style="font-size:13.5px;color:var(--slate-mid);margin-bottom:2rem">
          Consultez l'état de vos fiches ou accédez à la vue de direction.
        </p>

        <!-- Carte enseignant -->
        <div style="background:var(--white);border:1.5px solid var(--border);border-radius:10px;
                    padding:1.4rem;margin-bottom:1rem">
          <div style="font-size:15px;font-weight:700;color:var(--slate);margin-bottom:.35rem">
            👩‍🏫 Espace personnel
          </div>
          <p style="font-size:13px;color:var(--slate-mid);margin-bottom:1rem">
            Saisissez votre adresse mail académique. Si c'est votre première visite, vous créerez un PIN à 4 chiffres pour vos prochaines connexions.
          </p>
          <div style="display:flex;gap:.5rem;flex-wrap:wrap">
            <input type="email" id="acc-email-ens"
              placeholder="prenom.nom@ac-versailles.fr"
              style="flex:1;min-width:220px;padding:.55rem .75rem;border:1px solid var(--border);
                     border-radius:var(--radius);font-size:14px;font-family:var(--font)"
              onkeydown="if(event.key==='Enter') Suivi.etapeEmail()"
              oninput="Suivi.surSaisieEmail(this.value)">
          </div>
          <!-- Zone PIN — apparaît dynamiquement -->
          <div id="acc-pin-zone" style="display:none;margin-top:.75rem">
            <div id="acc-pin-label" style="font-size:13px;color:var(--slate-mid);margin-bottom:.5rem"></div>
            <div style="display:flex;gap:.5rem;flex-wrap:wrap;align-items:center">
              <input type="password" id="acc-pin-ens" maxlength="4" inputmode="numeric"
                pattern="[0-9]{4}" placeholder="• • • •"
                style="width:120px;padding:.55rem .75rem;border:1px solid var(--border);
                       border-radius:var(--radius);font-size:20px;letter-spacing:.25em;
                       text-align:center;font-family:var(--font)"
                onkeydown="if(event.key==='Enter') Suivi.etapePin()">
              <button class="btn btn-primary" onclick="Suivi.etapePin()" style="white-space:nowrap">
                Accéder →
              </button>
              <button onclick="Suivi.surSaisieEmail('')"
                style="background:none;border:none;color:var(--slate-mid);font-size:12px;
                       cursor:pointer;text-decoration:underline">
                Changer d'email
              </button>
            </div>
          </div>
          <!-- Bouton initial -->
          <div id="acc-email-btn-zone" style="margin-top:.75rem">
            <button class="btn btn-primary" onclick="Suivi.etapeEmail()" style="white-space:nowrap">
              Continuer →
            </button>
          </div>
          <div id="acc-email-err" style="display:none;font-size:12px;color:#991b1b;margin-top:.4rem"></div>
        </div>

        <!-- Carte direction -->
        <div style="background:var(--white);border:1.5px solid var(--border);border-radius:10px;
                    padding:1.4rem;margin-bottom:1rem">
          <div style="font-size:15px;font-weight:700;color:var(--slate);margin-bottom:.35rem">
            🔐 Accès direction
          </div>
          <p style="font-size:13px;color:var(--slate-mid);margin-bottom:1rem">
            Vue complète de toutes les demandes — réservée à la direction.
          </p>
          <div style="display:flex;gap:.5rem;flex-wrap:wrap">
            <input type="password" id="acc-pin-dir"
              placeholder="Code PIN direction"
              maxlength="10"
              style="max-width:200px;padding:.55rem .75rem;border:1px solid var(--border);
                     border-radius:var(--radius);font-size:14px;font-family:var(--font)"
              onkeydown="if(event.key==='Enter') Suivi.accesDirection()">
            <button class="btn btn-secondary" onclick="Suivi.accesDirection()">
              Accéder →
            </button>
          </div>
          <div id="acc-pin-err" style="display:none;font-size:12px;color:#991b1b;margin-top:.4rem"></div>
        </div>

        <!-- Bouton visa -->
        <div style="background:var(--white);border:1.5px solid var(--border);border-radius:10px;
                    padding:1.4rem">
          <div style="font-size:15px;font-weight:700;color:var(--slate);margin-bottom:.35rem">
            ✍️ Saisir mon bon pour accord
          </div>
          <p style="font-size:13px;color:var(--slate-mid);margin-bottom:1rem">
            CPE, Gestionnaire, Chef d'établissement : donnez votre avis sur une fiche en attente.
          </p>
          <button class="btn btn-secondary" onclick="Suivi.ouvrirVisa()">
            Accéder au circuit de validation →
          </button>
        </div>
      </div>`;
  }

  // ══════════════════════════════════════════════════
  // VUE ENSEIGNANT — ses fiches uniquement
  // ══════════════════════════════════════════════════

  function _renderEnseignant(c) {
    const mesDemandes = Store.getAll({ responsable: _emailEnseignant })
      .concat(Store.getAll().filter(d =>
        d.emailResponsable === _emailEnseignant &&
        !Store.getAll({ responsable: _emailEnseignant }).find(x => x.id === d.id)
      ));

    // Déduplique
    const seen = new Set();
    const demandes = mesDemandes.filter(d => {
      if (seen.has(d.id)) return false;
      seen.add(d.id);
      return true;
    }).sort((a, b) => new Date(b.dateMaj) - new Date(a.dateMaj));

    const enAttente = demandes.filter(d => d.statut === 'en_attente').length;
    const accordees = demandes.filter(d => d.statut === 'accordee').length;

    c.innerHTML = `
      <!-- Bandeau identité -->
      <div style="background:var(--blue);color:white;border-radius:10px;padding:1rem 1.25rem;
                  margin-bottom:1.5rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.5rem">
        <div>
          <div style="font-size:15px;font-weight:700">
            ${_profilConnecte?.nom ? `Bonjour, ${_profilConnecte.nom} 👋` : "Mes fiches d'action"}
          </div>
          <div style="font-size:12px;opacity:.8;margin-top:.2rem">${_emailEnseignant}</div>
        </div>
        <div style="display:flex;gap:.5rem;flex-wrap:wrap">
          <button class="btn btn-secondary" onclick="Router.navigate('fiche-action')"
            style="font-size:12px;background:rgba(255,255,255,.15);border-color:rgba(255,255,255,.3);color:white">
            ＋ Nouvelle fiche
          </button>
          <button onclick="Suivi.deconnecterEnseignant()"
            style="background:none;border:1px solid rgba(255,255,255,.3);color:white;
                   border-radius:6px;padding:.35rem .75rem;font-size:12px;cursor:pointer">
            ← Retour
          </button>
        </div>
      </div>

      <!-- Compteurs rapides -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:.65rem;margin-bottom:1.5rem">
        ${_miniCard(demandes.length,   'Total', '#1a4f8a', '#e8f0fa')}
        ${_miniCard(enAttente,         'En attente', '#1a4f8a', '#e8f0fa')}
        ${_miniCard(accordees,         'Accordées', '#15803d', '#dcfce7')}
        ${_miniCard(demandes.filter(d=>d.statut==='refusee').length, 'Refusées', '#991b1b', '#fee2e2')}
      </div>

      ${!demandes.length ? `
        <div style="text-align:center;padding:3rem;color:var(--slate-mid)">
          <div style="font-size:40px;margin-bottom:.75rem">📭</div>
          <p style="font-size:15px;font-weight:600">Aucune fiche trouvée pour cet email</p>
          <p style="font-size:13px;margin-top:.4rem">
            Vérifiez que l'email correspond exactement à celui saisi lors du dépôt de la fiche,
            ou <span onclick="Router.navigate('fiche-action')"
              style="color:var(--blue);cursor:pointer;text-decoration:underline">créez une nouvelle fiche</span>.
          </p>
        </div>` :
        `<div style="display:flex;flex-direction:column;gap:1rem">
          ${demandes.map(d => _renderCarteEnseignant(d)).join('')}
        </div>`
      }`;
  }

  function _miniCard(val, label, color, bg) {
    return `<div style="background:${bg};border:1px solid ${color}33;border-radius:8px;padding:.75rem">
      <div style="font-size:24px;font-weight:700;color:${color}">${val}</div>
      <div style="font-size:11px;color:${color};font-weight:600;text-transform:uppercase;letter-spacing:.04em">${label}</div>
    </div>`;
  }

  // Carte fiche vue par l'enseignant — très visuelle, axée sur "où en est-on"
  function _renderCarteEnseignant(d) {
    const s       = STATUTS[d.statut] || STATUTS.brouillon;
    const prochain = Store.prochainValidateur(d);

    // Message de statut principal
    const msgStatut = {
      brouillon:  { txt: 'Cette fiche est en brouillon — soumettez-la pour démarrer le circuit.', color: '#64748b' },
      en_attente: { txt: `En cours de validation — en attente du bon pour accord de : <strong>${prochain?.config?.label || '...'}</strong>`, color: '#1a4f8a' },
      accordee:   { txt: `Tous les bons pour accord ont été recueillis. <strong>Attendez le document imprimé signé pour que votre projet soit officiellement autorisé.</strong>`, color: '#15803d' },
      refusee:    { txt: `Votre demande a été refusée. Motif : <strong>${d.commentaire || 'non précisé'}</strong>`, color: '#991b1b' },
    }[d.statut] || { txt: '', color: '#64748b' };

    // Garde-fou selon statut
    const gardeFou = d.statut !== 'accordee' && d.statut !== 'brouillon'
      ? `<div style="margin:.75rem 0;background:#fef9c3;border:1px solid #fde047;border-radius:6px;
              padding:.65rem .9rem;font-size:12px;color:#78350f;line-height:1.5">
          ⚠️ <strong>Rappel :</strong> les bons pour accord numériques ne constituent pas une autorisation définitive.
          Votre projet est officiellement accepté uniquement lorsque vous disposez
          <strong>du document imprimé avec les signatures manuscrites</strong> de tous les validateurs.
        </div>`
      : d.statut === 'accordee'
      ? `<div style="margin:.75rem 0;background:#dcfce7;border:1px solid #86efac;border-radius:6px;
              padding:.65rem .9rem;font-size:12px;color:#15803d;line-height:1.5">
          ✅ Circuit numérique terminé. <strong>Votre projet n'est officiellement autorisé qu'une fois
          le document imprimé signé remis par le secrétariat.</strong>
        </div>`
      : '';

    return `
      <div style="background:var(--white);border:1.5px solid ${s.color}44;border-radius:10px;overflow:hidden">

        <!-- En-tête carte -->
        <div style="background:${s.bg};border-bottom:1px solid ${s.color}33;
                    padding:.9rem 1rem;display:flex;align-items:center;gap:.75rem;flex-wrap:wrap">
          <div style="flex:1">
            <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap">
              <span style="font-weight:700;font-size:15px;color:var(--slate)">${d.intitule || '(Sans titre)'}</span>
              ${_badge(d.statut)}
            </div>
            <div style="font-size:12px;color:var(--slate-mid);margin-top:.3rem;display:flex;gap:1rem;flex-wrap:wrap">
              ${d.dateAction ? `<span>📅 ${_fmtDate(d.dateAction)}</span>` : ''}
              ${d.data?.classes ? `<span>🏫 ${d.data.classes}</span>` : ''}
              <span>Soumise le ${_fmtDate(d.dateCreation)}</span>
            </div>
          </div>
        </div>

        <div style="padding:.9rem 1rem">

          <!-- Message statut principal -->
          <div style="font-size:13.5px;color:${msgStatut.color};margin-bottom:.5rem;line-height:1.5">
            ${s.icon} ${msgStatut.txt}
          </div>

          ${gardeFou}

          <!-- Timeline du circuit -->
          ${_renderTimelineEnseignant(d)}

        </div>

        <!-- Actions -->
        <div style="padding:.65rem 1rem;border-top:1px solid var(--border);
                    display:flex;gap:.5rem;flex-wrap:wrap;background:var(--cream)">
          <button class="btn btn-secondary" onclick="Suivi.voirDetailEnseignant('${d.id}')"
            style="font-size:12px;padding:.35rem .85rem">👁 Voir le détail complet</button>
          <button class="btn btn-secondary" onclick="Suivi.regenererPDF('${d.id}')"
            style="font-size:12px;padding:.35rem .85rem">⬇ Télécharger le PDF</button>
          ${d.statut === 'accordee'
            ? `<button class="btn btn-success" onclick="Suivi.telechargerPDFFinal('${d.id}')"
                style="font-size:12px;padding:.35rem .85rem">📄 PDF final avec bons pour accord</button>`
            : ''}
        </div>
      </div>`;
  }

  // Timeline visuelle pour l'enseignant
  function _renderTimelineEnseignant(d) {
    if (!d.visas?.length) return '';

    const steps = d.visas.map((v, i) => {
      const vs = VISA_STATUTS[v.statut] || VISA_STATUTS.en_attente;
      const isLast = i === d.visas.length - 1;
      return `
        <div style="display:flex;align-items:flex-start;gap:.65rem;position:relative">
          <!-- Icône étape -->
          <div style="display:flex;flex-direction:column;align-items:center;flex-shrink:0">
            <div style="width:28px;height:28px;border-radius:50%;background:${vs.color}22;
                        border:2px solid ${vs.color};display:flex;align-items:center;
                        justify-content:center;font-size:13px;flex-shrink:0">
              ${vs.icon}
            </div>
            ${!isLast ? `<div style="width:2px;height:22px;background:var(--border);margin-top:2px"></div>` : ''}
          </div>
          <!-- Contenu étape -->
          <div style="padding-bottom:${isLast?'0':'1rem'};flex:1">
            <div style="font-size:13px;font-weight:600;color:var(--slate)">${v.label}</div>
            <div style="font-size:12px;color:${vs.color};font-weight:600">${vs.label}</div>
            ${v.date ? `<div style="font-size:11px;color:var(--slate-mid)">${_fmtDateHeure(v.date)}</div>` : ''}
            ${v.motif ? `<div style="font-size:12px;color:#991b1b;margin-top:.2rem">Motif : ${v.motif}</div>` : ''}
          </div>
        </div>`;
    });

    return `
      <div style="margin-top:.75rem">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;
                    color:var(--slate-mid);margin-bottom:.75rem">Circuit de validation</div>
        ${steps.join('')}
      </div>`;
  }

  // ══════════════════════════════════════════════════
  // VUE DIRECTION — toutes les fiches
  // ══════════════════════════════════════════════════

  function _renderDirection(c) {
    const stats    = Store.stats();
    const demandes = Store.getAll({
      statut:      _filtreStatut === 'tous' ? undefined : _filtreStatut,
      responsable: _filtreNom || undefined,
    });

    c.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem;flex-wrap:wrap;gap:.75rem">
        <div>
          <h2 style="font-size:18px;font-weight:700;color:var(--blue);margin-bottom:.2rem">
            🔐 Vue direction — Toutes les demandes
          </h2>
          <p style="font-size:13px;color:var(--slate-mid)">${stats.total} demande${stats.total>1?'s':''} au total</p>
        </div>
        <div style="display:flex;gap:.5rem;flex-wrap:wrap">
          <button class="btn btn-secondary" onclick="Router.navigate('fiche-action')" style="font-size:13px">＋ Nouvelle fiche</button>
          <button class="btn btn-secondary" onclick="Suivi.ouvrirVisa()" style="font-size:13px">✍️ Saisir un visa</button>
          <button class="btn btn-secondary" onclick="Store.exportJSON()" style="font-size:13px">⬇ Exporter</button>
          <button class="btn btn-secondary" onclick="Suivi.quitterDirection()" style="font-size:13px;color:var(--accent)">← Quitter</button>
        </div>
      </div>

      <!-- Compteurs filtrables -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:.65rem;margin-bottom:1.25rem">
        ${Object.entries(STATUTS).map(([key, s]) => `
          <div onclick="Suivi.filtrerStatut('${key}')"
               style="background:${s.bg};border:1px solid ${s.color}33;border-radius:8px;
                      padding:.75rem;cursor:pointer;
                      ${_filtreStatut===key?`outline:2px solid ${s.color}`:''}">
            <div style="font-size:22px;font-weight:700;color:${s.color}">${stats[key]??0}</div>
            <div style="font-size:11px;color:${s.color};font-weight:600;text-transform:uppercase;letter-spacing:.04em">${s.label}</div>
          </div>`).join('')}
        <div onclick="Suivi.filtrerStatut('tous')"
             style="background:var(--white);border:1px solid var(--border);border-radius:8px;
                    padding:.75rem;cursor:pointer;${_filtreStatut==='tous'?'outline:2px solid var(--blue)':''}">
          <div style="font-size:22px;font-weight:700;color:var(--blue)">${stats.total}</div>
          <div style="font-size:11px;color:var(--blue);font-weight:600;text-transform:uppercase;letter-spacing:.04em">Toutes</div>
        </div>
      </div>

      <!-- Filtre nom -->
      <div style="margin-bottom:1.25rem">
        <input type="text" class="field-input" id="filtre-nom"
          placeholder="Filtrer par nom d'enseignant…" value="${_filtreNom}"
          style="max-width:300px;font-size:13px;padding:.4rem .75rem">
      </div>

      <div style="display:flex;flex-direction:column;gap:.75rem">
        ${!demandes.length
          ? `<div style="text-align:center;padding:3rem;color:var(--slate-mid)">
               <div style="font-size:36px">📭</div>
               <p style="margin-top:.75rem;font-size:15px;font-weight:600">Aucune demande</p>
             </div>`
          : demandes.map(_renderCarteDirection).join('')
        }
      </div>`;

    document.getElementById('filtre-nom')?.addEventListener('input', e => { _filtreNom = e.target.value; _renderDirection(c); });
  }

  function _renderCarteDirection(d) {
    const prochain = Store.prochainValidateur(d);
    return `
      <div style="background:var(--white);border:1px solid var(--border);border-radius:8px;overflow:hidden">
        <div style="display:flex;align-items:center;gap:.75rem;padding:.85rem 1rem;border-bottom:1px solid var(--border)">
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:.6rem;flex-wrap:wrap">
              <span style="font-weight:700;font-size:14px;color:var(--slate)">${d.intitule || '(Sans titre)'}</span>
              ${_badge(d.statut)}
              ${prochain ? `<span style="font-size:11px;color:var(--blue);background:var(--blue-light);
                padding:2px 7px;border-radius:10px;font-weight:600">⏳ Attend : ${prochain.config.label}</span>` : ''}
            </div>
            <div style="font-size:12px;color:var(--slate-mid);margin-top:.25rem;display:flex;gap:1rem;flex-wrap:wrap">
              <span>👤 ${d.responsable || '—'}</span>
              ${d.dateAction ? `<span>📅 ${_fmtDate(d.dateAction)}</span>` : ''}
              ${d.data?.classes ? `<span>🏫 ${d.data.classes}</span>` : ''}
              <span style="margin-left:auto;font-size:11px">Modifiée ${_fmtDateHeure(d.dateMaj)}</span>
            </div>
          </div>
        </div>
        <!-- Timeline compacte -->
        ${d.visas?.length ? `
          <div style="padding:.6rem 1rem;border-bottom:1px solid var(--border);display:flex;gap:.4rem;flex-wrap:wrap;align-items:center">
            <span style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--slate-mid);margin-right:.25rem">Circuit :</span>
            ${d.visas.map((v, i) => `
              <span style="font-size:12px;color:${VISA_STATUTS[v.statut]?.color||'#888'};font-weight:600">
                ${VISA_STATUTS[v.statut]?.icon} ${v.label}${v.date?` (${_fmtDate(v.date)})`:''}</span>
              ${i<d.visas.length-1?'<span style="color:var(--slate-mid);font-size:11px">→</span>':''}`).join('')}
          </div>` : ''}
        ${d.commentaire ? `<div style="padding:.6rem 1rem;background:#fef9c3;border-bottom:1px solid #fde047;font-size:12px;color:#854d0e">💬 ${d.commentaire}</div>` : ''}
        <div style="display:flex;gap:.5rem;padding:.65rem 1rem;flex-wrap:wrap;align-items:center">
          <button class="btn btn-secondary" onclick="Suivi.voirDetail('${d.id}')" style="font-size:12px;padding:.35rem .85rem">👁 Détail</button>
          <button class="btn btn-secondary" onclick="Suivi.regenererPDF('${d.id}')" style="font-size:12px;padding:.35rem .85rem">⬇ PDF</button>
          ${d.statut==='accordee'?`<button class="btn btn-success" onclick="Suivi.telechargerPDFFinal('${d.id}')" style="font-size:12px;padding:.35rem .85rem">📄 PDF final</button>`:''}
          <button onclick="Suivi.supprimerDemande('${d.id}')" style="margin-left:auto;background:none;border:none;cursor:pointer;color:var(--slate-mid);font-size:12px">🗑</button>
        </div>
      </div>`;
  }

  // ══════════════════════════════════════════════════
  // MODAL VISA
  // ══════════════════════════════════════════════════

  function ouvrirVisa() {
    const demandes = Store.getAll({ statut: 'en_attente' });
    const overlay  = document.createElement('div');
    overlay.id     = 'visa-modal';
    overlay.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:1000;
      display:flex;align-items:center;justify-content:center;padding:1rem;`;

    overlay.innerHTML = `
      <div style="background:var(--white);border-radius:12px;max-width:500px;width:100%;
                  box-shadow:0 8px 32px rgba(0,0,0,.2);overflow:hidden">
        <div style="background:var(--blue);color:white;padding:1rem 1.25rem;
                    display:flex;justify-content:space-between;align-items:center">
          <div style="font-weight:700;font-size:15px">✍️ Bon pour accord</div>
          <button onclick="document.getElementById('visa-modal').remove()"
            style="background:rgba(255,255,255,.2);border:none;color:white;
                   border-radius:6px;padding:.3rem .6rem;cursor:pointer;font-size:16px">✕</button>
        </div>
        <div style="padding:1.25rem;display:flex;flex-direction:column;gap:1rem">

          <div class="field-group">
            <label class="field-label">Je suis</label>
            <select class="field-select" id="visa-role">
              <option value="">-- Choisir mon rôle --</option>
              ${APP_CONFIG.validateurs.map(v => `<option value="${v.role}">${v.label}</option>`).join('')}
            </select>
          </div>

          <div class="field-group">
            <label class="field-label">Code PIN <span class="req">*</span></label>
            <input type="password" class="field-input" id="visa-pin"
              placeholder="Code d'identification" maxlength="10"
              oninput="Suivi._onVisaInput()">
            <div class="field-hint">Usage interne uniquement — pas un outil de sécurité forte.</div>
          </div>

          <div id="visa-demande-group" style="display:none" class="field-group">
            <label class="field-label">Demande à traiter</label>
            <select class="field-select" id="visa-demande" onchange="Suivi._afficherApercuVisa()">
              <option value="">-- Choisir --</option>
            </select>
          </div>

          <div id="visa-apercu" style="display:none;background:var(--blue-pale);
               border:1px solid #bfdbfe;border-radius:6px;padding:.85rem;font-size:13px;line-height:1.6"></div>

          <div id="visa-actions" style="display:none;flex-direction:column;gap:.75rem">
            <div class="field-group">
              <label class="field-label">Motif (obligatoire en cas de refus)</label>
              <textarea class="field-textarea" id="visa-motif" rows="2"
                placeholder="Précisez le motif si vous refusez…" style="min-height:60px"></textarea>
            </div>
            <div style="display:flex;gap:.5rem">
              <button class="btn btn-success" onclick="Suivi._confirmerVisa('valide')" style="flex:1">
                ✅ Bon pour accord
              </button>
              <button class="btn btn-secondary" onclick="Suivi._confirmerVisa('refuse')"
                style="flex:1;color:#991b1b">
                ✖ Refuser
              </button>
            </div>
          </div>

          <div id="visa-error" style="display:none;border-radius:6px;padding:.65rem .85rem;font-size:13px"></div>
        </div>
      </div>`;

    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
    document.getElementById('visa-role')?.addEventListener('change', () => Suivi._onVisaInput());
  }

  function _onVisaInput() {
    const role    = document.getElementById('visa-role')?.value;
    const pin     = document.getElementById('visa-pin')?.value;
    const errEl   = document.getElementById('visa-error');
    const grpEl   = document.getElementById('visa-demande-group');
    const selEl   = document.getElementById('visa-demande');
    const apercuEl= document.getElementById('visa-apercu');
    const actEl   = document.getElementById('visa-actions');

    errEl.style.display='none';
    if (!role || !pin) { grpEl.style.display='none'; return; }

    const v = APP_CONFIG.validateurs.find(x => x.role === role);
    if (!v || v.pin !== pin) {
      if (pin.length >= 4) {
        errEl.style.cssText='display:block;background:#fee2e2;border:1px solid #fca5a5;border-radius:6px;padding:.65rem .85rem;font-size:13px;color:#991b1b';
        errEl.textContent = 'Code PIN incorrect.';
      }
      grpEl.style.display='none'; return;
    }
    errEl.style.display='none';

    const demandes = Store.getAll({statut:'en_attente'}).filter(d => {
      const p = Store.prochainValidateur(d);
      return p && p.config.role === role;
    });

    if (!demandes.length) {
      errEl.style.cssText='display:block;background:#fef9c3;border:1px solid #fde047;border-radius:6px;padding:.65rem .85rem;font-size:13px;color:#854d0e';
      errEl.textContent = 'Aucune demande en attente de votre bon pour accord.';
      grpEl.style.display='none'; apercuEl.style.display='none'; actEl.style.display='none'; return;
    }

    selEl.innerHTML = '<option value="">-- Choisir --</option>'
      + demandes.map(d => `<option value="${d.id}">${d.intitule||'(Sans titre)'} — ${d.responsable}</option>`).join('');
    grpEl.style.display='block';
  }

  function _afficherApercuVisa() {
    const id = document.getElementById('visa-demande')?.value;
    const apercuEl = document.getElementById('visa-apercu');
    const actEl    = document.getElementById('visa-actions');
    if (!id) { apercuEl.style.display='none'; actEl.style.display='none'; return; }
    const d = Store.getById(id);
    if (!d) return;
    apercuEl.style.display='block';
    apercuEl.innerHTML = `
      <strong>${d.intitule}</strong><br>
      Responsable : ${d.responsable}<br>
      Classes : ${d.data?.classes||'—'} · Date : ${_fmtDate(d.dateAction)}<br>
      Type : ${d.data?.types?.join(', ')||'—'}`;
    actEl.style.display='flex';
  }

  function _confirmerVisa(decision) {
    const role  = document.getElementById('visa-role')?.value;
    const id    = document.getElementById('visa-demande')?.value;
    const motif = document.getElementById('visa-motif')?.value.trim();

    if (!role||!id) return;
    if (decision==='refuse' && !motif) {
      const e = document.getElementById('visa-error');
      e.style.cssText='display:block;background:#fee2e2;border:1px solid #fca5a5;border-radius:6px;padding:.65rem .85rem;font-size:13px;color:#991b1b';
      e.textContent='Indiquez un motif pour le refus.'; return;
    }

    const indexCourant = APP_CONFIG.validateurs.findIndex(v => v.role === role);
    const result = Store.enregistrerVisa(id, role, decision, motif);
    if (!result.ok) { alert(result.erreur); return; }

    document.getElementById('visa-modal')?.remove();
    const demande   = result.demande;
    const validateur = APP_CONFIG.validateurs[indexCourant];

    if (decision==='valide') {
      if (result.prochainIdx !== null) {
        EmailService.notifierBonPourAccord(demande, indexCourant, result.prochainIdx);
        EmailService.showResult(`Bon pour accord enregistré ✅ — notification envoyée au ${APP_CONFIG.validateurs[result.prochainIdx].label}.`);
      } else {
        EmailService.notifierAccordFinal(demande);
        EmailService.showResult('Circuit complet — le secrétariat et le responsable ont été notifiés pour impression.');
      }
    } else {
      EmailService.notifierRefus(demande, validateur, motif);
      EmailService.showResult('Refus enregistré — tous les protagonistes ont été notifiés.');
    }

    render();
  }

  // ══════════════════════════════════════════════════
  // MODALS DÉTAIL
  // ══════════════════════════════════════════════════

  function voirDetail(id) { _modalDetail(id, true); }
  function voirDetailEnseignant(id) { _modalDetail(id, false); }

  function _modalDetail(id, modeDir) {
    const d = Store.getById(id);
    if (!d) return;
    const overlay = document.createElement('div');
    overlay.style.cssText=`position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:1000;
      display:flex;align-items:flex-start;justify-content:center;padding:2rem 1rem;overflow-y:auto;`;
    overlay.innerHTML = `
      <div style="background:var(--white);border-radius:12px;max-width:660px;width:100%;
                  box-shadow:0 8px 32px rgba(0,0,0,.2)">
        <div style="background:var(--blue);color:white;padding:1rem 1.25rem;
                    border-radius:12px 12px 0 0;display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-weight:700;font-size:15px">${d.intitule||'—'}</div>
            <div style="font-size:12px;opacity:.8">${d.responsable} · Créée le ${_fmtDate(d.dateCreation)}</div>
          </div>
          <button onclick="this.closest('[style]').remove()"
            style="background:rgba(255,255,255,.2);border:none;color:white;border-radius:6px;
                   padding:.3rem .6rem;cursor:pointer;font-size:16px">✕</button>
        </div>
        <div style="padding:1.25rem;display:flex;flex-direction:column;gap:1rem;font-size:13.5px">
          ${_badge(d.statut)}

          <!-- Timeline complète -->
          ${d.visas?.length ? `
            <div>
              <div style="font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.08em;
                          color:var(--slate-mid);margin-bottom:.65rem">Circuit de validation</div>
              ${d.visas.map(v => `
                <div style="display:flex;align-items:center;gap:.65rem;padding:.5rem 0;
                            border-bottom:1px solid var(--border)">
                  <span style="font-weight:600;min-width:160px">${v.label}</span>
                  <span style="color:${VISA_STATUTS[v.statut]?.color||'#888'};font-weight:600">
                    ${VISA_STATUTS[v.statut]?.icon} ${VISA_STATUTS[v.statut]?.label||'—'}</span>
                  ${v.date?`<span style="font-size:12px;color:var(--slate-mid)">${_fmtDate(v.date)}</span>`:''}
                  ${v.motif?`<span style="font-size:12px;color:#991b1b">— ${v.motif}</span>`:''}
                </div>`).join('')}
            </div>` : ''}

          <!-- Infos fiche -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem;font-size:13px">
            ${[['Intitulé',d.intitule],['Responsable',d.responsable],['Classes',d.data?.classes],
               ['Date',_fmtDate(d.dateAction)],['Type',d.data?.types?.join(', ')],
               ['Destination',d.data?.destination]].filter(([,v])=>v).map(([l,v])=>
              `<div><span style="color:var(--slate-mid);font-weight:600">${l} : </span>${v}</div>`).join('')}
          </div>

          ${d.data?.description?`<div><strong>Description :</strong><br><span style="color:var(--slate-mid)">${d.data.description}</span></div>`:''}
          ${d.commentaire?`<div style="background:#fef9c3;border:1px solid #fde047;border-radius:6px;padding:.7rem 1rem;color:#854d0e"><strong>Motif de refus :</strong> ${d.commentaire}</div>`:''}

          <!-- Garde-fou enseignant -->
          <div style="background:#fef9c3;border:1px solid #fde047;border-radius:6px;
                      padding:.75rem 1rem;font-size:12.5px;color:#78350f">
            ⚠️ <strong>Rappel :</strong> les bons pour accord numériques ne remplacent pas
            les signatures manuscrites. Le projet est officiellement autorisé uniquement
            après réception du document imprimé signé.
          </div>
        </div>
      </div>`;
    overlay.addEventListener('click', e => { if(e.target===overlay) overlay.remove(); });
    document.body.appendChild(overlay);
  }

  // ══════════════════════════════════════════════════
  // PDF
  // ══════════════════════════════════════════════════

  function regenererPDF(id) {
    const d = Store.getById(id);
    if (!d?.data) { alert('Données introuvables.'); return; }
    const pdf = PDFGenerator.genererFicheAction(d.data, d);
    pdf.save(PDFGenerator.makeFilename('fiche_action', d.intitule));
  }

  function telechargerPDFFinal(id) {
    const d = Store.getById(id);
    if (!d) return;
    const pdf = PDFGenerator.genererFicheAction(d.data || {}, d);
    pdf.save(PDFGenerator.makeFilename('fiche_action_signee', d.intitule));
  }

  // ══════════════════════════════════════════════════
  // NAVIGATION
  // ══════════════════════════════════════════════════

  // ── Étape 1 : l'email est saisi ─────────────────

  function surSaisieEmail(val) {
    // Réinitialise la zone PIN quand l'email change
    const pinZone   = document.getElementById('acc-pin-zone');
    const btnZone   = document.getElementById('acc-email-btn-zone');
    const errEl     = document.getElementById('acc-email-err');
    if (errEl)   errEl.style.display = 'none';
    if (!val || !val.includes('@')) {
      if (pinZone) pinZone.style.display = 'none';
      if (btnZone) btnZone.style.display = 'block';
    }
  }

  async function etapeEmail() {
    const email = document.getElementById('acc-email-ens')?.value.trim().toLowerCase();
    const errEl = document.getElementById('acc-email-err');
    const pinZone   = document.getElementById('acc-pin-zone');
    const pinLabel  = document.getElementById('acc-pin-label');
    const btnZone   = document.getElementById('acc-email-btn-zone');

    if (!email || !email.includes('@')) {
      errEl.style.display = 'block';
      errEl.textContent   = 'Saisissez une adresse email valide.';
      return;
    }
    errEl.style.display = 'none';

    const dejaConnu = UserProfiles.existe(email);

    // Affiche la zone PIN adaptée
    if (pinLabel) {
      pinLabel.innerHTML = dejaConnu
        ? `Bienvenue ! Saisissez votre <strong>PIN à 4 chiffres</strong> pour accéder à vos dossiers.`
        : `Première visite — créez un <strong>PIN à 4 chiffres</strong> pour sécuriser votre espace personnel.<br>
           <span style="font-size:11px;color:var(--slate-mid)">
             Ce PIN vous permettra de vous connecter rapidement lors de vos prochaines visites.
           </span>`;
    }

    if (pinZone) pinZone.style.display = 'block';
    if (btnZone) btnZone.style.display = 'none';
    document.getElementById('acc-pin-ens')?.focus();
  }

  // ── Étape 2 : le PIN est saisi ───────────────────

  async function etapePin() {
    const email  = document.getElementById('acc-email-ens')?.value.trim().toLowerCase();
    const pin    = document.getElementById('acc-pin-ens')?.value.trim();
    const errEl  = document.getElementById('acc-email-err');

    if (!pin || !/^\d{4}$/.test(pin)) {
      errEl.style.display = 'block';
      errEl.textContent   = 'Le PIN doit contenir exactement 4 chiffres.';
      return;
    }
    errEl.style.display = 'none';

    const dejaConnu = UserProfiles.existe(email);

    if (dejaConnu) {
      // Vérification PIN existant
      const result = await UserProfiles.verifierPin(email, pin);
      if (!result.ok) {
        errEl.style.display = 'block';
        errEl.textContent   = result.erreur;
        document.getElementById('acc-pin-ens').value = '';
        document.getElementById('acc-pin-ens')?.focus();

        // Lien "PIN oublié" si erreur
        if (!document.getElementById('pin-oublie-link')) {
          const lien = document.createElement('div');
          lien.id = 'pin-oublie-link';
          lien.style.cssText = 'font-size:12px;margin-top:.4rem';
          lien.innerHTML = `<span onclick="Suivi.pinOublie('${email}')"
            style="color:var(--blue);cursor:pointer;text-decoration:underline">
            PIN oublié ? Réinitialiser mon accès</span>`;
          errEl.insertAdjacentElement('afterend', lien);
        }
        return;
      }
      _profilConnecte = result.profil;
    } else {
      // Nouveau profil — pop-up confirmation
      await _popupCreationProfil(email, pin);
      return;
    }

    _emailEnseignant = email;
    _mode = 'enseignant';
    render();
  }

  // ── Pop-up création de profil ────────────────────

  async function _popupCreationProfil(email, pin) {
    const overlay = document.createElement('div');
    overlay.id    = 'profil-creation-modal';
    overlay.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:2000;
      display:flex;align-items:center;justify-content:center;padding:1rem;`;

    overlay.innerHTML = `
      <div style="background:white;border-radius:14px;max-width:420px;width:100%;
                  box-shadow:0 12px 40px rgba(0,0,0,.25);overflow:hidden">

        <!-- En-tête -->
        <div style="background:var(--blue);padding:1.25rem 1.4rem">
          <div style="font-size:17px;font-weight:700;color:white;margin-bottom:.3rem">
            🔑 Créer votre espace personnel
          </div>
          <div style="font-size:12.5px;color:rgba(255,255,255,.8)">
            Première connexion — quelques secondes suffiront
          </div>
        </div>

        <div style="padding:1.4rem;display:flex;flex-direction:column;gap:1rem">

          <!-- Email (lecture seule) -->
          <div>
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;
                        letter-spacing:.08em;color:var(--slate-mid);margin-bottom:.35rem">
              Votre email
            </div>
            <div style="font-size:14px;font-weight:600;color:var(--slate);
                        background:var(--cream);padding:.55rem .75rem;border-radius:6px">
              ${email}
            </div>
          </div>

          <!-- Nom -->
          <div>
            <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;
                          letter-spacing:.08em;color:var(--slate-mid);margin-bottom:.35rem"
                   for="profil-nom">
              Votre nom complet
            </label>
            <input type="text" id="profil-nom" class="field-input"
              placeholder="Prénom NOM" style="font-size:14px">
          </div>

          <!-- PIN choisi -->
          <div>
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;
                        letter-spacing:.08em;color:var(--slate-mid);margin-bottom:.35rem">
              PIN choisi
            </div>
            <div style="display:flex;gap:8px;justify-content:center;margin:auto">
              ${[0,1,2,3].map(i =>
                `<div style="width:44px;height:52px;border:2px solid var(--blue);border-radius:8px;
                             display:flex;align-items:center;justify-content:center;
                             font-size:22px;font-weight:700;color:var(--blue);background:var(--blue-light)">
                  ${pin[i] ? '●' : ''}
                </div>`).join('')}
            </div>
            <div style="font-size:12px;color:var(--slate-mid);text-align:center;margin-top:.5rem">
              PIN : ${pin[0]}${pin[1]}${pin[2]}${pin[3]}
              <br><span style="font-size:11px">Mémorisez ces 4 chiffres — ils ne pourront pas être récupérés.</span>
            </div>
          </div>

          <!-- Note sécurité -->
          <div style="background:var(--blue-pale);border:1px solid #bfdbfe;border-radius:6px;
                      padding:.75rem 1rem;font-size:12px;color:var(--blue);line-height:1.5">
            ℹ️ Ce PIN est chiffré avant d'être sauvegardé sur cet appareil.
            Il donne accès uniquement à <strong>vos propres fiches</strong> sur ce navigateur.
            En cas d'oubli, vous pouvez réinitialiser votre accès depuis la page de connexion.
          </div>

          <div id="profil-err" style="display:none;font-size:12px;color:#991b1b"></div>

          <div style="display:flex;gap:.5rem">
            <button class="btn btn-secondary" onclick="document.getElementById('profil-creation-modal').remove()"
              style="flex:1">Annuler</button>
            <button class="btn btn-success" onclick="Suivi._confirmerCreationProfil('${email}','${pin}')"
              style="flex:1;font-size:14px">✓ Créer mon espace</button>
          </div>
        </div>
      </div>`;

    document.body.appendChild(overlay);
    document.getElementById('profil-nom')?.focus();
  }

  async function _confirmerCreationProfil(email, pin) {
    const nom    = document.getElementById('profil-nom')?.value.trim();
    const errEl  = document.getElementById('profil-err');

    if (!nom) {
      errEl.style.display = 'block';
      errEl.textContent   = 'Indiquez votre nom complet.';
      return;
    }

    const result = await UserProfiles.creerProfil(email, nom, pin);
    if (!result.ok) {
      errEl.style.display = 'block';
      errEl.textContent   = result.erreur;
      return;
    }

    document.getElementById('profil-creation-modal')?.remove();
    _profilConnecte  = UserProfiles.getProfil(email);
    _emailEnseignant = email;
    _mode = 'enseignant';
    render();
  }

  // ── PIN oublié ───────────────────────────────────

  function pinOublie(email) {
    const confirm1 = confirm(
      `Réinitialiser votre accès pour ${email} ?\n\n` +
      `Vous pourrez créer un nouveau PIN à votre prochaine connexion.\n` +
      `Vos fiches d'action ne seront pas supprimées.`
    );
    if (!confirm1) return;
    UserProfiles.reinitialiserProfil(email);
    document.getElementById('pin-oublie-link')?.remove();
    const errEl = document.getElementById('acc-email-err');
    if (errEl) { errEl.style.display='block'; errEl.style.color='#15803d'; errEl.textContent='Profil réinitialisé — saisissez un nouveau PIN à la prochaine connexion.'; }
    document.getElementById('acc-pin-zone').style.display    = 'none';
    document.getElementById('acc-email-btn-zone').style.display = 'block';
    document.getElementById('acc-email-ens').value = '';
    document.getElementById('acc-email-ens')?.focus();
  }

  function deconnecterEnseignant() {
    _emailEnseignant = '';
    _profilConnecte  = null;
    _mode = 'accueil';
    render();
  }

  function accesDirection() {
    const pin = document.getElementById('acc-pin-dir')?.value
             || prompt('Code PIN direction :');
    if (pin === APP_CONFIG.direction.pin) {
      _modeDirection = true; _filtreNom=''; render();
    } else if (pin !== null) {
      const e = document.getElementById('acc-pin-err');
      if (e) { e.style.display='block'; e.textContent='Code PIN incorrect.'; }
      else alert('Code PIN incorrect.');
    }
  }

  function quitterDirection() { _modeDirection=false; _mode='accueil'; render(); }
  function filtrerStatut(s)   { _filtreStatut=s; render(); }
  function supprimerDemande(id) { if(confirm('Supprimer définitivement ?')) { Store.remove(id); render(); } }

  // ── Init ──────────────────────────────────────────

  function init() {
    _mode='accueil'; _modeDirection=false;
    _emailEnseignant=''; _filtreStatut='tous'; _filtreNom='';
    render();
  }

  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);

  return {
    render, init, filtrerStatut,
    surSaisieEmail, etapeEmail, etapePin,
    deconnecterEnseignant, pinOublie,
    _confirmerCreationProfil,
    accesDirection, quitterDirection,
    ouvrirVisa, voirDetail, voirDetailEnseignant,
    regenererPDF, telechargerPDFFinal, supprimerDemande,
    _onVisaInput, _afficherApercuVisa, _confirmerVisa,
  };

})();
