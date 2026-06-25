// ═══════════════════════════════════════════════════
// config.js — Configuration de l'établissement
// Modifiez uniquement ce fichier pour adapter la
// plateforme à votre établissement.
// ═══════════════════════════════════════════════════

const APP_CONFIG = {
  etablissement: {
    nom:       'Collège Joliot-Curie',
    adresse:   '2bis Avenue de Stalingrad',
    codePostal:'92220',
    ville:     'BAGNEUX',
    telephone: '01-45-46-34-32',
    email:     'ce.0921778h@ac-versailles.fr',
    logo:      'assets/logo.svg',
  },

  // Adresse(s) qui reçoivent les fiches soumises
  destinataires: [
    'ce.0921778h@ac-versailles.fr',
  ],

  // Formspree — service d'envoi de mail gratuit, sans serveur
  // ACTIVATION (5 minutes) :
  //   1. Aller sur https://formspree.io → créer un compte gratuit
  //   2. "New Form" → nommer "Fiche action Joliot" → copier l'endpoint
  //   3. Remplacer la valeur ci-dessous par votre URL
  //      Ex : 'https://formspree.io/f/xpzgkwqr'
  // Plan gratuit : 50 soumissions/mois (largement suffisant)
  formspree: {
    endpoint: 'VOTRE_ENDPOINT_FORMSPREE',
  },

  // Axes du projet d'établissement (modifiables chaque année)
  axes: [
    {
      id: 'axe1',
      titre: 'AXE 1 — Réussir à tout niveau et dans chaque territoire',
      objectifs: [
        'Inclure tous les élèves dans les apprentissages',
        'Accompagner chaque élève dans un parcours ambitieux et sécurisé',
      ],
    },
    {
      id: 'axe2',
      titre: 'AXE 2 — Apprendre et agir dans le monde du 21e siècle',
      objectifs: [
        'Engagement de tous à la citoyenneté',
        'Aptitude à adapter sa communication dans tous les domaines',
      ],
    },
    {
      id: 'axe3',
      titre: 'AXE 3 — Mobiliser les intelligences',
      objectifs: [
        'Construire une académie de formation',
        "S'engager dans une culture du développement professionnel",
      ],
    },
  ],

  // Modules disponibles — active: true/false pour les afficher
  modules: [
    { id: 'fiche-action',    label: "Fiche d'action",    icon: '📋', active: true,  soon: false, categorie: 'pedagogique'  },
    { id: 'sortie-scolaire', label: 'Sorties scolaires',  icon: '🚌', active: false, soon: true,  categorie: 'pedagogique'  },
    { id: 'reservation',     label: 'Réservation salles', icon: '📅', active: false, soon: true,  categorie: 'pedagogique'  },
    { id: 'travaux',         label: 'Demandes travaux',   icon: '🔧', active: false, soon: true,  categorie: 'administratif'},
    { id: 'budget',          label: 'Budget / crédits',   icon: '📊', active: false, soon: true,  categorie: 'administratif'},
    { id: 'absences',        label: 'Demandes absences',  icon: '📝', active: false, soon: true,  categorie: 'rh'           },
    { id: 'materiel',        label: 'Prêt de matériel',   icon: '🔑', active: false, soon: true,  categorie: 'rh'           },
  ],
};
