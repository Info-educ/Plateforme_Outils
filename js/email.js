// ═══════════════════════════════════════════════════
// email.js — Service d'envoi de mail (EmailJS)
// Pour activer : configurer APP_CONFIG.emailjs
// dans js/config.js après inscription sur emailjs.com
// ═══════════════════════════════════════════════════

const EmailService = (() => {

  let _initialized = false;

  function _init() {
    if (_initialized) return;
    if (typeof emailjs === 'undefined') {
      console.warn('EmailJS non chargé. Ajoutez le script dans index.html.');
      return;
    }
    const key = APP_CONFIG.emailjs.publicKey;
    if (!key || key.startsWith('VOTRE_')) {
      console.warn('EmailJS : clé publique non configurée dans js/config.js');
      return;
    }
    emailjs.init(key);
    _initialized = true;
  }

  /**
   * Envoie un email avec le PDF en pièce jointe.
   *
   * @param {Object} params
   * @param {string} params.fromName    — Nom de l'expéditeur (enseignant)
   * @param {string} params.subject     — Objet du mail
   * @param {string} params.body        — Corps du mail (texte)
   * @param {string} params.pdfBase64   — PDF encodé en base64 (doc.output('datauristring'))
   * @param {string} [params.toEmail]   — Destinataire (défaut : config)
   * @returns {Promise<{ok: boolean, error?: string}>}
   */
  async function send({ fromName, subject, body, pdfBase64, toEmail }) {
    _init();

    if (!_initialized) {
      return {
        ok: false,
        error: 'EmailJS non configuré. Vérifiez js/config.js et la documentation.',
      };
    }

    const to = toEmail || APP_CONFIG.destinataires[0];
    const cfg = APP_CONFIG.emailjs;

    try {
      await emailjs.send(cfg.serviceId, cfg.templateId, {
        to_email:    to,
        from_name:   fromName,
        subject:     subject,
        message:     body,
        pdf_content: pdfBase64,
      });
      return { ok: true };
    } catch (err) {
      console.error('EmailJS error:', err);
      return { ok: false, error: err.text || err.message || 'Erreur inconnue' };
    }
  }

  /**
   * Affiche le toast de confirmation ou d'erreur.
   */
  function showResult(ok, container) {
    const el = document.getElementById(container || 'send-result');
    if (!el) return;
    el.className = ok ? 'send-result success show' : 'send-result error show';
    el.innerHTML = ok
      ? `✅ Fiche envoyée à <strong>${APP_CONFIG.etablissement.email}</strong>`
      : `⚠️ Envoi impossible. Le PDF a été téléchargé — transmettez-le manuellement.`;
    setTimeout(() => el.classList.remove('show'), 8000);
  }

  return { send, showResult };
})();
