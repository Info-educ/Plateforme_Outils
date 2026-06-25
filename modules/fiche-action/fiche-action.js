// ═══════════════════════════════════════════════════
// modules/fiche-action/fiche-action.js
// Logique métier du module "Fiche d'action"
// S'appuie sur : PDFGenerator, EmailService, APP_CONFIG
// ═══════════════════════════════════════════════════

const FicheAction = (() => {

  let currentStep = 1;

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
    const pdf = PDFGenerator.createDoc();
    const { doc } = pdf;
    const { ML, MW, PAGE_W, PAGE_H } = PDFGenerator;
    const C = PDFGenerator.C;

    // ── PAGE 1 : Infos générales ──
    pdf.y = 18;

    // Titre
    doc.setFillColor(...C.blueLight);
    doc.rect(ML, pdf.y, MW, 18, 'F');
    doc.setDrawColor(...C.blue);
    doc.setLineWidth(0.4);
    doc.rect(ML, pdf.y, MW, 18);
    doc.setTextColor(...C.blue);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text("Fiche d'action", PAGE_W / 2, pdf.y + 7, { align: 'center' });
    doc.setFontSize(11);
    doc.text("Demande d'autorisation", PAGE_W / 2, pdf.y + 14, { align: 'center' });
    pdf.y += 22;

    // Badges type d'action
    if (d.types.length) {
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...C.slate);
      doc.text("Type d'action :", ML, pdf.y + 4);
      doc.setFillColor(...C.blue);
      doc.setTextColor(...C.white);
      let tx = ML + 42;
      d.types.forEach(t => {
        doc.setFontSize(8);
        const tw = doc.getTextWidth(t) + 6;
        doc.roundedRect(tx, pdf.y, tw, 6, 1, 1, 'F');
        doc.text(t, tx + 3, pdf.y + 4.2);
        tx += tw + 4;
      });
      pdf.y += 10;
    }

    pdf.sectionHeader('INFORMATIONS GÉNÉRALES');
    pdf.field('Intitulé', d.intitule);
    pdf.field('Destination', d.destination);
    pdf.field('Responsable', d.responsable);
    pdf.field('Classes / groupes', d.classes);

    // Date
    pdf.checkY(8);
    doc.setFillColor(...C.blueLight);
    doc.rect(ML, pdf.y, MW, 7, 'F');
    doc.setTextColor(...C.blue);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text('DATE ET HORAIRE', ML + 3, pdf.y + 5);
    pdf.y += 9;
    const dateStr = d.dateDepart
      ? `Départ : ${PDFGenerator.formatDate(d.dateDepart)} à ${d.heureDepart || '..'}h  —  Retour : ${PDFGenerator.formatDate(d.dateRetour)} à ${d.heureRetour || '..'}h`
      : 'Non renseigné';
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.slate);
    doc.text(dateStr, ML + 3, pdf.y + 4);
    pdf.y += 8;

    pdf.multiLine("Description de l'action", d.description);

    // Tableau accompagnateurs
    if (d.accompagnateurs.length) {
      pdf.table(
        ["Nom de l'accompagnateur", 'Classes (cours annulés)', 'Heures'],
        d.accompagnateurs.map(a => [a.nom, a.classes, a.heures]),
        [80, 60, 40]
      );
    }
    if (d.autresPersonnels) pdf.field('Autres personnels', d.autresPersonnels);
    if (d.aed)              pdf.field('AED (CPE)', d.aed);
    if (d.parents)          pdf.field("Parents d'élèves", d.parents);

    // ── PAGE 2 : Volet pédagogique ──
    pdf.voletTitle('VOLET PÉDAGOGIQUE');
    pdf.chips('Axes & objectifs du projet d\'établissement', d.axes);
    pdf.chips('Type d\'action pédagogique', d.parcours);
    if (d.disciplines.length) pdf.chips('Disciplines concernées (EPI)', d.disciplines);
    pdf.multiLine('Objectif(s) pédagogique(s)', d.objectifsPeda);

    pdf.sectionHeader('COMPÉTENCES VISÉES — SOCLE COMMUN');
    pdf.chips('Domaines', d.domaines);

    if (d.criteres.length) {
      pdf.sectionHeader("ÉVALUATION DE L'ACTION");
      pdf.table(
        ["Critère d'évaluation", 'Valeur cible', 'Valeur mesurée'],
        d.criteres.map(c => [c.libelle, c.cible, c.mesure]),
        [70, 55, 55]
      );
    }

    pdf.sectionHeader('COMMUNICATION');
    if (d.crEleves || d.crProfs || d.crAutres) {
      const cr = [];
      if (d.crEleves) cr.push('Élèves : ' + d.crEleves);
      if (d.crProfs)  cr.push('Professeurs : ' + d.crProfs);
      if (d.crAutres) cr.push('Autres : ' + d.crAutres);
      pdf.chips('Compte rendu réalisé par', cr);
    }
    if (d.supports.length)    pdf.chips('Supports', d.supports);
    if (d.publications.length) pdf.chips('Publication', d.publications);

    // ── PAGE 3 : Volet financier ──
    pdf.voletTitle('VOLET FINANCIER');
    pdf.sectionHeader('DÉPENSES ÉVENTUELLES');
    if (d.budget)         pdf.field('Budget total', d.budget + ' €');
    if (d.budgetDetail)   pdf.field('Détail', d.budgetDetail);
    if (d.transports.length) pdf.field('Transport', d.transports.join(', '));

    if (d.elevesAvecCarte || d.elevesSansCarte) {
      pdf.table(
        ['', 'Avec carte de transport', 'Sans carte de transport'],
        [
          ["Nombre d'élèves", d.elevesAvecCarte, d.elevesSansCarte],
          ["Nombre d'accompagnateurs", d.accAvecCarte, d.accSansCarte],
          ['Total', d.totalAvecCarte, d.totalSansCarte],
        ],
        [70, 55, 55]
      );
    }
    if (d.partenaireDevis) pdf.field('Partenaire (devis)', d.partenaireDevis + ' €');

    pdf.sectionHeader('FINANCEMENTS');
    if (d.financements.length) pdf.chips('Sources', d.financements);

    pdf.checkY(20);
    pdf.sectionHeader('ASSURANCE');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.slate);
    doc.text('• Sortie obligatoire : assurance scolaire facultative mais vivement recommandée.', ML + 3, pdf.y + 4);
    pdf.y += 5.5;
    doc.text('• Sortie facultative : assurance scolaire obligatoire.', ML + 3, pdf.y + 4);
    pdf.y += 10;

    // Visas
    pdf.checkY(50);
    pdf.sectionHeader('VISAS PRÉALABLES & AUTORISATION DU CHEF D\'ÉTABLISSEMENT');
    const visaY = pdf.y;
    const visaW = MW / 3;
    ['Responsable de l\'action', 'CPE', 'Gestionnaire'].forEach((v, i) => {
      const vx = ML + i * visaW;
      doc.setFillColor(...C.blueLight);
      doc.rect(vx, visaY, visaW, 5.5, 'F');
      doc.setTextColor(...C.blue);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.text(v, vx + 2, visaY + 4);
      doc.setFillColor(...C.white);
      doc.rect(vx, visaY + 5.5, visaW, 22);
      doc.setDrawColor(...C.gray);
      doc.setLineWidth(0.3);
      doc.rect(vx, visaY, visaW, 27.5);
    });
    pdf.y = visaY + 32;

    // Autorisation
    pdf.checkY(50);
    pdf.y += 4;
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.slate);
    doc.text("AUTORISATION — Cette action est :", ML, pdf.y + 4);
    pdf.y += 8;
    ['Accordée', "Ajournée — encadrement insuffisant", 'Ajournée — passage en CA obligatoire',
      'Ajournée — manque un ou des visas', 'Ajournée — autre motif', 'Refusée — motif(s) :'].forEach(txt => {
      pdf.checkY(6);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text('□  ' + txt, ML + 4, pdf.y + 4);
      pdf.y += 6;
    });

    pdf.y += 6;
    doc.setFillColor(...C.blueLight);
    doc.rect(ML + MW - 60, pdf.y, 60, 25, 'F');
    doc.setDrawColor(...C.blue);
    doc.setLineWidth(0.4);
    doc.rect(ML + MW - 60, pdf.y, 60, 25);
    doc.setTextColor(...C.blue);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text("Le Chef d'Établissement", ML + MW - 30, pdf.y + 5, { align: 'center' });

    // Numéros de pages
    pdf.addPageNumbers(`Fiche d'action — ${d.intitule || 'Sans titre'} — ${d.responsable || ''}`);

    // Sauvegarde
    const filename = PDFGenerator.makeFilename('fiche_action', d.intitule);
    pdf.save(filename);

    // Envoi mail via Formspree (données) + PDF téléchargé localement
    if (sendMail) {
      const result = await EmailService.send({
        fromName: d.responsable || 'Enseignant',
        subject:  d.intitule || 'Sans titre',
        body:     `Responsable : ${d.responsable}\nClasses : ${d.classes}\nDate : ${PDFGenerator.formatDate(d.dateDepart)}`,
        data:     d,
      });
      EmailService.showResult(result.ok, 'send-result');
    }

    window.scrollTo(0, 0);
  }

  // ── Initialisation du module ─────────────────────

  function init() {
    // Génère les axes depuis APP_CONFIG
    renderAxes();

    // Affichage conditionnel du champ "Autres"
    const typeAutres = document.getElementById('type-autres');
    if (typeAutres) {
      typeAutres.addEventListener('change', function () {
        document.getElementById('type-autres-field').style.display = this.checked ? 'block' : 'none';
      });
    }
  }

  // Auto-init dès que le module est injecté dans le DOM
  document.addEventListener('DOMContentLoaded', init);
  // Si le module est chargé dynamiquement (après DOMContentLoaded)
  if (document.readyState !== 'loading') init();

  return { goToStep, generatePDF };
})();
