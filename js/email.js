// ═══════════════════════════════════════════════════
// email.js — Service d'envoi via Formspree
//
// POURQUOI PAS EMAILJS POUR LES PIÈCES JOINTES ?
// EmailJS ne supporte pas les fichiers binaires en
// pièce jointe depuis le navigateur. Il enverrait
// du base64 brut dans le corps du mail — illisible.
//
// SOLUTION RETENUE : Formspree (gratuit, 50 soumissions/mois)
// → envoie toutes les données de la fiche par mail
// → le PDF est téléchargé simultanément côté enseignant
// → la direction reçoit un mail complet + l'enseignant
//   joint le PDF téléchargé si nécessaire.
//
// POUR ACTIVER :
// 1. Créer un compte sur https://formspree.io
// 2. Créer un formulaire → copier l'endpoint (ex: https://formspree.io/f/xpzgkwqr)
// 3. Renseigner APP_CONFIG.formspree.endpoint dans js/config.js
// ═══════════════════════════════════════════════════

const EmailService = (() => {

  /**
   * Envoie les données de la fiche via Formspree
   * et déclenche simultanément le téléchargement du PDF.
   *
   * @param {Object} params
   * @param {string} params.fromName   — Nom de l'enseignant
   * @param {string} params.subject    — Intitulé de l'action
   * @param {string} params.body       — Récapitulatif texte
   * @param {Object} params.data       — Données complètes du formulaire
   * @returns {Promise<{ok: boolean, error?: string}>}
   */
  async function send({ fromName, subject, body, data }) {

    const endpoint = APP_CONFIG.formspree?.endpoint;

    if (!endpoint || endpoint.startsWith('VOTRE_')) {
      return {
        ok: false,
        error: 'Formspree non configuré. Renseignez APP_CONFIG.formspree.endpoint dans js/config.js.',
      };
    }

    // Construction du corps du mail — toutes les données lisibles
    const details = _buildEmailBody(data);

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          _subject:       `[Fiche d'action] ${subject}`,
          _replyto:       data.emailEnseignant || '',
          Responsable:    fromName,
          Intitulé:       subject,
          Classes:        data.classes || '',
          'Date départ':  data.dateDepart || '',
          'Heure départ': data.heureDepart || '',
          'Date retour':  data.dateRetour || '',
          Destination:    data.destination || '',
          Description:    data.description || '',
          Détails:        details,
          '--- Note ---':  'Le PDF complet a été téléchargé automatiquement par l\'enseignant.',
        }),
      });

      if (res.ok) {
        return { ok: true };
      } else {
        const json = await res.json().catch(() => ({}));
        return { ok: false, error: json.error || `Erreur HTTP ${res.status}` };
      }
    } catch (err) {
      return { ok: false, error: err.message || 'Erreur réseau' };
    }
  }

  // Construit un résumé texte de toutes les données
  function _buildEmailBody(d) {
    const lines = [];

    if (d.types?.length)       lines.push(`Type : ${d.types.join(', ')}`);
    if (d.axes?.length)        lines.push(`Axes projet : ${d.axes.join(' | ')}`);
    if (d.parcours?.length)    lines.push(`Parcours : ${d.parcours.join(', ')}`);
    if (d.disciplines?.length) lines.push(`Disciplines : ${d.disciplines.join(', ')}`);
    if (d.objectifsPeda)       lines.push(`Objectifs pédagogiques : ${d.objectifsPeda}`);
    if (d.domaines?.length)    lines.push(`Compétences socle : ${d.domaines.join(', ')}`);

    if (d.accompagnateurs?.length) {
      lines.push('Accompagnateurs :');
      d.accompagnateurs.forEach(a => lines.push(`  - ${a.nom} | ${a.classes} | ${a.heures}`));
    }
    if (d.autresPersonnels) lines.push(`Autres personnels : ${d.autresPersonnels}`);
    if (d.aed)              lines.push(`AED : ${d.aed}`);
    if (d.parents)          lines.push(`Parents : ${d.parents}`);

    if (d.budget)           lines.push(`Budget : ${d.budget} €`);
    if (d.budgetDetail)     lines.push(`Détail budget : ${d.budgetDetail}`);
    if (d.transports?.length) lines.push(`Transport : ${d.transports.join(', ')}`);
    if (d.financements?.length) lines.push(`Financements : ${d.financements.join(', ')}`);

    if (d.criteres?.length) {
      lines.push('Critères évaluation :');
      d.criteres.forEach((c, i) => lines.push(`  ${i+1}. ${c.libelle} — Cible : ${c.cible}`));
    }

    return lines.join('\n');
  }

  /**
   * Affiche le bandeau résultat dans la page.
   */
  function showResult(ok, containerId) {
    const el = document.getElementById(containerId || 'send-result');
    if (!el) return;
    el.className = ok ? 'send-result success show' : 'send-result error show';
    el.innerHTML = ok
      ? `✅ Données envoyées à <strong>${APP_CONFIG.etablissement.email}</strong>. Le PDF a été téléchargé — joignez-le si nécessaire.`
      : `⚠️ Envoi impossible (vérifiez la connexion ou la configuration Formspree). Le PDF a bien été téléchargé.`;
    window.scrollTo(0, 0);
    setTimeout(() => el.classList.remove('show'), 10000);
  }

  return { send, showResult };
})();
