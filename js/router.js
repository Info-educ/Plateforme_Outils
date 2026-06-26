// ═══════════════════════════════════════════════════
// router.js — Navigation entre modules
//
// Les modules HTML et JS sont intégrés directement
// dans index.html (templates + scripts inline).
// Aucun fetch, aucune requête réseau — fonctionne
// en file:// comme sur GitHub Pages.
// ═══════════════════════════════════════════════════

const Router = (() => {

  let currentModule = null;
  const contentEl  = () => document.getElementById('app-content');
  const sidebarEls = () => document.querySelectorAll('.sidebar-item[data-module]');

  // Table des fonctions d'init par module
  const MODULE_INIT = {
    'fiche-action': () => typeof FicheAction !== 'undefined' && FicheAction.init?.(),
    'suivi':        () => typeof Suivi       !== 'undefined' && Suivi.init?.(),
    'annuaire':     () => typeof Annuaire    !== 'undefined' && Annuaire.render?.(),
  };

  function navigate(moduleId) {
    if (currentModule === moduleId) return;

    const mod = APP_CONFIG.modules.find(m => m.id === moduleId);
    if (!mod || !mod.active) return;

    // Sidebar
    sidebarEls().forEach(el => {
      el.classList.toggle('active', el.dataset.module === moduleId);
    });

    // Récupère le template du module
    const tpl = document.getElementById('tpl-' + moduleId);
    if (!tpl) {
      contentEl().innerHTML = `
        <div class="error-box">
          <p>⚠️ Module <strong>${moduleId}</strong> introuvable dans index.html.</p>
        </div>`;
      return;
    }

    // Clone et injecte le HTML
    const clone = document.importNode(tpl.content, true);
    contentEl().innerHTML = '';
    contentEl().appendChild(clone);

    currentModule = moduleId;
    history.pushState({ moduleId }, '', '#' + moduleId);

    // Appelle la fonction d'init du module (si définie)
    try {
      MODULE_INIT[moduleId]?.();
    } catch(e) {
      console.warn('Init module', moduleId, e);
    }
  }

  function showHome() {
    sidebarEls().forEach(el => el.classList.remove('active'));
    document.querySelector('.sidebar-item[data-page="home"]')?.classList.add('active');
    currentModule = null;
    history.pushState({}, '', '#home');

    const cats = {
      pedagogique:   'Pédagogique',
      administratif: 'Administratif',
      rh:            'RH / Personnel',
    };

    let html = `
      <div class="dashboard-header">
        <h1>Bienvenue sur l'espace numérique du collège</h1>
        <p>Tous vos outils de direction et de gestion pédagogique au même endroit.</p>
      </div>`;

    Object.entries(cats).forEach(([catId, catLabel]) => {
      const mods = APP_CONFIG.modules.filter(m => m.categorie === catId);
      if (!mods.length) return;
      html += `<h2 class="dashboard-cat">${catLabel}</h2><div class="module-grid">`;
      mods.forEach(m => {
        html += `
          <div class="module-card ${m.active ? '' : 'disabled'}"
               ${m.active ? `onclick="Router.navigate('${m.id}')"` : ''}>
            <div class="module-card-icon">${m.icon}</div>
            <div class="module-card-title">${m.label}</div>
            <div class="module-card-tag ${m.soon ? 'soon' : ''}">${m.soon ? 'Bientôt' : 'Disponible'}</div>
          </div>`;
      });
      html += `</div>`;
    });

    contentEl().innerHTML = html;
  }

  window.addEventListener('popstate', () => {
    const hash = location.hash.replace('#', '');
    if (!hash || hash === 'home') showHome();
    else navigate(hash);
  });

  function init() {
    const hash = location.hash.replace('#', '');
    if (hash && hash !== 'home') navigate(hash);
    else showHome();
  }

  return { navigate, showHome, init };
})();
