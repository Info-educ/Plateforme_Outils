// ═══════════════════════════════════════════════════
// config.js — Seul fichier à modifier
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

  // ── Circuit de validation ─────────────────────────
  //
  // Chaque validateur reçoit un mail quand c'est son
  // tour et donne son "Bon pour accord" dans la
  // plateforme. Les signatures restent manuscrites sur
  // le PDF imprimé — la plateforme sert à la
  // traçabilité et à la circulation rapide.
  //
  // Champs par validateur :
  //   role     — identifiant interne (ne pas modifier)
  //   label    — affiché dans l'interface et sur le PDF
  //   email    — reçoit la notification "c'est votre tour"
  //   pin      — code d'identification dans la plateforme
  //              ⚠️  Visible dans le code JS côté navigateur.
  //              Ne constitue pas une sécurité forte.
  //              Le document officiel reste le PDF imprimé signé.
  //
  // Pour ajouter un validateur : copier un bloc et
  // l'insérer à la position souhaitée dans le tableau.
  //
  // notifierA : liste de rôles qui reçoivent aussi un
  //             mail de confirmation quand CE validateur
  //             donne son accord (en plus du suivant).
  //             Exemple : le chef veut être CC à chaque étape.

  validateurs: [
    {
      role:       'cpe',
      label:      'CPE',
      email:      'cpe@joliot-curie.fr',
      pin:        '2001',
      notifierA:  [],          // personne en copie à cette étape
    },
    {
      role:       'gestionnaire',
      label:      'Gestionnaire',
      email:      'gestionnaire@joliot-curie.fr',
      pin:        '2002',
      notifierA:  [],
    },
    {
      role:       'chef',
      label:      "Chef d'établissement",
      email:      'ce.0921778h@ac-versailles.fr',
      pin:        '2003',
      notifierA:  ['cpe', 'gestionnaire'],  // informe CPE et Gestionnaire de la décision finale
    },
  ],

  // ── Secrétariat ───────────────────────────────────
  // Reçoit le mail final d'impression quand tous les
  // "Bon pour accord" ont été donnés.
  secretariat: {
    label: 'Secrétariat',
    email: 'secretariat@joliot-curie.fr',
  },

  // ── Accès vue direction (tableau de bord complet) ─
  // PIN visible côté navigateur — usage interne uniquement.
  direction: {
    pin: '1234',
  },

  // ── Axes du projet d'établissement ───────────────
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

  // ── Modules ───────────────────────────────────────
  modules: [
    { id: 'annuaire',        label: 'Annuaire',            icon: '👥', active: true,  soon: false, categorie: 'pedagogique'   },
    { id: 'suivi',           label: 'Suivi des demandes', icon: '📊', active: true,  soon: false, categorie: 'pedagogique'   },
    { id: 'fiche-action',    label: "Fiche d'action",     icon: '📋', active: true,  soon: false, categorie: 'pedagogique'   },
    { id: 'sortie-scolaire', label: 'Sorties scolaires',  icon: '🚌', active: false, soon: true,  categorie: 'pedagogique'   },
    { id: 'reservation',     label: 'Réservation salles', icon: '📅', active: false, soon: true,  categorie: 'pedagogique'   },
    { id: 'travaux',         label: 'Demandes travaux',   icon: '🔧', active: false, soon: true,  categorie: 'administratif' },
    { id: 'budget',          label: 'Budget / crédits',   icon: '📊', active: false, soon: true,  categorie: 'administratif' },
    { id: 'absences',        label: 'Demandes absences',  icon: '📝', active: false, soon: true,  categorie: 'rh'            },
    { id: 'materiel',        label: 'Prêt de matériel',   icon: '🔑', active: false, soon: true,  categorie: 'rh'            },
  ],
};
