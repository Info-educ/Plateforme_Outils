// ═══════════════════════════════════════════════════
// router.js — Gestion de la navigation entre modules
// ═══════════════════════════════════════════════════

const Router = (() => {

  let currentModule = null;
  const contentEl  = () => document.getElementById('app-content');
  const sidebarEls = () => document.querySelectorAll('.sidebar-item[data-module]');

  // Charge et injecte un module dans #app-content
  async function navigate(moduleId) {
    if (currentModule === moduleId) return;

    const mod = APP_CONFIG.modules.find(m => m.id === moduleId);
    if (!mod) return;
    if (!mod.active) return; // module non disponible

    // Mise à jour sidebar
    sidebarEls().forEach(el => {
      el.classList.toggle('active', el.dataset.module === moduleId);
    });

    // Affichage du loader
    contentEl().innerHTML = `
      <div class="page-loader">
        <div class="loader-spinner"></div>
        <p>Chargement…</p>
      </div>`;

    try {
      // Charge le HTML du module
      const res  = await fetch(`modules/${moduleId}/form.html`);
      if (!res.ok) throw new Error(`Module introuvable : ${moduleId}`);
      const html = await res.text();
      contentEl().innerHTML = html;

      // Charge le JS du module (s'il existe)
      await loadModuleScript(moduleId);

      currentModule = moduleId;

      // Mise à jour URL sans rechargement
      history.pushState({ moduleId }, '', `#${moduleId}`);

    } catch (err) {
      contentEl().innerHTML = `
        <div class="error-box">
          <p>⚠️ Impossible de charger le module <strong>${moduleId}</strong>.</p>
          <p style="font-size:12px;margin-top:.5rem;color:var(--slate-mid)">${err.message}</p>
        </div>`;
    }
  }

  // Charge dynamiquement le script JS d'un module
  async function loadModuleScript(moduleId) {
    const scriptId = `module-script-${moduleId}`;
    // Supprime l'ancien script du même module s'il existe
    const old = document.getElementById(scriptId);
    if (old) old.remove();

    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.id  = scriptId;
      script.src = `modules/${moduleId}/${moduleId}.js?v=${Date.now()}`;
      script.onload  = resolve;
      script.onerror = resolve; // pas bloquant si pas de JS module
      document.body.appendChild(script);
    });
  }

  // Affiche la page d'accueil (dashboard)
  function showHome() {
    sidebarEls().forEach(el => el.classList.remove('active'));
    document.querySelector('.sidebar-item[data-page="home"]')?.classList.add('active');
    currentModule = null;
    history.pushState({}, '', '#home');

    const cats = { pedagogique: 'Pédagogique', administratif: 'Administratif', rh: 'RH / Personnel' };
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

  // Gestion du bouton retour navigateur
  window.addEventListener('popstate', (e) => {
    const hash = location.hash.replace('#', '');
    if (!hash || hash === 'home') showHome();
    else navigate(hash);
  });

  // Init au chargement
  function init() {
    const hash = location.hash.replace('#', '');
    if (hash && hash !== 'home') navigate(hash);
    else showHome();
  }

  return { navigate, showHome, init };
})();
