// ═══════════════════════════════════════════════════
// modules/fiche-action/fiche-action.js
// Logique métier du module "Fiche d'action"
// S'appuie sur : PDFGenerator, EmailService, APP_CONFIG
// ═══════════════════════════════════════════════════

const FicheAction = (() => {

  let currentStep = 1;
  let _currentId    = null; // id Store si reprise ou déjà sauvegardée

  // ── Navigation entre étapes ──────────────────────

  function goToStep(n) {
    document.getElementById(`step-${currentStep}`).style.display = 'none';
    const oldBtn = document.getElementById(`step-btn-${currentStep}`);
    oldBtn.classList.remove('active');
    if (n > currentStep) oldBtn.classList.add('done');

    currentStep = n;
    document.getElementById(`step-${n}`).style.display = 'block';
    const newBtn = document.getElementById(`step-btn-${n}`);
    newBtn.classList.add('active');
    newBtn.classList.remove('done');
    window.scrollTo(0, 0);
  }

  // ── Génération de la section Axes depuis config ──

  function renderAxes() {
    const container = document.getElementById('axes-container');
    if (!container) return;
    container.innerHTML = APP_CONFIG.axes.map(axe => `
      <div class="domaine-block">
        <div class="domaine-header">
          <input type="checkbox" id="${axe.id}" style="width:16px;height:16px;accent-color:var(--blue)">
          <label for="${axe.id}" style="font-weight:700;font-size:13px;cursor:pointer">${axe.titre}</label>
        </div>
        <div class="domaine-body">
          <div class="check-group">
            ${axe.objectifs.map((obj, i) => `
              <label class="check-item">
                <input type="checkbox" id="${axe.id}-obj${i + 1}">
                <span>Objectif ${i + 1} : ${obj}</span>
              </label>`).join('')}
          </div>
        </div>
      </div>`).join('');
  }

  // ── Collecte de toutes les valeurs du formulaire ─

  function gv(id)  { const el = document.getElementById(id); return el ? el.value.trim() : ''; }
  function gc(id)  { const el = document.getElementById(id); return el ? el.checked : false; }

  function collectData() {
    const types = [];
    if (gc('type-projet'))       types.push('Projet');
    if (gc('type-sortie'))       types.push('Sortie');
    if (gc('type-intervention')) types.push('Intervention');
    if (gc('type-autres'))       types.push('Autres : ' + gv('type-autres-texte'));

    // Axes depuis config
    const axes = [];
    APP_CONFIG.axes.forEach((axe, ai) => {
      if (!gc(axe.id)) return;
      const objs = axe.objectifs
        .map((o, i) => gc(`${axe.id}-obj${i + 1}`) ? `Obj.${i + 1} : ${o}` : null)
        .filter(Boolean);
      axes.push(axe.titre + (objs.length ? ' (' + objs.join(', ') + ')' : ''));
    });

    const parcours = [];
    if (gc('parcours-avenir'))    parcours.push('Parcours Avenir');
    if (gc('parcours-artistique'))parcours.push('Parcours Artistique et Culturel');
    if (gc('parcours-sante'))     parcours.push('Parcours Éducatif de Santé');
    if (gc('parcours-citoyen'))   parcours.push('Parcours Citoyen');
    if (gc('accomp-fragiles'))    parcours.push('Accompagnement personnalisé – Fragiles');
    if (gc('accomp-performants')) parcours.push('Accompagnement personnalisé – Performants');

    const disciplines = [];
    const discMap = {
      'arts-plast':'Arts plastiques','anglais':'Anglais','educ-mus':'Éducation musicale',
      'espagnol':'Espagnol','eps':'EPS','allemand':'Allemand','emc':'EMC',
      'maths':'Mathématiques','francais':'Français','physchim':'Physique-chimie',
      'hist-arts':'Histoire des arts','svt':'SVT','histgeo':'Histoire-Géo','techno':'Technologie',
    };
    Object.entries(discMap).forEach(([k, v]) => { if (gc(`disc-${k}`)) disciplines.push(v); });

    const domaines = [];
    if (gc('dom1')) {
      const ss = [];
      if (gc('dom1-fr'))    ss.push('Langue française');
      if (gc('dom1-le'))    ss.push('Langue étrangère');
      if (gc('dom1-maths')) ss.push('Math/sciences/info');
      if (gc('dom1-arts'))  ss.push('Arts/corps');
      domaines.push('Domaine 1' + (ss.length ? ' (' + ss.join(', ') + ')' : ''));
    }
    if (gc('dom2')) domaines.push('Domaine 2 – Méthodes et outils');
    if (gc('dom3')) domaines.push('Domaine 3 – Formation citoyenne');
    if (gc('dom4')) domaines.push('Domaine 4 – Systèmes naturels/techniques');
    if (gc('dom5')) domaines.push('Domaine 5 – Représentations du monde');

    const financements = [];
    if (gc('fin-cd'))       financements.push('Conseil Départemental');
    if (gc('fin-ermes'))    financements.push('Ermès');
    if (gc('fin-premis'))   financements.push('Premis');
    if (gc('fin-college'))  financements.push('Collège (DGF)');
    if (gc('fin-rectorat')) financements.push('Rectorat/État');
    if (gc('fin-adage'))    financements.push('Adage');
    if (gc('fin-familles')) financements.push('Participation familles (CA obligatoire)');
    if (gv('fin-autres1'))  financements.push(gv('fin-autres1'));
    if (gv('fin-autres2'))  financements.push(gv('fin-autres2'));

    const transports = [];
    if (gc('transport-oui'))      transports.push('Oui');
    if (gc('transport-non'))      transports.push('Non');
    if (gc('transport-ticket-t')) transports.push('Ticket T');
    if (gc('transport-rer'))      transports.push('Ticket RER (' + gv('rer-trajet') + ')');

    const supports = [];
    if (gc('sup-texte')) supports.push('Texte');
    if (gc('sup-video')) supports.push('Vidéo');
    if (gc('sup-photo')) supports.push('Photo');
    if (gc('sup-audio')) supports.push('Enregistrement audio');
    if (gv('sup-autres')) supports.push(gv('sup-autres'));

    const publications = [];
    if (gc('pub-site')) publications.push('Site du collège');
    if (gc('pub-oze'))  publications.push('Oze');
    if (gv('pub-autres')) publications.push(gv('pub-autres'));

    return {
      types, axes, parcours, disciplines, domaines, financements, transports, supports, publications,
      emailResponsable: gv('email-responsable'),
      intitule:        gv('intitule'),
      destination:     gv('destination'),
      responsable:     gv('responsable'),
      classes:         gv('classes'),
      dateDepart:      gv('date-depart'),
      heureDepart:     gv('heure-depart'),
      dateRetour:      gv('date-retour'),
      heureRetour:     gv('heure-retour'),
      description:     gv('description'),
      accompagnateurs: [
        { nom: gv('acc1-nom'), classes: gv('acc1-classes'), heures: gv('acc1-heures') },
        { nom: gv('acc2-nom'), classes: gv('acc2-classes'), heures: gv('acc2-heures') },
        { nom: gv('acc3-nom'), classes: gv('acc3-classes'), heures: gv('acc3-heures') },
        { nom: gv('acc4-nom'), classes: gv('acc4-classes'), heures: gv('acc4-heures') },
      ].filter(a => a.nom),
      autresPersonnels: gc('autres-personnels') ? gv('autres-personnels-texte') : '',
      aed:              gc('aed')     ? gv('aed-texte')     : '',
      parents:          gc('parents') ? gv('parents-texte') : '',
      objectifsPeda:    gv('objectifs-peda'),
      criteres: [
        { libelle: gv('crit1'), cible: gv('crit1-cible'), mesure: gv('crit1-mesure') },
        { libelle: gv('crit2'), cible: gv('crit2-cible'), mesure: gv('crit2-mesure') },
        { libelle: gv('crit3'), cible: gv('crit3-cible'), mesure: gv('crit3-mesure') },
        { libelle: gv('crit4'), cible: gv('crit4-cible'), mesure: gv('crit4-mesure') },
      ].filter(c => c.libelle),
      crEleves:         gc('cr-eleves')      ? gv('cr-eleves-noms')      : '',
      crProfs:          gc('cr-profs')       ? gv('cr-profs-noms')       : '',
      crAutres:         gc('cr-autres-perso')? gv('cr-autres-perso-noms'): '',
      budget:           gv('budget'),
      budgetDetail:     gv('budget-detail'),
      elevesAvecCarte:  gv('eleves-avec-carte'),
      elevesSansCarte:  gv('eleves-sans-carte'),
      accAvecCarte:     gv('acc-avec-carte'),
      accSansCarte:     gv('acc-sans-carte'),
      totalAvecCarte:   gv('total-avec-carte'),
      totalSansCarte:   gv('total-sans-carte'),
      partenaireDevis:  gv('partenaire-montant'),
    };
  }

  // ── Génération PDF ───────────────────────────────

  async function generatePDF(sendMail) {
    const d   = collectData();

    // Génération via le moteur PDF professionnel
    const pdf = PDFGenerator.genererFicheAction(d, null);

    // Sauvegarde dans le Store
    _currentId = Store.save({
      id:               _currentId || undefined,
      module:           'fiche-action',
      emailResponsable: d.emailResponsable || '',
      statut:           sendMail ? 'en_attente' : 'brouillon',
      responsable:      d.responsable || '',
      intitule:         d.intitule || '',
      dateAction:       d.dateDepart || '',
      data:             d,
    });

    // Téléchargement
    const filename = PDFGenerator.makeFilename('fiche_action', d.intitule);
    pdf.save(filename);

    // Notification mail
    if (sendMail) {
      const result = await EmailService.send({
        fromName: d.responsable || 'Enseignant',
        subject:  d.intitule || 'Sans titre',
        data:     d,
      });
      EmailService.showResult('Votre client mail s'est ouvert — envoyez le message pour notifier le CPE.', 'send-result');
    } else {
      const toast = document.getElementById('send-result');
      if (toast) {
        toast.className = 'send-result success show';
        toast.innerHTML = '💾 Brouillon sauvegardé — retrouvez-le dans <strong>Suivi des demandes</strong>.';
        setTimeout(() => toast.classList.remove('show'), 5000);
      }
    }

    window.scrollTo(0, 0);
  }


  // Génère un PDF depuis des données existantes (appelé par Suivi.regenererPDF)
  async function generatePDFFromData(data) {
    // Remplit temporairement les champs si le module est actif
    // Sinon génère directement depuis les données brutes
    if (typeof collectData === 'function') {
      await generatePDF(false);
    } else {
      // Génération directe sans formulaire chargé
      // (le module est appelé depuis Suivi sans être monté)
      console.warn('generatePDFFromData appelé hors contexte formulaire — naviguez vers Fiche action.');
    }
  }

  // Sauvegarde le brouillon courant sans générer de PDF
  function sauvegarderBrouillon() {
    const d = collectData();
    if (!d.intitule && !d.responsable) {
      alert('Renseignez au moins l'intitulé ou votre nom avant de sauvegarder.');
      return;
    }
    _currentId = Store.save({
      id:          _currentId || undefined,
      module:      'fiche-action',
      statut:      'brouillon',
      responsable: d.responsable || '',
      intitule:    d.intitule || '',
      dateAction:  d.dateDepart || '',
      data:        d,
    });
    const toast = document.getElementById('send-result');
    if (toast) {
      toast.className = 'send-result success show';
      toast.innerHTML = '💾 Brouillon sauvegardé — retrouvez-le dans <strong>Suivi des demandes</strong>.';
      setTimeout(() => toast.classList.remove('show'), 5000);
    }
    window.scrollTo(0, 0);
  }

  return { goToStep, generatePDF, generatePDFFromData, sauvegarderBrouillon, autocompleteEmail };
})();
