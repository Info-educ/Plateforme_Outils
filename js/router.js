// ═══════════════════════════════════════════════════
// router.js — Navigation entre modules
// Charge les modules depuis les <template> intégrés
// dans index.html — fonctionne en file:// et HTTP.
// ═══════════════════════════════════════════════════

const Router = (() => {

  let currentModule = null;
  const contentEl  = () => document.getElementById('app-content');
  const sidebarEls = () => document.querySelectorAll('.sidebar-item[data-module]');

  // ── Navigation vers un module ─────────────────────

  async function navigate(moduleId) {
    if (currentModule === moduleId) return;

    const mod = APP_CONFIG.modules.find(m => m.id === moduleId);
    if (!mod || !mod.active) return;

    // Sidebar
    sidebarEls().forEach(el => {
      el.classList.toggle('active', el.dataset.module === moduleId);
    });

    // Loader
    contentEl().innerHTML = `
      <div class="page-loader">
        <div class="loader-spinner"></div>
        <p>Chargement…</p>
      </div>`;

    // Cherche le template intégré
    const tpl = document.getElementById(`tpl-${moduleId}`);
    if (tpl) {
      // Clone le contenu du template
      const clone = tpl.content.cloneNode(true);
      contentEl().innerHTML = '';
      contentEl().appendChild(clone);
    } else {
      // Fallback : tentative fetch (GitHub Pages / serveur HTTP)
      try {
        const res  = await fetch(`modules/${moduleId}/form.html`);
        if (!res.ok) throw new Error(`Module "${moduleId}" introuvable.`);
        contentEl().innerHTML = await res.text();
      } catch (err) {
        contentEl().innerHTML = `
          <div class="error-box">
            <p>⚠️ Module <strong>${moduleId}</strong> introuvable.</p>
            <p style="font-size:12px;margin-top:.5rem;color:var(--slate-mid)">${err.message}</p>
          </div>`;
        return;
      }
    }

    // Charge le JS du module
    await loadModuleScript(moduleId);
    currentModule = moduleId;
    history.pushState({ moduleId }, '', `#${moduleId}`);
  }

  // ── Chargement JS du module ───────────────────────

  async function loadModuleScript(moduleId) {
    const scriptId = `module-script-${moduleId}`;
    document.getElementById(scriptId)?.remove();

    return new Promise((resolve) => {
      const script   = document.createElement('script');
      script.id      = scriptId;
      script.src     = `modules/${moduleId}/${moduleId}.js?v=${Date.now()}`;
      script.onload  = resolve;
      script.onerror = () => {
        // Pas de JS externe — le module est peut-être inline
        resolve();
      };
      document.body.appendChild(script);
    });
  }

  // ── Dashboard accueil ─────────────────────────────

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

  // ── Retour navigateur ─────────────────────────────

  window.addEventListener('popstate', () => {
    const hash = location.hash.replace('#', '');
    if (!hash || hash === 'home') showHome();
    else navigate(hash);
  });

  // ── Init ──────────────────────────────────────────

  function init() {
    const hash = location.hash.replace('#', '');
    if (hash && hash !== 'home') navigate(hash);
    else showHome();
  }

  return { navigate, showHome, init };
})();
