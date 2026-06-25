// ═══════════════════════════════════════════════════
// pdf-generator.js — Moteur de génération PDF
// Utilisé par tous les modules qui produisent un PDF.
// S'appuie sur jsPDF (chargé dans index.html).
// ═══════════════════════════════════════════════════

const PDFGenerator = (() => {

  // Palette partagée
  const C = {
    blue:       [26,  79,  138],
    blueMid:    [37,  99,  170],
    blueLight:  [232, 240, 250],
    slate:      [51,  65,  85],
    gray:       [226, 232, 240],
    white:      [255, 255, 255],
    accent:     [230, 92,  26],
  };

  const PAGE_W  = 210;
  const PAGE_H  = 297;
  const ML      = 15;
  const MR      = 15;
  const MW      = PAGE_W - ML - MR;

  // ── Helpers de dessin ──────────────────────────

  function _pageHeader(doc, cfg) {
    doc.setFillColor(...C.blue);
    doc.rect(0, 0, PAGE_W, 12, 'F');
    doc.setTextColor(...C.white);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(
      `${cfg.etablissement.nom} — ${cfg.etablissement.adresse}, ${cfg.etablissement.codePostal} ${cfg.etablissement.ville} — Tél : ${cfg.etablissement.telephone}`,
      ML, 7.5
    );
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(cfg.etablissement.email, PAGE_W - MR, 7.5, { align: 'right' });
  }

  // Renvoie un objet doc avec des helpers pratiques
  function createDoc() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    let y = 15;

    const helpers = {
      doc,
      get y()    { return y; },
      set y(val) { y = val; },

      // Nouvelle page avec en-tête
      newPage() {
        doc.addPage();
        y = 15;
        _pageHeader(doc, APP_CONFIG);
        y = 18;
      },

      // Vérification espace disponible
      checkY(needed) {
        if (y + needed > PAGE_H - 15) this.newPage();
      },

      // En-tête de section bleue
      sectionHeader(title) {
        this.checkY(10);
        doc.setFillColor(...C.blue);
        doc.rect(ML, y, MW, 7, 'F');
        doc.setTextColor(...C.white);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(title, ML + 3, y + 5);
        y += 9;
      },

      // Grand titre de volet (centré)
      voletTitle(title) {
        this.newPage();
        doc.setFillColor(...C.blue);
        doc.rect(ML, y, MW, 10, 'F');
        doc.setTextColor(...C.white);
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text(title, PAGE_W / 2, y + 7, { align: 'center' });
        y += 14;
      },

      // Champ label : valeur
      field(label, value, labelWidth = 55) {
        if (!value) return;
        this.checkY(7);
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...C.slate);
        doc.text(label + ' :', ML, y + 4);
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(value, MW - labelWidth - 2);
        lines.forEach((l, i) => {
          this.checkY(5);
          doc.text(l, ML + labelWidth, y + 4);
          if (i < lines.length - 1) y += 5;
        });
        y += 6;
      },

      // Texte multiligne avec label
      multiLine(label, value) {
        if (!value) return;
        this.checkY(7);
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...C.slate);
        doc.text(label + ' :', ML, y + 4);
        y += 6;
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(value, MW - 4);
        lines.forEach(l => {
          this.checkY(5);
          doc.text(l, ML + 4, y + 4);
          y += 5;
        });
        y += 2;
      },

      // Liste à puces
      chips(label, items) {
        if (!items?.length) return;
        this.checkY(7);
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...C.slate);
        doc.text(label + ' :', ML, y + 4);
        y += 6;
        items.forEach(item => {
          this.checkY(5);
          doc.setFont('helvetica', 'normal');
          doc.text('• ' + item, ML + 4, y + 4);
          y += 5;
        });
        y += 2;
      },

      // Tableau générique
      table(headers, rows, colWidths) {
        this.checkY(12);
        let x = ML;
        doc.setFillColor(...C.blue);
        doc.rect(ML, y, MW, 6, 'F');
        doc.setTextColor(...C.white);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        headers.forEach((h, i) => { doc.text(h, x + 2, y + 4.2); x += colWidths[i]; });
        y += 6;

        rows.forEach((row, idx) => {
          this.checkY(6);
          if (idx % 2 === 0) {
            doc.setFillColor(248, 250, 252);
            doc.rect(ML, y, MW, 5.5, 'F');
          }
          doc.setTextColor(...C.slate);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          let rx = ML;
          row.forEach((cell, ci) => {
            doc.text(String(cell || ''), rx + 2, y + 3.8);
            rx += colWidths[ci];
          });
          doc.setDrawColor(...C.gray);
          doc.setLineWidth(0.2);
          doc.rect(ML, y, MW, 5.5);
          y += 5.5;
        });
        y += 4;
      },

      // Numérotation des pages
      addPageNumbers(docTitle) {
        const total = doc.getNumberOfPages();
        for (let i = 1; i <= total; i++) {
          doc.setPage(i);
          doc.setFontSize(7);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(150, 150, 150);
          doc.text(`Page ${i} / ${total}`, PAGE_W - MR, PAGE_H - 6, { align: 'right' });
          doc.text(docTitle, ML, PAGE_H - 6);
        }
      },

      // Téléchargement
      save(filename) {
        doc.save(filename);
      },

      // Base64 pour envoi mail
      toBase64() {
        return doc.output('datauristring');
      },
    };

    // En-tête de la première page
    _pageHeader(doc, APP_CONFIG);

    return helpers;
  }

  // Formate une date YYYY-MM-DD en DD/MM/YYYY
  function formatDate(str) {
    if (!str) return '';
    const [y, m, d] = str.split('-');
    return `${d}/${m}/${y}`;
  }

  // Génère un nom de fichier propre
  function makeFilename(prefix, title) {
    const slug = (title || 'sans-titre')
      .toLowerCase()
      .replace(/[^a-z0-9]/gi, '_')
      .replace(/_+/g, '_');
    const date = new Date().toISOString().slice(0, 10);
    return `${prefix}_${slug}_${date}.pdf`;
  }

  return { createDoc, formatDate, makeFilename, C, ML, MR, MW, PAGE_W, PAGE_H };
})();
