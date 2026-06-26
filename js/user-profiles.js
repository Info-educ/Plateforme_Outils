// ═══════════════════════════════════════════════════
// user-profiles.js — Profils personnels avec PIN
//
// Chaque membre du personnel qui saisit son email
// pour la première fois se voit proposer de créer
// un PIN à 4 chiffres. Lors des connexions suivantes,
// il saisit uniquement son PIN — l'email est reconnu
// automatiquement.
//
// Stockage : localStorage, clé 'joliot_profils_v1'
//
// Structure d'un profil :
// {
//   email:       string  — adresse académique (clé unique)
//   nom:         string  — nom affiché
//   pin:         string  — 4 chiffres (hashé en SHA-256)
//   dateCreation:string  — ISO
//   dateDerniere:string  — ISO dernière connexion
// }
//
// ⚠️  Le PIN est hashé (SHA-256) avant stockage.
//     Il n'est jamais stocké en clair.
//     Il ne donne accès qu'aux fiches de l'utilisateur —
//     ce n'est pas une sécurité forte (usage interne).
// ═══════════════════════════════════════════════════

const UserProfiles = (() => {

  const KEY = 'joliot_profils_v1';

  // ── Lecture / écriture ────────────────────────────

  function _read() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); }
    catch { return {}; }
  }

  function _write(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  // ── Hash PIN (SHA-256 via Web Crypto API) ─────────

  async function _hashPin(pin) {
    const encoded = new TextEncoder().encode(pin + '_joliot_salt');
    const hash    = await crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // ── API publique ──────────────────────────────────

  /**
   * Vérifie si un email a déjà un profil.
   */
  function existe(email) {
    return !!(email && _read()[email.toLowerCase()]);
  }

  /**
   * Retourne le profil d'un email (sans le hash PIN).
   */
  function getProfil(email) {
    const p = _read()[email?.toLowerCase()];
    if (!p) return null;
    return { email: p.email, nom: p.nom, dateDerniere: p.dateDerniere };
  }

  /**
   * Crée un profil pour un email donné.
   * @param {string} email
   * @param {string} nom
   * @param {string} pin   — 4 chiffres en clair (sera hashé)
   * @returns {Promise<{ok:boolean, erreur?:string}>}
   */
  async function creerProfil(email, nom, pin) {
    if (!email || !email.includes('@')) return { ok: false, erreur: 'Email invalide.' };
    if (!pin || !/^\d{4}$/.test(pin))   return { ok: false, erreur: 'Le PIN doit contenir exactement 4 chiffres.' };

    const hash    = await _hashPin(pin);
    const profils = _read();
    const key     = email.toLowerCase();

    profils[key] = {
      email:        email.toLowerCase(),
      nom:          nom || email,
      pinHash:      hash,
      dateCreation: new Date().toISOString(),
      dateDerniere: new Date().toISOString(),
    };

    _write(profils);
    return { ok: true };
  }

  /**
   * Vérifie le PIN d'un email.
   * @returns {Promise<{ok:boolean, profil?:object, erreur?:string}>}
   */
  async function verifierPin(email, pin) {
    const profils = _read();
    const p       = profils[email?.toLowerCase()];

    if (!p)   return { ok: false, erreur: 'Aucun profil trouvé pour cet email.' };
    if (!pin) return { ok: false, erreur: 'Saisissez votre PIN.' };

    const hash = await _hashPin(pin);
    if (hash !== p.pinHash) return { ok: false, erreur: 'PIN incorrect.' };

    // Met à jour la date de dernière connexion
    p.dateDerniere = new Date().toISOString();
    profils[email.toLowerCase()] = p;
    _write(profils);

    return { ok: true, profil: getProfil(email) };
  }

  /**
   * Change le PIN d'un profil existant.
   * Nécessite l'ancien PIN pour valider.
   */
  async function changerPin(email, ancienPin, nouveauPin) {
    const verif = await verifierPin(email, ancienPin);
    if (!verif.ok) return { ok: false, erreur: 'Ancien PIN incorrect.' };
    if (!nouveauPin || !/^\d{4}$/.test(nouveauPin))
      return { ok: false, erreur: 'Le nouveau PIN doit contenir exactement 4 chiffres.' };

    const profils = _read();
    profils[email.toLowerCase()].pinHash = await _hashPin(nouveauPin);
    _write(profils);
    return { ok: true };
  }

  /**
   * Réinitialise un profil (oubli de PIN).
   * Nécessite l'email — la personne recrée son PIN.
   */
  function reinitialiserProfil(email) {
    const profils = _read();
    const key     = email?.toLowerCase();
    if (!profils[key]) return false;
    delete profils[key];
    _write(profils);
    return true;
  }

  /**
   * Retourne tous les profils (sans hash PIN) — usage direction.
   */
  function tousLesProfils() {
    return Object.values(_read()).map(p => ({
      email:        p.email,
      nom:          p.nom,
      dateDerniere: p.dateDerniere,
      dateCreation: p.dateCreation,
    }));
  }

  return {
    existe, getProfil, creerProfil, verifierPin,
    changerPin, reinitialiserProfil, tousLesProfils,
  };

})();
