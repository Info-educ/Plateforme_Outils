// ═══════════════════════════════════════════════════
// pdf-generator.js — Moteur PDF professionnel
// Rendu sobre, lisible, institutionnel.
// ═══════════════════════════════════════════════════

const PDFGenerator = (() => {

  const C = {
    blue:      [26,  79,  138],
    blueDark:  [18,  54,  96],
    blueLight: [232, 240, 250],
    bluePale:  [245, 248, 253],
    slate:     [51,  65,  85],
    slateMid:  [100, 116, 139],
    gray:      [226, 232, 240],
    white:     [255, 255, 255],
    black:     [30,  30,  30],
    green:     [21,  128, 61],
    greenBg:   [220, 252, 231],
    red:       [153, 27,  27],
    redBg:     [254, 226, 226],
    amber:     [120, 53,  15],
    amberBg:   [254, 243, 199],
    accent:    [230, 92,  26],
  };

  const PW = 210, PH = 297, ML = 14, MR = 14, MW = PW - ML - MR;
  const FONT = 'helvetica';

  // ── Factory : crée un doc avec helpers ────────────

  function createDoc() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    let y = 0;

    // ── En-tête de page ──────────────────────────────
    function _header() {
      // Bandeau bleu foncé
      doc.setFillColor(...C.blueDark);
      doc.rect(0, 0, PW, 14, 'F');

      // Nom établissement
      doc.setFont(FONT, 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...C.white);
      doc.text(APP_CONFIG.etablissement.nom.toUpperCase(), ML, 9);

      // Adresse à droite
      doc.setFont(FONT, 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(180, 200, 220);
      const adr = `${APP_CONFIG.etablissement.adresse} · ${APP_CONFIG.etablissement.codePostal} ${APP_CONFIG.etablissement.ville} · ${APP_CONFIG.etablissement.telephone}`;
      doc.text(adr, PW - MR, 9, { align: 'right' });

      // Ligne de séparation fine
      doc.setDrawColor(...C.blue);
      doc.setLineWidth(0.4);
      doc.line(0, 14, PW, 14);
    }

    // ── Pied de page ─────────────────────────────────
    function _footer(pageNum, total, docTitle) {
      doc.setFillColor(245, 247, 250);
      doc.rect(0, PH - 9, PW, 9, 'F');
      doc.setDrawColor(...C.gray);
      doc.setLineWidth(0.2);
      doc.line(0, PH - 9, PW, PH - 9);
      doc.setFont(FONT, 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...C.slateMid);
      doc.text(docTitle, ML, PH - 3.5);
      doc.text(`Page ${pageNum} / ${total}`, PW - MR, PH - 3.5, { align: 'right' });
      doc.text(APP_CONFIG.etablissement.email, PW / 2, PH - 3.5, { align: 'center' });
    }

    const api = {
      doc,
      get y()    { return y; },
      set y(val) { y = val;  },

      // ── Nouvelle page ──────────────────────────────
      newPage() {
        doc.addPage();
        _header();
        y = 20;
      },

      checkY(needed) {
        if (y + needed > PH - 14) this.newPage();
      },

      // ── Titre de volet (grande bannière) ──────────
      voletTitle(title) {
        doc.addPage();
        _header();
        y = 20;

        doc.setFillColor(...C.blue);
        doc.rect(ML, y, MW, 11, 'F');
        doc.setFont(FONT, 'bold');
        doc.setFontSize(11);
        doc.setTextColor(...C.white);
        doc.text(title.toUpperCase(), PW / 2, y + 7.5, { align: 'center' });
        y += 16;
      },

      // ── En-tête de section ─────────────────────────
      sectionHeader(title, icon) {
        this.checkY(10);
        // Fond bleu clair + bordure gauche bleue
        doc.setFillColor(...C.blueLight);
        doc.rect(ML, y, MW, 7.5, 'F');
        doc.setFillColor(...C.blue);
        doc.rect(ML, y, 2.5, 7.5, 'F');
        doc.setFont(FONT, 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(...C.blueDark);
        doc.text(title.toUpperCase(), ML + 5, y + 5.2);
        y += 10;
      },

      // ── Champ label : valeur ───────────────────────
      field(label, value, lw) {
        if (!value) return;
        lw = lw || 52;
        this.checkY(7);
        doc.setFont(FONT, 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...C.slateMid);
        doc.text(label.toUpperCase(), ML + 1, y + 4);
        doc.setFont(FONT, 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...C.black);
        const lines = doc.splitTextToSize(String(value), MW - lw - 2);
        lines.forEach((l, i) => {
          this.checkY(5);
          doc.text(l, ML + lw, y + 4);
          if (i < lines.length - 1) y += 5;
        });
        y += 6;
      },

      // ── Texte multiligne ───────────────────────────
      multiLine(label, value) {
        if (!value) return;
        this.checkY(8);
        doc.setFont(FONT, 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...C.slateMid);
        doc.text(label.toUpperCase(), ML + 1, y + 4);
        y += 6;
        doc.setFont(FONT, 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...C.black);
        doc.splitTextToSize(value, MW - 6).forEach(l => {
          this.checkY(5);
          doc.text(l, ML + 4, y + 4);
          y += 5;
        });
        y += 3;
      },

      // ── Liste à puces ──────────────────────────────
      chips(label, items) {
        if (!items?.length) return;
        this.checkY(8);
        doc.setFont(FONT, 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...C.slateMid);
        doc.text(label.toUpperCase(), ML + 1, y + 4);
        y += 6;
        items.forEach(item => {
          this.checkY(5);
          doc.setFont(FONT, 'normal');
          doc.setFontSize(9);
          doc.setTextColor(...C.black);
          doc.setFillColor(...C.blue);
          doc.circle(ML + 5, y + 3.2, 0.8, 'F');
          doc.text(item, ML + 8, y + 4);
          y += 5.5;
        });
        y += 2;
      },

      // ── Tableau générique ──────────────────────────
      table(headers, rows, colWidths, opts = {}) {
        this.checkY(14);
        let x = ML;

        // En-tête
        doc.setFillColor(...C.blue);
        doc.rect(ML, y, MW, 6.5, 'F');
        doc.setFont(FONT, 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(...C.white);
        headers.forEach((h, i) => {
          doc.text(h, x + 2, y + 4.5);
          x += colWidths[i];
        });
        y += 6.5;

        rows.forEach((row, ri) => {
          this.checkY(6);
          // Alternance de fond
          if (ri % 2 === 0) {
            doc.setFillColor(...C.bluePale);
            doc.rect(ML, y, MW, 5.5, 'F');
          }
          doc.setFont(FONT, ri === rows.length - 1 && opts.lastBold ? 'bold' : 'normal');
          doc.setFontSize(8.5);
          doc.setTextColor(...C.black);
          let rx = ML;
          row.forEach((cell, ci) => {
            doc.text(String(cell ?? ''), rx + 2, y + 3.8);
            rx += colWidths[ci];
          });
          // Bordure inférieure fine
          doc.setDrawColor(...C.gray);
          doc.setLineWidth(0.15);
          doc.line(ML, y + 5.5, ML + MW, y + 5.5);
          y += 5.5;
        });
        // Bordure extérieure
        doc.setDrawColor(...C.blue);
        doc.setLineWidth(0.3);
        doc.rect(ML, y - rows.length * 5.5 - 6.5, MW, rows.length * 5.5 + 6.5);
        y += 4;
      },

      // ── Séparateur léger ───────────────────────────
      separator() {
        this.checkY(6);
        doc.setDrawColor(...C.gray);
        doc.setLineWidth(0.2);
        doc.line(ML, y + 2, ML + MW, y + 2);
        y += 6;
      },

      // ── Espace ─────────────────────────────────────
      space(h) { y += h || 4; },

      // ── Numérotation des pages ─────────────────────
      addPageNumbers(title) {
        const total = doc.getNumberOfPages();
        for (let i = 1; i <= total; i++) {
          doc.setPage(i);
          _footer(i, total, title);
        }
      },

      // ── Export ────────────────────────────────────
      save(filename)   { doc.save(filename); },
      toBase64()       { return doc.output('datauristring'); },
    };

    // Initialise la première page
    _header();
    y = 20;
    return api;
  }

  // ── Génère le PDF complet d'une fiche d'action ───

  function genererFicheAction(d, demande) {
    const pdf = createDoc();
    const { doc } = pdf;

    // ════════════════════════════════════════════════
    // PAGE 1 — En-tête + Informations générales
    // ════════════════════════════════════════════════

    // Bloc titre central
    doc.setFillColor(...C.blueLight);
    doc.roundedRect(ML, pdf.y, MW, 22, 2, 2, 'F');
    doc.setDrawColor(...C.blue);
    doc.setLineWidth(0.5);
    doc.roundedRect(ML, pdf.y, MW, 22, 2, 2, 'S');
    doc.setFont(FONT, 'bold');
    doc.setFontSize(16);
    doc.setTextColor(...C.blue);
    doc.text("Fiche d'action", PW / 2, pdf.y + 9, { align: 'center' });
    doc.setFont(FONT, 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...C.slateMid);
    doc.text('Demande d\'autorisation', PW / 2, pdf.y + 16, { align: 'center' });
    pdf.y += 27;

    // Badges type d'action
    if (d.types?.length) {
      let bx = ML + 1;
      doc.setFont(FONT, 'bold');
      doc.setFontSize(8);
      d.types.forEach(t => {
        const tw = doc.getTextWidth(t) + 8;
        doc.setFillColor(...C.blue);
        doc.roundedRect(bx, pdf.y, tw, 6, 1.5, 1.5, 'F');
        doc.setTextColor(...C.white);
        doc.text(t, bx + 4, pdf.y + 4.2);
        bx += tw + 4;
      });
      pdf.y += 11;
    }

    // ── Section 1 : Identification ────────────────
    pdf.sectionHeader('Identification de l\'action');
    pdf.field('Intitulé',    d.intitule);
    pdf.field('Destination', d.destination);
    pdf.field('Responsable', d.responsable);
    pdf.field('Email',       d.emailResponsable);
    pdf.field('Classes',     d.classes);
    pdf.space(2);

    // ── Section 2 : Date et horaire ───────────────
    pdf.sectionHeader('Date et horaire');
    if (d.dateDepart) {
      const depart  = `${formatDate(d.dateDepart)} à ${d.heureDepart || '..'}h`;
      const retour  = d.dateRetour ? `${formatDate(d.dateRetour)} à ${d.heureRetour || '..'}h` : '—';
      pdf.field('Départ', depart);
      pdf.field('Retour', retour);
    }
    pdf.space(2);

    // ── Section 3 : Description ───────────────────
    if (d.description) {
      pdf.sectionHeader('Description de l\'action');
      pdf.multiLine('', d.description);
      pdf.space(2);
    }

    // ── Section 4 : Accompagnateurs ───────────────
    if (d.accompagnateurs?.length) {
      pdf.sectionHeader('Accompagnateurs');
      pdf.table(
        ['Nom de l\'accompagnateur', 'Classes / cours annulés', 'Heures'],
        d.accompagnateurs.map(a => [a.nom, a.classes, a.heures]),
        [78, 62, 40]
      );
    }

    const extras = [];
    if (d.autresPersonnels) extras.push(['Autres personnels', d.autresPersonnels]);
    if (d.aed)              extras.push(['AED (CPE)',          d.aed]);
    if (d.parents)          extras.push(['Parents d\'élèves',  d.parents]);
    if (extras.length) {
      extras.forEach(([l, v]) => pdf.field(l, v));
      pdf.space(2);
    }

    // ════════════════════════════════════════════════
    // PAGE 2 — Volet pédagogique
    // ════════════════════════════════════════════════
    pdf.voletTitle('Volet pédagogique');

    pdf.sectionHeader('Axes & objectifs du projet d\'établissement');
    if (d.axes?.length) {
      d.axes.forEach(axe => {
        pdf.checkY(6);
        doc.setFont(FONT, 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(...C.blue);
        doc.text(axe, ML + 4, pdf.y + 4);
        pdf.y += 5.5;
      });
      pdf.space(3);
    }

    pdf.sectionHeader('Type d\'action pédagogique');
    if (d.parcours?.length)    pdf.chips('Parcours', d.parcours);
    if (d.disciplines?.length) pdf.chips('Disciplines (EPI)', d.disciplines);
    pdf.space(2);

    if (d.objectifsPeda) {
      pdf.sectionHeader('Objectif(s) pédagogique(s)');
      pdf.multiLine('', d.objectifsPeda);
      pdf.space(2);
    }

    if (d.domaines?.length) {
      pdf.sectionHeader('Compétences visées — Socle commun');
      pdf.chips('', d.domaines);
      pdf.space(2);
    }

    if (d.criteres?.length) {
      pdf.sectionHeader('Évaluation de l\'action');
      pdf.table(
        ['Critère d\'évaluation', 'Valeur cible', 'Valeur mesurée'],
        d.criteres.map(c => [c.libelle, c.cible, c.mesure || '—']),
        [78, 46, 46]
      );
    }

    // Communication
    const crParts = [];
    if (d.crEleves) crParts.push(`Élèves : ${d.crEleves}`);
    if (d.crProfs)  crParts.push(`Professeurs : ${d.crProfs}`);
    if (d.crAutres) crParts.push(`Autres : ${d.crAutres}`);
    if (crParts.length || d.supports?.length || d.publications?.length) {
      pdf.sectionHeader('Communication');
      if (crParts.length)        pdf.chips('Compte rendu réalisé par', crParts);
      if (d.supports?.length)    pdf.chips('Supports', d.supports);
      if (d.publications?.length) pdf.chips('Publication', d.publications);
    }

    // ════════════════════════════════════════════════
    // PAGE 3 — Volet financier
    // ════════════════════════════════════════════════
    pdf.voletTitle('Volet financier');

    pdf.sectionHeader('Dépenses éventuelles');
    if (d.budget)       pdf.field('Budget total', d.budget + ' €');
    if (d.budgetDetail) pdf.field('Détail',        d.budgetDetail);
    if (d.transports?.length) pdf.field('Transport', d.transports.join(', '));

    if (d.elevesAvecCarte || d.elevesSansCarte) {
      pdf.table(
        ['', 'Avec carte de transport', 'Sans carte de transport'],
        [
          ['Élèves',          d.elevesAvecCarte, d.elevesSansCarte],
          ['Accompagnateurs', d.accAvecCarte,    d.accSansCarte],
          ['Total',           d.totalAvecCarte,  d.totalSansCarte],
        ],
        [60, 55, 55],
        { lastBold: true }
      );
    }
    if (d.partenaireDevis) pdf.field('Partenaire (devis)', d.partenaireDevis + ' €');

    pdf.sectionHeader('Financements');
    if (d.financements?.length) pdf.chips('', d.financements);
    pdf.space(2);

    pdf.sectionHeader('Assurance');
    doc.setFont(FONT, 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...C.slate);
    doc.text('• Sortie obligatoire : assurance scolaire facultative mais vivement recommandée.', ML + 4, pdf.y + 4);
    pdf.y += 5.5;
    doc.text('• Sortie facultative : assurance scolaire obligatoire.', ML + 4, pdf.y + 4);
    pdf.y += 8;

    // ════════════════════════════════════════════════
    // PAGE 4 — Circuit de validation / bons pour accord
    // ════════════════════════════════════════════════
    pdf.voletTitle('Circuit de validation');

    // Note explicative
    doc.setFillColor(...C.amberBg);
    doc.roundedRect(ML, pdf.y, MW, 13, 2, 2, 'F');
    doc.setFont(FONT, 'italic');
    doc.setFontSize(8);
    doc.setTextColor(...C.amber);
    doc.text('Les bons pour accord enregistrés dans la plateforme numérique constituent un accord de principe.', ML + 4, pdf.y + 5);
    doc.text('Les signatures manuscrites ci-dessous restent les éléments officiels du document.', ML + 4, pdf.y + 10);
    pdf.y += 18;

    // Tableau des bons pour accord numériques (si demande fournie)
    if (demande?.visas?.length) {
      pdf.sectionHeader('Bons pour accord enregistrés dans la plateforme');
      pdf.table(
        ['Validateur', 'Décision', 'Date', 'Motif'],
        demande.visas.map(v => [
          v.label,
          v.statut === 'valide'     ? '✓ Bon pour accord' :
          v.statut === 'refuse'     ? '✗ Refus'           : '⏳ En attente',
          v.date ? formatDate(v.date) : '—',
          v.motif || '',
        ]),
        [52, 42, 32, 54]
      );
      pdf.space(4);
    }

    // Cadres de signature manuscrite
    pdf.sectionHeader('Signatures manuscrites (document officiel)');
    pdf.space(3);

    const signataires = [
      { label: 'Responsable de l\'action', sublabel: demande?.responsable || '' },
      ...APP_CONFIG.validateurs.map(v => ({ label: v.label, sublabel: 'Bon pour accord' })),
    ];

    // Disposition : 2 colonnes
    const boxW  = (MW - 8) / 2;
    const boxH  = 28;
    signataires.forEach((s, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const bx  = ML + col * (boxW + 8);
      const by  = pdf.y + row * (boxH + 6);

      pdf.checkY(boxH + 8);

      doc.setFillColor(250, 251, 253);
      doc.roundedRect(bx, by, boxW, boxH, 2, 2, 'F');
      doc.setDrawColor(...C.blue);
      doc.setLineWidth(0.3);
      doc.roundedRect(bx, by, boxW, boxH, 2, 2, 'S');

      // Label
      doc.setFont(FONT, 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...C.blue);
      doc.text(s.label, bx + 4, by + 6);

      // Sous-label "Bon pour accord"
      if (s.sublabel) {
        doc.setFont(FONT, 'italic');
        doc.setFontSize(7);
        doc.setTextColor(...C.slateMid);
        doc.text(s.sublabel, bx + 4, by + 11);
      }

      // Ligne de signature
      doc.setDrawColor(...C.gray);
      doc.setLineWidth(0.3);
      doc.line(bx + 4, by + boxH - 5, bx + boxW - 4, by + boxH - 5);
      doc.setFont(FONT, 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...C.slateMid);
      doc.text('Signature', bx + 4, by + boxH - 2);

      // Avancer y après la dernière case de chaque rangée de 2
      if (col === 1 || i === signataires.length - 1) {
        pdf.y = by + boxH + 6;
      }
    });

    pdf.space(6);

    // Décision du Chef d'établissement
    pdf.checkY(40);
    pdf.sectionHeader('Décision du Chef d\'établissement');
    pdf.space(3);

    const decisions = [
      ['Accordée',   C.green,  C.greenBg],
      ['Ajournée — encadrement insuffisant', C.amber, C.amberBg],
      ['Ajournée — passage en CA obligatoire', C.amber, C.amberBg],
      ['Ajournée — manque un ou des visas', C.amber, C.amberBg],
      ['Refusée — motif :', C.red, C.redBg],
    ];
    decisions.forEach(([txt, col, bg]) => {
      pdf.checkY(8);
      doc.setFillColor(...bg);
      doc.rect(ML, pdf.y, 6, 5.5, 'F');
      doc.setDrawColor(...col);
      doc.setLineWidth(0.3);
      doc.rect(ML, pdf.y, 6, 5.5);
      doc.setFont(FONT, 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...C.black);
      doc.text(txt, ML + 9, pdf.y + 4);
      pdf.y += 7;
    });

    pdf.space(6);
    doc.setFillColor(250, 251, 253);
    doc.roundedRect(ML + MW - 55, pdf.y, 55, 22, 2, 2, 'F');
    doc.setDrawColor(...C.blue);
    doc.setLineWidth(0.3);
    doc.roundedRect(ML + MW - 55, pdf.y, 55, 22, 2, 2, 'S');
    doc.setFont(FONT, 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...C.blue);
    doc.text('Le Chef d\'Établissement', ML + MW - 55 + 27.5, pdf.y + 7, { align: 'center' });
    doc.setFont(FONT, 'italic');
    doc.setFontSize(7);
    doc.setTextColor(...C.slateMid);
    doc.text('Bon pour accord', ML + MW - 55 + 27.5, pdf.y + 12, { align: 'center' });

    // Numéros de pages
    pdf.addPageNumbers(`Fiche d'action — ${d.intitule || 'Sans titre'} — ${d.responsable || ''}`);

    return pdf;
  }

  function formatDate(str) {
    if (!str) return '—';
    const [y, m, d] = str.split('-');
    return `${d}/${m}/${y}`;
  }

  function makeFilename(prefix, title) {
    const slug = (title || 'sans-titre').toLowerCase().replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_');
    return `${prefix}_${slug}_${new Date().toISOString().slice(0,10)}.pdf`;
  }

  return { createDoc, genererFicheAction, formatDate, makeFilename, C, ML, MR, MW, PAGE_W: PW, PAGE_H: PH };
})();
