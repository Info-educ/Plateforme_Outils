// ═══════════════════════════════════════════════════
// email.js — Notifications mailto: circuit de visa
//
// Tous les mails sont courts, directs, factuels.
// La plateforme est l'outil de traçabilité ;
// le document officiel reste le PDF imprimé signé.
// ═══════════════════════════════════════════════════

const EmailService = (() => {

  function _fmtDate(str) {
    if (!str) return '—';
    const [y, m, d] = str.split('-');
    return `${d}/${m}/${y}`;
  }

  // Ouvre le client mail — délai 300ms entre deux appels
  // pour éviter que le navigateur ne bloque le second
  let _mailQueue = [];
  let _mailTimer = null;

  function _mailto(to, subject, body) {
    const url = `mailto:${encodeURIComponent(to)}`
      + `?subject=${encodeURIComponent(subject)}`
      + `&body=${encodeURIComponent(body)}`;
    window.location.href = url;
  }

  function _infoFiche(d) {
    return [
      `Intitulé  : ${d.intitule  || '—'}`,
      `Classes   : ${d.classes   || '—'}`,
      `Date      : ${d.dateDepart ? _fmtDate(d.dateDepart) : '—'}`,
      `Type      : ${d.types?.join(', ') || '—'}`,
      `Destination : ${d.destination || '—'}`,
    ].join('\n');
  }

  function _emailParRole(role) {
    return APP_CONFIG.validateurs.find(v => v.role === role)?.email || '';
  }

  // ─────────────────────────────────────────────────
  // 1. SOUMISSION → 1er validateur (CPE)
  // ─────────────────────────────────────────────────
  function notifierSoumission(demande) {
    const v    = APP_CONFIG.validateurs[0];
    const d    = demande.data;

    _mailto(
      v.email,
      `[Bon pour accord requis] ${d.intitule || 'Fiche d\'action'}`,
      [
        `Bonjour,`,
        ``,
        `${demande.responsable} a soumis une fiche d'action`,
        `qui attend votre bon pour accord.`,
        ``,
        _infoFiche(d),
        ``,
        `→ Connectez-vous à la plateforme (module "Suivi des demandes")`,
        `  pour donner votre bon pour accord ou refuser la demande.`,
        ``,
        `Note : votre accord dans la plateforme ne remplace pas`,
        `la signature manuscrite sur le document imprimé final.`,
        ``,
        `Cordialement,`,
        `Plateforme numérique — ${APP_CONFIG.etablissement.nom}`,
      ].join('\n')
    );
  }

  // ─────────────────────────────────────────────────
  // 2. BON POUR ACCORD → validateur suivant + copies
  // ─────────────────────────────────────────────────
  function notifierBonPourAccord(demande, indexCourant, indexSuivant) {
    const vCourant  = APP_CONFIG.validateurs[indexCourant];
    const vSuivant  = APP_CONFIG.validateurs[indexSuivant];
    const d         = demande.data;

    // Destinataires : suivant + éventuelles copies configurées
    const copies = (vCourant.notifierA || [])
      .map(_emailParRole)
      .filter(e => e && e !== vSuivant.email);

    const to = [vSuivant.email, ...copies].filter(Boolean).join(',');

    // Historique des accords déjà donnés
    const accordes = demande.visas
      .filter(v => v.statut === 'valide')
      .map(v => `  ✓ Bon pour accord — ${v.label} (${_fmtDate(v.date)})`)
      .join('\n');

    _mailto(
      to,
      `[Bon pour accord requis] ${d.intitule || 'Fiche d\'action'}`,
      [
        `Bonjour,`,
        ``,
        `La fiche d'action suivante attend votre bon pour accord.`,
        ``,
        _infoFiche(d),
        ``,
        `Accords déjà recueillis :`,
        accordes,
        ``,
        `→ Connectez-vous à la plateforme (module "Suivi des demandes")`,
        `  pour donner votre bon pour accord ou refuser la demande.`,
        ``,
        `Note : votre accord dans la plateforme ne remplace pas`,
        `la signature manuscrite sur le document imprimé final.`,
        ``,
        `Cordialement,`,
        `Plateforme numérique — ${APP_CONFIG.etablissement.nom}`,
      ].join('\n')
    );
  }

  // ─────────────────────────────────────────────────
  // 3. REFUS → tous les validateurs + responsable
  // ─────────────────────────────────────────────────
  function notifierRefus(demande, validateur, motif) {
    const d    = demande.data;
    const tous = APP_CONFIG.validateurs.map(v => v.email);
    const to   = [...new Set([...tous, demande.emailResponsable || ''])].filter(Boolean).join(',');

    _mailto(
      to,
      `[Refus] ${d.intitule || 'Fiche d\'action'} — ${validateur.label}`,
      [
        `Bonjour,`,
        ``,
        `La fiche d'action ci-dessous a été refusée.`,
        ``,
        _infoFiche(d),
        ``,
        `Refusée par : ${validateur.label}`,
        `Motif       : ${motif || 'Non précisé'}`,
        ``,
        `Le responsable de l'action (${demande.responsable})`,
        `et l'ensemble des parties prenantes sont informés.`,
        ``,
        `Cordialement,`,
        `Plateforme numérique — ${APP_CONFIG.etablissement.nom}`,
      ].join('\n')
    );
  }

  // ─────────────────────────────────────────────────
  // 4. ACCORD FINAL → secrétariat (impression)
  //                 + responsable de l'action
  // ─────────────────────────────────────────────────
  function notifierAccordFinal(demande) {
    const d         = demande.data;
    const secretariat = APP_CONFIG.secretariat;
    const emailResp   = demande.emailResponsable || '';

    // Liste complète des "Bon pour accord"
    const accords = demande.visas
      .filter(v => v.statut === 'valide')
      .map(v => `  ✓ Bon pour accord — ${v.label} (${_fmtDate(v.date)})`)
      .join('\n');

    const tous = APP_CONFIG.validateurs.map(v => v.email);
    const to   = [...new Set([secretariat.email, emailResp, ...tous])].filter(Boolean).join(',');

    _mailto(
      to,
      `[À imprimer] Fiche d'action accordée — ${d.intitule || '—'}`,
      [
        `Bonjour,`,
        ``,
        `La fiche d'action suivante a reçu tous les bons pour accord.`,
        ``,
        _infoFiche(d),
        `Responsable : ${demande.responsable}`,
        ``,
        `Bons pour accord recueillis :`,
        accords,
        ``,
        `──────────────────────────────────────────`,
        `ACTION REQUISE — ${secretariat.label.toUpperCase()} :`,
        `Merci d'imprimer le document final disponible dans`,
        `la plateforme (module "Suivi des demandes" → PDF final)`,
        `et de le transmettre pour signature manuscrite à :`,
        APP_CONFIG.validateurs.map(v => `  • ${v.label}`).join('\n'),
        `  • ${demande.responsable} (responsable de l'action)`,
        `──────────────────────────────────────────`,
        ``,
        `Note : les bons pour accord enregistrés dans la plateforme`,
        `ne remplacent pas les signatures manuscrites sur le document.`,
        ``,
        `Cordialement,`,
        `Plateforme numérique — ${APP_CONFIG.etablissement.nom}`,
      ].join('\n')
    );
  }

  // ─────────────────────────────────────────────────
  // Bandeau résultat dans la page
  // ─────────────────────────────────────────────────
  function showResult(message, containerId) {
    const el = document.getElementById(containerId || 'send-result');
    if (!el) return;
    el.className = 'send-result success show';
    el.innerHTML = `📬 ${message}`;
    window.scrollTo(0, 0);
    setTimeout(() => el.classList.remove('show'), 12000);
  }

  // Compatibilité appel initial depuis fiche-action.js
  function send({ fromName, subject, data }) {
    notifierSoumission({ responsable: fromName, data, visas: [] });
    return { ok: true };
  }

  return {
    send,
    notifierSoumission,
    notifierBonPourAccord,
    notifierRefus,
    notifierAccordFinal,
    showResult,
  };
})();
