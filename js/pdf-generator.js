// ═══════════════════════════════════════════════════
// pdf-generator.js — Style éditorial sobre
// Grandes marges · Zéro case · DejaVu (accents FR)
// Trait vertical de chapitre · Watermark numéro
// ═══════════════════════════════════════════════════

const PDFGenerator = (() => {

  // ── Mise en page ──────────────────────────────────
  const PW  = 210;   // largeur page mm
  const PH  = 297;   // hauteur page mm
  const ML  = 25;    // marge gauche — généreuse, safe pour impression
  const MR  = 22;    // marge droite
  const MT  = 22;    // marge haute
  const MB  = 20;    // marge basse
  const TW  = PW - ML - MR;   // largeur texte = 163 mm
  const BODY_BOT = PH - MB - 8; // limite basse du corps

  // ── Palette ───────────────────────────────────────
  const C = {
    navy:      [12,  35,  64],   // marine profond — titres
    navy2:     [26,  58, 100],   // marine secondaire
    gold:      [160, 120,  40],  // or chaud — accents
    ink:       [28,  28,  46],   // noir texte
    soft:      [74,  85, 104],   // texte secondaire
    muted:     [140, 154, 176],  // labels, hints
    rule:      [205, 213, 224],  // lignes fines
    pageBg:    [247, 249, 252],  // blanc cassé fond
    green:     [20,  90,  50],
    amber:     [122, 74,   0],
    red:       [123, 29,  29],
    white:     [255, 255, 255],
    // Couleurs de chapitre
    ch: {
      general:    [12,  35,  64],
      peda:       [20,  90,  64],
      financier:  [110, 56,   0],
      validation: [61,  18, 120],
    },
  };

  // Labels et numéros de chapitres
  const CH_LABEL = {
    general:    'Informations g\u00e9n\u00e9rales',
    peda:       'Volet p\u00e9dagogique',
    financier:  'Volet financier',
    validation: 'Circuit de validation',
  };
  const CH_NUM = { general: '01', peda: '02', financier: '03', validation: '04' };

  const FONT = 'DejaVuSans';

  // ── Enregistrement DejaVu (jsPDF) ─────────────────
  // Les fichiers .ttf DejaVu doivent être accessibles.
  // jsPDF les cherche via le chemin relatif ou le CDN configuré.
  // On utilise le support built-in de jsPDF pour les polices custom
  // en les déclarant via addFileToVFS + addFont.

  let _fontsLoaded = false;

  async function _loadFonts(doc) {
    if (_fontsLoaded) return;
    // jsPDF embarque DejaVuSans nativement via le plugin
    // Si non disponible, on retombe sur helvetica avec translitération
    try {
      // Tentative de chargement des polices DejaVu depuis le dossier assets
      const fontFiles = [
        { url: 'assets/fonts/DejaVuSans.ttf',           name: 'DejaVuSans',            style: 'normal'  },
        { url: 'assets/fonts/DejaVuSans-Bold.ttf',      name: 'DejaVuSans',            style: 'bold'    },
        { url: 'assets/fonts/DejaVuSans-Oblique.ttf',   name: 'DejaVuSans',            style: 'italic'  },
        { url: 'assets/fonts/DejaVuSans-BoldOblique.ttf', name: 'DejaVuSans',          style: 'bolditalic' },
      ];
      for (const { url, name, style } of fontFiles) {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`Font not found: ${url}`);
        const buf  = await resp.arrayBuffer();
        const b64  = btoa(String.fromCharCode(...new Uint8Array(buf)));
        const fname = url.split('/').pop();
        doc.addFileToVFS(fname, b64);
        doc.addFont(fname, name, style);
      }
      _fontsLoaded = true;
    } catch (e) {
      console.warn('DejaVu fonts not found in assets/fonts/ — falling back to helvetica. Accents may not render.', e);
    }
  }

  // ── Utilitaires ───────────────────────────────────

  function _rgb(arr) { return arr; }

  // Translitération de secours (helvetica)
  function _safe(str) {
    if (!str) return '';
    return String(str)
      .replace(/[\u2019\u2018]/g, "'")
      .replace(/[\u201c\u201d]/g, '"')
      .replace(/\u2014/g, '--')
      .replace(/\u2013/g, '-')
      .replace(/\u00b7/g, '.')
      .replace(/[^\x00-\x7E\xA0-\xFF]/g, '?');
  }

  function _text(doc, useDejaVu, str, ...args) {
    return doc.text(useDejaVu ? str : _safe(str), ...args);
  }

  // ── Trait vertical de chapitre ────────────────────
  function _chapterBar(doc, chapterKey) {
    const col = C.ch[chapterKey];
    const barX = ML - 8;
    doc.setDrawColor(...col);
    doc.setLineWidth(1.6);
    doc.line(barX, MT + 4, barX, PH - MB - 6);
  }

  // ── Watermark numéro ──────────────────────────────
  function _watermark(doc, chapterKey, useDejaVu) {
    const col = C.ch[chapterKey];
    const num = CH_NUM[chapterKey];
    doc.saveGraphicsState();
    doc.setGState(new doc.GState({ opacity: 0.04 }));
    doc.setFont(useDejaVu ? 'DejaVuSans' : 'helvetica', 'bold');
    doc.setFontSize(130);
    doc.setTextColor(...col);
    doc.text(num, ML - 4, 200);
    doc.restoreGraphicsState();
  }

  // ── En-tête ───────────────────────────────────────
  function _header(doc, chapterKey, docSubtitle, useDejaVu) {
    const col = C.ch[chapterKey];

    // Ligne fine haut
    doc.setDrawColor(...col);
    doc.setLineWidth(0.5);
    doc.line(ML - 8, MT, PW - MR, MT);

    // Établissement — gauche
    doc.setFont(useDejaVu ? 'DejaVuSans' : 'helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...C.navy);
    _text(doc, useDejaVu, APP_CONFIG.etablissement.nom.toUpperCase(), ML, MT - 3.5);

    const adr = `${APP_CONFIG.etablissement.adresse} \u00b7 ${APP_CONFIG.etablissement.codePostal} ${APP_CONFIG.etablissement.ville}`;
    doc.setFont(useDejaVu ? 'DejaVuSans' : 'helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...C.muted);
    _text(doc, useDejaVu, adr, ML, MT - 0.2);

    // Chapitre — droite
    const chLabel = `${CH_NUM[chapterKey]}  \u00b7  ${CH_LABEL[chapterKey].toUpperCase()}`;
    doc.setFont(useDejaVu ? 'DejaVuSans' : 'helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...col);
    _text(doc, useDejaVu, chLabel, PW - MR, MT - 3.5, { align: 'right' });

    doc.setFont(useDejaVu ? 'DejaVuSans' : 'helvetica', 'italic');
    doc.setFontSize(6.5);
    doc.setTextColor(...C.muted);
    _text(doc, useDejaVu, docSubtitle, PW - MR, MT - 0.2, { align: 'right' });
  }

  // ── Pied de page ──────────────────────────────────
  function _footer(doc, chapterKey, pageNum, total, docTitle, useDejaVu) {
    const col = C.ch[chapterKey];
    const fy  = PH - MB + 5;

    doc.setDrawColor(...col);
    doc.setLineWidth(0.35);
    doc.line(ML - 8, fy, PW - MR, fy);

    doc.setFont(useDejaVu ? 'DejaVuSans' : 'helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...C.muted);
    _text(doc, useDejaVu, APP_CONFIG.etablissement.email, ML, fy + 4);
    _text(doc, useDejaVu, `Page ${pageNum} / ${total}`, PW - MR, fy + 4, { align: 'right' });
  }

  // ── Titre de section ──────────────────────────────
  function _sectionHead(doc, chapterKey, title, y, useDejaVu) {
    const col = C.ch[chapterKey];
    // Pastille
    doc.setFillColor(...col);
    doc.circle(ML - 2.5, y - 0.5, 1, 'F');
    // Titre en capitales colorées
    doc.setFont(useDejaVu ? 'DejaVuSans' : 'helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...col);
    _text(doc, useDejaVu, title.toUpperCase(), ML + 2, y);
    // Règle fine sous le titre
    doc.setDrawColor(...col);
    doc.setLineWidth(0.4);
    doc.line(ML + 2, y + 2, PW - MR, y + 2);
    return y + 7;
  }

  // ── Paire de champs (2 colonnes) ──────────────────
  function _fieldPair(doc, items, y, useDejaVu) {
    const half = TW / 2 - 4;
    items.forEach(([label, value], i) => {
      if (!value) return;
      const x = ML + i * (half + 8);
      doc.setFont(useDejaVu ? 'DejaVuSans' : 'helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(...C.muted);
      _text(doc, useDejaVu, label.toUpperCase(), x, y);
      doc.setFont(useDejaVu ? 'DejaVuSans' : 'helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(...C.ink);
      _text(doc, useDejaVu, String(value), x, y + 5.5);
    });
    // Ligne séparatrice légère
    doc.setDrawColor(...C.rule);
    doc.setLineWidth(0.25);
    doc.line(ML, y + 11, PW - MR, y + 11);
    return y + 15;
  }

  // ── Champ simple (label + valeur sur ligne) ────────
  function _fieldRow(doc, label, value, y, lw, useDejaVu) {
    if (!value) return y;
    lw = lw || 45;
    doc.setFont(useDejaVu ? 'DejaVuSans' : 'helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...C.muted);
    _text(doc, useDejaVu, label.toUpperCase(), ML, y);
    doc.setFont(useDejaVu ? 'DejaVuSans' : 'helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...C.ink);
    const lines = doc.splitTextToSize(String(value), TW - lw - 2);
    lines.forEach((l, i) => {
      _text(doc, useDejaVu, l, ML + lw, y + i * 5);
    });
    const h = Math.max(lines.length * 5, 5);
    doc.setDrawColor(...C.rule);
    doc.setLineWidth(0.2);
    doc.line(ML, y + h + 1.5, PW - MR, y + h + 1.5);
    return y + h + 5;
  }

  // ── Texte libre italique ───────────────────────────
  function _bodyText(doc, value, y, useDejaVu) {
    if (!value) return y;
    doc.setFont(useDejaVu ? 'DejaVuSans' : 'helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(...C.soft);
    const lines = doc.splitTextToSize(String(value), TW);
    lines.forEach((l, i) => _text(doc, useDejaVu, l, ML, y + i * 5.2));
    return y + lines.length * 5.2 + 4;
  }

  // ── Liste à tirets ────────────────────────────────
  function _bulletList(doc, items, y, useDejaVu) {
    items.forEach(item => {
      if (!item) return;
      doc.setFont(useDejaVu ? 'DejaVuSans' : 'helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...C.muted);
      _text(doc, useDejaVu, '\u2014', ML, y);
      doc.setFontSize(9);
      doc.setTextColor(...C.ink);
      const lines = doc.splitTextToSize(String(item), TW - 6);
      lines.forEach((l, i) => _text(doc, useDejaVu, l, ML + 6, y + i * 5));
      y += lines.length * 5 + 2;
    });
    return y + 2;
  }

  // ── Chips inline séparées par · ──────────────────
  function _chipsInline(doc, chapterKey, items, y, useDejaVu) {
    if (!items?.length) return y;
    const col = C.ch[chapterKey];
    const joined = items.join('  \u00b7  ');
    doc.setFont(useDejaVu ? 'DejaVuSans' : 'helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...col);
    const lines = doc.splitTextToSize(joined, TW);
    lines.forEach((l, i) => _text(doc, useDejaVu, l, ML, y + i * 5.5));
    return y + lines.length * 5.5 + 4;
  }

  // ── Tableau sobre ─────────────────────────────────
  function _table(doc, chapterKey, headers, rows, colWidths, y, useDejaVu, opts = {}) {
    const col    = C.ch[chapterKey];
    const rowH   = 6.5;
    const headH  = 7.5;

    // En-tête — fond coloré
    doc.setFillColor(...col);
    doc.rect(ML, y, TW, headH, 'F');
    doc.setFont(useDejaVu ? 'DejaVuSans' : 'helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...C.white);
    let x = ML + 2;
    headers.forEach((h, i) => {
      _text(doc, useDejaVu, h, x, y + 5.2);
      x += colWidths[i];
    });
    y += headH;

    // Lignes
    rows.forEach((row, ri) => {
      if (ri % 2 === 1) {
        const bg = chapterKey === 'general'    ? [240, 244, 251] :
                   chapterKey === 'peda'       ? [235, 248, 242] :
                   chapterKey === 'financier'  ? [253, 244, 230] :
                                                 [243, 235, 255];
        doc.setFillColor(...bg);
        doc.rect(ML, y, TW, rowH, 'F');
      }
      const isBold = opts.lastBold && ri === rows.length - 1;
      doc.setFont(useDejaVu ? 'DejaVuSans' : 'helvetica', isBold ? 'bold' : 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...C.ink);
      let rx = ML + 2;
      row.forEach((cell, ci) => {
        _text(doc, useDejaVu, String(cell ?? ''), rx, y + 4.6);
        rx += colWidths[ci];
      });
      doc.setDrawColor(...C.rule);
      doc.setLineWidth(0.15);
      doc.line(ML, y + rowH, ML + TW, y + rowH);
      y += rowH;
    });

    // Contour fin
    doc.setDrawColor(...col);
    doc.setLineWidth(0.3);
    doc.rect(ML, y - rows.length * rowH - headH, TW, rows.length * rowH + headH);
    return y + 4;
  }

  // ── Axe PE ────────────────────────────────────────
  function _axeLine(doc, chapterKey, axeText, y, useDejaVu) {
    const col = C.ch[chapterKey];
    // Numéro watermark dans la marge
    const num = axeText.match(/AXE\s+(\d)/)?.[1] || '';
    if (num) {
      doc.saveGraphicsState();
      doc.setGState(new doc.GState({ opacity: 0.1 }));
      doc.setFont(useDejaVu ? 'DejaVuSans' : 'helvetica', 'bold');
      doc.setFontSize(24);
      doc.setTextColor(...col);
      doc.text(num, ML - 7, y + 3);
      doc.restoreGraphicsState();
    }
    doc.setFont(useDejaVu ? 'DejaVuSans' : 'helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...C.ink);
    const lines = doc.splitTextToSize(axeText, TW);
    lines.forEach((l, i) => _text(doc, useDejaVu, l, ML + 1, y + i * 5.2));
    doc.setDrawColor(...C.rule);
    doc.setLineWidth(0.2);
    doc.line(ML, y + lines.length * 5.2 + 2, PW - MR, y + lines.length * 5.2 + 2);
    return y + lines.length * 5.2 + 6;
  }

  // ── Bloc de signature ─────────────────────────────
  function _sigBlock(doc, chapterKey, label, sublabel, x, y, w, useDejaVu) {
    const col = C.ch[chapterKey];
    doc.setFont(useDejaVu ? 'DejaVuSans' : 'helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...C.navy);
    _text(doc, useDejaVu, label, x, y);
    if (sublabel) {
      doc.setFont(useDejaVu ? 'DejaVuSans' : 'helvetica', 'italic');
      doc.setFontSize(7);
      doc.setTextColor(...C.muted);
      _text(doc, useDejaVu, sublabel, x, y + 5);
    }
    // Date
    doc.setFont(useDejaVu ? 'DejaVuSans' : 'helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...C.muted);
    _text(doc, useDejaVu, 'Le _____ / _____ / _________', x, y + 13);
    // Ligne de signature
    doc.setDrawColor(...col);
    doc.setLineWidth(0.6);
    doc.line(x, y + 23, x + w - 2, y + 23);
    doc.setFont(useDejaVu ? 'DejaVuSans' : 'helvetica', 'italic');
    doc.setFontSize(6.5);
    doc.setTextColor(...C.muted);
    _text(doc, useDejaVu, 'Signature', x, y + 27);
  }

  // ── Case à cocher décision ────────────────────────
  function _decisionLine(doc, label, y, colArr, useDejaVu) {
    doc.setDrawColor(...C.rule);
    doc.setLineWidth(0.4);
    doc.rect(ML, y - 3.5, 3.5, 3.5);
    doc.setFont(useDejaVu ? 'DejaVuSans' : 'helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...colArr);
    _text(doc, useDejaVu, label, ML + 6, y);
    return y + 7;
  }

  // ── checkY ────────────────────────────────────────
  function _checkY(y, needed) {
    return y + needed > BODY_BOT;
  }

  // ── formatDate ────────────────────────────────────
  function formatDate(str) {
    if (!str) return '\u2014';
    const [yr, mo, da] = str.split('-');
    return `${da}/${mo}/${yr}`;
  }

  // ── makeFilename ──────────────────────────────────
  function makeFilename(prefix, title) {
    const slug = (title || 'sans-titre')
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/gi, '_')
      .replace(/_+/g, '_');
    return `${prefix}_${slug}_${new Date().toISOString().slice(0, 10)}.pdf`;
  }

  // ════════════════════════════════════════════════════
  // FONCTION PRINCIPALE
  // ════════════════════════════════════════════════════

  async function genererFicheAction(d, demande) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // Chargement des polices DejaVu
    await _loadFonts(doc);
    const useDejaVu = _fontsLoaded;
    const F = useDejaVu ? 'DejaVuSans' : 'helvetica';

    // Titre court pour pied de page
    const docTitle  = d.intitule || 'Fiche d\u2019action';
    const docSubtitle = `${d.intitule || 'Fiche d\u2019action'}  \u00b7  ${d.responsable || ''}`;

    // Total pages — on compte les pages réelles après génération
    // On passe d'abord 1 passe pour numéroter en fin

    // ─────────────────────────────────────────────────
    // Helpers de page
    // ─────────────────────────────────────────────────

    let currentChapter = 'general';

    function startPage(chapterKey) {
      currentChapter = chapterKey;
      _chapterBar(doc, chapterKey);
      _watermark(doc, chapterKey, useDejaVu);
      _header(doc, chapterKey, docSubtitle, useDejaVu);
      return MT + 12;
    }

    function addPage(chapterKey) {
      doc.addPage();
      return startPage(chapterKey);
    }

    function checkY(y, needed, chapterKey) {
      if (_checkY(y, needed)) {
        return addPage(chapterKey);
      }
      return y;
    }

    // ═══════════════════════════════════════════════
    // PAGE 1 — Bloc titre + Informations générales
    // ═══════════════════════════════════════════════
    let y = startPage('general');

    // ── Grand titre ──────────────────────────────────
    doc.setFont(F, 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...C.gold);
    _text(doc, useDejaVu,
      "FICHE D\u2019ACTION  \u00b7  DEMANDE D\u2019AUTORISATION", ML, y);
    y += 9;

    // Titre principal
    const titreLines = doc.splitTextToSize(d.intitule || 'Fiche d\u2019action', TW);
    doc.setFont(F, 'bold');
    doc.setFontSize(22);
    doc.setTextColor(...C.navy);
    titreLines.forEach((l, i) => _text(doc, useDejaVu, l, ML, y + i * 11));
    y += titreLines.length * 11 + 2;

    // Sous-titre
    const sousTitre = [d.classes, d.destination, `Ann\u00e9e scolaire ${new Date().getFullYear()}\u2013${new Date().getFullYear() + 1}`]
      .filter(Boolean).join('  \u00b7  ');
    if (sousTitre) {
      doc.setFont(F, 'italic');
      doc.setFontSize(9.5);
      doc.setTextColor(...C.soft);
      _text(doc, useDejaVu, sousTitre, ML, y);
      y += 7;
    }

    // Ligne dorée
    doc.setDrawColor(...C.gold);
    doc.setLineWidth(1);
    doc.line(ML, y, PW - MR, y);
    y += 10;

    // ── Méta-données en paires ───────────────────────
    y = _fieldPair(doc, [
      ['Responsable de l\u2019action', d.responsable],
      ['Email',                        d.emailResponsable],
    ], y, useDejaVu);

    y = _fieldPair(doc, [
      ['Classes concern\u00e9es', d.classes],
      ['Destination',             d.destination],
    ], y, useDejaVu);

    if (d.dateDepart) {
      y = _fieldPair(doc, [
        ['D\u00e9part', `${formatDate(d.dateDepart)} \u00e0 ${d.heureDepart || '..'}h`],
        ['Retour',      d.dateRetour ? `${formatDate(d.dateRetour)} \u00e0 ${d.heureRetour || '..'}h` : '\u2014'],
      ], y, useDejaVu);
    }

    y += 4;

    // ── Description ──────────────────────────────────
    if (d.description) {
      y = checkY(y, 20, 'general');
      y = _sectionHead(doc, 'general', 'Description de l\u2019action', y, useDejaVu);
      y = _bodyText(doc, d.description, y, useDejaVu);
    }

    // ── Accompagnateurs ──────────────────────────────
    if (d.accompagnateurs?.length) {
      y = checkY(y, d.accompagnateurs.length * 6.5 + 20, 'general');
      y = _sectionHead(doc, 'general', 'Accompagnateurs', y, useDejaVu);
      y = _table(doc, 'general',
        ['Accompagnateur', 'Classes / cours annul\u00e9s', 'Heures'],
        d.accompagnateurs.map(a => [a.nom, a.classes, a.heures]),
        [82, 64, 17], y, useDejaVu);
    }

    const extras = [];
    if (d.autresPersonnels) extras.push(['Autres personnels', d.autresPersonnels]);
    if (d.aed)              extras.push(['AED (CPE)',          d.aed]);
    if (d.parents)          extras.push(['Parents d\u2019\u00e9l\u00e8ves', d.parents]);
    if (extras.length) {
      y = _fieldPair(doc, extras.slice(0, 2), y, useDejaVu);
      if (extras.length > 2) y = _fieldPair(doc, extras.slice(2), y, useDejaVu);
    }

    // ═══════════════════════════════════════════════
    // PAGE 2 — Volet pédagogique
    // ═══════════════════════════════════════════════
    doc.addPage();
    y = startPage('peda');

    // Titre de volet
    doc.setFont(F, 'bold');
    doc.setFontSize(16);
    doc.setTextColor(...C.navy);
    _text(doc, useDejaVu, 'Volet p\u00e9dagogique', ML, y);
    doc.setDrawColor(...C.gold);
    doc.setLineWidth(0.8);
    doc.line(ML, y + 4, PW - MR, y + 4);
    y += 13;

    // Axes PE
    if (d.axes?.length) {
      y = _sectionHead(doc, 'peda', 'Axes du projet d\u2019\u00e9tablissement', y, useDejaVu);
      d.axes.forEach(axe => {
        y = checkY(y, 14, 'peda');
        y = _axeLine(doc, 'peda', axe, y, useDejaVu);
      });
      y += 2;
    }

    // Type d'action
    const typeItems = [];
    if (d.parcours?.length)    typeItems.push(...d.parcours);
    if (d.disciplines?.length) typeItems.push(...d.disciplines);
    if (typeItems.length) {
      y = checkY(y, 15, 'peda');
      y = _sectionHead(doc, 'peda', 'Type d\u2019action p\u00e9dagogique', y, useDejaVu);
      y = _chipsInline(doc, 'peda', typeItems, y, useDejaVu);
    }

    // Objectifs
    if (d.objectifsPeda) {
      y = checkY(y, 20, 'peda');
      y = _sectionHead(doc, 'peda', 'Objectifs p\u00e9dagogiques', y, useDejaVu);
      y = _bodyText(doc, d.objectifsPeda, y, useDejaVu);
    }

    // Domaines / Socle
    if (d.domaines?.length) {
      y = checkY(y, 15, 'peda');
      y = _sectionHead(doc, 'peda', 'Comp\u00e9tences vis\u00e9es \u2014 Socle commun', y, useDejaVu);
      y = _chipsInline(doc, 'peda', d.domaines, y, useDejaVu);
    }

    // Évaluation
    if (d.criteres?.length) {
      y = checkY(y, d.criteres.length * 6.5 + 20, 'peda');
      y = _sectionHead(doc, 'peda', '\u00c9valuation de l\u2019action', y, useDejaVu);
      y = _table(doc, 'peda',
        ['Crit\u00e8re d\u2019\u00e9valuation', 'Valeur cible', 'Valeur mesur\u00e9e'],
        d.criteres.map(cr => [cr.libelle, cr.cible, cr.mesure || '\u2014']),
        [95, 42, 26], y, useDejaVu);
    }

    // Communication
    const crParts = [];
    if (d.crEleves) crParts.push(`\u00c9l\u00e8ves : ${d.crEleves}`);
    if (d.crProfs)  crParts.push(`Professeurs : ${d.crProfs}`);
    if (d.crAutres) crParts.push(`Autres : ${d.crAutres}`);
    const commItems = [...crParts, ...(d.supports || []), ...(d.publications || [])];
    if (commItems.length) {
      y = checkY(y, 20, 'peda');
      y = _sectionHead(doc, 'peda', 'Communication et restitution', y, useDejaVu);
      y = _bulletList(doc, commItems, y, useDejaVu);
    }

    // ═══════════════════════════════════════════════
    // PAGE 3 — Volet financier
    // ═══════════════════════════════════════════════
    doc.addPage();
    y = startPage('financier');

    doc.setFont(F, 'bold');
    doc.setFontSize(16);
    doc.setTextColor(...C.navy);
    _text(doc, useDejaVu, 'Volet financier', ML, y);
    doc.setDrawColor(...C.gold);
    doc.setLineWidth(0.8);
    doc.line(ML, y + 4, PW - MR, y + 4);
    y += 13;

    y = _sectionHead(doc, 'financier', 'Budget pr\u00e9visionnel', y, useDejaVu);
    y = _fieldPair(doc, [
      ['Budget total',      d.budget ? `${d.budget} \u20ac` : null],
      ['Mode de transport', d.transports?.join(', ')],
    ], y, useDejaVu);
    if (d.budgetDetail) {
      y = _fieldRow(doc, 'D\u00e9tail du budget', d.budgetDetail, y, 35, useDejaVu);
    }
    y += 4;

    if (d.elevesAvecCarte != null || d.elevesSansCarte != null) {
      y = checkY(y, 40, 'financier');
      y = _sectionHead(doc, 'financier', 'R\u00e9partition \u2014 Carte de transport', y, useDejaVu);
      y = _table(doc, 'financier',
        ['', 'Avec carte de transport', 'Sans carte de transport'],
        [
          ['\u00c9l\u00e8ves',         d.elevesAvecCarte ?? '\u2014', d.elevesSansCarte ?? '\u2014'],
          ['Accompagnateurs',          d.accAvecCarte    ?? '\u2014', d.accSansCarte    ?? '\u2014'],
          ['Total',                    d.totalAvecCarte  ?? '\u2014', d.totalSansCarte  ?? '\u2014'],
        ],
        [68, 52, 43], y, useDejaVu, { lastBold: true });
    }

    if (d.partenaireDevis) {
      y = checkY(y, 14, 'financier');
      y = _sectionHead(doc, 'financier', 'Devis prestataire', y, useDejaVu);
      y = _fieldRow(doc, 'Partenaire', `${d.partenaireDevis} \u20ac`, y, 30, useDejaVu);
      y += 4;
    }

    if (d.financements?.length) {
      y = checkY(y, 15, 'financier');
      y = _sectionHead(doc, 'financier', 'Sources de financement', y, useDejaVu);
      y = _chipsInline(doc, 'financier', d.financements, y, useDejaVu);
    }

    y = checkY(y, 20, 'financier');
    y = _sectionHead(doc, 'financier', 'Assurance', y, useDejaVu);
    y = _bulletList(doc, [
      'Sortie obligatoire : assurance scolaire facultative, mais vivement recommand\u00e9e.',
      'Sortie facultative : assurance scolaire obligatoire.',
    ], y, useDejaVu);

    // ═══════════════════════════════════════════════
    // PAGE 4 — Circuit de validation
    // ═══════════════════════════════════════════════
    doc.addPage();
    y = startPage('validation');

    doc.setFont(F, 'bold');
    doc.setFontSize(16);
    doc.setTextColor(...C.navy);
    _text(doc, useDejaVu, 'Circuit de validation', ML, y);
    doc.setDrawColor(...C.gold);
    doc.setLineWidth(0.8);
    doc.line(ML, y + 4, PW - MR, y + 4);
    y += 13;

    // Note légale
    doc.setFont(F, 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...C.amber);
    _text(doc, useDejaVu,
      '\u26a0  Document non officiel avant signatures manuscrites.', ML, y);
    y += 5;
    doc.setFont(F, 'italic');
    doc.setFontSize(8);
    doc.setTextColor(...C.soft);
    const noteLegale = 'Les bons pour accord num\u00e9riques constituent un accord de principe. '
      + 'Seules les signatures manuscrites ci-dessous ont valeur officielle.';
    const noteLines = doc.splitTextToSize(noteLegale, TW);
    noteLines.forEach((l, i) => _text(doc, useDejaVu, l, ML, y + i * 5));
    y += noteLines.length * 5 + 8;

    // Circuit visuel
    if (demande?.visas?.length || APP_CONFIG.validateurs?.length) {
      y = _sectionHead(doc, 'validation', 'Avancements num\u00e9riques', y, useDejaVu);

      const visas = demande?.visas || APP_CONFIG.validateurs.map(v => ({
        label: v.label, statut: 'attente', date: null, motif: '',
      }));
      const stepW = TW / visas.length;
      const circY = y + 8;

      visas.forEach((v, i) => {
        const cx = ML + stepW * i + stepW / 2;
        const done = v.statut === 'valide';
        const refused = v.statut === 'refuse';

        // Cercle
        const circCol = done ? C.ch.peda : refused ? C.red : C.muted;
        doc.setFillColor(...(done ? C.ch.peda : C.white));
        doc.setDrawColor(...circCol);
        doc.setLineWidth(done ? 1.5 : 0.6);
        doc.circle(cx, circY, 5, 'FD');

        // Icône
        doc.setFont(F, 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(...(done ? C.white : circCol));
        const icon = done ? '\u2713' : refused ? '\u2717' : String(i + 1);
        _text(doc, useDejaVu, icon, cx, circY + 2.5, { align: 'center' });

        // Nom
        doc.setFont(F, 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(...C.navy);
        _text(doc, useDejaVu, v.label, cx, y + 3, { align: 'center' });

        // Statut
        const statusCol = done ? C.green : refused ? C.red : C.amber;
        const statusTxt = done ? '\u2713 Bon pour accord' : refused ? '\u2717 Refus' : '\u23f3 En attente';
        doc.setFont(F, 'italic');
        doc.setFontSize(7);
        doc.setTextColor(...statusCol);
        _text(doc, useDejaVu, statusTxt, cx, y + 21, { align: 'center' });
        if (v.date) {
          doc.setFont(F, 'normal');
          doc.setFontSize(6.5);
          doc.setTextColor(...C.muted);
          _text(doc, useDejaVu, formatDate(v.date), cx, y + 26, { align: 'center' });
        }

        // Flèche
        if (i < visas.length - 1) {
          doc.setDrawColor(...C.rule);
          doc.setLineWidth(0.4);
          const ax = ML + stepW * (i + 1);
          doc.line(ax - 5, circY, ax + 5, circY);
        }
      });
      y += 32;
    }

    // Tableau récap si visas
    if (demande?.visas?.length) {
      y = checkY(y, demande.visas.length * 6.5 + 20, 'validation');
      y = _sectionHead(doc, 'validation', 'D\u00e9tail des bons pour accord', y, useDejaVu);
      y = _table(doc, 'validation',
        ['Validateur', 'D\u00e9cision', 'Date', 'Motif'],
        demande.visas.map(v => [
          v.label,
          v.statut === 'valide' ? '\u2713 Bon pour accord' :
          v.statut === 'refuse' ? '\u2717 Refus' : '\u23f3 En attente',
          v.date ? formatDate(v.date) : '\u2014',
          v.motif || '',
        ]),
        [52, 44, 28, 39], y, useDejaVu);
    }

    // Signatures
    y = checkY(y, 75, 'validation');
    y = _sectionHead(doc, 'validation', 'Signatures manuscrites \u2014 Document officiel', y, useDejaVu);
    y += 3;

    const signataires = [
      { label: 'Responsable de l\u2019action', sublabel: d.responsable || '' },
      ...APP_CONFIG.validateurs.map(v => ({ label: v.label, sublabel: 'Bon pour accord' })),
    ];

    const sigW = (TW - 10) / 2;
    const sigH = 30;

    signataires.forEach((s, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      if (col === 0 && row > 0) y = checkY(y, sigH + 8, 'validation');
      const sx = ML + col * (sigW + 10);
      const sy = col === 0 ? y : y;
      _sigBlock(doc, 'validation', s.label, s.sublabel, sx, sy, sigW, useDejaVu);
      if (col === 1 || i === signataires.length - 1) y += sigH + 8;
    });

    // Décision chef
    y = checkY(y, 55, 'validation');
    y = _sectionHead(doc, 'validation', 'D\u00e9cision du Chef d\u2019\u00e9tablissement', y, useDejaVu);
    y += 3;

    y = _decisionLine(doc, 'Accord\u00e9e', y, C.green, useDejaVu);
    y = _decisionLine(doc, 'Ajourn\u00e9e \u2014 encadrement insuffisant', y, C.amber, useDejaVu);
    y = _decisionLine(doc, 'Ajourn\u00e9e \u2014 passage en CA obligatoire', y, C.amber, useDejaVu);
    y = _decisionLine(doc, 'Ajourn\u00e9e \u2014 manque un ou des visas', y, C.amber, useDejaVu);
    y = _decisionLine(doc, 'Refus\u00e9e \u2014 motif : ___________________________________', y, C.red, useDejaVu);

    y += 6;
    // Signature chef seule à droite
    _sigBlock(doc, 'validation', 'Le Chef d\u2019\u00c9tablissement', 'Signature & cachet officiel',
              ML + TW - sigW, y, sigW, useDejaVu);

    // ── Numérotation ──────────────────────────────────
    const totalPages = doc.getNumberOfPages();
    // Les chapitres par page — on les a créés dans l'ordre
    const pageChapters = ['general', 'peda', 'financier', 'validation'];
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      const chKey = pageChapters[Math.min(p - 1, pageChapters.length - 1)];
      _footer(doc, chKey, p, totalPages, docTitle, useDejaVu);
    }

    return {
      doc,
      save(filename) { doc.save(filename); },
      toBase64()     { return doc.output('datauristring'); },
    };
  }

  // createDoc reste disponible pour d'autres modules
  function createDoc() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    return { doc };
  }

  return {
    createDoc,
    genererFicheAction,
    formatDate,
    makeFilename,
    C,
    ML, MR, TW,
    PAGE_W: PW,
    PAGE_H: PH,
  };

})();
