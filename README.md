# Outils numériques — Collège Joliot-Curie

Plateforme métier pour la direction et les enseignants du collège Joliot-Curie (Bagneux, 92).

---

## Structure du projet

```
joliot-outils/
│
├── index.html                  ← Point d'entrée unique (topbar + sidebar + zone contenu)
│
├── css/
│   ├── design-system.css       ← Variables, topbar, sidebar, layout, dashboard
│   └── components.css          ← Composants formulaires (fields, tables, buttons…)
│
├── js/
│   ├── config.js               ← ⚙️  TOUT ce qui change : adresse, email, axes, modules
│   ├── router.js               ← Navigation entre modules (chargement dynamique)
│   ├── pdf-generator.js        ← Moteur PDF partagé (jsPDF)
│   └── email.js                ← Service d'envoi mail (EmailJS)
│
├── modules/
│   ├── fiche-action/
│   │   ├── form.html           ← HTML du formulaire (4 étapes)
│   │   └── fiche-action.js     ← Logique métier, collecte des données, génération PDF
│   │
│   ├── sortie-scolaire/        ← 🔜 À créer
│   │   ├── form.html
│   │   └── sortie-scolaire.js
│   │
│   └── reservation/            ← 🔜 À créer
│       ├── form.html
│       └── reservation.js
│
├── assets/
│   ├── logo.svg                ← Logo de l'établissement
│   └── favicon.ico
│
└── README.md
```

**Principe clé :** `index.html` ne contient aucun formulaire. Il charge la coquille (sidebar, topbar) et le router injecte dynamiquement le module demandé dans `#app-content`.

---

## Déploiement sur GitHub Pages (gratuit)

### 1. Créer le dépôt

```bash
git init
git add .
git commit -m "Initial — Fiche d'action"
git remote add origin https://github.com/VOTRE_USERNAME/joliot-outils.git
git push -u origin main
```

### 2. Activer GitHub Pages

Dépôt → **Settings** → **Pages** → Source : `main / root` → **Save**

URL : `https://VOTRE_USERNAME.github.io/joliot-outils/`

> ⚠️ **Important :** GitHub Pages sert des fichiers statiques. Le chargement dynamique des modules via `fetch()` fonctionne parfaitement — c'est du HTML/JS standard.

---

## Configuration initiale

Tout se passe dans **`js/config.js`** :

```js
const APP_CONFIG = {
  etablissement: {
    nom:    'Collège Joliot-Curie',
    email:  'ce.0921778h@ac-versailles.fr',
    // …
  },
  axes: [ /* axes du projet d'établissement */ ],
  modules: [ /* liste des modules actifs */ ],
};
```

Pour activer un module "bientôt" → passer `active: true` dans le tableau `modules`.

---

## Activer l'envoi automatique par mail (EmailJS)

1. Créer un compte sur [emailjs.com](https://www.emailjs.com/) (gratuit : 200 mails/mois)
2. Créer un **Email Service** + un **Email Template**
3. Renseigner dans `js/config.js` :
   ```js
   emailjs: {
     publicKey:  'votre_clé_publique',
     serviceId:  'votre_service_id',
     templateId: 'votre_template_id',
   }
   ```
4. Dans `index.html`, décommenter la ligne :
   ```html
   <script src="https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js"></script>
   ```

---

## Ajouter un nouveau module

1. Créer `modules/NOM-MODULE/form.html` — le HTML du formulaire
2. Créer `modules/NOM-MODULE/NOM-MODULE.js` — la logique (exposer un objet global)
3. Dans `js/config.js`, passer `active: true` pour ce module
4. Dans `index.html`, ajouter l'entrée sidebar correspondante

Le router charge automatiquement `form.html` + `NOM-MODULE.js` sans rien toucher d'autre.

---

## Modules

| Module | Statut | Fichiers |
|--------|--------|----------|
| Fiche d'action | ✅ Disponible | `modules/fiche-action/` |
| Sorties scolaires | 🔜 Bientôt | — |
| Réservation de salles | 🔜 Bientôt | — |
| Demandes de travaux | 🔜 Bientôt | — |
| Demandes d'absences | 🔜 Bientôt | — |
| Prêt de matériel | 🔜 Bientôt | — |

---

*Juin 2026 — Collège Joliot-Curie, Bagneux*
